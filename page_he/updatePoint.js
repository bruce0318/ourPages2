import { reloadLayerFromDB } from "./mapShow.js"; 
import { setButtonsDisabled } from "./mapShow.js";
export function updatePoint(overlayGroup) {
    // 禁用其他按钮
    setButtonsDisabled(true);

    // 设置修改模式标志
    window.isUpdateMode = true;
    
    // 创建提示信息元素
    const infoDiv = document.createElement('div');
    infoDiv.id = 'delete-point-info';
    infoDiv.innerHTML = '<span style="color: red; font-weight: bold;">修改模式: 请点击要修改的足迹点</span>';
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
    cancelButton.textContent = '取消修改';
    cancelButton.style.marginLeft = '10px';
    cancelButton.style.padding = '4px 8px';
    cancelButton.style.backgroundColor = '#f0f0f0';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '3px';
    cancelButton.style.cursor = 'pointer';
    
    // 添加到地图容器
    const mapContainer = document.getElementById('map-container');
    mapContainer.appendChild(infoDiv);
    infoDiv.appendChild(cancelButton);
    
    // 存储原始事件处理函数
    const originalHandlers = new Map();
    
    // 为每个标记添加临时事件监听
    overlayGroup.getOverlays().forEach(overlay => {
        if (overlay instanceof AMap.Marker) {
            // 保存原始点击处理函数
            originalHandlers.set(overlay, overlay.events?.click?.[0]);
            
            // 移除原始事件
            overlay.off('click');
            
            // 添加修改模式下的点击处理
            overlay.on('click', async function(e) {

                const marker = e.target;
                const cityName = marker.cityName;
                
                if (!cityName) {
                    infoDiv.innerHTML = '<span style="color: red; font-weight: bold;">错误: 无法获取城市信息</span>';
                    return;
                }

                // const user = prompt(`请输入要修改 ${cityName} 足迹点年份的用户名称：`);
                const user = '何灿非'; //个人足迹地图使用
                if (!user) return;

                const newYear = prompt(`请输入修改后的年份：`);
                if (!user) return;
                
                const confirmDel = confirm(`确定要修改 ${user} 在 ${cityName} 的足迹点年份为 ${newYear} 年吗？`);
                if (!confirmDel) return;

                const body = { cityName, user, newYear };

                try {
                    const response = await fetch('http://localhost:5500/api/updatePoint', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    
                    if (!response.ok) {
                        throw new Error('修改请求失败');
                    }
                    
                    // 更新提示信息
                    infoDiv.innerHTML = '<span style="color: green; font-weight: bold;">修改成功!</span>';

                    // 2秒后自动移除提示
                    setTimeout(() => {
                        if (infoDiv.parentNode) {
                            infoDiv.parentNode.removeChild(infoDiv);
                        }
                        exitUpdateMode(); // 退出修改模式
                    }, 2000);

                    reloadLayerFromDB();
                } catch (err) {
                    console.error("修改失败:", err);
                    infoDiv.innerHTML = `<span style="color: red; font-weight: bold;">修改失败: ${err.message}</span>`;
                }
            });
        }
    });

    
    
    // 退出修改模式的函数
    function exitUpdateMode() {
        // 恢复原始事件处理
        overlayGroup.getOverlays().forEach(overlay => {
            if (overlay instanceof AMap.Marker) {
                const originalHandler = originalHandlers.get(overlay);
                if (originalHandler) {
                    overlay.off('click');
                    overlay.on('click', originalHandler);
                }
            }
        });
        
        window.isUpdateMode = false;
        
        // 移除提示元素
        if (infoDiv.parentNode) {
            infoDiv.parentNode.removeChild(infoDiv);
        }

        // 启用所有按钮
        setButtonsDisabled(false);
    }
    
    // 取消按钮事件
    cancelButton.addEventListener('click', exitUpdateMode);
}

