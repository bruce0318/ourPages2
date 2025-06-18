import { setButtonsDisabled } from "./mapShow.js";

let provinceInfoWindow = null;
let statModeInfoDiv = null;
export async function statProvince(map) {
    // 禁用所有其他按钮
    setButtonsDisabled(true);
    
    // 创建统计模式提示元素
    statModeInfoDiv = document.createElement('div');
    statModeInfoDiv.id = 'query-mode-info';
    statModeInfoDiv.innerHTML = '<span style="color: blue; font-weight: bold;">统计模式: 请等待查询结果</span>';
    statModeInfoDiv.style.position = 'absolute';
    statModeInfoDiv.style.top = '10px';
    statModeInfoDiv.style.left = '50%';
    statModeInfoDiv.style.transform = 'translateX(-50%)';
    statModeInfoDiv.style.zIndex = '1000';
    statModeInfoDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    statModeInfoDiv.style.padding = '8px 16px';
    statModeInfoDiv.style.borderRadius = '4px';
    statModeInfoDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    
    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消统计';
    cancelButton.style.marginLeft = '10px';
    cancelButton.style.padding = '4px 8px';
    cancelButton.style.backgroundColor = '#f0f0f0';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '3px';
    cancelButton.style.cursor = 'pointer';
    
    statModeInfoDiv.appendChild(cancelButton);
    
    // 添加到地图容器
    const mapContainer = document.getElementById('map-container');
    mapContainer.appendChild(statModeInfoDiv);
    
    // 绑定取消按钮事件
    cancelButton.addEventListener('click', () => {
        exitStatMode();
    });

    const input = document.getElementById('province-select').value.trim();
    if (!input) {
        alert("请选择省份");
        exitStatMode();
        return;
    }
    const provinceName = input
    const body = {provinceName};

    const res_points = await fetch('http://localhost:5500/api/statProvince', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const pointsData = await res_points.json();

    const res_province = await fetch('http://localhost:5500/api/drawProvince', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const province = await res_province.json();

    try{
        let content = `<div class="info-window"></div> `;

        if (!pointsData.features || pointsData.features.length === 0) {
            content += `<p>没有人来过${input}</p>`;
        } else {
            // 计算统计信息
            const firsrUser = pointsData.features[0].properties.name;
            const firstCity = pointsData.features[0].properties.city;
            const uniqueUser = new Set();
            const uniqueCity = new Set();
            uniqueUser.add(firsrUser);
            uniqueCity.add(firstCity);

            pointsData.features.forEach(record => { 
                const props = record.properties;
                if(firsrUser != props.name){
                    uniqueUser.add(props.name);
                }
                if(firstCity!= props.city){
                    uniqueCity.add(props.city);
                }
            });
            
            content += `<div><h3>共有${uniqueUser.size}人来过${input}，走过${uniqueCity.size}个城市：</h3></div>`;
            
            // 添加每条足迹记录
            pointsData.features.forEach(record => {
                const props = record.properties;
                content += `<p>${props.name}在${props.time}年去过${props.city}</p>`; 
            });
        }

        // 显示信息窗口
        const center = getProvinceCenter(province);
        provinceInfoWindow = new AMap.InfoWindow({
            content: content,
            offset: new AMap.Pixel(0, -10),
            closeWhenClickMap: false
        }).open(map, center);


        statModeInfoDiv.querySelector('span').textContent = `统计模式: 已显示 ${input} 的足迹统计`;

        
    } catch(error) {
        console.error('省份统计失败:', error);
        alert('获取省份数据失败，请重试');
        exitStatMode(map);
    }
}

// 退出统计模式函数
function exitStatMode() {
    
    // 关闭信息窗口
    if (provinceInfoWindow) {
        provinceInfoWindow.close();
        provinceInfoWindow = null;
    }
    
    // 移除统计模式提示元素
    if (statModeInfoDiv && statModeInfoDiv.parentNode) {
        statModeInfoDiv.parentNode.removeChild(statModeInfoDiv);
        statModeInfoDiv = null;
    }
    
    // 启用所有按钮
    setButtonsDisabled(false);
}

// 获取省份中心点
function getProvinceCenter(geojson) {
    if (!geojson.features || geojson.features.length === 0) {
        return [104.195, 35.861]; // 默认中心点
    }
    
    const coordinates = geojson.features[0].geometry.coordinates[0];
    let lngSum = 0;
    let latSum = 0;
    
    coordinates[0].forEach(coord => {
        lngSum += coord[0];
        latSum += coord[1];
    });
    
    return [
        lngSum / coordinates[0].length,
        latSum / coordinates[0].length
    ];
}

