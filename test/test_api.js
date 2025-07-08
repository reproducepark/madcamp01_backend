// test/test_api.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const { title } = require('process');

// 설정
const BASE_URL = 'https://api.reproducepark.my/api';
const UPLOAD_BASE_URL = 'https://api.reproducepark.my/uploads';
const TEST_IMAGE_PATH = path.join(__dirname, 'test.png');
const TEST_IMAGE_PATH_2 = path.join(__dirname, 'test2.png'); // 추가: 새로운 테스트 이미지
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

const ORIGINAL_IMAGE_MD5 = '1251e844b093eeb27b4452d0c2298d92'; // Make sure this is the actual MD5 of your test.png
const SECOND_IMAGE_MD5 = '6e21bd51dae43464dbbd7d58bcebd8e0'; // Replace with actual MD5 of test2.png if it exists

// 테스트 데이터
const testUser = {
    nickname: 'nodejs_test_user_' + Date.now(),
    lat: 36.3504,
    lon: 127.3845
};

const testPost = {
    title: 'Node.js 테스트 글',
    content: 'Node.js 스크립트에서 작성한 테스트 글입니다!',
    lat: 36.3510,
    lon: 127.3850
};

// --- API 클라이언트 함수들 ---

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
    console.log('--- 1. 사용자 온보딩 테스트 ---');
    try {
        const response = await axios.post(`${BASE_URL}/auth/onboard`, userData, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('온보딩 응답:', response.data);
        assert.ok(response.data.userId, '온보딩 후 사용자 ID가 반환되어야 합니다.');
        assert.ok(response.data.adminDong, '온보딩 후 adminDong이 반환되어야 합니다.');
        console.log(`획득한 userId: ${response.data.userId}`);
        console.log(`획득한 adminDong: ${response.data.adminDong}`);
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
    console.log('\n--- 2. 글 작성 테스트 (이미지 포함) ---');
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

        const {
            title: createdTitle,
            content: createdContent,
            imageUrl: createdImageUrl,
            adminDong: createdAdminDong,
        } = response.data;

        console.log(`작성된 글 제목 확인:, ${createdTitle}`);
        console.log(`작성된 글 내용 확인: ${createdContent}`);
        console.log(`작성된 이미지 URL 확인: ${createdImageUrl}`);
        console.log(`작성된 글의 행정동 확인: ${createdAdminDong}`);

        // 응답 데이터 검증
        assert.strictEqual(createdTitle, postData.title, '글 제목이 일치해야 합니다.');
        assert.strictEqual(createdContent, postData.content, '글 내용이 일치해야 합니다.');
        assert.ok(createdImageUrl, '이미지 URL이 존재해야 합니다.');
        assert.ok(createdAdminDong, '작성된 글에 행정동이 존재해야 합니다.');

        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 특정 ID의 글을 조회합니다.
 * @param {number} postId - 조회할 글의 ID.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function getPostByIdTest(postId) {
    console.log(`\n--- 3. 특정 ID의 글 조회 테스트 (ID: ${postId}) ---`);
    try {
        const response = await axios.get(`${BASE_URL}/posts/${postId}`);
        console.log('특정 글 조회 응답:', JSON.stringify(response.data, null, 2));

        // 응답 데이터 검증
        assert.ok(response.data.id, '글 ID가 존재해야 합니다.');
        assert.strictEqual(response.data.id, postId, '조회된 글의 ID가 요청한 ID와 일치해야 합니다.');
        assert.ok(response.data.user_id, '사용자 ID가 존재해야 합니다.');
        assert.ok(response.data.title, '글 제목이 존재해야 합니다.');
        assert.ok(response.data.content, '글 내용이 존재해야 합니다.');
        assert.ok(response.data.admin_dong, '행정동이 존재해야 합니다.');
        assert.ok(response.data.created_at, '생성일시가 존재해야 합니다.');
        assert.ok(response.data.nickname, '작성자 닉네임이 존재해야 합니다.');

        console.log('특정 ID의 글 조회 테스트 성공!');
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 현재 위치를 기반으로 근처 동네 글을 조회합니다.
 * @param {number} lat - 현재 위도.
 * @param {number} lon - 현재 경도.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function getNearbyPosts(lat, lon) {
    console.log('\n--- 4. 근처 동네 글 조회 테스트 ---');
    try {
        const response = await axios.get(`${BASE_URL}/posts/nearby`, {
            params: { currentLat: lat, currentLon: lon }
        });
        console.log('근처 글 조회 응답:', JSON.stringify(response.data, null, 2));

        assert.ok(typeof response.data === 'object' && response.data !== null, '응답은 객체여야 합니다.');
        assert.ok(response.data.message, '응답에 message 필드가 있어야 합니다.');
        assert.ok(response.data.yourLocation, '응답에 yourLocation 필드가 있어야 합니다.');
        assert.ok(response.data.yourAdminDong !== undefined, '응답에 yourAdminDong 필드가 있어야 합니다.');
        assert.ok(Array.isArray(response.data.nearbyPosts), 'nearbyPosts는 배열이어야 합니다.');

        if (response.data.nearbyPosts.length > 0) {
            console.log(`첫 번째 근처 글 제목: ${response.data.nearbyPosts[0].title}`);
            assert.ok(response.data.nearbyPosts[0].title, '첫 번째 게시물에 제목이 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].id, '첫 번째 게시물에 ID가 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].nickname, '첫 번째 게시물에 닉네임이 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].admin_dong, '첫 번째 게시물에 행정동 정보가 있어야 합니다.');
        } else {
            console.log('근처에 게시물이 없습니다.');
        }

        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 현재 위치를 기반으로 상위 행정동의 글을 조회합니다.
 * @param {number} lat - 현재 위도.
 * @param {number} lon - 현재 경도.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function getNearbyPostsUpper(lat, lon) {
    console.log('\n--- 4-1. 상위 행정동 근처 글 조회 테스트 ---');
    try {
        const response = await axios.get(`${BASE_URL}/posts/nearbyupper`, {
            params: { currentLat: lat, currentLon: lon }
        });
        console.log('상위 행정동 근처 글 조회 응답:', JSON.stringify(response.data, null, 2));

        assert.ok(typeof response.data === 'object' && response.data !== null, '응답은 객체여야 합니다.');
        assert.ok(response.data.message, '응답에 message 필드가 있어야 합니다.');
        assert.ok(response.data.yourLocation, '응답에 yourLocation 필드가 있어야 합니다.');
        assert.ok(response.data.yourUpperAdminDong !== undefined, '응답에 yourUpperAdminDong 필드가 있어야 합니다.');
        assert.ok(Array.isArray(response.data.nearbyPosts), 'nearbyPosts는 배열이어야 합니다.');

        if (response.data.nearbyPosts.length > 0) {
            console.log(`첫 번째 상위 행정동 근처 글 제목: ${response.data.nearbyPosts[0].title}`);
            assert.ok(response.data.nearbyPosts[0].title, '첫 번째 게시물에 제목이 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].id, '첫 번째 게시물에 ID가 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].nickname, '첫 번째 게시물에 닉네임이 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].admin_dong, '첫 번째 게시물에 행정동 정보가 있어야 합니다.');
            assert.ok(response.data.nearbyPosts[0].upper_admin_dong, '첫 번째 게시물에 상위 행정동 정보가 있어야 합니다.');
            // Additional check: Ensure posts are indeed from the same upper admin dong if it's available
            if (response.data.yourUpperAdminDong && response.data.yourUpperAdminDong !== "API 호출 중 오류가 발생했거나 API 키가 설정되지 않았습니다." && response.data.yourUpperAdminDong !== "상위 행정동 주소를 찾을 수 없습니다.") {
                const allPostsMatchUpperDong = response.data.nearbyPosts.every(
                    post => post.upper_admin_dong === response.data.yourUpperAdminDong
                );
                assert.ok(allPostsMatchUpperDong, '모든 근처 게시물이 요청된 상위 행정동과 일치해야 합니다.');
            }
        } else {
            console.log('상위 행정동 근처에 게시물이 없습니다.');
        }

        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}


/**
 * 사용자의 위치를 업데이트합니다.
 * @param {string} userId - 업데이트할 사용자의 ID.
 * @param {number} newLat - 새 위도.
 * @param {number} newLon - 새 경도.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function updateUserLocation(userId, newLat, newLon) {
    console.log('\n--- 5. 사용자 위치 업데이트 테스트 ---');
    try {
        const response = await axios.post(`${BASE_URL}/auth/update-location`, {
            userId: userId,
            lat: newLat,
            lon: newLon
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('업데이트된 행정동:', response.data.adminDong);
        assert.ok(response.data.adminDong, '업데이트된 행정동이 존재해야 합니다.');
        // Additionally, check for upper_admin_dong in the update response if your API returns it
        // assert.ok(response.data.upperAdminDong, '업데이트된 상위 행정동이 존재해야 합니다.');
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 주어진 파일의 MD5 해시를 계산합니다.
 * @param {string} filePath - 해시를 계산할 파일의 경로.
 * @returns {Promise<string>} - 파일의 MD5 해시 값.
 */
function calculateFileMD5(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (chunk) => {
            hash.update(chunk);
        });

        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 주어진 URL에서 이미지를 다운로드하고 로컬에 저장하며, MD5 해시를 검증합니다.
 * @param {string} imageUrl - 다운로드할 이미지의 전체 URL.
 * @param {string} outputDir - 이미지를 저장할 로컬 디렉토리 경로.
 * @param {string} expectedMd5 - 기대하는 MD5 해시 값.
 * @returns {Promise<string>} - 다운로드된 파일의 전체 경로.
 */
async function downloadImageAndVerifyMD5(imageUrl, outputDir, expectedMd5) {
    console.log('\n--- 6. 이미지 다운로드 및 MD5 검증 테스트 ---');
    try {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const fileName = path.basename(new URL(imageUrl).pathname);
        const localFilePath = path.join(outputDir, fileName);

        console.log(`이미지 다운로드 시도: ${imageUrl} -> ${localFilePath}`);

        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(localFilePath);
        response.data.pipe(writer);

        return new Promise(async (resolve, reject) => {
            writer.on('finish', async () => {
                console.log(`이미지 다운로드 성공: ${localFilePath}`);

                // 다운로드된 파일의 MD5 해시 계산
                try {
                    const downloadedFileMD5 = await calculateFileMD5(localFilePath);
                    console.log(`원본 MD5: ${expectedMd5}`);
                    console.log(`다운로드된 파일 MD5: ${downloadedFileMD5}`);

                    // MD5 값 비교
                    assert.strictEqual(downloadedFileMD5, expectedMd5, '다운로드된 파일의 MD5 해시가 원본과 일치해야 합니다.');
                    console.log('MD5 해시 검증 성공!');
                    resolve(localFilePath);
                } catch (md5Error) {
                    console.error(`MD5 해시 계산 또는 비교 중 오류 발생: ${md5Error.message}`);
                    fs.unlink(localFilePath, () => reject(md5Error)); // 에러 발생 시 파일 삭제
                }
            });
            writer.on('error', (err) => {
                console.error(`이미지 다운로드 중 오류 발생: ${err.message}`);
                fs.unlink(localFilePath, () => reject(err));
            });
        });
    } catch (error) {
        console.error(`이미지 다운로드 및 MD5 검증 테스트 실패: ${error.message}`);
        handleApiError(error);
    }
}

/**
 * 게시글을 수정합니다.
 * @param {number} postId - 수정할 게시글의 ID.
 * @param {string} userId - 게시글을 수정하는 사용자의 ID.
 * @param {object} updateData - 업데이트할 게시글 데이터 (title, content, image_url_delete_flag, image_url_update_flag).
 * @param {string|null} imagePath - 새로운 이미지 파일 경로 (이미지 업데이트 시).
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function updatePostTest(postId, userId, updateData, imagePath = null) {
    console.log(`\n--- 7. 게시글 수정 테스트 (ID: ${postId}) ---`);
    try {
        const formData = new FormData();
        formData.append('userId', userId);
        if (updateData.title !== undefined) formData.append('title', updateData.title);
        if (updateData.content !== undefined) formData.append('content', updateData.content);
        if (updateData.image_url_delete_flag) {
            formData.append('image_url_delete_flag', 'true');
        } else if (updateData.image_url_update_flag && imagePath) {
            formData.append('image_url_update_flag', 'true');
            formData.append('image', fs.createReadStream(imagePath));
        }
        console.log('수정할 게시글 데이터:', formData);
        const response = await axios.put(`${BASE_URL}/posts/${postId}`, formData, {
            headers: { ...formData.getHeaders() }
        });
        console.log('게시글 수정 응답:', response.data);

        assert.strictEqual(response.status, 200, '게시글 수정은 성공 시 200 상태 코드를 반환해야 합니다.');
        assert.strictEqual(response.data.message, 'Post updated successfully!', '성공 메시지가 일치해야 합니다.');
        assert.strictEqual(Number(response.data.postId), postId, '응답의 게시글 ID가 요청한 ID와 일치해야 합니다.');

        // 수정된 게시글을 다시 조회하여 내용이 업데이트되었는지 확인
        const updatedPost = await getPostByIdTest(postId);
        if (updateData.title !== undefined) {
            assert.strictEqual(updatedPost.title, updateData.title, '게시글 제목이 성공적으로 업데이트되어야 합니다.');
        }
        if (updateData.content !== undefined) {
            assert.strictEqual(updatedPost.content, updateData.content, '게시글 내용이 성공적으로 업데이트되어야 합니다.');
        }
        if (updateData.image_url_delete_flag) {
            assert.strictEqual(updatedPost.image_url, null, '이미지 삭제 플래그가 true일 때 image_url은 null이어야 합니다.');
        } else if (updateData.image_url_update_flag && imagePath) {
            assert.ok(updatedPost.image_url.includes(path.basename(imagePath)), '이미지 URL이 새로운 이미지로 업데이트되어야 합니다.');
        }

        console.log('게시글 수정 테스트 성공!');
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 게시글을 삭제합니다.
 * @param {number} postId - 삭제할 게시글의 ID.
 * @param {string} userId - 게시글을 삭제하는 사용자의 ID.
 * @returns {Promise<object>} - API 응답 데이터.
 */
async function deletePostTest(postId, userId) {
    console.log(`\n--- 8. 게시글 삭제 테스트 (ID: ${postId}) ---`);
    try {
        const response = await axios.delete(`${BASE_URL}/posts/${postId}`, {
            data: { userId: userId }, // DELETE 요청 시 body에 데이터 전송
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('게시글 삭제 응답:', response.data);

        assert.strictEqual(response.status, 200, '게시글 삭제는 성공 시 200 상태 코드를 반환해야 합니다.');
        assert.strictEqual(response.data.message, 'Post deleted successfully!', '성공 메시지가 일치해야 합니다.');
        assert.strictEqual(response.data.postId, postId, '응답의 게시글 ID가 요청한 ID와 일치해야 합니다.');

        // 삭제된 게시글을 다시 조회하여 존재하지 않는지 확인
        try {
            await getPostByIdTest(postId);
            assert.fail('삭제된 게시글이 여전히 존재합니다.');
        } catch (error) {
            assert.strictEqual(error.response.status, 404, '삭제된 게시글은 404를 반환해야 합니다.');
            console.log('게시글이 성공적으로 삭제되었음을 확인했습니다 (404 응답).');
        }

        console.log('게시글 삭제 테스트 성공!');
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}


// --- 테스트 실행기 ---

async function runAllTests() {
    let userId = null;
    let createdPostId = null;
    let createdImageUrl = null;

    console.log('--- API 테스트 시작 ---');
    console.log(`기본 URL: ${BASE_URL}`);
    console.log(`테스트 사용자 닉네임: ${testUser.nickname}`);

    if (ORIGINAL_IMAGE_MD5 === 'YOUR_TEST_PNG_MD5_HASH_HERE') {
        console.error('\n--- 오류: ORIGINAL_IMAGE_MD5 값을 test.png의 실제 MD5 값으로 업데이트하세요! ---');
        process.exit(1);
    }
    // test2.png가 있다면 MD5를 확인하거나 적절한 값을 설정하세요.
    if (!fs.existsSync(TEST_IMAGE_PATH_2)) {
         console.warn(`경고: ${TEST_IMAGE_PATH_2} 파일이 없습니다. 이미지 업데이트 테스트가 제한될 수 있습니다.`);
    }


    try {
        // 테스트 1: 사용자 온보딩
        const onboardResult = await onboardUser(testUser);
        userId = onboardResult.userId;

        // 테스트 2: 이미지를 포함한 글 작성
        const postResult = await createPostWithImage(userId, testPost, TEST_IMAGE_PATH);
        createdPostId = postResult.postId;
        createdImageUrl = postResult.imageUrl;

        // 테스트 3: 특정 ID의 글 조회
        if (createdPostId) {
            await getPostByIdTest(createdPostId);
        } else {
            console.warn('생성된 글 ID가 없어 특정 ID의 글 조회 테스트를 건너뜁니다.');
        }

        // 테스트 4: 근처 글 조회
        await getNearbyPosts(testPost.lat, testPost.lon);

        // 새 테스트 4-1: 상위 행정동 근처 글 조회
        await getNearbyPostsUpper(testPost.lat, testPost.lon);


        // 테스트 5: 사용자 위치 업데이트
        await updateUserLocation(userId, 36.3000, 127.3780);

        // 테스트 6: 업로드된 이미지 다운로드 및 MD5 검증
        if (createdImageUrl) {
            const fullImageUrl = `${UPLOAD_BASE_URL}/${path.basename(new URL(createdImageUrl).pathname)}`;
            await downloadImageAndVerifyMD5(fullImageUrl, DOWNLOAD_DIR, ORIGINAL_IMAGE_MD5);
        } else {
            console.warn('이미지 URL이 없어 이미지 다운로드 및 MD5 검증 테스트를 건너뜁니다.');
        }

        // --- 새로 추가된 테스트 ---

        // 테스트 7-1: 게시글 내용만 수정 (이미지 유지)
        await updatePostTest(createdPostId, userId, {
            title: 'Node.js 테스트 글 (수정됨)',
            content: '내용이 수정되었습니다. 이미지 유지.',
        });

        // 테스트 7-2: 게시글 이미지 삭제
        await updatePostTest(createdPostId, userId, {
            content: '이미지 삭제됨',
            image_url_delete_flag: true
        });

        // 테스트 7-3: 게시글 이미지와 내용 모두 업데이트 (새 이미지로 변경)
        if (fs.existsSync(TEST_IMAGE_PATH_2)) {
            await updatePostTest(createdPostId, userId, {
                title: 'Node.js 테스트 글 (완전히 수정됨)',
                content: '내용과 이미지가 모두 수정되었습니다.',
                image_url_update_flag: true
            }, TEST_IMAGE_PATH_2);

            // 업데이트된 이미지 MD5 검증 (선택 사항, 필요시 활성화)
            const updatedPostData = await getPostByIdTest(createdPostId);
            const updatedFullImageUrl = `${UPLOAD_BASE_URL}/${path.basename(new URL(updatedPostData.image_url).pathname)}`;
            await downloadImageAndVerifyMD5(updatedFullImageUrl, DOWNLOAD_DIR, SECOND_IMAGE_MD5);
        } else {
            console.warn('test2.png 파일이 없어 게시글 이미지 업데이트 테스트를 건너뜁니다.');
        }

        // 테스트 8: 게시글 삭제
        await deletePostTest(createdPostId, userId);

        console.log('\n--- 모든 테스트 성공적으로 완료! ---');

    } catch (error) {
        console.error('\n--- 하나 이상의 테스트가 실패했습니다! ---');
        process.exit(1);
    } finally {
        // 테스트 후 생성된 이미지 파일 정리 (선택 사항)
        // 예를 들어, multer가 업로드 폴더에 파일을 남기는 경우
        // fs.readdirSync(DOWNLOAD_DIR).forEach(file => fs.unlinkSync(path.join(DOWNLOAD_DIR, file)));
    }
}

// 테스트 실행
runAllTests();