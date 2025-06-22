import { reloadLayerFromDB } from "./mapShow.js"; 
import { setButtonsDisabled } from "./mapShow.js";

export function deletePoint(overlayGroup) {
    // 禁用其他按钮
    setButtonsDisabled(true);

    // 设置修改模式标志
    window.isDeleteMode = true;
    
    // 创建提示信息元素
    const infoDiv = document.createElement('div');
    infoDiv.id = 'delete-point-info';
    infoDiv.innerHTML = '<span style="color: red; font-weight: bold;">删除模式: 请点击要删除的足迹点</span>';
    infoDiv.style.position = 'absolute';
    infoDiv.style.top = '10px';
    infoDiv.style.left = '50%';
    infoDiv.style.transform = 'translateX(-50%)';
    infoDiv.style.zIndex = '1000';
    infoDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    infoDiv.style.padding = '8px 16px';
    infoDiv.style.borderRadius = '4px';
    infoDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    
    // 创建取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '取消删除';
    cancelButton.style.marginLeft = '10px';
    cancelButton.style.padding = '4px 8px';
    cancelButton.style.backgroundColor = '#f0f0f0';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '3px';
    cancelButton.style.cursor = 'pointer';
    
    // 添加到地图容器
    const mapContainer = document.getElementById('map');
    mapContainer.appendChild(infoDiv);
    infoDiv.appendChild(cancelButton);
    
    // 存储原始事件处理函数
    const originalHandlers = new Map();
    
    // 为每个标记添加临时事件监听
    overlayGroup.getLayers().forEach(layer => {
        if (layer instanceof L.Marker) {
            // 保存原始点击处理函数
            originalHandlers.set(layer, layer._events?.click);
            
            // 移除原始事件
            layer.off('click');
            
            // 添加删除模式下的点击处理
            layer.on('click', async function(e) {
                const marker = e.target;
                const cityName = marker.cityName;
                
                if (!cityName) {
                    infoDiv.innerHTML = '<span style="color: red; font-weight: bold;">错误: 无法获取城市信息</span>';
                    return;
                }

                const user = '崔泽铭' //个人足迹地图使用
                
                if (!user) return;
                
                const confirmDel = confirm(`确定要删除 ${user} 在 ${cityName} 的足迹点吗？`);
                if (!confirmDel) return;

                const body = { cityName, user };

                try {
                    const response = await fetch('http://localhost:5500/api/deletePoint', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    
                    if (!response.ok) {
                        throw new Error('删除请求失败');
                    }
                    
                    // 从地图移除标记
                    overlayGroup.removeLayer(marker);
                    
                    // 更新提示信息
                    infoDiv.innerHTML = '<span style="color: green; font-weight: bold;">删除成功!</span>';
                    
                    // 2秒后自动移除提示
                    setTimeout(() => {
                        if (infoDiv.parentNode) {
                            infoDiv.parentNode.removeChild(infoDiv);
                        }
                        exitDeleteMode(); // 退出删除模式
                    }, 2000);

                    reloadLayerFromDB();
                } catch (err) {
                    console.error("删除失败:", err);
                    infoDiv.innerHTML = `<span style="color: red; font-weight: bold;">删除失败: ${err.message}</span>`;
                }
            });
        }
    });
    
    // 退出删除模式的函数
    function exitDeleteMode() {
        // 恢复原始事件处理
        overlayGroup.getLayers().forEach(layer => {
            if (layer instanceof L.Marker) {
                const originalHandler = originalHandlers.get(layer);
                if (originalHandler) {
                    layer.off('click');
                    // 恢复原始点击事件
                    layer.on('click', () => {
                        layer.bindPopup(layer.content).openPopup();
                    });
                }
            }
        });
        
        window.isDeleteMode = false;
        
        // 移除提示元素
        if (infoDiv.parentNode) {
            infoDiv.parentNode.removeChild(infoDiv);
        }

        // 启用所有按钮
        setButtonsDisabled(false);
    }
    
    // 取消按钮事件
    cancelButton.addEventListener('click', exitDeleteMode);
} 