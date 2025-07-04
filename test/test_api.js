// test_api.js (앞부분은 동일)
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const assert = require('assert');

// 설정
const BASE_URL = 'http://api.reproducepark.my:3000/api';
const UPLOAD_BASE_URL = 'http://api.reproducepark.my:3000/uploads'; // 업로드된 이미지 다운로드 URL
const TEST_IMAGE_PATH = path.join(__dirname, 'test.png');
const DOWNLOAD_DIR = path.join(__dirname, 'downloads'); // 다운로드된 이미지를 저장할 디렉토리

// 테스트 데이터 (고유한 닉네임을 위해 타임스탬프 추가)
const testUser = {
    nickname: 'nodejs_test_user_' + Date.now(),
    lat: 36.3504, // 대전광역시청 근처
    lon: 127.3845
};

const testPost = {
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
        formData.append('content', postData.content);
        formData.append('lat', postData.lat);
        formData.append('lon', postData.lon);
        formData.append('image', fs.createReadStream(imagePath));

        const response = await axios.post(`${BASE_URL}/posts`, formData, {
            headers: { ...formData.getHeaders() }
        });

        const { content: createdContent, imageUrl: createdImageUrl, adminDong: createdAdminDong } = response.data;
        console.log(`작성된 글 내용 확인: ${createdContent}`);
        console.log(`작성된 이미지 URL 확인: ${createdImageUrl}`);
        console.log(`작성된 글의 행정동 확인: ${createdAdminDong}`);

        assert.strictEqual(createdContent, postData.content, '글 내용이 일치해야 합니다.');
        assert.ok(createdImageUrl, '이미지 URL이 존재해야 합니다.');
        assert.ok(createdAdminDong, '작성된 글에 행정동이 존재해야 합니다.');

        return response.data; // imageUrl을 반환하여 다음 테스트에서 사용할 수 있도록 합니다.
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
    console.log('\n--- 3. 근처 동네 글 조회 테스트 ---');
    try {
        const response = await axios.get(`${BASE_URL}/posts/nearby`, {
            params: { currentLat: lat, currentLon: lon }
        });
        console.log('근처 글 조회 응답:', JSON.stringify(response.data, null, 2));

        // 응답 데이터 검증 (객체 형식 및 nearbyPosts 배열 확인)
        assert.ok(typeof response.data === 'object' && response.data !== null, '응답은 객체여야 합니다.');
        assert.ok(response.data.message, '응답에 message 필드가 있어야 합니다.');
        assert.ok(response.data.yourLocation, '응답에 yourLocation 필드가 있어야 합니다.');
        assert.ok(response.data.yourAdminDong, '응답에 yourAdminDong 필드가 있어야 합니다.');
        assert.ok(Array.isArray(response.data.nearbyPosts), 'nearbyPosts는 배열이어야 합니다.');
        
        // 예시로 첫 번째 게시물의 content를 확인 (선택 사항)
        if (response.data.nearbyPosts.length > 0) {
            console.log(`첫 번째 근처 글 내용: ${response.data.nearbyPosts[0].content}`);
            assert.ok(response.data.nearbyPosts[0].content, '첫 번째 게시물에 내용이 있어야 합니다.');
        } else {
            console.log('근처에 게시물이 없습니다.');
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
    console.log('\n--- 4. 사용자 위치 업데이트 테스트 ---');
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
        return response.data;
    } catch (error) {
        handleApiError(error);
    }
}

/**
 * 주어진 URL에서 이미지를 다운로드하고 로컬에 저장합니다.
 * @param {string} imageUrl - 다운로드할 이미지의 전체 URL (예: http://api.reproducepark.my:3000/uploads/image-name.png).
 * @param {string} outputDir - 이미지를 저장할 로컬 디렉토리 경로.
 * @returns {Promise<string>} - 다운로드된 파일의 전체 경로.
 */
async function downloadImage(imageUrl, outputDir) {
    console.log('\n--- 5. 이미지 다운로드 테스트 ---');
    try {
        // 다운로드 디렉토리가 없으면 생성
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // URL에서 파일명 추출. 'uploads/'가 포함된 경로에서 파일명만 추출하기 위해 pathname 사용
        const fileName = path.basename(new URL(imageUrl).pathname); 
        const localFilePath = path.join(outputDir, fileName);

        console.log(`이미지 다운로드 시도: ${imageUrl} -> ${localFilePath}`);

        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'stream' // 스트림으로 응답을 받음
        });

        // 응답 스트림을 파일에 파이프
        const writer = fs.createWriteStream(localFilePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`이미지 다운로드 성공: ${localFilePath}`);
                // 다운로드된 파일의 크기가 0이 아닌지 확인 (간단한 유효성 검사)
                const stats = fs.statSync(localFilePath);
                assert.ok(stats.size > 0, '다운로드된 이미지 파일 크기가 0보다 커야 합니다.');
                resolve(localFilePath);
            });
            writer.on('error', (err) => {
                console.error(`이미지 다운로드 중 오류 발생: ${err.message}`);
                fs.unlink(localFilePath, () => reject(err)); // 에러 발생 시 부분적으로 다운로드된 파일 삭제
            });
        });
    } catch (error) {
        console.error(`이미지 다운로드 테스트 실패: ${error.message}`);
        handleApiError(error); // 에러 처리 함수 사용
    }
}


// --- 테스트 실행기 ---

async function runAllTests() {
    let userId = null;
    let createdImageUrl = null; // 생성된 이미지 URL을 저장할 변수

    console.log('--- API 테스트 시작 ---');
    console.log(`기본 URL: ${BASE_URL}`);
    console.log(`테스트 사용자 닉네임: ${testUser.nickname}`);

    try {
        // 테스트 1: 사용자 온보딩
        const onboardResult = await onboardUser(testUser);
        userId = onboardResult.userId;

        // 테스트 2: 이미지를 포함한 글 작성
        const postResult = await createPostWithImage(userId, testPost, TEST_IMAGE_PATH);
        createdImageUrl = postResult.imageUrl; // 생성된 이미지 URL 저장

        // 테스트 3: 근처 글 조회
        await getNearbyPosts(testPost.lat, testPost.lon);

        // 테스트 4: 사용자 위치 업데이트
        await updateUserLocation(userId, 36.3000, 127.3780);

        // 테스트 5: 업로드된 이미지 다운로드
        if (createdImageUrl) {
            // 서버의 전체 이미지 URL을 사용합니다.
            // createdImageUrl이 이미 전체 URL이더라도 path.basename을 사용하여 파일명만 추출 후 UPLOAD_BASE_URL과 합쳐 안정적인 URL을 만듭니다.
            const fullImageUrl = `${UPLOAD_BASE_URL}/${path.basename(new URL(createdImageUrl).pathname)}`;
            await downloadImage(fullImageUrl, DOWNLOAD_DIR);
        } else {
            console.warn('이미지 URL이 없어 이미지 다운로드 테스트를 건너뜁니다.');
        }


        console.log('\n--- 모든 테스트 성공적으로 완료! ---');

    } catch (error) {
        console.error('\n--- 하나 이상의 테스트가 실패했습니다! ---');
        process.exit(1); // 실패를 나타내기 위해 0이 아닌 코드로 종료
    }
}

// 테스트 실행
runAllTests();