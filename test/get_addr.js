import axios from 'axios';
import 'dotenv/config'; // Load environment variables from .env file using ES module syntax

// 카카오 REST API 키를 여기에 입력하세요.
// 실제 사용 시에는 환경 변수 등으로 관리하는 것이 좋습니다.
const REST_API_KEY = process.env.REST_API_KEY; // Use REST_API_KEY from .env

async function getAdminDongAddress(longitude, latitude) {

  console.log(REST_API_KEY)
  if (!REST_API_KEY) {
    console.error("Error: Kakao REST API Key is not defined in .env file.");
    return "API 키가 설정되지 않았습니다.";
  }


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
    // 더 자세한 오류 메시지를 위해 error.response.data를 출력할 수 있습니다.
    // console.error("API Error Response:", error.response ? error.response.data : "No response data");
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

// If you intend to use this function in other ES modules, you would export it like this:
// export { getAdminDongAddress };
