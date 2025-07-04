// src/controllers/postController.js
const { getDb } = require('../config/db');
const { isWithinRadius, DISTANCE_THRESHOLD_KM } = require('../utils/geoUtils');
const path = require('path');
require('dotenv').config();

const UPLOAD_DIR_PUBLIC_PATH = `http://localhost:${process.env.PORT || 3000}/uploads`; // 이미지 접근을 위한 URL

// 새 글 작성 (이미지 포함)
const createPost = (req, res) => {
        const { userId, content } = req.body;
    const lat = parseFloat(req.body.lat);
    const lon = parseFloat(req.body.lon);
    let imageUrl = null;

    if (!userId || !content || typeof lat !== 'number' || typeof lon !== 'number') {
        console.log('Missing required fields:', { userId, content, lat, lon });
        // 이미지 파일이 필수적이지 않으므로, 파일 유무는 검사하지 않음
        return res.status(400).json({ message: 'User ID, content, latitude, and longitude are required.' });
    }

    if (req.file) {
        // 이미지 파일이 업로드된 경우, public URL 생성
        imageUrl = `${UPLOAD_DIR_PUBLIC_PATH}/${req.file.filename}`;
    }

    try {
        const db = getDb();

        // 사용자 존재 여부 확인 (옵션: 실제 앱에서는 미들웨어에서 user ID를 검증할 수 있음)
        const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!userExists) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const stmt = db.prepare('INSERT INTO posts (user_id, content, image_url, lat, lon) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(userId, content, imageUrl, lat, lon);

        res.status(201).json({
            message: 'Post created successfully!',
            postId: info.lastInsertRowid,
            userId,
            content,
            imageUrl,
            lat,
            lon
        });
    } catch (error) {
        console.error('Error creating post:', error.message);
        res.status(500).json({ message: 'Error creating post.', error: error.message });
    }
};

// 현재 위치 기반으로 근처 동네 글 조회
const getNearbyPosts = (req, res) => {
    const { currentLat, currentLon } = req.query; // 쿼리 파라미터로 현재 위치 받기

    if (typeof parseFloat(currentLat) !== 'number' || typeof parseFloat(currentLon) !== 'number') {
        return res.status(400).json({ message: 'Valid currentLat and currentLon are required query parameters.' });
    }

    const userLocation = { lat: parseFloat(currentLat), lon: parseFloat(currentLon) };

    try {
        const db = getDb();
        // 모든 글을 가져와서 서버에서 거리 계산 후 필터링
        // (데이터가 많아지면 DB에서 먼저 필터링하는 것이 효율적일 수 있으나, SQLite의 내장 함수 한계로 일단 풀 스캔)
        const allPosts = db.prepare(`
            SELECT
                p.id,
                p.content,
                p.image_url,
                p.lat,
                p.lon,
                p.created_at,
                u.nickname
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `).all();

        const nearbyPosts = allPosts.filter(post =>
            isWithinRadius(userLocation, { lat: post.lat, lon: post.lon })
        );

        res.json({
            message: `Nearby posts within ${DISTANCE_THRESHOLD_KM} km radius.`,
            yourLocation: userLocation,
            nearbyPosts
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