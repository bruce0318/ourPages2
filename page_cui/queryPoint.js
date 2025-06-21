const MAP_Server_KEY = 'd8a7b93f3cd67c42cac944d72765ca9c';
import { setButtonsDisabled } from "./mapShow.js";

let queryMarker = null;
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
    const mapContainer = document.getElementById('map');
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

        const res = await fetch('http://localhost:5501/api/queryPointForCui', {
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
function highlightQueryPoint(map, geoData) {
    // 清除之前的查询标记
    clearQueryMarkers(map);

    const [lng, lat] = geoData.features[0].geometry.coordinates;
    const firstProps = geoData.features[0].properties;

    console.log('查询的经纬度：', lng, lat);

    // 创建红色高亮标记
    queryMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color: red; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;'></div>",
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        }),
        zIndexOffset: 1000
    });

    // 信息窗口内容
    let content = `
    <div class="info-window">
        <h3>${firstProps.province ? `${firstProps.province}·` : ''}${firstProps.city}</h3>
    </div>`;

    geoData.features.forEach(record => { 
        const props = record.properties;
        content += `<p>${props.name}在${props.time}年来过这里</p>`;
    });

    // 创建并打开信息窗口
    queryMarker.bindPopup(content).addTo(map).openPopup();

    // 将地图中心移动到该点并放大
    map.setView([lat, lng], 8);
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
        map.removeLayer(queryMarker);
        queryMarker = null;
    }
} 