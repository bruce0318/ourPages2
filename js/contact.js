document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('contactForm');
  const nameInput  = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  // 改成和 textarea 对应
  const msgInput   = document.getElementById('userMessage');
  const successEl  = document.getElementById('success');
  // 对应上面改好的 div
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
      const resp = await fetch('http://47.110.54.187:3002/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errMsg;
        try {
          errMsg = JSON.parse(errText).error || errText;
        } catch {
          errMsg = errText;
        }
        throw new Error(errMsg);
      }

      const result = await resp.json();
      successEl.innerText = result.msg;
      errorEl.innerText   = '';
      form.reset();

    } catch (err) {
      errorEl.innerText = err.message;
    }
  });
});
