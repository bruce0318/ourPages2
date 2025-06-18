var http = require('http');
http.createServer(function (request, response) {
    // 发送HTTP头部
    // HTTP状态值：200：OK
    // 内容类型：text/pLain。
    // 使用charset=UTF-8解决输出中文乱码
    response.writeHead(200, {'Content-Type': 'text/plain; charset=UTF-8'});

    // 下句是发送响应数据
    response.end('Hello！这是简单的web服务器测试。\n');
}).listen(8888);
    // 终端打印如下信息
console.log('Server running at http://127.0.0.1:8888/');
