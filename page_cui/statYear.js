import { removeLayer } from './mapShow.js';
import { createPointMarker } from './mapShow.js';
import { map } from './mapShow.js';

export async function statYear(start, end) {
    let startYear = start;
    let endYear = end;

    if(start < 2015){
        startYear = 2004;
    }
    
    try{
        const body = { startYear, endYear };
        const response = await fetch('http://localhost:5501/api/statYearForCui', {
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
        
        // 自适应视野
        if (geoData.features && geoData.features.length > 0) {
            const bounds = L.latLngBounds(geoData.features.map(f => f.geometry.coordinates.reverse()));
            map.fitBounds(bounds);
        }
        
    }catch (error) {
        console.error("加载失败：", error);
        alert("加载失败，请稍后重试。");
    }
    alert("加载成功");
} 