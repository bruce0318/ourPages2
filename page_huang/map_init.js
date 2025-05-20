
// 天地图矢量底图
var tdtVec = L.tileLayer('http://t{s}.tianditu.gov.cn/vec_w/wmts?' +
    'service=WMTS&request=GetTile&version=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&' +
    'TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&format=tiles&tk=c696a63eb65a93f18f23a897c28f20b6', {
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: "天地图"
});

// 天地图注记图层（cva）
var tdtCva = L.tileLayer('http://t{s}.tianditu.gov.cn/cva_w/wmts?' +
    'service=WMTS&request=GetTile&version=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&' +
    'TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&format=tiles&format=tiles&tk=c696a63eb65a93f18f23a897c28f20b6', {
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: "天地图注记"
});

// 初始化地图
var map = L.map('map', {
    center: [30.6, 114.3],  // 武汉大学
    zoom: 8,
    layers: [tdtVec, tdtCva]
});

// 添加比例尺控件
L.control.scale().addTo(map);

// 添加 GeoServer 图层
var wmsLayer = L.tileLayer.wms('http://localhost:8080/geoserver/maritimeday/wms', {
    layers: 'maritimeday:footprints2',
    format: 'image/png',
    transparent: true,
    attribution: "成员足迹图层"
});
wmsLayer.addTo(map);

// 图层控制器
var baseMaps = {
    "天地图矢量": tdtVec
};

var overlayMaps = {
    "注记图层": tdtCva,
    "成员足迹": wmsLayer
};

L.control.layers(baseMaps, overlayMaps, {
    collapsed: false,
    position: 'topright'
}).addTo(map);