const express = require('express');
const bodyParser = require('body-parser');
const getWeatherByCity = require('./getWeather');
const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(express.static(__dirname)); // 提供静态文件访问
app.use(bodyParser.json());

app.post('/getWeather', async (req, res) => {
    const { city } = req.body;

    //参数验证
    if (!city || typeof city !== 'string') {
        return res.status(400).json({ error: '城市名称错误' });
    }

    try {
        const weatherData = await getWeatherByCity(city);
        res.json(weatherData);
    } catch (error) {
        res.status(500).json({ error: '获取天气失败' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`伪服务器运行中：http://localhost:${PORT}`);
});
