// 高德地图API密钥
const MAP_Server_KEY = 'd8a7b93f3cd67c42cac944d72765ca9c';

// 获取天气信息函数
async function getWeather(cityName, weatherInfoElement) {           
    try {
        // 获取城市编码
        const geocodeUrl = `https://restapi.amap.com/v3/geocode/geo?key=${MAP_Server_KEY}&address=${cityName}&city=`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeJson = await geocodeResponse.json();
        
        if (geocodeJson.status !== '1' || geocodeJson.geocodes.length === 0) {
            throw new Error('未找到该城市');
        }
        
        const adcode = geocodeJson.geocodes[0].adcode;
        
        // 使用adcode查询天气
        const weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?key=${MAP_Server_KEY}&city=${adcode}`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherJson = await weatherResponse.json();
        
        if (weatherJson.status !== '1' || weatherJson.lives.length === 0) {
            throw new Error('获取天气信息失败');
        }
        
        // 解析天气数据
        const weatherData = weatherJson.lives[0];
        
        // 简洁的天气描述
        const weatherSummary = `天气${weatherData.weather}, 温度${weatherData.temperature}℃, 风向${weatherData.winddirection}, 风力${weatherData.windpower}级, 湿度${weatherData.humidity}%`;
        
        // 更新时间（仅显示时间部分）
        const reportTime = weatherData.reporttime;
        
        // 组合简洁的天气信息
        weatherInfoElement.textContent = `${weatherSummary} (${reportTime}更新)`;
        
    } catch (error) {
        console.error('获取天气信息失败:', error);
        weatherInfoElement.textContent = `获取天气失败: ${error.message || '请稍后重试'}`;
    }
}


