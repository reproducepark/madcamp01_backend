// test/test_api_getPostsByUserId.js (또는 기존 test_api.js에 추가)
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const assert = require('assert');

// 설정 (기존 test_api.js와 동일하게 유지)
const BASE_URL = 'https://api.reproducepark.my/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'test.png'); // 이미지가 필요 없는 테스트지만, createPost 함수를 위해 필요할 수 있습니다.

// 테스트 데이터
const testUserForPostsByUserId = {
    nickname: 'posts_by_user_test_user_' + Date.now(),
    lat: 35.961664,
    lon: 127.087993
};

// --- API 클라이언트 함수들 (기존 함수 재사용 또는 필요한 경우 복사) ---

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
 * @param {object} userData - 온보딩할 사용자 데이터 (nickname, lat, lon).
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function onboardUser(userData) {
    console.log(`\n--- 사용자 온보딩 테스트 (닉네임: ${userData.nickname}) ---`);
    try {
        const response = await axios.post(`${BASE_URL}/auth/onboard`, userData, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('온보딩 응답:', response.data);
        assert.ok(response.data.userId, '온보딩 후 사용자 ID가 반환되어야 합니다.');
        assert.ok(response.data.adminDong, '온보딩 후 adminDong이 반환되어야 합니다.');
        console.log(`획득한 userId: ${response.data.userId}`);
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 이미지를 포함한 새 글을 작성합니다.
 * @param {string} userId - 글을 작성하는 사용자의 ID.
 * @param {object} postData - 글 상세 정보 (content, lat, lon).
 * @param {string} imagePath - 이미지 파일 경로.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function createPostWithImage(userId, postData, imagePath) {
    console.log(`\n--- 글 작성 테스트 (제목: ${postData.title}) ---`);
    try {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('title', postData.title);
        formData.append('content', postData.content);
        formData.append('lat', postData.lat);
        formData.append('lon', postData.lon);
        // 이미지가 필수라면 빈 파일이라도 첨부, 아니면 조건부 첨부
        if (fs.existsSync(imagePath)) {
            formData.append('image', fs.createReadStream(imagePath));
        } else {
            console.warn(`경고: 이미지 파일이 없어 첨부하지 않습니다: ${imagePath}`);
        }


        const response = await axios.post(`${BASE_URL}/posts`, formData, {
            headers: { ...formData.getHeaders() }
        });

        const {
            title: createdTitle,
            content: createdContent,
            imageUrl: createdImageUrl,
        } = response.data;

        assert.strictEqual(createdTitle, postData.title, '글 제목이 일치해야 합니다.');
        assert.strictEqual(createdContent, postData.content, '글 내용이 일치해야 합니다.');

        console.log(`글 작성 성공! Post ID: ${response.data.postId}`);
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}


// --- 새로운 테스트 함수: 특정 userId의 게시글 조회 ---

/**
 * 특정 userId에 해당하는 모든 게시글을 조회합니다.
 * @param {string} userId - 조회할 사용자의 ID.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function getPostsByUserIdTest(userId, expectedCount) {
    console.log(`\n--- 9. 특정 userId의 게시글 조회 테스트 (UserID: ${userId}) ---`);
    try {
        const response = await axios.get(`${BASE_URL}/posts/user/${userId}`);
        console.log('게시글 조회 응답:', JSON.stringify(response.data, null, 2));

        assert.ok(response.data.posts, '응답에 posts 배열이 존재해야 합니다.');
        assert.ok(Array.isArray(response.data.posts), 'posts는 배열이어야 합니다.');
        assert.strictEqual(response.data.posts.length, expectedCount, `작성된 게시글의 개수가 ${expectedCount}개여야 합니다.`);

        if (response.data.posts.length > 0) {
            console.log(`첫 번째 게시글 제목: ${response.data.posts[0].title}`);
            assert.ok(response.data.posts[0].id, '게시글에 ID가 존재해야 합니다.');
            assert.ok(response.data.posts[0].title, '게시글에 제목이 존재해야 합니다.');
            assert.ok(response.data.posts[0].nickname, '게시글에 닉네임이 존재해야 합니다.');
            assert.strictEqual(response.data.posts[0].nickname, testUserForPostsByUserId.nickname, '게시글 작성자 닉네임이 일치해야 합니다.');
            assert.ok(response.data.posts[0].admin_dong, '게시글에 행정동이 존재해야 합니다.');
        }

        console.log('특정 userId의 게시글 조회 테스트 성공!');
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}


// --- 테스트 실행기 ---

async function runGetPostsByUserIdTest() {
    let userId = null;
    const numberOfPostsToCreate = 5;
    const createdPostIds = [];

    console.log('--- 특정 userId의 게시글 조회 테스트 시작 ---');
    console.log(`테스트 사용자 닉네임: ${testUserForPostsByUserId.nickname}`);

    try {
        // 1. 사용자 온보딩
        const onboardResult = await onboardUser(testUserForPostsByUserId);
        userId = onboardResult.userId;

        // 2. 해당 userId로 5개의 글 작성
        console.log(`\n--- ${numberOfPostsToCreate}개의 게시글 작성 시작 ---`);
        for (let i = 1; i <= numberOfPostsToCreate; i++) {
            const postData = {
                title: `사용자 테스트 글 ${i}`,
                content: `이것은 ${testUserForPostsByUserId.nickname}이(가) 작성한 ${i}번째 테스트 글입니다.`,
                lat: testUserForPostsByUserId.lat + (i * 0.0001), // 약간 다른 위치로
                lon: testUserForPostsByUserId.lon + (i * 0.0001)
            };
            const postResult = await createPostWithImage(userId, postData, TEST_IMAGE_PATH);
            createdPostIds.push(postResult.postId);
        }
        console.log(`--- ${numberOfPostsToCreate}개의 게시글 작성 완료 ---`);

        // 3. 특정 userId의 게시글 조회 및 검증
        await getPostsByUserIdTest(userId, numberOfPostsToCreate);

        // 4. (선택 사항) 생성된 게시글 정리 (삭제)
        console('\n--- 생성된 게시글 정리 시작 ---');
        for (const postId of createdPostIds) {
            // deletePostTest 함수가 필요합니다. 만약 위의 test_api.js에서 가져오지 않았다면 추가해야 합니다.
            // 여기서는 단순 콘솔 로그로 대체합니다.
            console.log(`게시글 ID ${postId} 삭제 (실제 삭제 로직은 구현 필요)`);
             // 실제로 삭제하려면 deletePostTest 함수를 여기에 호출해야 합니다.
             // 예: await deletePostTest(postId, userId);
        }
        console('--- 생성된 게시글 정리 완료 ---');


        console.log('\n--- 특정 userId의 게시글 조회 테스트 성공적으로 완료! ---');

    } catch (error) {
        console.error('\n--- 특정 userId의 게시글 조회 테스트 실패! ---');
        process.exit(1);
    }
}

// 테스트 실행
runGetPostsByUserIdTest();