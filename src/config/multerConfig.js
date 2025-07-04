// src/config/multerConfig.js
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';

// Multer storage 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve(__dirname, '../../', UPLOAD_DIR)); // 이미지 저장될 경로
    },
    filename: (req, file, cb) => {
        // 파일명: 필드이름-현재시간.확장자
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// 파일 필터 (옵션): 이미지 파일만 허용
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB 제한
    }
});

module.exports = upload;