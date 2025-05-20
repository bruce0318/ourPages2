// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// 跨域、JSON 解析
app.use(cors());
app.use(bodyParser.json());

// 1. 前端静态文件
app.use('/', express.static(path.join(__dirname, 'ourPages2')));
app.use(express.json());

// 2. 留言接口
app.post('/api/contact', async (req, res) => {
  let { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: '请填写 姓名、邮箱、留言 内容' });
  }

  // —— 用 163 SMTP —— 
  const transporter = nodemailer.createTransport({
    host: 'smtp.163.com',
    port: 465,          // 推荐 465
    secure: true,       // 465 要 true
    auth: {
      user: 'connor_rk800@163.com',
      pass: 'YKg7vuK8hLWpMXw3'  // 你在 163 开启 SMTP 时拿到的授权码
    }
    // 如果你跑 587，可以这样：
    // port: 587,
    // secure: false,
    // tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.sendMail({
      from:    `"网站留言" <connor_rk800@163.com>`,  // 必须和 auth.user 一致
      to:      'connor_rk800@163.com',              // 收件箱：就自己
      replyTo: `${name} <${email}>`,                // 访客邮箱
      subject: `来自 ${name} 的新留言`,
      text:    `电话：${phone}\n\n${message}`
    });
    res.json({ success: true, msg: '留言发送成功，谢谢！' });
  } catch (err) {
    console.error('✉️ 发送邮件失败：', err);
    res.status(500).json({ error: err.message });
  }
});


// 3. 启动
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
