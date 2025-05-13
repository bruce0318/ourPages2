// js/contact.js
document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('contactForm');
  const nameInput  = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const msgInput   = document.getElementById('userMessage');    // 注意和 HTML 中 textarea 的 id 对应
  const successEl  = document.getElementById('success');
  const errorEl    = document.getElementById('formMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      phone:   phoneInput.value.trim(),
      message: msgInput.value.trim()
    };

    try {
      const resp   = await fetch('http://localhost:3000/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': '' },
        body:    JSON.stringify(payload)
      });
      const result = await resp.json();

      if (resp.ok) {
        successEl.innerText = result.msg;
        errorEl.  innerText = '';
        form.reset();
      } else {
        throw new Error(result.error || '提交失败');
      }
    } catch (err) {
      errorEl.innerText = err.message;
    }
  });
});
