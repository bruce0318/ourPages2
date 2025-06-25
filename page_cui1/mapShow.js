import {addPoint} from './addPoint.js'
import {deletePoint} from './deletePoint.js'
import {updatePoint} from './updatePoint.js'
import {queryPoint} from './queryPoint.js'
import {statProvince} from './statProvince.js' 
import {statYear} from './statYear.js'
import { calculateStatistics, updateStatistics, initStatistics } from './mapStat.js';

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
        viewMode: '3D',     
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

    // 初始化统计数据
    initStatistics();

    if(typeof AMap !== 'undefined' && window.map){
        // 比例尺
        window.map.addControl(new AMap.Scale());
        // 指南针+缩放
        window.map.addControl(new AMap.ControlBar({
            position: {right: '10px', top: '60px'}
        }));
    }
}


// 加载GeoJSON数据
// async function loadGeoJSONLayer() {
//     try {
//         const response = await fetch('./page_cui1/data/cities.geojson');
//         const geoData = await response.json();

//         // 清除旧数据
//         overlayGroup.clearOverlays();

//         // 遍历要素处理
//         geoData.features.forEach(feature => {
//             switch(feature.geometry.type) {
//                 case 'Point':
//                 createPointFromGeojson(feature);
//                 break;
//                 case 'LineString':
//                 createPolyline(feature);
//                 break;
//                 case 'Polygon':
//                 createPolygon(feature);
//                 break;
//             }
//         });

//         // 自适应视野
//         map.setFitView(overlayGroup.getOverlays());

//         //激活移除图层按钮
//         document.getElementById('remove-layer-btn').disabled = false;
//         console.log('图层加载完成');

//     } catch (error) {
//         console.error('加载GeoJSON数据失败：', error);
//     }
// }

// 从数据库中加载数据图层
export async function reloadLayerFromDB(){
    if(map){
        map.clearInfoWindow();
    }
    
    try {
        const response = await fetch('http://47.111.136.83:5500/api/getDatabasePointsForCui');
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

         // 计算并更新统计数据
        const { cityCount, provinceCount } = calculateStatistics(geoData);
        updateStatistics(cityCount, provinceCount);
        
        // 自适应视野
        map.setFitView(overlayGroup.getOverlays());
        
        // 激活移除图层按钮
        document.getElementById('remove-layer-btn').disabled = false;
        console.log('数据库点图层加载完成');
        
    } catch (error) {
        console.error('加载数据库点数据失败：', error);
    }
}

// 创建FontAwesome蓝色地图标记SVG
const blueMarkerSVG = 'data:image/svg+xml;utf8,<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="%233498db" stroke="white" stroke-width="3"/><path d="M16 8C12.6863 8 10 10.6863 10 14C10 17.3137 16 24 16 24C16 24 22 17.3137 22 14C22 10.6863 19.3137 8 16 8ZM16 16.5C14.6193 16.5 13.5 15.3807 13.5 14C13.5 12.6193 14.6193 11.5 16 11.5C17.3807 11.5 18.5 12.6193 18.5 14C18.5 15.3807 17.3807 16.5 16 16.5Z" fill="white"/></svg>';

//通过本地geojson创建点图层
export function createPointFromGeojson(feature) {
    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties;

    const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        offset: new AMap.Pixel(0, 0),
        icon: new AMap.Icon({
            image: blueMarkerSVG,
            size: new AMap.Size(32, 32),
            imageSize: new AMap.Size(32, 32)
        })
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
        offset: new AMap.Pixel(-16, -16),
        icon: new AMap.Icon({
            image: blueMarkerSVG,
            size: new AMap.Size(32, 32),
            imageSize: new AMap.Size(32, 32)
        })
    });

    marker.cityName = props.city; //添加城市名称属性，方便后续删除点的操作

    //信息窗口代码
    marker.content = `
    <div class="info-window">
        <p class="location-title">${getLocationDisplay(props)}</p>
        <p class="visit-info">${props.name}在${props.time}年来过这里</p>
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

// 移除图层
export function removeLayer() {
    overlayGroup.clearOverlays();

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
document.getElementById('remove-layer-btn').addEventListener('click', removeLayer);
document.getElementById('load-layer-fromDB-btn').addEventListener('click', reloadLayerFromDB);
document.getElementById('add-point-btn').addEventListener('click', () => {addPoint(map, overlayGroup);});
document.getElementById('delete-point-btn').addEventListener('click', () => {deletePoint(overlayGroup);});
document.getElementById('update-point-btn').addEventListener('click', () => {updatePoint(overlayGroup);});
document.getElementById('query-point-btn').addEventListener('click', () => {queryPoint(map);});
document.getElementById('stat-province-btn').addEventListener('click', () => {statProvince(map);});

// 新增：底部新增、删除、修改按钮触发同样功能
const addBottomBtn = document.getElementById('add-point-bottom-btn');
if(addBottomBtn){
    addBottomBtn.addEventListener('click', function(){
        document.getElementById('add-point-btn').click();
    });
}
const deleteBottomBtn = document.getElementById('delete-point-bottom-btn');
if(deleteBottomBtn){
    deleteBottomBtn.addEventListener('click', function(){
        document.getElementById('delete-point-btn').click();
    });
}
const updateBottomBtn = document.getElementById('update-point-bottom-btn');
if(updateBottomBtn){
    updateBottomBtn.addEventListener('click', function(){
        document.getElementById('update-point-btn').click();
    });
}

// 新增：底部按钮触发同样功能
const bottomBtn = document.getElementById('load-layer-bottom-btn');
if(bottomBtn){
    bottomBtn.addEventListener('click', function(){
        document.getElementById('load-layer-fromDB-btn').click();
    });
}

// 新增：底部移除按钮触发同样功能
const removeBottomBtn = document.getElementById('remove-layer-bottom-btn');
if(removeBottomBtn){
    removeBottomBtn.addEventListener('click', function(){
        document.getElementById('remove-layer-btn').click();
    });
}

// 年份筛选区逻辑
const yearRange = document.getElementById('year-range');
const yearRangeDisplay = document.getElementById('year-range-display');
let yearStart = 2014;
let yearEnd = 2025;

// 双滑块实现（单条双滑块）
// 这里用两个input[type=range]叠加实现
const yearSliderWrap = document.querySelector('.year-slider-wrap');
if (yearSliderWrap) {
    // 移除原单滑块
    yearSliderWrap.innerHTML = `
        <input type="range" id="year-start-bottom" min="2014" max="2025" value="2014" class="year-slider">
        <input type="range" id="year-end-bottom" min="2014" max="2025" value="2025" class="year-slider">
        <div class="year-labels">
            <span id="year-range-display">2014 - 2025</span>
        </div>
    `;
    const yearStartInput = document.getElementById('year-start-bottom');
    const yearEndInput = document.getElementById('year-end-bottom');
    const yearRangeDisplay = document.getElementById('year-range-display');
    function updateYearDisplay() {
        let start = parseInt(yearStartInput.value);
        let end = parseInt(yearEndInput.value);
        if (start > end) [start, end] = [end, start];
        yearStartInput.value = start;
        yearEndInput.value = end;
        yearRangeDisplay.textContent = `${start} - ${end}`;
    }
    yearStartInput.addEventListener('input', updateYearDisplay);
    yearEndInput.addEventListener('input', updateYearDisplay);
    updateYearDisplay();
}
// 按钮逻辑复用
const statYearBtnBottom = document.getElementById('stat-year-btn-bottom');
if(statYearBtnBottom){
    statYearBtnBottom.addEventListener('click', function(){
        const start = document.getElementById('year-start-bottom').value;
        const end = document.getElementById('year-end-bottom').value;
        // 同步顶部滑块
        document.getElementById('year-start').value = start;
        document.getElementById('year-end').value = end;
        // 手动触发input事件，更新顶部显示
        document.getElementById('year-start').dispatchEvent(new Event('input'));
        document.getElementById('year-end').dispatchEvent(new Event('input'));
        // 触发原有筛选
        document.getElementById('stat-year-btn').click();
    });
}
const resetTimeBtnBottom = document.getElementById('reset-time-filter-bottom');
if(resetTimeBtnBottom){
    resetTimeBtnBottom.addEventListener('click', function(){
        document.getElementById('reset-time-filter').click();
        document.getElementById('year-start-bottom').value = 2014;
        document.getElementById('year-end-bottom').value = 2025;
        document.getElementById('year-range-display').textContent = '2014 - 2025';
    });
}

// 地图内左上查询按钮
const queryTopBtn = document.getElementById('query-point-btn-top');
if(queryTopBtn){
    queryTopBtn.addEventListener('click', function(){
        document.getElementById('query-input').value = document.getElementById('query-input-top').value;
        document.getElementById('query-point-btn').click();
    });
}
// 地图内右上统计按钮
const statTopBtn = document.getElementById('stat-province-btn-top');
if(statTopBtn){
    statTopBtn.addEventListener('click', function(){
        document.getElementById('province-select').value = document.getElementById('province-select-top').value;
        document.getElementById('stat-province-btn').click();
    });
}

// 右下角统计面板显示/隐藏按钮
const showOverlayBtn = document.getElementById('show-overlay-btn');
const mapOverlay = document.querySelector('.map-overlay');
let overlayInBottomRight = false;
if(showOverlayBtn && mapOverlay){
    showOverlayBtn.addEventListener('click', function(){
        overlayInBottomRight = !overlayInBottomRight;
        if(overlayInBottomRight){
            mapOverlay.classList.add('bottom-right');
            mapOverlay.style.display = 'block';
        }else{
            mapOverlay.classList.remove('bottom-right');
            mapOverlay.style.display = '';
        }
    });
}

// 初始化入口
if (typeof AMap !== 'undefined') {
    initMapCallback();
} else {
    initMap();
}