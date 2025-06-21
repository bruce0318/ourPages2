import { reloadLayerFromDB } from "./mapShow.js";
const MAP_Server_KEY = 'd8a7b93f3cd67c42cac944d72765ca9c';

export async function addPoint(map, overlayGroup) {
    const name = prompt("请输入城市名称（如：南宁市）：");
    const year = prompt("请输入年份（如：2023）：");
    //const user = prompt("请输入用户名称：");
    const user = '何灿非';   //个人网页使用

    if (!name || !year || isNaN(year)) {
        alert("输入无效，请重新输入有效的城市和年份。");
        return;
    }

    try {
        const apiUrl = `https://restapi.amap.com/v3/geocode/geo?key=${MAP_Server_KEY}&address=${name}&city=`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (!json || json.status !== '1' || json.geocodes.length === 0) {
            alert("未找到该城市，请输入标准城市名。");
            return;
        }

        const geocode = json.geocodes[0];

        const [lng, lat] = geocode.location.split(',').map(Number); // 经纬度
        const province = geocode.province;                          // 省份
        const city = geocode.city || name;                          // 城市名（如果为空，就用输入名）
        const code = geocode.adcode;

        const body = { lng, lat, code, province, city, year, user };

        // 发送数据到服务器写入数据库
        await fetch('http://47.111.136.83:5500/api/addPoint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // 地图上添加标记
        const marker = new AMap.Marker({
            position: new AMap.LngLat(lng, lat),
            offset: new AMap.Pixel(0, 0)
        });

        marker.content = `
            <div class="info-window">
                <h3>${province ? `${province}·` : ''}${city}</h3>
                <p>${year}</p>
            </div>
        `;

        marker.on('click', () => {
            new AMap.InfoWindow({
                content: marker.content,
                offset: new AMap.Pixel(0, -10)
            }).open(map, marker.getPosition());
        });

        overlayGroup.addOverlay(marker);

        alert("添加成功！");
        reloadLayerFromDB();

    } catch (err) {
        console.error("添加失败：", err);
        alert("添加失败，请稍后重试。");
    }
}
