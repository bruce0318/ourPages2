const BASE_URL = 'http://localhost:5501';

async function testAPI() {
    console.log('开始测试崔泽铭服务器API...\n');

    try {
        // 测试获取足迹数据
        console.log('1. 测试获取足迹数据...');
        const response1 = await fetch(`${BASE_URL}/api/getDatabasePointsForCui`);
        if (response1.ok) {
            const data1 = await response1.json();
            console.log('✅ 获取足迹数据成功');
            console.log(`   找到 ${data1.features ? data1.features.length : 0} 个足迹点\n`);
        } else {
            console.log('❌ 获取足迹数据失败:', response1.status);
        }

        // 测试添加足迹点
        console.log('2. 测试添加足迹点...');
        const addData = {
            lng: 116.3974,
            lat: 39.9093,
            code: 110000,
            province: '北京市',
            city: '北京市',
            year: 2025,
            user: '崔泽铭'
        };
        
        const response2 = await fetch(`${BASE_URL}/api/addPoint`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addData)
        });
        
        if (response2.ok) {
            console.log('✅ 添加足迹点成功\n');
        } else {
            console.log('❌ 添加足迹点失败:', response2.status);
        }

        // 测试查询足迹点
        console.log('3. 测试查询足迹点...');
        const queryData = { cityName: '北京市' };
        const response3 = await fetch(`${BASE_URL}/api/queryPointForCui`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryData)
        });
        
        if (response3.ok) {
            const data3 = await response3.json();
            console.log('✅ 查询足迹点成功');
            console.log(`   找到 ${data3.features ? data3.features.length : 0} 个记录\n`);
        } else {
            console.log('❌ 查询足迹点失败:', response3.status);
        }

        // 测试省份统计
        console.log('4. 测试省份统计...');
        const provinceData = { provinceName: '北京市' };
        const response4 = await fetch(`${BASE_URL}/api/statProvinceForCui`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(provinceData)
        });
        
        if (response4.ok) {
            const data4 = await response4.json();
            console.log('✅ 省份统计成功');
            console.log(`   找到 ${data4.features ? data4.features.length : 0} 个记录\n`);
        } else {
            console.log('❌ 省份统计失败:', response4.status);
        }

        // 测试时间筛选
        console.log('5. 测试时间筛选...');
        const timeData = { startYear: 2020, endYear: 2025 };
        const response5 = await fetch(`${BASE_URL}/api/statYearForCui`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(timeData)
        });
        
        if (response5.ok) {
            const data5 = await response5.json();
            console.log('✅ 时间筛选成功');
            console.log(`   找到 ${data5.features ? data5.features.length : 0} 个记录\n`);
        } else {
            console.log('❌ 时间筛选失败:', response5.status);
        }

        console.log('🎉 所有API测试完成！');

    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 运行测试
testAPI(); 