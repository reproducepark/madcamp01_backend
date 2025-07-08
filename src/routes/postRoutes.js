// src/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../config/multerConfig'); // multer 설정 가져오기

// 'image'는 클라이언트에서 FormData로 보낼 때의 필드 이름입니다.
router.post('/', upload.single('image'), postController.createPost); // 이미지 한 개 업로드
router.get('/nearby', postController.getNearbyPosts);
router.get('/nearbyupper', postController.getNearbyPostsUpper); // 상위 행정동 기준 근처 게시글
router.get('/nearbyviewport', postController.getPostsInViewport); // Rectangular viewport posts
router.get('/user/:userId', postController.getPostsByUserId); // 특정 userId의 게시글 조회
router.get('/:id', postController.getPostById); // 특정 ID의 Post를 가져오는 라우트 추가
router.put('/:id', upload.single('image'), postController.updatePost); // 게시글 수정 (이미지 포함)
router.delete('/:id', postController.deletePost); // 게시글 삭제

module.exports = router;