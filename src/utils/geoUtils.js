// src/utils/geoUtils.js
const axios = require('axios'); // import 대신 require 사용
require('dotenv').config(); // ES 모듈 방식의 import 'dotenv/config' 대신 CommonJS 방식 사용

/**
 * Checks if a location (e.g., a post) is within a defined rectangular map viewport.
 * This function expects the viewport to be defined by its center coordinates and delta values.
 *
 * @param {object} location - Object with 'lat' and 'lon' properties (e.g., a post's coordinates).
 * @param {object} viewport - Object defining the map's visible area using center and delta:
 * - centerLat: Latitude of the center of the viewport.
 * - centerLon: Longitude of the center of the viewport.
 * - deltaLat: The 'height' of the viewport in degrees latitude (maxLat - minLat).
 * - deltaLon: The 'width' of the viewport in degrees longitude (maxLon - minLon).
 * @returns {boolean} - True if the location is within the viewport, false otherwise.
 */
function isWithinMapViewport(location, viewport) { // export 키워드 제거
    const { centerLat, centerLon, deltaLat, deltaLon } = viewport;

    // 필수 파라미터 체크
    if (centerLat === undefined || centerLon === undefined ||
        deltaLat === undefined || deltaLon === undefined) {
        console.error("Error: Viewport must contain centerLat, centerLon, deltaLat, and deltaLon.");
        return false;
    }

    // 뷰포트의 최소/최대 위도 및 경도 계산
    const minLat = centerLat - (deltaLat / 2);
    const maxLat = centerLat + (deltaLat / 2);
    const minLon = centerLon - (deltaLon / 2);
    const maxLon = centerLon + (deltaLon / 2);

    const { lat, lon } = location;

    // 위치의 위도가 뷰포트 범위 내에 있는지 확인
    const latInRange = lat >= minLat && lat <= maxLat;

    // 위치의 경도가 뷰포트 범위 내에 있는지 확인
    // 경도 180도/ -180도 경계선 넘나드는 경우 처리
    let lonInRange;
    if (minLon <= maxLon) { // 일반적인 경우 (경계선 안 넘어감)
        lonInRange = lon >= minLon && lon <= maxLon;
    } else { // 경계선을 넘어가는 경우 (예: minLon = 170, maxLon = -170)
        lonInRange = (lon >= minLon || lon <= maxLon);
    }

    return latInRange && lonInRange;
}


// --- Configuration from .env ---
const KAKAO_REST_API_KEY = process.env.REST_API_KEY;

/**
 * Retrieves the administrative dong address for a given longitude and latitude using Kakao API.
 * @param {number} longitude - The longitude of the location.
 * @param {number} latitude - The latitude of the location.
 * @returns {Promise<string>} A promise that resolves to the administrative dong address or an error message.
 */
async function getAdminDongAddress(longitude, latitude) { // export 키워드 제거
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
        return "API 호출 중 오류가 발생했습니다.";
    }
}

// CommonJS 방식으로 함수들을 내보냅니다.
module.exports = {
    isWithinMapViewport, // isWithinMapViewport도 내보냅니다.
    getAdminDongAddress,
};

