// test_api.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// const BASE_URL = 'http://localhost:3000/api';
const BASE_URL = 'http://api.reproducepark.my:3000/api';


// 테스트용 사용자 정보 및 위치
const testUser = {
    nickname: 'nodejs_test_user3',
    lat: 36.3504, // 대전광역시청 근처
    lon: 127.3845
};

// 테스트용 글 정보
const testPost = {
    content: 'Node.js 스크립트에서 작성한 테스트 글입니다!',
    lat: 36.3510,
    lon: 127.3850
};

// 테스트용 이미지 파일 경로 (현재 스크립트와 같은 디렉토리에 있다고 가정)
const testImagePath = path.join(__dirname, 'test.png');

async function runTests() {
    let userId = null;

    try {
        console.log('--- 1. 사용자 온보딩 테스트 ---');
        const onboardRes = await axios.post(`${BASE_URL}/auth/onboard`, testUser, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('온보딩 응답:', onboardRes.data);
        userId = onboardRes.data.userId; // 생성된 userId 저장
        adminDong = onboardRes.data.adminDong; // 생성된 adminDong 저장

        if (!userId) {
            console.error('사용자 ID를 가져오지 못했습니다. 테스트 중단.');
            return;
        }
        console.log(`획득한 userId: ${userId}`);
        console.log(`획득한 adminDong: ${adminDong}`); // adminDong 출력

        console.log('\n--- 2. 글 작성 테스트 (이미지 포함) ---');
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('content', testPost.content);
        formData.append('lat', testPost.lat);
        formData.append('lon', testPost.lon);
        formData.append('image', fs.createReadStream(testImagePath)); // 파일 스트림 추가

        const postRes = await axios.post(`${BASE_URL}/posts`, formData, {
            headers: {
                ...formData.getHeaders() // FormData의 Content-Type 헤더를 자동으로 설정
            }
        });
        // console.log('글 작성 응답:', postRes.data);

        // 응답에서 content, imageUrl, adminDong 확인
        const { content: createdContent, imageUrl: createdImageUrl, adminDong: createdAdminDong } = postRes.data;

        console.log(`작성된 글 내용 확인: ${createdContent}`);
        console.log(`작성된 이미지 URL 확인: ${createdImageUrl}`);
        console.log(`작성된 글의 행정동 확인: ${createdAdminDong}`);

        console.log('\n--- 3. 근처 동네 글 조회 테스트 ---');
        const nearbyRes = await axios.get(`${BASE_URL}/posts/nearby`, {
            params: {
                currentLat: 36.3510,
                currentLon: 127.3850
            }
        });
        console.log('근처 글 조회 응답:', JSON.stringify(nearbyRes.data, null, 2));

        console.log('\n--- 4. 사용자 위치 업데이트 테스트 ---');
        const updateLocationRes = await axios.post(`${BASE_URL}/auth/update-location`, {
            userId: userId,
            lat: 36.3000,
            lon: 127.3780
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        // console.log('위치 업데이트 응답:', updateLocationRes.data);
        // 추가: 업데이트된 adminDong을 명확하게 출력
        console.log('업데이트된 행정동:', updateLocationRes.data.adminDong);

    } catch (error) {
        if (error.response) {
            // 서버에서 에러 응답을 보낸 경우
            console.error('\n--- API 에러 발생 ---');
            console.error('상태 코드:', error.response.status);
            console.error('응답 데이터:', error.response.data);
        } else if (error.request) {
            // 요청이 보내졌지만 응답을 받지 못한 경우 (네트워크 문제 등)
            console.error('\n--- 네트워크 에러 발생 ---');
            console.error('요청:', error.request);
        } else {
            // 요청 설정 중 문제 발생
            console.error('\n--- 요청 설정 에러 ---');
            console.error('에러 메시지:', error.message);
        }
        console.error('전체 에러 객체:', error); // 전체 에러 객체를 출력하여 더 자세한 정보 확인
    }
}

// 테스트 실행
runTests();