// src/utils/geoUtils.js
import axios from 'axios';
import 'dotenv/config'; // Load environment variables from .env file using ES module syntax

// src/utils/geoUtils.js
const DISTANCE_THRESHOLD_KM = 0.5; // Existing constant for default radius

// Haversine formula to calculate distance between two points given their latitudes and longitudes
function haversineDistance(coords1, coords2) {
    const R = 6371; // Radius of Earth in kilometers
    const lat1 = coords1.lat * Math.PI / 180;
    const lon1 = coords1.lon * Math.PI / 180;
    const lat2 = coords2.lat * Math.PI / 180;
    const lon2 = coords2.lon * Math.PI / 180;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
}

/**
 * Checks if a post is within a specified radius of a given location.
 * @param {object} userLocation - Object with lat and lon properties for the user's current location.
 * @param {object} postLocation - Object with lat and lon properties for the post's location.
 * @param {number} [thresholdKm=DISTANCE_THRESHOLD_KM] - The maximum distance (in kilometers) for a post to be considered "within radius".
 * @returns {boolean} - True if the post is within the radius, false otherwise.
 */
function isWithinRadius(userLocation, postLocation, thresholdKm = DISTANCE_THRESHOLD_KM) {
    const distance = haversineDistance(userLocation, postLocation);
    return distance <= thresholdKm;
}

// --- Configuration from .env ---
const KAKAO_REST_API_KEY = process.env.REST_API_KEY; // Use a more specific name for clarity

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
module.exports = {
    isWithinRadius,
    DISTANCE_THRESHOLD_KM,
    getAdminDongAddress,
    haversineDistance // Export haversineDistance if you need it directly elsewhere
};