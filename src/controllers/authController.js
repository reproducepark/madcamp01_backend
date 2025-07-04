// src/controllers/authController.js
const { getDb } = require('../config/db');
// uuid 라이브러리를 상단에 추가합니다.
const { v4: uuidv4 } = require('uuid');

const onboardUser = (req, res) => {
    const { nickname, lat, lon } = req.body;

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

        // 2. INSERT 문에 id 필드를 추가합니다.
        //    (users 테이블의 id 컬럼 타입은 TEXT 또는 VARCHAR여야 합니다)
        const stmt = db.prepare('INSERT INTO users (id, nickname, lat, lon) VALUES (?, ?, ?, ?)');
        
        // 3. run() 메서드에 생성한 userId를 전달합니다.
        stmt.run(userId, nickname, lat, lon);

        res.status(201).json({
            message: 'User onboarded successfully!',
            // 4. 생성된 userId를 응답으로 보냅니다.
            userId: userId,
            nickname,
            lat,
            lon
        });
    } catch (error) {
        console.error('Error onboarding user:', error.message);
        res.status(500).json({ message: 'Error onboarding user.', error: error.message });
    }
};

// 사용자 위치 업데이트 (새로 접속할 때마다 호출될 수 있음)
const updateUserLocation = (req, res) => {
    const { userId, lat, lon } = req.body;

    if (!userId || typeof lat !== 'number' || typeof lon !== 'number') {
        return res.status(400).json({ message: 'User ID, latitude, and longitude are required.' });
    }

    try {
        const db = getDb();
        const stmt = db.prepare('UPDATE users SET lat = ?, lon = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?');
        const info = stmt.run(lat, lon, userId);

        if (info.changes > 0) {
            res.json({ message: 'User location updated successfully.' });
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