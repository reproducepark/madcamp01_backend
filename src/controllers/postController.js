// src/controllers/postController.js
const { getDb } = require('../config/db');
const { isWithinMapViewport, getAdminDongAddress, getUpperAdminDongAddress } = require('../utils/geoUtils'); // Import getAdminDongAddress
require('dotenv').config();

const SERVER_HOST = process.env.SERVER_IP || `localhost`; // .env에서 서버 IP를 가져오고, 없으면 localhost 사용
const UPLOAD_DIR_PUBLIC_PATH = `http://${SERVER_HOST || localhost}:${process.env.PORT || 3000}/uploads`;

// 특정 ID의 Post를 가져오는 함수
const getPostById = async (req, res) => {
    const { id } = req.params; // URL 파라미터에서 id를 추출

    try {
        const db = getDb();

        // 게시글 정보와 작성자 닉네임을 함께 조회
        const sql = `
            SELECT
                p.id,
                p.user_id,
                p.title,
                p.content,
                p.image_url,
                p.admin_dong,
                p.created_at,
                u.nickname
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `;

        const post = db.prepare(sql).get(id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        res.status(200).json(post); // Post 데이터를 JSON 형태로 응답
    } catch (error) {
        console.error('Error fetching post by ID:', error.message);
        res.status(500).json({ message: 'Error fetching post.', error: error.message });
    }
};

// 새 글 작성 (이미지 포함)
const createPost = async (req, res) => {
    // Destructure title from req.body as it's now a required field
    const { userId, content, title } = req.body;
    const lat = parseFloat(req.body.lat);
    const lon = parseFloat(req.body.lon);
    let imageUrl = null;
    let adminDong = null; // To store the administrative dong
    let upperAdminDong = null; // To store the upper administrative dong (e.g., Si/Gu)

    // Validate all required fields, including the new 'title'
    if (!userId || !content || !title || typeof lat !== 'number' || typeof lon !== 'number') {
        console.log('Missing required fields:', { userId, content, title, lat, lon });
        return res.status(400).json({ message: 'User ID, title, content, latitude, and longitude are required.' });
    }

    if (req.file) {
        imageUrl = `${UPLOAD_DIR_PUBLIC_PATH}/${req.file.filename}`;
    }

    try {
        // Get the administrative dong for the post's location
        // getAdminDongAddress expects (longitude, latitude)
        adminDong = await getAdminDongAddress(lon, lat);

        // Get the upper administrative dong for the post's location
        upperAdminDong = await getUpperAdminDongAddress(lon, lat);

        const db = getDb();

        // User existence check (optional: can be done via middleware in a real app)
        const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Insert data into the posts table, including 'title' and 'upper_admin_dong'
        // Ensure your 'posts' table has 'title' (TEXT NOT NULL) and 'upper_admin_dong' (TEXT NOT NULL) columns
        const stmt = db.prepare(
            'INSERT INTO posts (user_id, title, content, image_url, lat, lon, admin_dong, upper_admin_dong) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        const info = stmt.run(userId, title, content, imageUrl, lat, lon, adminDong, upperAdminDong);

        res.status(201).json({
            message: 'Post created successfully!',
            postId: info.lastInsertRowid,
            userId,
            title,
            content,
            imageUrl,
            lat,
            lon,
            adminDong,
            upperAdminDong
        });
    } catch (error) {
        console.error('Error creating post:', error.message);
        res.status(500).json({ message: 'Error creating post.', error: error.message });
    }
};

// 현재 위치 기반으로 근처 동네 글 조회
const getNearbyPosts = async (req, res) => { // Make function async
    const { currentLat, currentLon } = req.query;

    if (typeof parseFloat(currentLat) !== 'number' || typeof parseFloat(currentLon) !== 'number') {
        return res.status(400).json({ message: 'Valid currentLat and currentLon are required query parameters.' });
    }

    const userLocation = { lat: parseFloat(currentLat), lon: parseFloat(currentLon) };

    try {
        const db = getDb();

        // 1. Get the administrative dong for the user's current location
        const userAdminDong = await getAdminDongAddress(userLocation.lon, userLocation.lat);

        let posts = [];

        // 2. First, try to fetch posts from the same administrative dong
        if (userAdminDong && userAdminDong !== "행정동 주소를 찾을 수 없습니다." && userAdminDong !== "API 호출 중 오류가 발생했습니다.") {
            posts = db.prepare(`
                SELECT
                    p.id,
                    p.title,
                    p.image_url,
                    p.created_at,
                    p.admin_dong,
                    u.nickname
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.admin_dong = ?
                ORDER BY p.created_at DESC
            `).all(userAdminDong);
        }

        res.json({
            message: `Posts for your neighborhood (${userAdminDong || 'unknown'})`,
            yourLocation: userLocation,
            yourAdminDong: userAdminDong,
            nearbyPosts: posts
        });

    } catch (error) {
        console.error('Error fetching nearby posts:', error.message);
        res.status(500).json({ message: 'Error fetching nearby posts.', error: error.message });
    }
};

/**
 * Retrieves posts from the same upper administrative dong as the user's current location.
 *
 * @param {object} req - The Express request object, expecting `currentLat` and `currentLon` in `req.query`.
 * @param {object} res - The Express response object.
 */
const getNearbyPostsUpper = async (req, res) => {
    const { currentLat, currentLon } = req.query;

    // Validate input coordinates
    if (typeof parseFloat(currentLat) !== 'number' || typeof parseFloat(currentLon) !== 'number') {
        return res.status(400).json({ message: 'Valid currentLat and currentLon are required query parameters.' });
    }

    const userLocation = { lat: parseFloat(currentLat), lon: parseFloat(currentLon) };

    try {
        const db = getDb(); // Get your database instance

        // 1. Get the upper administrative dong for the user's current location
        const userUpperAdminDong = await getUpperAdminDongAddress(userLocation.lon, userLocation.lat);

        let posts = [];
        let message = `Posts for your upper neighborhood (${userUpperAdminDong || 'unknown'})`;

        // 2. Fetch posts from the same upper administrative dong if found
        if (userUpperAdminDong &&
            userUpperAdminDong !== "API 호출 중 오류가 발생했거나 API 키가 설정되지 않았습니다." &&
            userUpperAdminDong !== "상위 행정동 주소를 찾을 수 없습니다.") {
            posts = db.prepare(`
                SELECT
                    p.id,
                    p.title,
                    p.image_url,
                    p.created_at,
                    p.admin_dong,
                    p.upper_admin_dong,
                    u.nickname
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.upper_admin_dong = ?
                ORDER BY p.created_at DESC
            `).all(userUpperAdminDong);
        } else {
            // Adjust message if upper admin dong could not be determined
            message = `Could not determine your upper neighborhood. ${userUpperAdminDong}`;
        }

        res.json({
            message: message,
            yourLocation: userLocation,
            yourUpperAdminDong: userUpperAdminDong,
            nearbyPosts: posts
        });

    } catch (error) {
        console.error('Error fetching nearby posts by upper administrative dong:', error.message);
        res.status(500).json({ message: 'Error fetching nearby posts.', error: error.message });
    }
};

/**
 * Retrieves posts within a specified rectangular map viewport.
 * @param {object} req - The request object, expecting query parameters:
 * - centerLat: Latitude of the center of the viewport.
 * - centerLon: Longitude of the center of the viewport.
 * - deltaLat: The 'height' of the viewport in degrees latitude (maxLat - minLat).
 * - deltaLon: The 'width' of the viewport in degrees longitude (maxLon - minLon).
 * @param {object} res - The response object.
 */
const getPostsInViewport = async (req, res) => {
    const { centerLat, centerLon, deltaLat, deltaLon } = req.query;

    // Validate input parameters
    const parsedCenterLat = parseFloat(centerLat);
    const parsedCenterLon = parseFloat(centerLon);
    const parsedDeltaLat = parseFloat(deltaLat);
    const parsedDeltaLon = parseFloat(deltaLon);

    if (isNaN(parsedCenterLat) || isNaN(parsedCenterLon) ||
        isNaN(parsedDeltaLat) || isNaN(parsedDeltaLon) ||
        parsedDeltaLat < 0 || parsedDeltaLon < 0) {
        return res.status(400).json({ message: 'Valid centerLat, centerLon, non-negative deltaLat, and non-negative deltaLon are required query parameters.' });
    }

    const viewport = {
        centerLat: parsedCenterLat,
        centerLon: parsedCenterLon,
        deltaLat: parsedDeltaLat,
        deltaLon: parsedDeltaLon
    };

    try {
        const db = getDb(); // Get your database instance

        // Fetch all posts. As noted in your original code, for very large datasets,
        // filtering in memory might be inefficient. For a production environment
        // with spatial indexing, a more optimized database query would be preferred.
        const allPosts = db.prepare(`
            SELECT
                p.id,
                p.title,
                p.content,
                p.image_url,
                p.lat,
                p.lon,
                p.created_at,
                p.admin_dong,
                u.nickname
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `).all();

        // Filter posts that are within the specified viewport
        const postsInViewport = allPosts.filter(post =>
            isWithinMapViewport({ lat: post.lat, lon: post.lon }, viewport)
        );

        res.json({
            message: `Posts within the specified viewport.`,
            viewport: viewport,
            postsInViewport: postsInViewport
        });

    } catch (error) {
        console.error('Error fetching posts by viewport:', error.message);
        res.status(500).json({ message: 'Error fetching posts by viewport.', error: error.message });
    }
};

module.exports = {
    getPostById,
    createPost,
    getNearbyPosts,
    getPostsInViewport,
    getNearbyPostsUpper
};