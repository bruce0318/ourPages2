// 用户ID到用户名的映射
const userMap = {
    'huang': '黄卉然',
    'gao': '高家垚',
    'he': '何灿非',
    'cui': '崔泽铭'
};

export async function loadUserPoints(userId, map, userLayers){
    // 如果已加载，直接返回
    if (userLayers[userId]) {
        userLayers[userId].show();
        return;
    }
    
    try {
        const body = {userName: userMap[userId]};
        const response = await fetch('http://localhost:5500/api/getPointsFromGroupDB', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const geoData = await response.json();

        // 创建覆盖物组
        const overlayGroup = new AMap.OverlayGroup();
        map.add(overlayGroup);

        // 处理足迹点数据
        if (geoData.features && Array.isArray(geoData.features)) {
            geoData.features.forEach(feature => {
                if (feature.geometry.type === 'Point') {
                    createPointMarker(feature, overlayGroup, userMap[userId]);
                }
            });
        }
        
        // 存储图层组
        userLayers[userId] = {
            group: overlayGroup,
            show: () => overlayGroup.show(),
            hide: () => overlayGroup.hide()
        };

        console.log(`${userMap[userId]}的足迹点已加载`);
    } catch (error) {
        console.error(`加载用户${userId}足迹点失败：`, error);
        throw error;
    }
}

// 移除指定用户的足迹点
export function removeUserPoints(userId, userLayers) {
    if (userLayers[userId]) {
        userLayers[userId].hide();
    }
}

//创建点图层标记
export function createPointMarker(feature, overlayGroup, userName){

    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    // 创建各个用户的自定义图标
    const icon = new AMap.Icon({
        image: getIconForUser(userName), // 根据用户获取不同图标
        size: new AMap.Size(16, 16),
        imageOffset: new AMap.Pixel(0, 0),
        imageSize: new AMap.Size(16, 16)
    });

    const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        icon: icon,
        offset: new AMap.Pixel(-8, -8)
    });

    // 信息窗口内容
    marker.content = `
        <div class="info-window">
            <h3>${props.province ? `${props.province}·` : ''}${props.city}</h3>
            <p>${userName}在${props.time}年来过这里</p>
        </div>
    `;

    // 点击事件
    marker.on('click', () => {
        new AMap.InfoWindow({
            content: marker.content,
            offset: new AMap.Pixel(0, -30)
        }).open(map, marker.getPosition());
    });
    
    overlayGroup.addOverlay(marker);
}

// 根据用户获取不同图标
function getIconForUser(userName) {
    const icons = {
        '何灿非': 'images/footprint/mark_1.png',
        '黄卉然': 'images/footprint/mark_2.png',
        '高家垚': 'images/footprint/mark_3.png',
        '崔泽铭': 'images/footprint/mark_4.png'
    };
    return icons[userName] || 'images/icons/default.png';
}