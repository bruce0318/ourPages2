const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer(async (req, res) => {
  // 设置通用 CORS 响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const sendGeoJSON = async (filePath) => {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (error) {
      res.writeHead(500);
      res.end('Internal Server Error');
      console.error(`Error serving ${filePath}:`, error);
    }
  };

  if (req.url === '/cycle1' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'data/cycle1.geojson');
    await sendGeoJSON(filePath);
  } else if (req.url === '/cycle1_points' && req.method === 'GET') {
    const filePath = path.join(__dirname, 'data/cycle1_points.geojson');
    await sendGeoJSON(filePath);
  } 
    else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const port = 3000;

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});