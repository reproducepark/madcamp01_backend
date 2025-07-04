// src/utils/geoUtils.js
import axios from 'axios';
import 'dotenv/config'; // Load environment variables from .env file using ES module syntax

// --- Configuration from .env ---
const KAKAO_REST_API_KEY = process.env.REST_API_KEY; // Use a more specific name for clarity

// --- Kakao API Utility Function ---

/**
 * Retrieves the administrative dong address for a given longitude and latitude using Kakao API.
 * @param {number} longitude - The longitude of the location.
 * @param {number} latitude - The latitude of the location.
 * @returns {Promise<string>} A promise that resolves to the administrative dong address or an error message.
 */
async function getAdminDongAddress(longitude, latitude) {
    if (!KAKAO_REST_API_KEY) {
        console.error("Error: Kakao REST API Key (REST_API_KEY) is not defined in your .env file.");
        return "API 키가 설정되지 않았습니다.";
    }

    const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json`;
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`
            },
            params: {
                x: longitude,
                y: latitude
            }
        });

        const documents = response.data.documents;

        // Find the administrative dong (region_type 'H')
        const adminDong = documents.find(doc => doc.region_type === 'H');

        if (adminDong) {
            return adminDong.address_name;
        } else {
            return "행정동 주소를 찾을 수 없습니다.";
        }
    } catch (error) {
        console.error("Error calling Kakao API:", error.message);
        // You can log more detailed error response for debugging:
        // console.error("API Error Response:", error.response ? error.response.data : "No response data");
        return "API 호출 중 오류가 발생했습니다.";
    }
}

// --- Module Exports ---
export {
    getAdminDongAddress
};

// --- Example Usage (for testing purposes, can be removed in production) ---
// const myLongitude = 128.205284;
// const myLatitude = 35.207029;

// getAdminDongAddress(myLongitude, myLatitude)
//   .then(address => {
//     console.log("현재 위치의 행정동:", address);
//   })
//   .catch(error => {
//     console.error("에러:", error);
//   });