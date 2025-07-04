import axios from 'axios';

// 카카오 REST API 키를 여기에 입력하세요.
// 실제 사용 시에는 환경 변수 등으로 관리하는 것이 좋습니다.

async function getAdminDongAddress(longitude, latitude) {
  const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `KakaoAK ${REST_API_KEY}`
      },
      params: {
        x: longitude,
        y: latitude
      }
    });

    const documents = response.data.documents;

    // region_type이 'H'인 행정동을 찾습니다.
    const adminDong = documents.find(doc => doc.region_type === 'H');

    if (adminDong) {
      return adminDong.address_name;
    } else {
      return "행정동 주소를 찾을 수 없습니다.";
    }
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
    return "API 호출 중 오류가 발생했습니다.";
  }
}

// 사용 예시: 원하는 좌표를 입력하세요 (예: 판교역 근처)
const myLongitude = 128.205284;
const myLatitude = 35.207029;

// 35.207029, 128.205284

getAdminDongAddress(myLongitude, myLatitude)
  .then(address => {
    console.log("현재 위치의 행정동:", address);
  })
  .catch(error => {
    console.error("에러:", error);
  });