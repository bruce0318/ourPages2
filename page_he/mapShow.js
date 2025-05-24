// 初始化地图实例
let map = null;
let overlayGroup = null; // 用于存储覆盖物组

const MAP_KEY = '6690aa0df3fd29673c58c9b248817548';

// 初始化地图
function initMap() {
    // 加载高德地图JS API
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${MAP_KEY}&callback=initMapCallback`;
    document.head.appendChild(script);
}

// 地图初始化回调
window.initMapCallback = function() {
    // 创建地图实例
    map = new AMap.Map('map-container', {
        zoom: 4, 
        center: [104.195, 35.861],
        viewMode: '2D',     
        resizeEnable: true  
    });

    //添加地图加载完成监听
    map.on('complete', function(){
        console.log('地图加载完成');
        // 可以在此处执行初始化操作
    });   

    // 初始化覆盖物组
    overlayGroup = new AMap.OverlayGroup();
    map.add(overlayGroup);
}

// 加载GeoJSON数据
async function loadGeoJSONLayer() {
    try {
        const response = await fetch('./page_he/data/cities.geojson');
        const geoData = await response.json();

        // 清除旧数据
        overlayGroup.clearOverlays();

        // 遍历要素处理
        geoData.features.forEach(feature => {
            switch(feature.geometry.type) {
                case 'Point':
                createPointMarker(feature);
                break;
                case 'LineString':
                createPolyline(feature);
                break;
                case 'Polygon':
                createPolygon(feature);
                break;
            }
        });

        // 自适应视野
        map.setFitView(overlayGroup.getOverlays());

        //激活移除图层按钮
        document.getElementById('remove-layer-btn').disabled = false;
        console.log('图层加载完成');

    } catch (error) {
        console.error('加载GeoJSON数据失败：', error);
    }
}

//创建点图层
function createPointMarker(feature) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        offset: new AMap.Pixel(0, 0)
    });

    //信息窗口代码
    marker.content = `
    <div class="info-window">
        <h3>${props.province ? `${props.province}·` : ''}${props.name}</h3>
        <p>${props.time || '暂无时间信息'}</p>
        ${props.image ? `<img src="${props.image}" alt="城市图片" style="width: 200px; height: 150px; object-fit: cover;">` : ''}
    </div>
`;

    // 点击事件
    marker.on('click', () => {
        new AMap.InfoWindow({
        content: marker.content,
        offset: new AMap.Pixel(0, -10)
        }).open(map, marker.getPosition());
    });

    overlayGroup.addOverlay(marker);
}

//创建线图层
function createPolyline(feature) {
    const path = feature.geometry.coordinates.map(
        coord => new AMap.LngLat(...coord)
    );

    const polyline = new AMap.Polyline({
        path: path,
        strokeColor: '#1890ff',
        strokeWeight: 3
    });

    overlayGroup.addOverlay(polyline);
}

//创建面图层
function createPolygon(feature) {
  const paths = feature.geometry.coordinates[0].map(
    coord => new AMap.LngLat(...coord)
  );

  const polygon = new AMap.Polygon({
    path: paths,
    fillColor: 'rgba(15,83,30,0.3)',
    strokeColor: '#0f531e',
    strokeWeight: 2
  });

  overlayGroup.addOverlay(polygon);
}
// 移除图层
function removeGeoJSONLayer() {
    overlayGroup.clearOverlays();

    //禁用移除按钮
    document.getElementById('remove-layer-btn').disabled = true;
}

// 按钮事件绑定
document.getElementById('load-layer-btn').addEventListener('click', loadGeoJSONLayer);
document.getElementById('remove-layer-btn').addEventListener('click', removeGeoJSONLayer);

// 初始化入口
if (typeof AMap !== 'undefined') {
    initMapCallback();
} else {
    initMap();
}