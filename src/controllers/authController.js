// src/controllers/authController.js
const { getDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
// geoUtils에서 getAdminDongAddress 함수를 불러옵니다.
const { getAdminDongAddress } = require('../utils/geoUtils');

const onboardUser = async (req, res) => { // Make function async
    const { nickname, lat, lon } = req.body;
    let adminDong = null; // Variable to store the administrative dong

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

        // 1. 데이터베이스에 저장하기 전에 UUID를 생성합니다.
        const userId = uuidv4();

        // 2. 사용자 위치 기반으로 행정동 주소를 가져옵니다.
        // getAdminDongAddress는 경도(lon)를 먼저, 위도(lat)를 다음으로 받습니다.
        adminDong = await getAdminDongAddress(lon, lat);

        // 3. INSERT 문에 id 필드와 admin_dong 필드를 추가합니다.
        //    (users 테이블의 id 컬럼 타입은 TEXT 또는 VARCHAR, admin_dong은 TEXT여야 합니다)
        //    onboarding 시 last_active_at 필드도 추가합니다.
        const stmt = db.prepare('INSERT INTO users (id, nickname, lat, lon, admin_dong, last_active_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)');
        
        // 4. run() 메서드에 생성한 userId와 adminDong을 전달합니다.
        //    last_active_at는 CURRENT_TIMESTAMP로 자동 설정되므로 별도로 전달할 필요가 없습니다.
        stmt.run(userId, nickname, lat, lon, adminDong);

        res.status(201).json({
            message: 'User onboarded successfully!',
            // 5. 생성된 userId와 adminDong을 응답으로 보냅니다.
            userId: userId,
            nickname,
            lat,
            lon,
            adminDong // Include the administrative dong in the response
        });
    } catch (error) {
        console.error('Error onboarding user:', error.message);
        res.status(500).json({ message: 'Error onboarding user.', error: error.message });
    }
};

// 사용자 위치 업데이트 (새로 접속할 때마다 호출될 수 있음)
const updateUserLocation = async (req, res) => { // Make function async
    const { userId, lat, lon } = req.body;
    let adminDong = null; // Variable to store the administrative dong

    if (!userId || typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({ message: 'User ID, latitude, and longitude are required.' });
    }

    try {
        const db = getDb();

        // 사용자 위치 기반으로 행정동 주소를 가져옵니다.
        adminDong = await getAdminDongAddress(lon, lat);

        // UPDATE 문에 admin_dong 필드를 추가합니다.
        const stmt = db.prepare('UPDATE users SET lat = ?, lon = ?, admin_dong = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?');
        const info = stmt.run(lat, lon, adminDong, userId);

        if (info.changes > 0) {
            res.json({ 
                message: 'User location and administrative dong updated successfully.',
                adminDong // Include the updated administrative dong in the response
            });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error('Error updating user location:', error.message);
        res.status(500).json({ message: 'Error updating user location.', error: error.message });
    }
};

module.exports = {
    onboardUser,
    updateUserLocation
};