
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.weather-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            const city = button.getAttribute('data-city');
            const weatherInfoDiv = button.nextElementSibling;

            try {
                const response = await fetch('/getWeather', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ city })
                });
                const data = await response.json();
                weatherInfoDiv.innerText = `天气：${data.weather}，温度：${data.temperature}℃，风向：${data.windDirection}，风力：${data.windPower}级，湿度：${data.humidity}%`;
            } catch (error) {
                weatherInfoDiv.innerText = '天气信息获取失败';
            }
        });
    });
});
