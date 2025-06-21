import {addPoint} from './addPoint.js'
import {deletePoint} from './deletePoint.js'
import {updatePoint} from './updatePoint.js'
import {queryPoint} from './queryPoint.js'
import {statProvince} from './statProvince.js' 
import {statYear} from './statYear.js'

// 初始化地图实例
let map = null;
export let overlayGroup = null; // 用于存储覆盖物组
let wmsTileLayer = null;

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

    //初始化其他地图功能

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
                createPointFromGeojson(feature);
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

// 从数据库中加载数据图层
export async function reloadLayerFromDB(){
    if(map){
        map.clearInfoWindow();
    }
    
    try {
        const response = await fetch('http://47.111.136.83:5500/api/getDatabasePointsForHe');
        const geoData = await response.json();

        console.log("接收到的 GeoJSON:", geoData);
        
        // 清除旧数据
        overlayGroup.clearOverlays();
        
        // 处理 GeoJSON 数据
        if (geoData.features && Array.isArray(geoData.features)) {
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
        }
        
        // 自适应视野
        map.setFitView(overlayGroup.getOverlays());
        
        // 激活移除图层按钮
        document.getElementById('remove-layer-btn').disabled = false;
        console.log('数据库点图层加载完成');
        
    } catch (error) {
        console.error('加载数据库点数据失败：', error);
    }
}

//通过本地geojson创建点图层
export function createPointFromGeojson(feature) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        offset: new AMap.Pixel(0, 0)
    });

    marker.cityName = props.name; //添加城市名称属性，方便后续删除点的操作

    //信息窗口代码
    marker.content = `
    <div class="info-window">
        <h3>${props.province ? `${props.province}·` : ''}${props.name}</h3>
        <p>${props.text || '暂无时间信息'}</p>
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

//创建点图层标记
export function createPointMarker(feature) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        offset: new AMap.Pixel(0, 0)
    });

    marker.cityName = props.city; //添加城市名称属性，方便后续删除点的操作

    //信息窗口代码
    marker.content = `
    <div class="info-window">
        <h3>${getLocationDisplay(props)}</h3>
        <p>${props.name}在${props.time}年来过这里</p>
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
export function createPolyline(feature) {
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
export function createPolygon(feature) {
//   const paths = feature.geometry.coordinates[0].map(
//     coord => new AMap.LngLat(...coord)
//   );

    const paths = feature.geometry.coordinates.map(ring => {
        return ring.map(point => new AMap.LngLat(point[0], point[1]));
    });

    const polygon = new AMap.Polygon({
        path: paths,
        fillColor: 'rgba(0,0,0,0)',
        strokeColor: '#00008B',
        strokeWeight: 2,
        strokeStyle: 'solid'
    });

  overlayGroup.addOverlay(polygon);
}



//加载GeoServer的WMS图层
function loadGeoServerWMSLayer() {
    if (wmsTileLayer) {
        wmsTileLayer.setMap(null);
    }

    wmsTileLayer = new AMap.TileLayer({
        getTileUrl: function (x, y, z) {
            const bbox = getTileBBox(x, y, z);
            return `http://localhost:8080/geoserver/he/wms?service=WMS&version=1.1.1&request=GetMap
                &layers=he:he_province
                &styles=
                &bbox=${bbox}
                &width=256&height=256
                &srs=EPSG:3857
                &format=image/png
                &transparent=true`.replace(/\s+/g, '');
        },
        zIndex: 12
    });

    wmsTileLayer.setMap(map);
    console.log('GeoServer WMS 图层已加载');
}

// 计算WMS图层每个瓦片的BBOX（Web墨卡托 EPSG:3857）
function getTileBBox(x, y, z) {
    const tileSize = 256;
    const initialResolution = 2 * Math.PI * 6378137 / tileSize;
    const originShift = 2 * Math.PI * 6378137 / 2.0;

    const resolution = initialResolution / Math.pow(2, z);

    const minx = x * tileSize * resolution - originShift;
    const maxx = (x + 1) * tileSize * resolution - originShift;
    const miny = originShift - (y + 1) * tileSize * resolution;
    const maxy = originShift - y * tileSize * resolution;

    return [minx, miny, maxx, maxy].join(',');
}

// 移除图层
export function removeLayer() {
    overlayGroup.clearOverlays();

    //禁用移除按钮
    document.getElementById('remove-layer-btn').disabled = true;
}

// 移除GeoServer的WMS图层
function removeGeoServerWMSLayer() {
    if (wmsTileLayer) {
        wmsTileLayer.setMap(null); // 从地图中移除
        wmsTileLayer = null;       // 释放引用，避免重复叠加
        console.log('GeoServer WMS 图层已移除');
    } else {
        console.log('未加载 GeoServer WMS 图层');
    }
}

// 判断直辖市和特别行政区
function getLocationDisplay(props) {
    const municipalities = ['北京市', '天津市', '上海市', '重庆市'];
    const specialRegions = ['香港特别行政区', '澳门特别行政区'];
    
    // 如果是直辖市或特别行政区，直接显示城市名
    if (municipalities.includes(props.province) || 
        specialRegions.includes(props.province)) {
        return props.province;
    }
    
    // 其他情况
    return props.province ? `${props.province}·${props.city}` : props.city;
}


// 全区按钮ID列表
const controlButtonIds = [
    'load-layer-btn',
    'remove-layer-btn',
    'load-layer-fromDB-btn',
    'load-geoserver_layer-btn',
    'remove-geoserver_layer-btn',
    'add-point-btn',
    'delete-point-btn',
    'update-point-btn',
    'query-point-btn',
    'stat-province-btn'
];

// 添加按钮禁用/启用函数
export function setButtonsDisabled(disabled) {
    controlButtonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = disabled;
        }
    });
}

// 按钮事件绑定
document.getElementById('load-layer-btn').addEventListener('click', loadGeoJSONLayer);
document.getElementById('remove-layer-btn').addEventListener('click', removeLayer);
document.getElementById('load-layer-fromDB-btn').addEventListener('click', reloadLayerFromDB)
document.getElementById('load-geoserver_layer-btn').addEventListener('click', loadGeoServerWMSLayer);
document.getElementById('remove-geoserver_layer-btn').addEventListener('click', removeGeoServerWMSLayer);
document.getElementById('add-point-btn').addEventListener('click', () => {addPoint(map, overlayGroup);});
document.getElementById('delete-point-btn').addEventListener('click', () => {deletePoint(overlayGroup);});
document.getElementById('update-point-btn').addEventListener('click', () => {updatePoint(overlayGroup);});
document.getElementById('query-point-btn').addEventListener('click', () => {queryPoint(map);});
document.getElementById('stat-province-btn').addEventListener('click', () => {statProvince(map);});

// 时间轴按钮绑定
document.getElementById('stat-year-btn').addEventListener('click', () => {
    const startYear = document.getElementById('year-start').value;
    const endYear = document.getElementById('year-end').value;
    statYear(startYear, endYear);
});
document.getElementById('reset-time-filter').addEventListener('click', () => {
    // 重置滑块位置
    document.getElementById('year-start').value = 2014;
    document.getElementById('year-end').value = 2025;
    document.getElementById('start-year-display').textContent = 2015 + '年以前';
    document.getElementById('end-year-display').textContent = 2025 + '年';
    // 清除时间筛选效果
    reloadLayerFromDB();
});

// 添加滑块值显示更新
document.getElementById('year-start').addEventListener('input', function() {
    if(this.value < 2015){
        document.getElementById('start-year-display').textContent = '2015年以前';
    }else{
    document.getElementById('start-year-display').textContent = this.value  + '年';
    }
});

document.getElementById('year-end').addEventListener('input', function() {
    document.getElementById('end-year-display').textContent = this.value  + '年';
});

// 初始化入口
if (typeof AMap !== 'undefined') {
    initMapCallback();
} else {
    initMap();
}