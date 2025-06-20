import { loadUserPoints, removeUserPoints } from './loadPoints.js';
import { addPoint } from './addPoint.js'; 
import { deletePoint } from './deletePoint.js';
import { updatePoint } from './updatePoint.js';
import { queryPoint } from './queryPoint.js';
import { statProvince } from './statProvince.js';
import { statYear, resetTimeFilter} from './statYear.js';

export let map = null;
export const userLayers = {};
const userIds = ['huang', 'gao', 'he', 'cui']; // 所有用户ID

// 确保高德地图API已加载
function loadAMapScript() {
    return new Promise((resolve) => {
        if (window.AMap) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=6690aa0df3fd29673c58c9b248817548&callback=initAMapCallback`;
        document.head.appendChild(script);
        
        window.initAMapCallback = resolve;
    });
}
async function initMap() {
    // 确保高德地图API已加载
    await loadAMapScript();

    // 初始化地图
    map = new AMap.Map('map', {
        zoom: 4,
        center: [108.94, 34.34],
        resizeEnable: true,
        viewMode: '3D'
    });
    
    // 图层管理逻辑
    const layerManager = document.getElementById('layer-manager');
    const layerCheckboxes = layerManager.querySelectorAll('input[type="checkbox"]');
    
    layerCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const userId = this.id.replace('layer-', '');
            const layerElement = document.getElementById(`layer-${userId}-text`);
            
            if (this.checked) {
                layerElement.style.display = 'block';
                // 加载用户足迹点
                loadUserPoints(userId, map, userLayers)
                    .then(() => console.log(`显示图层: ${userId}`))
                    .catch(err => console.error(`加载用户${userId}足迹点失败:`, err));
            } else {
                layerElement.style.display = 'none';
                // 移除用户足迹点
                removeUserPoints(userId, userLayers);
                console.log(`隐藏图层: ${userId}`);
            }
        });
    });

}

// 确保在页面加载完成后初始化地图
window.addEventListener('DOMContentLoaded', initMap);


// 按钮事件绑定
document.getElementById('load-point-btn').addEventListener('click', function() {
    userIds.forEach(userId => {
        const checkbox = document.getElementById(`layer-${userId}`);
        if (checkbox) {
            // 勾选复选框并触发change事件
            checkbox.checked = true;
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        }
    });
});

document.getElementById('remove-point-btn').addEventListener('click', function() {
    userIds.forEach(userId => {
        const checkbox = document.getElementById(`layer-${userId}`);
        if (checkbox) {
            // 取消勾选复选框并触发change事件
            checkbox.checked = false;
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        }
    });
});

document.getElementById('add-point-btn').addEventListener('click', () => {addPoint(map, userLayers);});
document.getElementById('delete-point-btn').addEventListener('click', () => {deletePoint(map, userLayers);});
document.getElementById('update-point-btn').addEventListener('click', () => {updatePoint(map, userLayers);});
document.getElementById('query-point-btn').addEventListener('click', () => {queryPoint(map);});
document.getElementById('stat-province-btn').addEventListener('click', () => {statProvince(map);});

// 时间滑块事件处理
const yearStart = document.getElementById('year-start');
const yearEnd = document.getElementById('year-end');
const startYearDisplay = document.getElementById('start-year-display');
const endYearDisplay = document.getElementById('end-year-display');

// 更新年份显示
function updateYearDisplay() {
    startYearDisplay.textContent = yearStart.value < 2015 ? 
        '2015年以前' : `${yearStart.value}年`;
    endYearDisplay.textContent = `${yearEnd.value}年`;
}

yearStart.addEventListener('input', updateYearDisplay);
yearEnd.addEventListener('input', updateYearDisplay);

// 初始显示
updateYearDisplay();

// 按时间筛选按钮事件
document.getElementById('stat-year-btn').addEventListener('click', () => {
    const start = parseInt(yearStart.value);
    const end = parseInt(yearEnd.value);
    
    if (start > end) {
        alert("起始年份不能大于结束年份");
        return;
    }
    
    statYear(map, userLayers, start, end);
});

// 重置时间筛选按钮事件
document.getElementById('reset-time-filter').addEventListener('click', () => {
    resetTimeFilter(map, userLayers);
    
    // 重置滑块位置
    yearStart.value = 2014;
    yearEnd.value = 2025;
    updateYearDisplay();
});


// 全区按钮ID列表
const controlButtonIds = [
    'load-point-btn',
    'remove-point-btn',
    'add-point-btn',
    'delete-point-btn',
    'update-point-btn',
    'query-point-btn',
    'stat-province-btn',
    'stat-year-btn',
    'reset-time-filter'
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
