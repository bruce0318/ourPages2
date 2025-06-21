const API_HOST = `http://${Web_IP}:8090`;  
const FOOTPRINTS_URL = `${API_HOST}/api/footprints`;

// 全局变量
let currentMode = 'view'; // 'view', 'edit', 'delete'
let currentEditId = null;
let timelineData = [];
let markersByYear = new Map(); // Store markers by year for interaction
let travelPolyline = null; // To hold the travel path
let isPolylineVisible = false; // Toggles the travel path visibility

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
    crs: L.CRS.EPSG3857,
    layers: [tdtVec, tdtCva]
});

// 添加比例尺控件
L.control.scale().addTo(map);

// 添加 GeoServer 图层
/*
var wmsLayer = L.tileLayer.wms('http://'+ Web_IP +':8888//geoserver/maritimeday/wms', {
    layers: 'maritimeday:lena_footprints',
    format: 'image/png',
    transparent: true,
    attribution: "足迹图层"
});
wmsLayer.addTo(map);
*/

// 图层控制器
var baseMaps = {
    "天地图矢量": tdtVec
};

var overlayMaps = {
    "注记图层": tdtCva,
    //"我的足迹": wmsLayer
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

// 足迹图层 - 使用聚类解决重合问题
var footprintLayer = L.markerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  maxClusterRadius: 50, // 减小聚类半径，让重合点更容易分离
  iconCreateFunction: function(cluster) {
    var count = cluster.getChildCount();
    var className = 'marker-cluster-';
    if (count < 3) {
      className += 'small';
    } else if (count < 10) {
      className += 'medium';
    } else {
      className += 'large';
    }
    return L.divIcon({
      html: '<div><span>' + count + '</span></div>',
      className: 'marker-cluster ' + className,
      iconSize: L.point(40, 40)
    });
  }
}).addTo(map);

// 绘制控件
var drawControl = new L.Control.Draw({
  draw: {
    marker: true, 
    polyline: false, 
    polygon: false,
    rectangle: false, 
    circle: false, 
    circlemarker: false
  },
  edit: { 
    featureGroup: footprintLayer, 
    remove: true 
  }
});
map.addControl(drawControl);

// Add a layer for the travel polyline
const polylineLayer = L.layerGroup().addTo(map);

// --- UI Helper Functions ---
function showMapLoader() {
  const loader = document.getElementById('map-loader');
  if (loader) loader.style.display = 'flex';
}

function hideMapLoader() {
  const loader = document.getElementById('map-loader');
  if (loader) loader.style.display = 'none';
}

// 渲染地图标记
function renderMarkers(data) {
  footprintLayer.clearLayers();
  markersByYear.clear(); // Clear the old mapping

  if (!data || data.length === 0) {
    return;
  }

  const markerData = new Map();

  // Consolidate data for each unique location
  data.forEach(fp => {
    if (!fp.geom || !fp.geom.coordinates) return;
    const key = fp.geom.coordinates.join(',');
    if (!markerData.has(key)) {
      markerData.set(key, {
        latlng: [fp.geom.coordinates[1], fp.geom.coordinates[0]],
        footprints: []
      });
    }
    markerData.get(key).footprints.push(fp);
  });

  // Create markers
  markerData.forEach(locData => {
    const marker = L.marker(locData.latlng, {
        title: locData.footprints.map(fp => `${fp.city} (${fp.year})`).join('\n')
      })
      .bindPopup(`<div style="max-height: 200px; overflow: auto;">${makePopupHtml(locData.footprints)}</div>`, {
        maxWidth: 350,
        minWidth: 250
      });
    
    // Associate footprint data with the marker
    marker.footprintData = locData.footprints;
    footprintLayer.addLayer(marker);

    // Populate markersByYear map
    locData.footprints.forEach(fp => {
      if (!markersByYear.has(fp.year)) {
        markersByYear.set(fp.year, []);
      }
      markersByYear.get(fp.year).push(marker);
    });
  });
}

// 创建时间轴容器
function createTimelineContainer() {
  // 检查是否已存在
  let timelineContainer = document.getElementById('timeline-section');
  if (timelineContainer) {
    return timelineContainer;
  }

  // 如果不存在（理论上不应该发生），创建新的时间轴区域
  timelineContainer = document.createElement('div');
  timelineContainer.id = 'timeline-section';
  timelineContainer.style.cssText = `
    background: #ffffff; /* White background */
    border-radius: 10px;
    margin-top: 20px; /* Space from operation panel */
    padding: 15px 20px; /* Reduced vertical padding */
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  
  timelineContainer.innerHTML = `
    <div class="section-title text-left" style="display: flex; align-items: center; margin-bottom: 10px;">
      <div style="flex-grow: 1;">
        <h3>📊 足迹时间轴</h3>
        <p style="margin-bottom: 0;">点击年份可在地图上筛选</p>
      </div>
      <button id="clear-timeline-filter" class="btn btn-sm btn-outline-secondary" style="display: none;">显示全部</button>
    </div>
    <div id="timeline-chart" style="height: 180px; width: 100%;">
      <div style="text-align: center; color: #666; padding-top: 70px;">
        暂无数据，请先添加一些足迹记录
      </div>
    </div>
  `;
  
  // 插入到地图区域的操作面板后面
  const operationPanel = document.getElementById('operation-panel');
  if (operationPanel && operationPanel.parentNode) {
    operationPanel.parentNode.insertBefore(timelineContainer, operationPanel.nextSibling);
  }
  
  return timelineContainer;
}

// 生成时间轴图表
function generateTimeline(data) {
  const timelineContainer = createTimelineContainer();
  const chartDiv = document.getElementById('timeline-chart');
  
  if (!data || data.length === 0) {
    chartDiv.innerHTML = `
      <div style="text-align: center; color: #666; padding-top: 100px;">
        暂无数据，请先添加一些足迹记录
      </div>
    `;
    return;
  }
  
  // 按年份分组统计
  const yearStats = {};
  data.forEach(item => {
    const year = item.year;
    if (!yearStats[year]) {
      yearStats[year] = {
        count: 0,
        cities: new Set(),
        provinces: new Set()
      };
    }
    yearStats[year].count++;
    yearStats[year].cities.add(item.city);
    if (item.province) {
      yearStats[year].provinces.add(item.province);
    }
  });
  
  // 转换为图表数据
  const chartData = Object.keys(yearStats).sort().map(year => ({
    year: parseInt(year),
    count: yearStats[year].count,
    cities: Array.from(yearStats[year].cities).join(', '),
    provinces: Array.from(yearStats[year].provinces).join(', ')
  }));
  
  // 创建时间轴HTML
  const timelineHtml = `
    <div style="display: flex; align-items: center; height: 100%; overflow-x: auto; padding: 10px;">
      ${chartData.map((item, index) => `
        <div style="display: flex; flex-direction: column; align-items: center; margin: 0 20px; min-width: 100px;">
          <div class="timeline-node" data-year="${item.year}" style="
            width: ${Math.max(30, item.count * 10)}px; 
            height: ${Math.max(30, item.count * 10)}px; 
            background: linear-gradient(45deg, #4CAF50, #2196F3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            cursor: pointer;
          " 
          title="${item.year}年: ${item.count}个足迹点\n城市: ${item.cities}\n省份: ${item.provinces}">
            ${item.count}
          </div>
          <div style="text-align: center; font-size: 14px; color: #333;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${item.year}</div>
            <div style="font-size: 12px; color: #666; max-width: 100px; overflow: hidden; text-overflow: ellipsis;" title="${item.cities}">
              ${item.cities}
            </div>
          </div>
          ${index < chartData.length - 1 ? '<div style="width: 40px; height: 3px; background: linear-gradient(90deg, #ddd, #bbb); margin: 0 10px; border-radius: 2px;"></div>' : ''}
        </div>
      `).join('')}
    </div>
  `;
  
  chartDiv.innerHTML = timelineHtml;

  // --- Add Timeline Interactions ---
  chartDiv.querySelectorAll('.timeline-node').forEach(node => {
    const year = parseInt(node.dataset.year, 10);
    const markersForYear = markersByYear.get(year) || [];

    // Click to filter and zoom
    node.addEventListener('click', () => {
      filterFootprintsByYear(year, node);
      if (markersForYear.length > 0) {
        const featureGroup = L.featureGroup(markersForYear);
        map.fitBounds(featureGroup.getBounds().pad(0.1));
      }
    });

    // Hover to highlight
    node.addEventListener('mouseover', () => {
      markersForYear.forEach(m => m.getElement()?.classList.add('highlight-marker'));
    });
    node.addEventListener('mouseout', () => {
      markersForYear.forEach(m => m.getElement()?.classList.remove('highlight-marker'));
    });
  });

  // 绑定"显示全部"按钮
  const clearButton = document.getElementById('clear-timeline-filter');
  clearButton.style.display = 'block';
  clearButton.onclick = () => {
    renderMarkers(timelineData);
    chartDiv.querySelectorAll('.timeline-node.active').forEach(n => n.classList.remove('active'));
    // 隐藏自身
    clearButton.style.display = 'none';
  };
}

// 根据年份筛选足迹
function filterFootprintsByYear(year, clickedNode) {
    const filteredData = timelineData.filter(fp => fp.year === year);
    renderMarkers(filteredData);

    // 高亮选中年份
    const chartDiv = document.getElementById('timeline-chart');
    chartDiv.querySelectorAll('.timeline-node.active').forEach(node => {
        node.classList.remove('active');
    });
    if (clickedNode) {
        clickedNode.classList.add('active');
    }

    // 显示"显示全部"按钮
    document.getElementById('clear-timeline-filter').style.display = 'block';
}

// 生成弹窗HTML
function makePopupHtml(group) {
  if (currentMode === 'view') {
    return group.map(fp => `
      <div style="margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
        <strong>ID：</strong>${fp.id}<br>
        <strong>名称：</strong>${fp.name}<br>
        <strong>年份：</strong>${fp.year}<br>
        <strong>省份：</strong>${fp.province || '未知'}<br>
        <strong>城市：</strong>${fp.city}
      </div>
    `).join('');
  } else if (currentMode === 'edit') {
    return group.map(fp => `
      <div style="margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
        <strong>ID：</strong>${fp.id}<br>
        <strong>名称：</strong>${fp.name}<br>
        <strong>年份：</strong>${fp.year}<br>
        <strong>省份：</strong>${fp.province || '未知'}<br>
        <strong>城市：</strong>${fp.city}<br>
        <button class="btn btn-warning btn-sm edit-btn" data-id="${fp.id}" style="margin-top: 5px;">
          ✏️ 编辑此记录
        </button>
      </div>
    `).join('');
  } else if (currentMode === 'delete') {
    return group.map(fp => `
      <div style="margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 8px;">
        <strong>ID：</strong>${fp.id}<br>
        <strong>名称：</strong>${fp.name}<br>
        <strong>年份：</strong>${fp.year}<br>
        <strong>省份：</strong>${fp.province || '未知'}<br>
        <strong>城市：</strong>${fp.city}<br>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${fp.id}" style="margin-top: 5px;">
          🗑️ 删除此记录
        </button>
      </div>
    `).join('');
  }
}

function drawTravelPolyline(data) {
  polylineLayer.clearLayers();

  if (!data || data.length < 2) return;

  // Sort data chronologically
  const sortedData = [...data].sort((a, b) => a.year - b.year);

  const latLngs = sortedData
    .map(fp => {
      if (!fp.geom || !fp.geom.coordinates) return null;
      return [fp.geom.coordinates[1], fp.geom.coordinates[0]]; // lat, lng
    })
    .filter(p => p !== null);

  if (latLngs.length < 2) return;

  travelPolyline = L.polyline(latLngs, {
    color: '#3388ff',
    weight: 3,
    opacity: 0.7,
    dashArray: '5, 10'
  }).addTo(polylineLayer);
}

// 加载足迹数据
function loadFootprints(province) {
  showMapLoader();
  let url = `${API_HOST}/api/footprints?name=黄卉然`;
  if (province) {
    url += `&province=${encodeURIComponent(province)}`;
  }

  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(response => {
      // 检查API响应格式
      if (!response.success) {
        throw new Error(response.message || '查询失败');
      }
      
      const data = response.data || [];
      timelineData = data; // 保存数据用于时间轴
      renderMarkers(data);
      if (isPolylineVisible) drawTravelPolyline(data);

      // 自动更新时间轴
      generateTimeline(data);

      // 如果是省份查询且有数据，自动缩放到查到的点位
      if (province && data.length > 0) {
        // 获取所有标记点的边界
        const markers = [];
        data.forEach(fp => {
          if (fp.geom && fp.geom.coordinates) {
            const latlng = [fp.geom.coordinates[1], fp.geom.coordinates[0]];
            markers.push(latlng);
          }
        });
        
        if (markers.length > 0) {
          // 创建边界并缩放到合适的大小
          const bounds = L.latLngBounds(markers);
          map.fitBounds(bounds, {
            padding: [20, 20], // 添加一些内边距
            maxZoom: 12 // 限制最大缩放级别，避免过度放大
          });
        }
      }
    })
    .catch(err => {
      console.error('loadFootprints 出错：', err);
      alert('加载数据失败：' + err.message);
    })
    .finally(() => {
      hideMapLoader();
    });
}

// 加载所有足迹
function loadAllFootprints() {
  showMapLoader();
  fetch(`${API_HOST}/api/footprints`)
    .then(r => r.json())
    .then(response => {
      if (!response.success) {
        throw new Error(response.message || '查询失败');
      }
      
      const data = response.data || [];
      timelineData = data;
      renderMarkers(data);
      if (isPolylineVisible) drawTravelPolyline(data);
      
      // 更新时间轴
      generateTimeline(data);
    })
    .catch(err => {
      console.error('loadAllFootprints 出错：', err);
      alert('加载数据失败：' + err.message);
    })
    .finally(() => {
      hideMapLoader();
    });
}

// 编辑足迹
function editFootprint(id) {
  fetch(`${API_HOST}/api/footprints?id=${id}`)
    .then(r => r.json())
    .then(response => {
      if (!response.success) {
        throw new Error(response.message || '查询失败');
      }
      
      const fp = response.data[0]; // 获取第一条记录
      if (!fp) {
        throw new Error('未找到足迹记录');
      }
      
      // 填充表单 - 只填充城市，省份由后端自动获取
      document.getElementById('addName').value = fp.name;
      document.getElementById('addYear').value = fp.year;
      document.getElementById('addLocation').value = fp.city;
      currentEditId = id;
      
      // 显示模态框 (使用jQuery)
      $('#addModal').modal('show');
    })
    .catch(err => {
      console.error('获取足迹数据失败：', err);
      alert('获取数据失败：' + err.message);
    });
}

// 删除足迹
function deleteFootprint(id) {
  if (!confirm('确定要删除这条足迹记录吗？此操作不可撤销。')) {
    return;
  }
  
  fetch(`${API_HOST}/api/footprints/${id}`, { 
    method: 'DELETE' 
  })
    .then(res => res.json())
    .then(response => {
      if (!response.success) {
        throw new Error(response.message || '删除失败');
      }
      alert('删除成功！');
      map.closePopup();
      loadFootprints(); // 重新加载
    })
    .catch(err => {
      console.error('删除失败：', err);
      alert('删除失败：' + err.message);
    });
}

// 保存足迹（新增或更新）
function saveFootprint() {
  const name = document.getElementById('addName').value.trim();
  const year = parseInt(document.getElementById('addYear').value, 10);
  const city = document.getElementById('addLocation').value.trim();

  if (!name || !year || !city) {
    alert('请完整填写姓名、年份和城市');
    return;
  }

  const payload = {
    name: name,
    year: year,
    city: city
  };

  const url = currentEditId 
    ? `${API_HOST}/api/footprints/${currentEditId}`
    : `${API_HOST}/api/footprints/post`;
  
  const method = currentEditId ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(response => {
    if (!response.success) {
      throw new Error(response.message || '操作失败');
    }
    
    // 关闭模态框 (使用jQuery)
    $('#addModal').modal('hide');
    const isEdit = currentEditId;
    currentEditId = null;
    loadFootprints();
    alert(isEdit ? '更新成功！' : '添加成功！');
  })
  .catch(err => {
    console.error(err);
    alert('操作失败：' + err.message);
  });
}

// 切换模式
function switchMode(mode) {
  currentMode = mode;
  
  // 更新按钮状态
  document.querySelectorAll('#operation-panel .btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 高亮当前模式按钮
  if (mode === 'edit') {
    document.getElementById('btnEditMode').classList.add('active');
  } else if (mode === 'delete') {
    document.getElementById('btnDeleteMode').classList.add('active');
  } else {
    document.getElementById('btnLoad').classList.add('active');
  }
  
  // 重新加载足迹以更新弹窗内容
  loadFootprints();
}

// 事件监听器
map.on('popupopen', e => {
  const container = e.popup._contentNode;

  // 编辑按钮
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      editFootprint(id);
    });
  });

  // 删除按钮
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      deleteFootprint(id);
    });
  });
});

// 绘制事件
map.on('draw:created', function(e) {
  var layer = e.layer;
  layer.bindPopup(`<div style="max-height: 200px; overflow: auto;">${makePopupHtml([{ 
    id: layer._leaflet_id, 
    name: '', 
    year: new Date().getFullYear(),
    province: '', 
    city: '' 
  }])}</div>`, {
    maxWidth: 350,  // 添加宽度限制，与renderMarkers保持一致
    minWidth: 250
  }).openPopup();
  footprintLayer.addLayer(layer);
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 省份查询
  document.getElementById('btnSearchProvince').addEventListener('click', () => {
    const prov = document.getElementById('provinceInput').value.trim();
    loadFootprints(prov);
  });

  // 全部足迹
  document.getElementById('btnLoad').addEventListener('click', () => {
    switchMode('view');
    loadAllFootprints();
  });

  // 个人地图
  document.getElementById('btnClear').addEventListener('click', () => {
    switchMode('view');
    loadFootprints();
  });

  // 编辑模式
  document.getElementById('btnEditMode').addEventListener('click', () => {
    switchMode('edit');
  });

  // 删除模式
  document.getElementById('btnDeleteMode').addEventListener('click', () => {
    switchMode('delete');
  });

  // 添加点位
  document.getElementById('btnAddMode').addEventListener('click', function() {
    document.getElementById('addForm').reset();
    currentEditId = null;
    // (使用jQuery)
    $('#addModal').modal('show');
  });

  // 保存按钮
  document.getElementById('addSaveBtn').addEventListener('click', saveFootprint);

  // Polyline Toggle Button
  const togglePolylineBtn = document.getElementById('btnTogglePolyline');
  togglePolylineBtn.addEventListener('click', () => {
    isPolylineVisible = !isPolylineVisible;
    if (isPolylineVisible) {
      drawTravelPolyline(timelineData);
      togglePolylineBtn.classList.add('active');
      togglePolylineBtn.innerHTML = '🗺️ 隐藏轨迹';
    } else {
      polylineLayer.clearLayers();
      togglePolylineBtn.classList.remove('active');
      togglePolylineBtn.innerHTML = '🗺️ 显示轨迹';
    }
  });

  // 默认加载
  loadFootprints();
});

// 添加一些CSS样式
const style = document.createElement('style');
style.textContent = `
  .btn.active {
    background-color: #007bff !important;
    border-color: #007bff !important;
    color: white !important;
    transform: translateY(0); /* 激活状态不下沉 */
  }
  
  .marker-cluster-small {
    background-color: rgba(181, 226, 140, 0.6);
  }
  .marker-cluster-small div {
    background-color: rgba(110, 204, 57, 0.6);
  }
  
  .marker-cluster-medium {
    background-color: rgba(241, 211, 87, 0.6);
  }
  .marker-cluster-medium div {
    background-color: rgba(240, 194, 12, 0.6);
  }
  
  .marker-cluster-large {
    background-color: rgba(253, 156, 115, 0.6);
  }
  .marker-cluster-large div {
    background-color: rgba(241, 128, 23, 0.6);
  }
  
  .marker-cluster {
    background-clip: padding-box;
    border-radius: 20px;
  }
  .marker-cluster div {
    width: 30px;
    height: 30px;
    margin-left: 5px;
    margin-top: 5px;
    text-align: center;
    border-radius: 15px;
    font: 12px "Helvetica Neue", Arial, Helvetica, sans-serif;
    color: white;
    font-weight: bold;
  }
  
  /* 操作面板样式 */
  #operation-panel {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    position: relative; /* 为子元素的 z-index 提供上下文 */
    z-index: 10;
    margin-top: 20px; /* 添加顶部间距 */
  }
  
  #operation-panel .btn {
    transition: all 0.3s ease;
    border-radius: 6px;
    font-weight: 500;
    margin: 4px; /* Added margin for spacing */
  }
  
  #operation-panel .btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
  
  /* 弹窗样式 */
  .leaflet-popup-content {
    border-radius: 8px;
  }
  
  .leaflet-popup-content .btn {
    margin: 2px;
    font-size: 12px;
    padding: 4px 8px;
  }
  
  /* 时间轴样式 */
  #timeline-section {
    transition: all 0.3s ease;
    position: relative; /* 为子元素的 z-index 提供上下文 */
    z-index: 5; /* 确保在地图下层 */
    margin-bottom: 20px; /* 与地图容器的间距 */
  }
  
  #timeline-section:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  }
  
  /* 模态框样式 */
  .modal-content {
    border-radius: 12px;
    border: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  }
  
  .modal-header {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    border-radius: 12px 12px 0 0;
  }
  
  .modal-header .btn-close {
    filter: invert(1);
  }
  
  /* 输入框样式 */
  .form-control:focus {
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
  
  /* 按钮组样式 */
  .btn-group .btn {
    border-radius: 0;
  }
  
  .btn-group .btn:first-child {
    border-radius: 6px 0 0 6px;
  }
  
  .btn-group .btn:last-child {
    border-radius: 0 6px 6px 0;
  }

  .timeline-node {
    transition: all 0.3s ease;
  }
  
  .timeline-node:hover {
    transform: scale(1.1);
  }

  .timeline-node.active {
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.5), 0 4px 15px rgba(0,0,0,0.3);
  }

  .highlight-marker {
    filter: drop-shadow(0 0 5px #00aaff) drop-shadow(0 0 10px #00aaff);
  }
`;
document.head.appendChild(style);
