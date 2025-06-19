 var map = L.map('map').setView([30.5928, 114.3055], 12); // 武汉为例

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
  // 添加 GeoServer 图层
var cui_point = L.tileLayer.wms("http://47.110.54.187:8888/geoserver/cui/wms", {
    layers: 'cui:cui_point',
    format: 'image/png',
    transparent: true,
    attribution: "足迹图层"
});
cui_point.addTo(map);


// 添加 GeoServer 图层
var wmsLayer = L.tileLayer.wms('http://'+ Web_IP +':8888//geoserver/maritimeday/wms', {
    layers: 'maritimeday:lena_footprints',
    format: 'image/png',
    transparent: true,
    attribution: "足迹图层"
});
wmsLayer.addTo(map);

var cui_point11 = L.tileLayer.wms("localhost:8888/geoserver/cui/wms", {
    layers: 'cui:cui_point',
    format: 'image/png',
    transparent: true,
    attribution: "足迹图层"
});
cui_point11.addTo(map);

map.on('click', function(e) {
      var bbox = map.getBounds().toBBoxString();
      var size = map.getSize();
      var url = 'http://47.110.54.187:8888/geoserver/cui/wms' +
        '?SERVICE=WMS' +
        '&VERSION=1.1.1' +
        '&REQUEST=GetFeatureInfo' +
        '&LAYERS=cui:cui_point' +
        '&QUERY_LAYERS=cui:cui_point' +
        '&STYLES=' +
        '&BBOX=' + bbox +
        '&FEATURE_COUNT=1' +
        '&HEIGHT=' + size.y +
        '&WIDTH=' + size.x +
        '&FORMAT=image/png' +
        '&INFO_FORMAT=application/json' +
        '&SRS=EPSG:4326' +
        '&X=' + Math.floor(map.layerPointToContainerPoint(e.layerPoint).x) +
        '&Y=' + Math.floor(map.layerPointToContainerPoint(e.layerPoint).y);

      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.features && data.features.length) {
            var feat = data.features[0];
            var fid = feat.id;  // 形如 "cui:cui_point.7"
            // 5. 弹出确认对话框
            if (confirm('确定要删除 ID = ' + fid + ' 的点位吗？')) {
              deleteFeature(fid);
            }
          }
        })
        .catch(function(err) {
          console.error('GetFeatureInfo 错误：', err);
        });
    });

    function deleteFeature(featureId) {
      var xml =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<wfs:Transaction service="WFS" version="1.0.0" ' +
            'xmlns:wfs="http://www.opengis.net/wfs" ' +
            'xmlns:ogc="http://www.opengis.net/ogc" ' +
            'xmlns:cui="http://example.com/cui">' +
          '<wfs:Delete typeName="cui:cui_point">' +
            '<ogc:Filter>' +
              '<ogc:FeatureId fid="' + featureId + '"/>' +
            '</ogc:Filter>' +
          '</wfs:Delete>' +
        '</wfs:Transaction>';

      fetch('http://47.110.54.187:8888/geoserver/wfs', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml
      })
      .then(function(response) {
        if (!response.ok) throw new Error('网络错误');
        return response.text();
      })
      .then(function(text) {
        console.log('删除响应：', text);
        // 7. 刷新 WMS 图层（加时间戳避免缓存）
        wmsLayer.setParams({ _t: Date.now() });
      })
      .catch(function(err) {
        console.error('删除失败：', err);
        alert('删除操作失败，请查看控制台日志');
      });
    }