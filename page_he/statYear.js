import { removeLayer } from './mapShow.js';
import { createPointMarker } from './mapShow.js';
export async function statYear(start, end) {
    let startYear = start;
    let endYear = end;

    if(start < 2015){
        startYear = 2004;
    }

    if(startYear > endYear){
        alert("起始年份不能大于结束年份，请确保时间范围正确！");
        return;
    }
        
    
    try{
        const body = { startYear, endYear };
        const response = await fetch('http://47.111.136.83:5500/api/statYearForHe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('请求失败');
        }

        const geoData = await response.json();

        // 先移除现有的，再加载新的
        removeLayer();
        if (geoData.features && Array.isArray(geoData.features)) {
            geoData.features.forEach(feature => {
                createPointMarker(feature);
            });
        }
    }catch (error) {
        console.error("加载失败：", err);
        alert("加载失败，请稍后重试。");
    }
}