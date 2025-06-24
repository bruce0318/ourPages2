// 计算访问城市和省份数量
export function calculateStatistics(geoData) {
    const cities = new Set();
    const provinces = new Set();
    
    if (geoData.features && Array.isArray(geoData.features)) {
        geoData.features.forEach(feature => {
            const props = feature.properties;
            
            // 添加城市
            if (props.city) {
                cities.add(props.city);
            }
            
            // 添加省份
            if (props.province) {
                provinces.add(props.province);
            }
        });
    }
    
    return {
        cityCount: cities.size,
        provinceCount: provinces.size
    };
}

// 更新地图统计数据
export function updateStatistics(cityCount, provinceCount) {
    const cityElement = document.getElementById('city-count');
    const provinceElement = document.getElementById('province-count');
    
    if (cityElement) cityElement.textContent = cityCount;
    if (provinceElement) provinceElement.textContent = provinceCount;
}

// 初始化统计
export function initStatistics() {
    updateStatistics(25, 15); // 初始化为0
}