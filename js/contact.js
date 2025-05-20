// js/contact.js
document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('contactForm');
  const nameInput  = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const msgInput   = document.getElementById('userMessage');
  const successEl  = document.getElementById('success');
  const errorEl    = document.getElementById('formMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 收集表单
    const payload = {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      phone:   phoneInput.value.trim(),
      message: msgInput.value.trim()
    };

    try {
      const resp = await fetch('http://localhost:3000/api/contact', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json'    // ← 一定要加上
        },
        body: JSON.stringify(payload)
      });

      // 如果后端返回的不是 2xx，先拿到文本，防止直接调用 resp.json 出错
      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg;
        try {
          // 尝试把它当 JSON 解析一下（如果后端返回了 { error: '...' }）
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errText;
        } catch {
          errMsg = errText;  // 真的是 HTML 或者其它，就直接输出
        }
        throw new Error(errMsg);
      }

      // 到这里一定是 OK, 且 Content-Type: application/json
      const result = await resp.json();
      successEl.innerText = result.msg;
      errorEl.innerText   = '';
      form.reset();

    } catch (err) {
      errorEl.innerText = err.message;
    }
  });
});
