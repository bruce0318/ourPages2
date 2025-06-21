import { createPointMarker, reloadPoints } from './loadPoints.js';
import { setButtonsDisabled } from './map_init_all.js';

// 存储年份范围状态
let currentYearRange = { start: null, end: null };

// 按年份筛选足迹点
export async function statYear(map, userLayers, start, end) {
    // 禁用所有按钮
    setButtonsDisabled(true);

    let startYear = start;
    let endYear = end;

    if(start < 2015){
        startYear = 2004;
    }
    
    // 保存当前年份范围
    currentYearRange = { start: startYear, end: endYear };
    
    // 获取当前已勾选的用户ID
    const activeUserIds = Object.keys(userLayers).filter(userId => {
        const checkbox = document.getElementById(`layer-${userId}`);
        return checkbox?.checked;
    });
    
    // 移除所有已显示的足迹点
    activeUserIds.forEach(userId => {
        if (userLayers[userId]) {
            map.remove(userLayers[userId].group);
            delete userLayers[userId];
        }
    });
    
    // 重新加载每个用户的足迹点（按年份筛选）
    for (const userId of activeUserIds) {
        try {
            const body = { 
                userName: userMap[userId],
                startYear,
                endYear
            };
            
            const response = await fetch('http://47.111.136.83:5500/api/statYear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const geoData = await response.json();
            
            // 创建新的覆盖物组
            const overlayGroup = new AMap.OverlayGroup();
            map.add(overlayGroup);
            
            // 处理足迹点数据
            if (geoData.features?.length > 0) {
                geoData.features.forEach(feature => {
                    if (feature.geometry.type === 'Point') {
                        createPointMarker(feature, overlayGroup, userMap[userId], map);
                    }
                });
            }
            
            // 更新图层组
            userLayers[userId] = {
                group: overlayGroup,
                show: () => overlayGroup.show(),
                hide: () => overlayGroup.hide()
            };
            
            console.log(`${userMap[userId]}的足迹点已按年份筛选加载`);
        } catch (error) {
            console.error(`按年份筛选用户${userId}足迹点失败：`, error);
        }
    }
    
    // 启用所有按钮
    setButtonsDisabled(false);
}

// 重置年份筛选
export function resetTimeFilter(map, userLayers) {
    // 清除当前年份范围
    currentYearRange = { start: null, end: null };
    
    // 重新加载所有点
    reloadPoints(map, userLayers);
}

// 用户ID到用户名的映射
const userMap = {
    'huang': '黄卉然',
    'gao': '高家垚',
    'he': '何灿非',
    'cui': '崔泽铭'
};


