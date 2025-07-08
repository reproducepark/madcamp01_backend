// test/commentAndLikeTests.js
const axios = require('axios');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const crypto = require('crypto'); // MD5 계산을 위해 필요

// --- 설정 (test_api.js와 동일하게 설정하거나 프로젝트에 맞게 조정) ---
const BASE_URL = 'https://api.reproducepark.my/api';
const UPLOAD_BASE_URL = 'https://api.reproducepark.my/uploads'; // 이미지 다운로드 테스트에 필요할 수 있음
const TEST_IMAGE_PATH = path.join(__dirname, 'test.png');
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

const ORIGINAL_IMAGE_MD5 = '1251e844b093eeb27b4452d0c2298d92'; // test.png의 실제 MD5 값으로 업데이트하세요

// 테스트 사용자 및 게시글 데이터 (이 테스트 파일 내에서 독립적으로 사용)
const testUser = {
    nickname: 'comment_like_test_user_' + Date.now(),
    lat: 36.3504,
    lon: 127.3845
};

const testPost = {
    title: '댓글/좋아요 테스트 게시글',
    content: '댓글과 좋아요 기능 테스트를 위한 게시글입니다.',
    lat: 36.3510,
    lon: 127.3850
};

// --- 유틸리티 함수 (test_api.js에서 복사하여 사용) ---

/**
 * 일반적인 API 요청 에러를 처리합니다.
 * @param {Error} error - axios에서 발생한 에러 객체.
 */
function handleApiError(error) {
    console.error('\n--- API 에러 발생 ---');
    if (error.response) {
        console.error('상태 코드:', error.response.status);
        console.error('응답 데이터:', error.response.data);
    } else if (error.request) {
        console.error('응답을 받지 못했습니다 (네트워크 문제 등):', error.request);
    } else {
        console.error('요청 설정 중 에러 발생:', error.message);
    }
    throw error;
}

/**
 * 사용자 온보딩을 수행합니다.
 */
async function onboardUser(userData) {
    try {
        const response = await axios.post(`${BASE_URL}/auth/onboard`, userData, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 이미지를 포함한 새 글을 작성합니다.
 */
async function createPostWithImage(userId, postData, imagePath) {
    try {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('title', postData.title);
        formData.append('content', postData.content);
        formData.append('lat', postData.lat);
        formData.append('lon', postData.lon);
        formData.append('image', fs.createReadStream(imagePath));

        const response = await axios.post(`${BASE_URL}/posts`, formData, {
            headers: { ...formData.getHeaders() }
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 특정 ID의 글을 조회합니다.
 */
async function getPostByIdTest(postId) {
    try {
        const response = await axios.get(`${BASE_URL}/posts/${postId}`);
        return response.data;
    } catch (error) {
        // 404 에러는 글이 삭제되었을 때 예상되는 결과이므로 throw하지 않음
        if (error.response && error.response.status === 404) {
            return null; // 게시글이 없음을 나타냄
        }
        handleApiError(error);
    }
}


/**
 * 게시글을 삭제합니다. (댓글 및 좋아요 삭제 후 클린업에 사용)
 */
async function deletePostTest(postId, userId) {
    try {
        const response = await axios.delete(`${BASE_URL}/posts/${postId}`, {
            data: { userId: userId },
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}


// --- 댓글 및 좋아요 테스트 함수 ---

async function runCommentAndLikeTests() {
    let userId = null;
    let createdPostId = null;
    let createdCommentId = null;

    console.log('\n--- 댓글 및 좋아요 API 테스트 시작 ---');
    console.log(`테스트 사용자 닉네임: ${testUser.nickname}`);

    if (!fs.existsSync(TEST_IMAGE_PATH)) {
        console.error(`\n--- 오류: ${TEST_IMAGE_PATH} 파일이 없습니다. 테스트를 위해 이미지를 추가해주세요! ---`);
        process.exit(1);
    }

    try {
        // 사전 작업: 사용자 온보딩 및 테스트 게시글 생성
        console.log('\n[사전 작업] 사용자 온보딩 및 테스트 게시글 생성...');
        const onboardResult = await onboardUser(testUser);
        userId = onboardResult.userId;
        console.log(`테스트 사용자 ID: ${userId}`);

        const postResult = await createPostWithImage(userId, testPost, TEST_IMAGE_PATH);
        createdPostId = postResult.postId;
        console.log(`테스트 게시글 ID: ${createdPostId}`);
        console.log('[사전 작업 완료]\n');


        // --- 테스트 9: 댓글 생성 ---
        console.log('--- 9. 댓글 생성 테스트 ---');
        try {
            const commentContent = '이것은 Node.js 테스트 댓글입니다!';
            const response = await axios.post(`${BASE_URL}/posts/${createdPostId}/comments`, {
                userId: userId,
                content: commentContent
            });
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 201, '댓글 생성은 201 상태 코드를 반환해야 합니다.');
            assert.ok(response.data.commentId, '생성된 댓글의 ID가 반환되어야 합니다.');
            assert.strictEqual(response.data.postId, createdPostId, '댓글이 올바른 게시글에 연결되어야 합니다.');
            assert.strictEqual(response.data.userId, userId, '댓글 작성자 ID가 일치해야 합니다.');
            assert.strictEqual(response.data.content, commentContent, '댓글 내용이 일치해야 합니다.');
            createdCommentId = response.data.commentId;
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 댓글 생성');
            handleApiError(error);
        }

        // --- 테스트 10: 특정 게시글의 댓글 조회 ---
        console.log('\n--- 10. 특정 게시글의 댓글 조회 테스트 ---');
        try {
            const response = await axios.get(`${BASE_URL}/posts/${createdPostId}/comments`);
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '댓글 조회는 200 상태 코드를 반환해야 합니다.');
            assert.ok(Array.isArray(response.data.comments), '댓글 목록은 배열이어야 합니다.');
            assert.ok(response.data.comments.length > 0, '최소한 하나의 댓글이 조회되어야 합니다.');
            assert.strictEqual(response.data.comments[0].id, createdCommentId, '조회된 댓글 ID가 생성된 댓글 ID와 일치해야 합니다.');
            assert.ok(response.data.comments[0].nickname, '댓글 작성자 닉네임이 조회되어야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 특정 게시글의 댓글 조회');
            handleApiError(error);
        }

        // --- 테스트 11: 댓글 수정 ---
        console.log('\n--- 11. 댓글 수정 테스트 ---');
        try {
            const updatedCommentContent = '댓글 내용이 수정되었습니다.';
            const response = await axios.put(`${BASE_URL}/posts/comments/${createdCommentId}`, {
                userId: userId,
                content: updatedCommentContent
            });
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '댓글 수정은 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.message, 'Comment updated successfully!', '댓글 수정 성공 메시지가 일치해야 합니다.');

            // 수정된 댓글 내용 확인을 위해 다시 조회
            const commentsResponse = await axios.get(`${BASE_URL}/posts/${createdPostId}/comments`);
            const updatedComment = commentsResponse.data.comments.find(c => c.id === createdCommentId);
            assert.strictEqual(updatedComment.content, updatedCommentContent, '댓글 내용이 성공적으로 업데이트되어야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 댓글 수정');
            handleApiError(error);
        }

        // --- 테스트 12: 좋아요 토글 (좋아요 누르기) ---
        console.log('\n--- 12. 좋아요 토글 테스트 (좋아요 누르기) ---');
        try {
            const response = await axios.post(`${BASE_URL}/posts/${createdPostId}/likes`, {
                userId: userId
            });
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 201, '좋아요 추가는 201 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.message, 'Like added successfully!', '좋아요 추가 성공 메시지가 일치해야 합니다.');
            assert.strictEqual(response.data.liked, true, '좋아요 상태가 true여야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 좋아요 토글 (좋아요 누르기)');
            handleApiError(error);
        }

        // --- 테스트 13: 좋아요 수 조회 ---
        console.log('\n--- 13. 좋아요 수 조회 테스트 ---');
        try {
            const response = await axios.get(`${BASE_URL}/posts/${createdPostId}/likes/count`);
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '좋아요 수 조회는 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.likeCount, 1, '좋아요 수가 1이어야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 좋아요 수 조회');
            handleApiError(error);
        }

        // --- 테스트 14: 특정 사용자의 좋아요 상태 확인 ---
        console.log('\n--- 14. 특정 사용자의 좋아요 상태 확인 테스트 ---');
        try {
            const response = await axios.get(`${BASE_URL}/posts/${createdPostId}/likes/status/${userId}`);
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '좋아요 상태 확인은 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.liked, true, '사용자가 좋아요를 눌렀으므로 liked는 true여야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 특정 사용자의 좋아요 상태 확인');
            handleApiError(error);
        }

        // --- 테스트 15: 좋아요 토글 (좋아요 취소) ---
        console.log('\n--- 15. 좋아요 토글 테스트 (좋아요 취소) ---');
        try {
            const response = await axios.post(`${BASE_URL}/posts/${createdPostId}/likes`, {
                userId: userId
            });
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '좋아요 취소는 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.message, 'Like removed successfully!', '좋아요 취소 성공 메시지가 일치해야 합니다.');
            assert.strictEqual(response.data.liked, false, '좋아요 상태가 false여야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 좋아요 토글 (좋아요 취소)');
            handleApiError(error);
        }

        // --- 테스트 16: 좋아요 취소 후 좋아요 수 재확인 ---
        console.log('\n--- 16. 좋아요 취소 후 좋아요 수 재확인 테스트 ---');
        try {
            const response = await axios.get(`${BASE_URL}/posts/${createdPostId}/likes/count`);
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '좋아요 수 조회는 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.likeCount, 0, '좋아요 취소 후 좋아요 수가 0이어야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 좋아요 취소 후 좋아요 수 재확인');
            handleApiError(error);
        }

        // --- 테스트 17: 좋아요 취소 후 특정 사용자의 좋아요 상태 재확인 ---
        console.log('\n--- 17. 좋아요 취소 후 특정 사용자의 좋아요 상태 재확인 테스트 ---');
        try {
            const response = await axios.get(`${BASE_URL}/posts/${createdPostId}/likes/status/${userId}`);
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '좋아요 상태 확인은 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.liked, false, '사용자가 좋아요를 취소했으므로 liked는 false여야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 좋아요 취소 후 특정 사용자의 좋아요 상태 재확인');
            handleApiError(error);
        }

        // --- 테스트 18: 댓글 삭제 ---
        console.log('\n--- 18. 댓글 삭제 테스트 ---');
        try {
            const response = await axios.delete(`${BASE_URL}/posts/comments/${createdCommentId}`, {
                data: { userId: userId },
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('  응답:', response.data);
            assert.strictEqual(response.status, 200, '댓글 삭제는 200 상태 코드를 반환해야 합니다.');
            assert.strictEqual(response.data.message, 'Comment deleted successfully!', '댓글 삭제 성공 메시지가 일치해야 합니다.');

            // 삭제된 댓글이 없는지 확인하기 위해 다시 조회
            const commentsResponse = await axios.get(`${BASE_URL}/posts/${createdPostId}/comments`);
            const deletedComment = commentsResponse.data.comments.find(c => c.id === createdCommentId);
            assert.strictEqual(deletedComment, undefined, '삭제된 댓글은 조회되지 않아야 합니다.');
            console.log('  테스트 성공!');
        } catch (error) {
            console.error('  테스트 실패: 댓글 삭제');
            handleApiError(error);
        }

        console.log('\n--- 댓글 및 좋아요 API 모든 테스트 성공적으로 완료! ---');

    } catch (error) {
        console.error('\n--- 하나 이상의 댓글 또는 좋아요 테스트가 실패했습니다! ---');
        process.exit(1);
    } finally {
        // 테스트 후 생성된 리소스 정리 (게시글 삭제)
        if (createdPostId && userId) {
            console.log(`\n[클린업] 테스트 게시글 (ID: ${createdPostId}) 삭제...`);
            await deletePostTest(createdPostId, userId);
            console.log('[클린업 완료]');
        }
    }
}

// 테스트 실행
runCommentAndLikeTests();