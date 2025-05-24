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