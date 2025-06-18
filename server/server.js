const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 修改CORS设置
app.use(cors({
    origin:  ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 连接数据库
const pool = new Pool({
    user: 'postgres',
    host: '47.110.54.187',
    database: 'all_footprints',
    password: 'webGIS2025',
    port: 5432,
});

//数据库连接测试
pool.connect()
    .then(client => {
        console.log('数据库连接成功');
        client.release();
    })
    .catch(err => {
        console.error('数据库连接失败:', err.message);
        process.exit(1); // 退出应用
    });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'he.html'));
});

// 添加参数验证
app.use('/api/addPoint',(req, res, next) => {
    const { lng, lat, code, province, city, year, user } = req.body;
    if (!lng || !lat || !code || !province || !city || !year || !user) {
        return res.status(400).json({ error: '参数不完整' });
    }

    // 转换参数类型
    req.body.lng = parseFloat(lng);
    req.body.lat = parseFloat(lat);
    req.body.code = parseFloat(code);
    req.body.year = parseInt(year);
    next();
});

// 从数据库中获取足迹数据
app.get('/api/getDatabasePoints', async (req, res) => {
    try {
        const query = `
            SELECT json_build_object('type', 'FeatureCollection','features', 
                        json_agg(
                            json_build_object(
                                'type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::json,
                                'properties', json_build_object(
                                'name', name,
                                'time', time,
                                'province', province,
                                'city', city
                            )
                        )
                    )
                ) AS geojson
            FROM he;`;
        
        const result = await pool.query(query);
        
        if (result.rows.length === 0 || !result.rows[0].geojson) {
            return res.status(404).send("未找到数据");
        }
        
        const geojson = result.rows[0].geojson;
        console.log("生成的GeoJSON:", JSON.stringify(geojson, null, 2));
        res.json(geojson);

    } catch (err) {
        console.error("获取点数据错误：", err);
        res.status(500).send("数据库查询失败");
    }
});

// 添加足迹点路由
app.post('/api/addPoint', async (req, res) => {
    try {
        const { lng, lat, code, province, city, year, user } = req.body;
        console.log('收到添加点请求:', { lng, lat, code, province, city, year, user });

        await pool.query(`INSERT INTO he (geom, code, province, city, x, y, time, name)
             VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, $4, $5, $1, $2, $6, $7)`, 
             [ lng, lat, code, province, city, year, user ]);

        console.log("插入成功");
        res.send("ok");
    }catch (err) {
        console.error("插入错误详情：", err.message);
        console.error("错误堆栈：", err.stack);
        res.status(500).send(`数据库插入失败: ${err.message}`);
    }

});

//删除足迹点路由
app.post('/api/deletePoint', async (req, res) => {
    const { cityName, user } = req.body;
    console.log('收到删除点请求:', { cityName, user });

    if (!cityName) {
        return res.status(400).json({ error: '缺少城市名称参数' });
    }

    if (!user) {
        return res.status(400).json({ error: '缺少用户参数' });
    }
    
    try {
        // 使用城市名称与用户名删除
        const result = await pool.query(
            `DELETE FROM he WHERE city = $1 AND name = $2`,[cityName, user]
        );
        
        console.log(`删除足迹点 ${cityName} 成功，影响行数: ${result.rowCount}`);
        return res.send("ok");
    } catch (err) {
        console.error("删除错误：", err);
        return res.status(500).send("数据库删除失败");
    }
});

// 修改足迹点路由
app.post('/api/updatePoint', async (req, res) => {
    const { cityName, user, newYear } = req.body;
    console.log('收到修改点请求:', { cityName, user, newYear });
   
    if (!cityName) {
        return res.status(400).json({ error: '缺少城市名称参数' });
    }
    if (!user) {
        return res.status(400).json({ error: '缺少用户参数' });
    }
    if (!newYear) {
        return res.status(400).json({ error: '缺少新增年份参数' });
    }

    try {
        await pool.query(`UPDATE he SET time=$3 WHERE city=$1 AND name=$2`, [cityName, user, newYear]);
        res.send("ok");
        console.log(`修改${user}的足迹点 ${cityName} 成功`);
    }
    catch (err) {
        console.error("修改错误：", err);
        res.status(500).send("数据库修改失败");
    }

});

// 查询足迹点路由
app.post('/api/queryPoint', async (req, res) => {
    const { cityName } = req.body;
    console.log('收到查询点请求:', { cityName });

    if (!cityName) {
        return res.status(400).json({ error: '缺少城市名称参数' });
    }

    const query = `
        SELECT json_build_object('type', 'FeatureCollection','features', 
                    json_agg(
                        json_build_object(
                            'type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::json,
                            'properties', json_build_object(
                            'name', name,
                            'time', time,
                            'province', province,
                            'city', city
                        )
                    )
                )
            ) AS geojson
        FROM he WHERE city = $1 ;`; 
    
    try {
        const result = await pool.query(query, [cityName]); // 传递参数

        if (result.rows.length === 0 || !result.rows[0].geojson) {
            return res.status(404).json({ error: "未找到该城市的足迹记录" });
        }
        
        const geojson = result.rows[0].geojson;
        console.log("生成的GeoJSON:", JSON.stringify(geojson, null, 2));
        return res.json(geojson);
        
    } catch (err) {
        console.error("查询错误：", err);
        return res.status(500).json({ error: "数据库查询失败" });
    }

});

// 按省份统计足迹点路由
app.post('/api/statProvince', async (req, res) => { 
    const { provinceName } = req.body;
    console.log('收到省份查询请求:', { provinceName });

    if (!provinceName) {
        return res.status(400).json({ error: '缺少省份名称参数' });
    }

    const query = `
        SELECT json_build_object('type', 'FeatureCollection','features', 
                    json_agg(
                        json_build_object(
                            'type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::json,
                            'properties', json_build_object(
                            'name', name,
                            'time', time,
                            'province', province,
                            'city', city
                        )
                    )
                )
            ) AS geojson
        FROM he WHERE province = $1`; 
    
    try {
        const result = await pool.query(query, [provinceName]); // 传递参数

        if (result.rows.length === 0 || !result.rows[0].geojson) {
            return res.status(404).json({ error: "未找到该省份" });
        }
        
        const geojson = result.rows[0].geojson;
        return res.json(geojson);
        
    } catch (err) {
        console.error("查询错误：", err);
        return res.status(500).json({ error: "数据库查询失败" });
    }

});

// 获取省份空间数据并绘制路由
app.post('/api/drawProvince', async (req, res) => { 
    const { provinceName } = req.body;
    console.log('收到省份绘制请求:', { provinceName });

    if (!provinceName) {
        return res.status(400).json({ error: '缺少省份名称参数' });
    }

    const query = `
        SELECT json_build_object('type', 'FeatureCollection','features', 
                    json_agg(
                        json_build_object(
                            'type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::json,
                            'properties', json_build_object(
                            'name', name,
                            'code', code
                        )
                    )
                )
            ) AS geojson
        FROM province WHERE name = $1 ;`; 
    
    try {
        const result = await pool.query(query, [provinceName]); // 传递参数

        if (result.rows.length === 0 || !result.rows[0].geojson) {
            return res.status(404).json({ error: "未找到该省份" });
        }
        
        const geojson = result.rows[0].geojson;
        return res.json(geojson);
        
    } catch (err) {
        console.error("查询错误：", err);
        return res.status(500).json({ error: "数据库查询失败" });
    }

});

// 按照时间获取足迹点
app.post('/api/statYear', async (req, res) => {
    const { startYear, endYear } = req.body;
    console.log("收到时间筛选请求： 开始时间：", startYear, "结束时间：", endYear);

    try {
        const query = `
            SELECT json_build_object('type', 'FeatureCollection','features', 
                        json_agg(
                            json_build_object(
                                'type', 'Feature', 'geometry', ST_AsGeoJSON(geom)::json,
                                'properties', json_build_object(
                                'name', name,
                                'time', time,
                                'province', province,
                                'city', city
                            )
                        )
                    )
                ) AS geojson
            FROM he
            WHERE time >= $1 AND time <= $2;`;
        
        const result = await pool.query(query, [startYear, endYear]);
        
        if (result.rows.length === 0 || !result.rows[0].geojson) {
            return res.status(404).send("未找到数据");
        }
        
        const geojson = result.rows[0].geojson;
        console.log("生成的GeoJSON:", JSON.stringify(geojson, null, 2));
        res.json(geojson);

    } catch (err) {
        console.error("获取点数据错误：", err);
        res.status(500).send("数据库查询失败");
    }
});

app.listen(5500, () => console.log('Server running on http://localhost:5500'));