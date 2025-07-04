// src/utils/geoUtils.js
const geolib = require('geolib');
require('dotenv').config();

const DISTANCE_THRESHOLD_KM = parseFloat(process.env.DISTANCE_THRESHOLD_KM) || 5; // .env에서 설정된 값

/**
 * 두 지점 간의 거리를 킬로미터 단위로 계산합니다.
 * @param {object} coord1 { latitude: lat1, longitude: lon1 }
 * @param {object} coord2 { latitude: lat2, longitude: lon2 }
 * @returns {number} 거리 (킬로미터)
 */
function getDistanceKm(coord1, coord2) {
    const distanceMeters = geolib.getDistance(
        { latitude: coord1.lat, longitude: coord1.lon },
        { latitude: coord2.lat, longitude: coord2.lon }
    );
    return distanceMeters / 1000; // 미터를 킬로미터로 변환
}

/**
 * 특정 지점이 반경 내에 있는지 확인합니다.
 * @param {object} centerCoord { lat, lon } - 중심 지점
 * @param {object} pointCoord { lat, lon } - 확인할 지점
 * @param {number} radiusKm - 반경 (킬로미터)
 * @returns {boolean} 반경 내에 있으면 true, 아니면 false
 */
function isWithinRadius(centerCoord, pointCoord, radiusKm = DISTANCE_THRESHOLD_KM) {
    return getDistanceKm(centerCoord, pointCoord) <= radiusKm;
}

module.exports = {
    getDistanceKm,
    isWithinRadius,
    DISTANCE_THRESHOLD_KM // 외부에서 접근 가능하도록 내보내기
};