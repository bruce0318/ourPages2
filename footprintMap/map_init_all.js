// footprintMap/map_init_all.js
function initMap() {
    // 初始化地图
    var map = new AMap.Map('map', {
        zoom: 5,
        center: [108.94, 34.34],
        resizeEnable: true,
        viewMode: '2D'
    });
    
    // 图层管理逻辑
    const layerManager = document.getElementById('layer-manager');
    const layerCheckboxes = layerManager.querySelectorAll('input[type="checkbox"]');
    
    layerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const layerId = this.id.replace('layer-', '');
            const layerElement = document.getElementById(`layer-${layerId}-text`);
            
            if (this.checked) {
                layerElement.style.display = 'block';
                // 这里添加实际显示图层的逻辑
                console.log(`显示图层: ${layerId}`);
            } else {
                layerElement.style.display = 'none';
                // 这里添加隐藏图层的逻辑
                console.log(`隐藏图层: ${layerId}`);
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
window.onload = initMap;