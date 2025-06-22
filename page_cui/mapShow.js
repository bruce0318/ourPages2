import {addPoint} from './addPoint.js'
import {deletePoint} from './deletePoint.js'
import {updatePoint} from './updatePoint.js'
import {queryPoint} from './queryPoint.js'
import {statProvince} from './statProvince.js' 
import {statYear} from './statYear.js'

// 初始化地图实例
let map = null;
export let overlayGroup = null; // 用于存储覆盖物组

// 初始化地图
function initMap() {
    // 创建地图实例
    map = L.map('map').setView([35.861, 104.195], 4); // 中国中心

    // 加载天地图底图（矢量图层 + 注记）
    var vec = L.tileLayer('https://t{s}.tianditu.gov.cn/vec_w/wmts?' +
      'service=WMTS&request=GetTile&version=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&' +
      'FORMAT=tiles&tileMatrix={z}&tileRow={y}&tileCol={x}&tk=527522fcd90b3700d477f942a2ee2bf9', {
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
      attribution: '&copy; <a href="http://www.tianditu.gov.cn">天地图</a>'
    });

    var cva = L.tileLayer('https://t{s}.tianditu.gov.cn/cva_w/wmts?' +
      'service=WMTS&request=GetTile&version=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&' +
      'FORMAT=tiles&tileMatrix={z}&tileRow={y}&tileCol={x}&tk=527522fcd90b3700d477f942a2ee2bf9', {
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
    });

    vec.addTo(map);
    cva.addTo(map);
    L.control.scale().addTo(map);

    // 初始化覆盖物组
    overlayGroup = L.layerGroup().addTo(map);

    console.log('地图加载完成');
}

// 加载GeoJSON数据
async function loadGeoJSONLayer() {
    try {
        const response = await fetch('./page_he/data/cities.geojson');
        const geoData = await response.json();

        // 清除旧数据
        overlayGroup.clearLayers();

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
        if (overlayGroup.getLayers().length > 0) {
            map.fitBounds(overlayGroup.getBounds());
        }

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
        map.closePopup();
    }
    
    try {
        const response = await fetch('http://localhost:5500/api/getDatabasePointsForCui');
        const geoData = await response.json();

        console.log("接收到的 GeoJSON:", geoData);
        
        // 清除旧数据
        overlayGroup.clearLayers();
        
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
        if (overlayGroup.getLayers().length > 0) {
            map.fitBounds(overlayGroup.getBounds());
        }
        
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

    const marker = L.marker([lat, lng]);

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
        marker.bindPopup(marker.content).openPopup();
    });

    overlayGroup.addLayer(marker);
}

//创建点图层标记
export function createPointMarker(feature) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    const marker = L.marker([lat, lng]);

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
        marker.bindPopup(marker.content).openPopup();
    });

    overlayGroup.addLayer(marker);
}

//创建线图层
export function createPolyline(feature) {
    const path = feature.geometry.coordinates.map(
        coord => [coord[1], coord[0]] // Leaflet使用[lat, lng]格式
    );

    const polyline = L.polyline(path, {
        color: '#1890ff',
        weight: 3
    });

    overlayGroup.addLayer(polyline);
}

//创建面图层
export function createPolygon(feature) {
    const paths = feature.geometry.coordinates.map(ring => {
        return ring.map(point => [point[1], point[0]]); // Leaflet使用[lat, lng]格式
    });

    const polygon = L.polygon(paths, {
        fillColor: 'rgba(0,0,0,0)',
        color: '#00008B',
        weight: 2
    });

    overlayGroup.addLayer(polygon);
}

// 移除图层
export function removeLayer() {
    overlayGroup.clearLayers();

    //禁用移除按钮
    document.getElementById('remove-layer-btn').disabled = true;
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

// 等待DOM加载完成后绑定事件
document.addEventListener('DOMContentLoaded', function() {
    // 按钮事件绑定
    document.getElementById('load-layer-btn').addEventListener('click', loadGeoJSONLayer);
    document.getElementById('remove-layer-btn').addEventListener('click', removeLayer);
    document.getElementById('load-layer-fromDB-btn').addEventListener('click', reloadLayerFromDB);
    document.getElementById('add-point-btn').addEventListener('click', () => {addPoint(map, overlayGroup);});
    document.getElementById('delete-point-btn').addEventListener('click', () => {deletePoint(overlayGroup);});
    document.getElementById('update-point-btn').addEventListener('click', () => {updatePoint(overlayGroup);});
    document.getElementById('query-point-btn').addEventListener('click', () => {queryPoint(map);});
    document.getElementById('stat-province-btn').addEventListener('click', () => {statProvince();});

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
});

// 初始化地图
initMap();

// 导出map变量供其他模块使用
export { map }; 