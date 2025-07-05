const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const assert = require('assert');

// --- 설정 ---
const BASE_URL = 'http://api.reproducepark.my:3000/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'test.png');

// --- API 헬퍼 함수 ---

/**
 * API 요청 중 발생하는 에러를 콘솔에 출력합니다.
 * @param {Error} error - axios에서 발생한 에러 객체.
 */
function handleApiError(error, apiName = 'API') {
    console.error(`\n--- ${apiName} 테스트 중 에러 발생 ---`);
    if (error.response) {
        console.error('상태 코드:', error.response.status);
        console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
        console.error('응답을 받지 못했습니다:', error.request);
    } else {
        console.error('요청 설정 중 에러 발생:', error.message);
    }
    throw error;
}

/**
 * 테스트용 새 사용자를 온보딩하고 ID를 반환합니다.
 * @returns {Promise<number>} 생성된 사용자의 ID.
 */
async function onboardTestUser() {
    console.log('--- 1. 테스트 사용자 생성 ---');
    try {
        const userData = {
            nickname: 'local_tester_' + Date.now(),
            lat: 37.4979, // 강남역
            lon: 127.0276,
        };
        const response = await axios.post(`${BASE_URL}/auth/onboard`, userData);
        const userId = response.data.userId;
        assert.ok(userId, '사용자 ID가 생성되어야 합니다.');
        console.log(`테스트 사용자 생성 성공. User ID: ${userId}`);
        return userId;
    } catch (error) {
        handleApiError(error, '사용자 온보딩');
    }
}

/**
 * 지정된 위치에 하나의 테스트 게시물을 생성합니다.
 * @param {number} userId - 게시물을 작성할 사용자 ID.
 * @param {object} postData - 게시물 데이터 { content, lat, lon }.
 * @returns {Promise<object>} 생성된 게시물 정보.
 */
async function createPost(userId, postData) {
    try {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('content', postData.content);
        formData.append('lat', postData.lat);
        formData.append('lon', postData.lon);

        if (fs.existsSync(TEST_IMAGE_PATH)) {
            formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));
        } else {
            console.warn(`경고: ${TEST_IMAGE_PATH} 이미지를 찾을 수 없어 이미지 없이 게시물을 생성합니다.`);
        }

        const response = await axios.post(`${BASE_URL}/posts`, formData, {
            headers: { ...formData.getHeaders() }
        });

        assert.ok(response.data.postId, '게시물 ID가 반환되어야 합니다.');
        return response.data;
    } catch (error) {
        handleApiError(error, `'${postData.content}' 게시물 생성`);
    }
}

/**
 * 지정된 뷰포트 내의 게시물을 조회합니다.
 * @param {object} viewport - 뷰포트 파라미터 { centerLat, centerLon, deltaLat, deltaLon }.
 * @returns {Promise<object>} API 응답 데이터.
 */
async function getPostsInViewport(viewport) {
    console.log('\n--- 4. Viewport로 게시물 조회 테스트 ---');
    try {
        // --- 이 부분이 수정되었습니다 ---
        const response = await axios.get(`${BASE_URL}/posts/nearbyviewport`, { params: viewport });
        // -----------------------------
        console.log('조회된 게시물:', response.data);
        console.log(`Viewport 조회 성공. ${response.data.postsInViewport.length}개의 게시물을 찾았습니다.`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'Viewport 게시물 조회');
    }
}

// --- 메인 테스트 실행기 ---

/**
 * 전체 뷰포트 테스트를 실행합니다.
 */
async function runViewportTest() {
    const userId = await onboardTestUser();

    console.log('\n--- 2. 한 지역 근처에 테스트 게시물 5개 생성 ---');
    
    // 2-1. 중심점 설정 (강남역)
    const centerPoint = { lat: 37.4979, lon: 127.0276 };
    console.log(`중심점: 강남역 (lat: ${centerPoint.lat}, lon: ${centerPoint.lon})`);

    // 2-2. 위도 1km는 약 0.009도, 경도 1km는 약 0.0114도 입니다.
    //     계산 편의상 0.009도를 최대 오프셋으로 설정하여 1km 반경 내에 위치하도록 합니다.
    const maxOffsetDegrees = 0.009; 
    
    const createdPostIds = [];
    const generatedLocations = [];

    for (let i = 1; i <= 5; i++) {
        // 중심점에서 무작위로 위도/경도를 더하거나 빼서 좌표 생성
        const latOffset = (Math.random() - 0.5) * 2 * maxOffsetDegrees; // -maxOffset ~ +maxOffset
        const lonOffset = (Math.random() - 0.5) * 2 * maxOffsetDegrees;
        
        const newLocation = {
            lat: centerPoint.lat + latOffset,
            lon: centerPoint.lon + lonOffset,
        };
        
        const post = await createPost(userId, {
            content: `강남역 근처 테스트 게시물 #${i}`,
            lat: newLocation.lat,
            lon: newLocation.lon
        });

        createdPostIds.push(post.postId);
        generatedLocations.push(newLocation);
        console.log(`게시물 #${i} 생성 완료 (Post ID: ${post.postId}, Lat: ${newLocation.lat.toFixed(4)}, Lon: ${newLocation.lon.toFixed(4)})`);
    }

    console.log('\n--- 3. 모든 게시물을 포함하는 Viewport 계산 ---');
    const lats = generatedLocations.map(loc => loc.lat);
    const lons = generatedLocations.map(loc => loc.lon);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    const deltaLat = (maxLat - minLat) * 1.1; // 여유 공간 10% 추가
    const deltaLon = (maxLon - minLon) * 1.1; // 여유 공간 10% 추가

    const viewport = {
        centerLat: minLat + (maxLat - minLat) / 2,
        centerLon: minLon + (maxLon - minLon) / 2,
        deltaLat: deltaLat,
        deltaLon: deltaLon
    };
    console.log('계산된 Viewport:', viewport);

    const result = await getPostsInViewport(viewport);
    
    console.log('\n--- 5. 결과 검증 ---');
    assert.strictEqual(result.postsInViewport.length, 5, 'Viewport 내에서 정확히 5개의 게시물이 조회되어야 합니다.');

    const receivedPostIds = result.postsInViewport.map(p => p.id);

    assert.deepStrictEqual(
        receivedPostIds.sort((a, b) => a - b), 
        createdPostIds.sort((a, b) => a - b),
        '조회된 게시물 ID들이 생성된 게시물 ID들과 일치해야 합니다.'
    );
    console.log('게시물 ID 일치 검증 성공!');
}

(async () => {
    try {
        if (!fs.existsSync(TEST_IMAGE_PATH)) {
            console.error(`\n--- 오류: 테스트 이미지 파일(${TEST_IMAGE_PATH})이 필요합니다. ---`);
            process.exit(1);
        }

        await runViewportTest();
        console.log('\n✅✅✅ 모든 지역 집중 Viewport 테스트가 성공적으로 완료되었습니다! ✅✅✅');
    } catch (error) {
        console.error('\n❌❌❌ 테스트 중 심각한 오류가 발생하여 중단되었습니다. ❌❌❌');
        process.exit(1);
    }
})();