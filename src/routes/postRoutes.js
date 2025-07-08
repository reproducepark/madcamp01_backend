// src/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../config/multerConfig'); // multer 설정 가져오기

// Post 관련 기존 라우트
router.post('/', upload.single('image'), postController.createPost); // 이미지 한 개 업로드
router.get('/nearby', postController.getNearbyPosts);
router.get('/nearbyupper', postController.getNearbyPostsUpper); // 상위 행정동 기준 근처 게시글
router.get('/nearbyviewport', postController.getPostsInViewport); // Rectangular viewport posts
router.get('/user/:userId', postController.getPostsByUserId); // 특정 userId의 게시글 조회
router.get('/:id', postController.getPostById); // 특정 ID의 Post를 가져오는 라우트 추가
router.put('/:id', upload.single('image'), postController.updatePost); // 게시글 수정 (이미지 포함)
router.delete('/:id', postController.deletePost); // 게시글 삭제

router.post('/:postId/comments', postController.createComment); // 특정 게시글에 댓글 작성
router.get('/:postId/comments', postController.getCommentsByPostId); // 특정 게시글의 모든 댓글 조회
router.put('/comments/:commentId', postController.updateComment); // 댓글 수정
router.delete('/comments/:commentId', postController.deleteComment); // 댓글 삭제

router.post('/:postId/likes', postController.toggleLike); // 특정 게시글에 좋아요 토글 (누르면 좋아요, 다시 누르면 좋아요 취소)
router.get('/:postId/likes/count', postController.getLikesCountByPostId); // 특정 게시글의 좋아요 수 조회
router.get('/:postId/likes/status/:userId', postController.getLikeStatusForUser); // 특정 게시물에 대한 특정 사용자의 좋아요 상태 확인

module.exports = router;