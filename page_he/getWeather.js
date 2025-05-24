// 由 server.js 调用此模块进行天气获取
const axios = require('axios');

async function getWeatherByCity(city) {
    const key = '21f79ff3afb9d7449f0e2e45ef7a878a';
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?city=${encodeURIComponent(city)}&key=${key}`;
    const response = await axios.get(url);
    const result = response.data.lives?.[0];
    return {
        weather: result.weather,
        temperature: result.temperature,
        windDIrection: result.winddirection,
        windPower:result.windPower,
        humidity: result.humidity
    };
}

module.exports = getWeatherByCity;
