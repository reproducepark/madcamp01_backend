// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDb } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR_PUBLIC_PATH = process.env.UPLOAD_DIR || './public/uploads';

// 미들웨어 설정
app.use(cors()); // CORS 허용 (개발 시 필요)
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 본문 파싱

// 정적 파일 제공 (업로드된 이미지를 웹에서 접근 가능하게 함)
app.use('/uploads', express.static(path.resolve(__dirname, '../../', UPLOAD_DIR_PUBLIC_PATH)));

// 데이터베이스 연결
connectDb();

// 라우터 설정
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// 기본 라우트
app.get('/', (req, res) => {
    res.send('Welcome to the Neighborhood SNS Backend!');
});

// 전역 에러 핸들러 (선택 사항, 자세한 에러 처리를 위해 추가할 수 있음)
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something broke!');
// });


// 서버 시작
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Image uploads served from http://localhost:${PORT}/uploads`);
});