import { removeLayer } from './mapShow.js';
import { createPointMarker } from './mapShow.js';
export async function statYear(start, end) {
    let startYear = start;
    let endYear = end;

    if(start === 2014){
        startYear = 2004;
    }
    
    try{
        const body = { startYear, endYear };
        const response = await fetch('http://localhost:5500/api/statYear', {
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
        alert("加载成功。");
    }catch (error) {
        console.error("加载失败：", err);
        alert("加载失败，请稍后重试。");
    }
}