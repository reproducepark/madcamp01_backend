// src/controllers/authController.js
const { getDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { getAdminDongAddress } = require('../utils/geoUtils');

const onboardUser = async (req, res) => {
    const { nickname, lat, lon } = req.body;
    let adminDong = null;

    if (!nickname || typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({ message: 'Nickname, latitude, and longitude are required.' });
    }

    try {
        const db = getDb();

        // 닉네임 중복 확인
        const existingUser = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
        if (existingUser) {
            return res.status(409).json({ message: 'Nickname already exists. Please choose another.' });
        }

        const userId = uuidv4();
        adminDong = await getAdminDongAddress(lon, lat);

        const stmt = db.prepare('INSERT INTO users (id, nickname, lat, lon, admin_dong, last_active_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)');
        stmt.run(userId, nickname, lat, lon, adminDong);

        res.status(201).json({
            message: 'User onboarded successfully!',
            userId: userId,
            nickname,
            lat,
            lon,
            adminDong
        });
    } catch (error) {
        console.error('Error onboarding user:', error.message);
        res.status(500).json({ message: 'Error onboarding user.', error: error.message });
    }
};

// 사용자 위치 업데이트 (새로 접속할 때마다 호출될 수 있음)
const updateUserLocation = async (req, res) => {
    const { userId, lat, lon } = req.body;
    let adminDong = null;

    if (!userId || typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({ message: 'User ID, latitude, and longitude are required.' });
    }

    try {
        const db = getDb();
        adminDong = await getAdminDongAddress(lon, lat);

        const stmt = db.prepare('UPDATE users SET lat = ?, lon = ?, admin_dong = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?');
        const info = stmt.run(lat, lon, adminDong, userId);

        if (info.changes > 0) {
            res.json({
                message: 'User location and administrative dong updated successfully.',
                adminDong
            });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error updating user location:', error.message);
        res.status(500).json({ message: 'Error updating user location.', error: error.message });
    }
};

/**
 * 닉네임 중복 여부를 확인하는 함수.
 * @param {Object} req - Express 요청 객체.
 * @param {Object} res - Express 응답 객체.
 */
const checkNicknameAvailability = (req, res) => {
    const { nickname } = req.query; // GET 요청이므로 query 파라미터에서 닉네임을 가져옵니다.

    if (!nickname) {
        return res.status(400).json({ message: 'Nickname is required.' });
    }

    try {
        const db = getDb();
        const existingUser = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);

        if (existingUser) {
            // 닉네임이 이미 존재하면 true를 반환합니다.
            res.json({ isAvailable: false, message: 'Nickname already taken.' });
        } else {
            // 닉네임이 사용 가능하면 false를 반환합니다.
            res.json({ isAvailable: true, message: 'Nickname is available.' });
        }
    } catch (error) {
        console.error('Error checking nickname availability:', error.message);
        res.status(500).json({ message: 'Error checking nickname availability.', error: error.message });
    }
};


module.exports = {
    onboardUser,
    updateUserLocation,
    checkNicknameAvailability // 새로 추가된 함수 export
};