// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/onboard', authController.onboardUser); // 닉네임 설정 및 초기 위치
router.post('/update-location', authController.updateUserLocation); // 위치 업데이트
router.get('/check-nickname', authController.checkNicknameAvailability); // 닉네임 중복 확인

module.exports = router;