// src/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../config/multerConfig'); // multer 설정 가져오기

// 'image'는 클라이언트에서 FormData로 보낼 때의 필드 이름입니다.
router.post('/', upload.single('image'), postController.createPost); // 이미지 한 개 업로드
router.get('/nearby', postController.getNearbyPosts);

module.exports = router;