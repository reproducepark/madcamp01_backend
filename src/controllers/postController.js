// src/controllers/postController.js
const { getDb } = require('../config/db');
const { isWithinRadius, DISTANCE_THRESHOLD_KM, getAdminDongAddress } = require('../utils/geoUtils'); // Import getAdminDongAddress
const path = require('path');
require('dotenv').config();

const UPLOAD_DIR_PUBLIC_PATH = `http://${process.env.SERVER_HOST || localhost}:${process.env.PORT || 3000}/uploads`;


// 새 글 작성 (이미지 포함)
const createPost = async (req, res) => { // Make function async
    const { userId, content } = req.body;
    const lat = parseFloat(req.body.lat);
    const lon = parseFloat(req.body.lon);
    let imageUrl = null;
    let adminDong = null; // To store the administrative dong

    if (!userId || !content || typeof lat !== 'number' || typeof lon !== 'number') {
        console.log('Missing required fields:', { userId, content, lat, lon });
        return res.status(400).json({ message: 'User ID, content, latitude, and longitude are required.' });
    }

    if (req.file) {
        imageUrl = `${UPLOAD_DIR_PUBLIC_PATH}/${req.file.filename}`;
    }

    try {
        // Get the administrative dong for the post's location
        adminDong = await getAdminDongAddress(lon, lat); // getAdminDongAddress expects (longitude, latitude)

        const db = getDb();

        // User existence check (optional: can be done via middleware in a real app)
        const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Insert admin_dong into the posts table
        // *** IMPORTANT: Ensure your 'posts' table has an 'admin_dong' column (e.g., TEXT) ***
        const stmt = db.prepare('INSERT INTO posts (user_id, content, image_url, lat, lon, admin_dong) VALUES (?, ?, ?, ?, ?, ?)');
        const info = stmt.run(userId, content, imageUrl, lat, lon, adminDong);

        res.status(201).json({
            message: 'Post created successfully!',
            postId: info.lastInsertRowid,
            userId,
            content,
            imageUrl,
            lat,
            lon,
            adminDong // Include adminDong in the response
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
                    p.content,
                    p.image_url,
                    p.lat,
                    p.lon,
                    p.created_at,
                    p.admin_dong,
                    u.nickname
                FROM posts p
                JOIN users u ON p.user_id = u.id
                WHERE p.admin_dong = ?
                ORDER BY p.created_at DESC
            `).all(userAdminDong);
        }

        // 3. If no posts are found in the same administrative dong, or if admin dong lookup failed,
        // fall back to the radius-based search (all posts then filter)
        if (posts.length === 0) {
            const allPosts = db.prepare(`
                SELECT
                    p.id,
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

            posts = allPosts.filter(post =>
                isWithinRadius(userLocation, { lat: post.lat, lon: post.lon })
            );
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

module.exports = {
    createPost,
    getNearbyPosts
};