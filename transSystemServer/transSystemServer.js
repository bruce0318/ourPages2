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
    origin: '*',
    methods: ['POST', 'GET', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 连接数据库
const pool = new Pool({
    user: 'postgres',
    host: '47.110.54.187',
    database: 'VRPPD',
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



// 登录接口
app.post('/user/login', async (req, res) => { 
    const { phoneNumber, password} = req.body;
    console.log("收到登录请求：", phoneNumber, password);

    const query = `
        SELECT COALESCE(
            (SELECT "rank" FROM users 
            WHERE "phone_number" = $1 AND "password" = $2), -1) AS rank;
    `;

    try {
        const result = await pool.query(query, [phoneNumber, password]);
        const rank = result.rows[0].rank;
        res.json({ rank });
    } catch (error) {
        console.error("数据库查询错误：", error);
        res.status(500).json({ error: "服务器内部错误" });
    }

});

// 经理接口
app.post('/manager/work', async (req, res) => { 
    const { start_id, end_id, date } = req.body;
    console.log("收到客户经理新增点请求")

    try{
        const routeQuery = `
            SELECT rid FROM routes WHERE start_id = $1 AND end_id = $2;`;
        const routeResult = await pool.query(routeQuery, [start_id, end_id]);

        if (routeResult.rows.length === 0) {
            return res.status(404).json({ status_code: 404 }); // Route not found
        }

        const rid = routeResult.rows[0].rid;

        const taskPairsQuery = `
            INSERT INTO task_pairs (rid, start_id, end_id, driver_id, driver_order, date) 
            VALUES ($1, $2, $3, NULL, NULL, $4);
        `;
        const taskPairsResult = await pool.query(taskPairsQuery, [rid, start_id, end_id, date]);

        res.json({ status_code: 200 }); // Success
    } catch (error) {
        console.error("Error inserting task pair:", error);
        res.status(500).json({ status_code: 500 }); // Internal server error
    }
});

// 管理员接口
app.post('/admin', async (req, res) => { 
    const { uid, date } = req.body;
    console.log("收到管理端的查看请求");

    try { 
        // 按照司机id和日期查询任务
        const taskPairsQuery = `
            SELECT tid, rid, start_id, end_id, driver_order 
            FROM task_pairs 
            WHERE driver_id = $1 AND date = $2 
            ORDER BY driver_order;
        `;
        const taskPairsResult = await pool.query(taskPairsQuery, [uid, date]);

        if (taskPairsResult.rows.length === 0) {
            return res.status(404).json({ status_code: 404, message: 'No tasks found for the given uid and date' });
        }

        // 提取任务的RID和Driver_order
        const transportingRids = taskPairsResult.rows.map(row => row.rid);
        const transportingDriverOrders = taskPairsResult.rows.map(row => row.driver_order);

        // 从routes表中获取这些任务的空间数据
        const transportingGeomsQuery = `
            SELECT rid, ST_AsGeoJSON(geom)::text AS geom, start_id, end_id, length 
            FROM routes 
            WHERE rid IN (${transportingRids.map((_, i) => `$${i + 1}`).join(', ')});
        `;
        const transportingGeomsResult = await pool.query(transportingGeomsQuery, transportingRids);

        // 生成“运输中”geojson数据
        const transportingFeatures = transportingGeomsResult.rows.map(row => ({
            type: 'Feature',
            geometry: JSON.parse(row.geom),
            properties: {
                start_id: row.start_id,
                end_id: row.end_id,
                driver_id: uid,
                driver_order: transportingDriverOrders[transportingGeomsResult.rows.indexOf(row)]
            }
        }));

        const transportingGeojson = {
            type: 'FeatureCollection',
            features: transportingFeatures
        };

        let transferringFeatures = [];
        let totalLength = 0;

        // 获取运输中路线的总长度
        transportingGeomsResult.rows.forEach(row => {
            totalLength += row.length;
        });

        // 生成“转移中”geojson数据
        for (let i = 0; i < taskPairsResult.rows.length - 1; i++) {
            const currentTask = taskPairsResult.rows[i];
            const nextTask = taskPairsResult.rows[i + 1];

            // 从停车场到第一个任务段的起点
            if (i === 0) {
                const routeQuery = `
                    SELECT ST_AsGeoJSON(geom)::text AS geom, start_id, end_id, length 
                    FROM routes 
                    WHERE start_id = 1 AND end_id = $1;
                `;
                const routeResult = await pool.query(routeQuery, [currentTask.start_id]);
                if (routeResult.rows.length > 0) {
                    const route = routeResult.rows[0];
                    transferringFeatures.push({
                        type: 'Feature',
                        geometry: JSON.parse(route.geom),
                        properties: {
                            start_id: 1,
                            end_id: currentTask.start_id,
                            driver_id: uid
                        }
                    });
                    totalLength += route.length;
                }
            }

            // 任务间的转移路线
            const routeQuery = `
                SELECT ST_AsGeoJSON(geom)::text AS geom, start_id, end_id, length 
                FROM routes 
                WHERE start_id = $1 AND end_id = $2;
            `;
            const routeResult = await pool.query(routeQuery, [currentTask.end_id, nextTask.start_id]);
            if (routeResult.rows.length > 0) {
                const route = routeResult.rows[0];
                transferringFeatures.push({
                    type: 'Feature',
                    geometry: JSON.parse(route.geom),
                    properties: {
                        start_id: currentTask.end_id,
                        end_id: nextTask.start_id,
                        driver_id: uid
                    }
                });
                totalLength += route.length;
            }
        }

        // 从最后一个任务到停车场
        const lastTask = taskPairsResult.rows[taskPairsResult.rows.length - 1];
        const routeQuery = `
            SELECT ST_AsGeoJSON(geom)::text AS geom, start_id, end_id, length 
            FROM routes 
            WHERE start_id = $1 AND end_id = 1;
        `;
        const routeResult = await pool.query(routeQuery, [lastTask.end_id]);
        if (routeResult.rows.length > 0) {
            const route = routeResult.rows[0];
            transferringFeatures.push({
                type: 'Feature',
                geometry: JSON.parse(route.geom),
                properties: {
                    start_id: lastTask.end_id,
                    end_id: 1,
                    driver_id: uid
                }
            });
            totalLength += route.length;
        }

        const transferringGeojson = {
            type: 'FeatureCollection',
            features: transferringFeatures
        };

        // 返回两个geojson和总长度
        res.json({
            status_code: 200,
            transporting_geojson: transportingGeojson,
            transferring_geojson: transferringGeojson,
            total_length: totalLength
        });

    } catch (error) { 
        console.error("Error in admin endpoint:", error);
        res.status(500).json({ status_code: 500, message: 'Internal server error' });        
    }
});

// 点查询接口
app.post('/point', async (req, res) => { 
    const { pid } = req.body;
    console.log("收到点查询请求：", pid)
    try { 
        const query = `
            SELECT name, type, x, y 
            FROM points 
            WHERE pid = $1;`;
        const result = await pool.query(query, [pid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ status_code: 404, message: 'Point not found' });
        }

        const point = result.rows[0];

        // 返回结果
        res.json({
            status_code: 200,
            name: point.name,
            type: point.type,
            x: point.x,
            y: point.y
        }); 
    } catch (error) { 
        console.error("Error in point endpoint:", error);
        res.status(500).json({ status_code: 500, message: 'Internal server error' });        
    }

})

// 司机接口
app.post('/driver/work', async (req, res) => { 
    const { uid, date } = req.body;
    console.log("收到司机接口请求" , uid, date)
    try { 
        const query = `
            SELECT start_id, end_id, driver_order 
            FROM task_pairs 
            WHERE driver_id = $1 AND date = $2;`; 
        const result = await pool.query(query, [uid, date]);

        if (result.rows.length === 0) {
            return res.status(404).json({ status_code: 404, message: 'Task not found' });
        }

        const task = result.rows[0];

        // 返回结果
        res.json({
            status_code: 200,
            start_id: task.start_id,
            end_id: task.end_id,
            driver_order: task.driver_order
        }); 
    } catch (error) { 
        console.error("Error in point endpoint:", error);
        res.status(500).json({ status_code: 500, message: 'Internal server error' });        
    }
})

app.listen(8888, '0.0.0.0',() => console.log('Server running on http://0.0.0.0:8888'));