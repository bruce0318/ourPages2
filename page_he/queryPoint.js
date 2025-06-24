const MAP_Server_KEY = 'd8a7b93f3cd67c42cac944d72765ca9c';
import { setButtonsDisabled } from "./mapShow.js";
let queryMarker = null;
let queryInfoWindow = null;
let queryModeInfoDiv = null;
export async function queryPoint(map) {
    // 禁用所有其他按钮
    setButtonsDisabled(true);
    
    // 创建查询模式提示元素
    queryModeInfoDiv = document.createElement('div');
    queryModeInfoDiv.id = 'query-mode-info';
    queryModeInfoDiv.innerHTML = '<span style="color: blue; font-weight: bold;">查询模式: 请等待查询结果</span>';
    queryModeInfoDiv.style.position = 'absolute';
    queryModeInfoDiv.style.top = '10px';
    queryModeInfoDiv.style.left = '50%';
    queryModeInfoDiv.style.transform = 'translateX(-50%)';
    queryModeInfoDiv.style.zIndex = '1000';
    queryModeInfoDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    queryModeInfoDiv.style.padding = '8px 16px';
    queryModeInfoDiv.style.borderRadius = '4px';
    queryModeInfoDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    
    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消查询';
    cancelButton.style.marginLeft = '10px';
    cancelButton.style.padding = '4px 8px';
    cancelButton.style.backgroundColor = '#f0f0f0';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '3px';
    cancelButton.style.cursor = 'pointer';
    
    queryModeInfoDiv.appendChild(cancelButton);
    
    // 添加到地图容器
    const mapContainer = document.getElementById('map-container');
    mapContainer.appendChild(queryModeInfoDiv);
    
    // 绑定取消按钮事件
    cancelButton.addEventListener('click', () => {
        exitQueryMode(map);
    });

    const input = document.getElementById('query-input').value.trim();
    if (!input) {
        alert("请输入城市名称，如'武汉市'");
        exitQueryMode(map);
        return;
    }

    try{
        const apiUrl = `https://restapi.amap.com/v3/geocode/geo?key=${MAP_Server_KEY}&address=${input}&city=`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (!json || json.status !== '1' || json.geocodes.length === 0) {
            alert("未找到该城市，请输入标准城市名。");
            exitQueryMode(map);
            return;
        }

        const cityName = json.geocodes[0].city;
        const body = {cityName};

        const res = await fetch('http://47.111.136.83:5500/api/queryPointForHe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        // 检查响应状态
        if (!res.ok) {
            throw new Error(`HTTP 错误! 状态: ${res.status}`);
        }
        
        const geoData = await res.json();

        // 正确检查空数据
        if (!geoData.features || geoData.features.length === 0) {
            alert("未去过该城市。");
            exitQueryMode(map);
            return;
        }

        highlightQueryPoint(map, geoData);
        
        // 更新提示信息
        queryModeInfoDiv.querySelector('span').textContent = `查询模式: 已显示 ${cityName} 的足迹点`;
        
    } catch(error) {
        console.error('查询失败：', error);
        alert("查询失败，请稍后再试。");
        exitQueryMode(map);
    }
}

// 查询点高亮函数
function highlightQueryPoint(map,geoData) {
    // 清除之前的查询标记
    clearQueryMarkers(map);

    const [lng, lat]= geoData.features[0].geometry.coordinates;
    const firstProps = geoData.features[0].properties;

    console.log('查询的经纬度：', lng, lat);

    // 创建红色高亮标记
    queryMarker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        offset: new AMap.Pixel(-10, -35),
        icon: "https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png", // 红色标记
        zIndex: 100 // 确保在最上层
    });

    // 信息窗口内容
    let content = `
    <div class="info-window">
        <p class="location-title">${firstProps.province ? `${firstProps.province}·` : ''}${firstProps.city}</p>
    </div>`;

    geoData.features.forEach(record => { 
        const props = record.properties;
        content += `<p class="visit-info">${props.name}在${props.time}年来过这里</p>`;
    });

    // 创建并打开信息窗口
    queryInfoWindow = new AMap.InfoWindow({
        content: content,
        offset: new AMap.Pixel(0, -30),
        closeWhenClickMap: false
    }).open(map, queryMarker.getPosition());


    map.add(queryMarker);

    // 将地图中心移动到该点并放大
    map.setZoomAndCenter(5, [lng, lat]);

    // 在信息窗口的关闭按钮事件中添加退出查询模式
    setTimeout(() => {
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearQueryMarkers(map);
                // 不退出查询模式，用户需手动点击"取消查询"
            });
        }
    }, 100);
}

// 退出查询模式函数
function exitQueryMode(map) {
    // 清除查询标记
    clearQueryMarkers(map);
    
    // 移除查询模式提示元素
    if (queryModeInfoDiv && queryModeInfoDiv.parentNode) {
        queryModeInfoDiv.parentNode.removeChild(queryModeInfoDiv);
        queryModeInfoDiv = null;
    }
    
    // 启用所有按钮
    setButtonsDisabled(false);
}
export function clearQueryMarkers(map) {
    if (queryMarker) {
        map.remove(queryMarker);
        queryMarker = null;
    }
    if (queryInfoWindow){
        queryInfoWindow.close();
        queryInfoWindow = null;
    }
}

