import { loadUserPoints, removeUserPoints } from './loadPoints.js';

const userLayers = {};

// 确保高德地图API已加载
function loadAMapScript() {
    return new Promise((resolve) => {
        if (window.AMap) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=6690aa0df3fd29673c58c9b248817548&callback=initAMapCallback`;
        document.head.appendChild(script);
        
        window.initAMapCallback = resolve;
    });
}
async function initMap() {
    // 确保高德地图API已加载
    await loadAMapScript();

    // 初始化地图
    var map = new AMap.Map('map', {
        zoom: 4,
        center: [108.94, 34.34],
        resizeEnable: true,
        viewMode: '3D'
    });
    
    // 图层管理逻辑
    const layerManager = document.getElementById('layer-manager');
    const layerCheckboxes = layerManager.querySelectorAll('input[type="checkbox"]');
    
    layerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const userId = this.id.replace('layer-', '');
            const layerElement = document.getElementById(`layer-${userId}-text`);
            
            if (this.checked) {
                layerElement.style.display = 'block';
                // 加载用户足迹点
                loadUserPoints(userId, map, userLayers)
                    .then(() => console.log(`显示图层: ${userId}`))
                    .catch(err => console.error(`加载用户${userId}足迹点失败:`, err));
            } else {
                layerElement.style.display = 'none';
                // 移除用户足迹点
                removeUserPoints(userId, userLayers);
                console.log(`隐藏图层: ${userId}`);
            }
        });
    });
    
    // 按钮事件占位函数
    document.getElementById('add-point-btn').addEventListener('click', function() {
        console.log('新增足迹点');
    });
    
    // 其他按钮事件...
}

// 确保在页面加载完成后初始化地图
window.addEventListener('DOMContentLoaded', initMap);