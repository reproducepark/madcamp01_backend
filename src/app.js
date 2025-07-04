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
const SERVER_HOST = process.env.SERVER_IP || `localhost`; // .env에서 서버 IP를 가져오고, 없으면 localhost 사용
const UPLOAD_DIR_PUBLIC_PATH = './public/uploads';

// 미들웨어 설정
app.use(cors()); // CORS 허용 (개발 시 필요)
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL-encoded 본문 파싱

// // 정적 파일 제공 (업로드된 이미지를 웹에서 접근 가능하게 함)
const resolvedUploadPath = path.resolve(__dirname, '../', UPLOAD_DIR_PUBLIC_PATH);
console.log('Resolved Upload Path:', resolvedUploadPath); // 이 경로를 확인!
app.use('/uploads', express.static(resolvedUploadPath));

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
    console.log(`Server running on http://${SERVER_HOST}:${PORT}`);
    console.log(`Uploads can be accessed at http://${SERVER_HOST}:${PORT}/uploads`);
});