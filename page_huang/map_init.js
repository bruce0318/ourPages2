
// 天地图矢量底图
var tdtVec = L.tileLayer('http://t{s}.tianditu.gov.cn/vec_w/wmts?' +
    'service=WMTS&request=GetTile&version=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&' +
    'TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&format=tiles&tk=' + TDT_KEY, {
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    attribution: "天地图"
});

// 天地图注记图层（cva）
var tdtCva = L.tileLayer('http://t{s}.tianditu.gov.cn/cva_w/wmts?' +
    'service=WMTS&request=GetTile&version=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&' +
    'TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&format=tiles&tk=' + TDT_KEY, {
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
var wmsLayer = L.tileLayer.wms('http://'+ Web_IP +':8888//geoserver/maritimeday/wms', {
    layers: 'maritimeday:huang_footprints',
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
    "我的足迹": wmsLayer
};

L.control.layers(baseMaps, overlayMaps, {
    collapsed: false,
    position: 'topright'
}).addTo(map);

var measureCtl = new L.Control.Measure({
  primaryLengthUnit: 'meters',
  primaryAreaUnit:   'sqmeters',
  position:          'topright'
});
map.addControl(measureCtl);


// 2. 坐标显示（需引入 leaflet-mouseposition 插件）
L.control.mousePosition({
  position:'bottomleft',
  separator:' , ',
  numDigits:5
}).addTo(map);

// 6. WMS GetFeatureInfo 弹窗
function getFeatureInfoUrl(latlng) {
  var size = map.getSize(),
      bounds = map.getBounds().toBBoxString(),
      point = map.latLngToContainerPoint(latlng, map.getZoom());
  var params = {
    request:'GetFeatureInfo', service:'WMS', srs:'EPSG:4326',
    styles:'', version:'1.1.1', format:'image/png', transparent:true,
    bbox:bounds, width:size.x, height:size.y,
    layers:'maritimeday:huang_footprints',
    query_layers:'maritimeday:huang_footprints',
    info_format:'application/json',
    x:Math.round(point.x), y:Math.round(point.y)
  };
  return 'http://'+Web_IP+':8888/geoserver/maritimeday/wms?' +
         new URLSearchParams(params).toString();
}
map.on('click', e=>{
  fetch(getFeatureInfoUrl(e.latlng))
    .then(r=>r.json())
    .then(json=>{
      if(json.features.length){
        var props = json.features[0].properties;
        L.popup()
         .setLatLng(e.latlng)
         .setContent(`<b>${props.name}</b><br>访问：${props.visited_at}`)
         .openOn(map);
      }
    });
});