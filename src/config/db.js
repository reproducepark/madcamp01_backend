// src/config/db.js
// SQLite 데이터베이스 연결 및 초기화 설정
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/database.sqlite';
const dbFilePath = path.resolve(__dirname, '../../', DB_PATH);

let db;

function connectDb() {
    try {
        db = new Database(dbFilePath);
        console.log(`SQLite database connected to ${dbFilePath}`);
        initializeDb();
    } catch (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1);
    }
}

function initializeDb() {
    const createUsersTableSql = `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            nickname TEXT UNIQUE NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            admin_dong TEXT,
            last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    db.exec(createUsersTableSql);

    const createPostsTableSql = `
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            admin_dong TEXT NOT NULL,
            upper_admin_dong TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `;
    db.exec(createPostsTableSql);

    const createCommentsTableSql = `
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `;
    db.exec(createCommentsTableSql);

    const createLikesTableSql = `
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (post_id, user_id),
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `;
    db.exec(createLikesTableSql);

    console.log('Database tables (users, posts, comments, likes) ensured.');
}

function getDb() {
    if (!db) {
        connectDb();
    }
    return db;
}

module.exports = {
    connectDb,
    getDb
};