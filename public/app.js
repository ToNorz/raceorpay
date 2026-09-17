function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/bank/me', {
      headers: { ...authHeaders() }
    });

    if (res.status === 401) {
      window.location.href = '/';
      return;
    }

    const data = await res.json();

    document.getElementById('welcomeMsg').textContent = 'signed in as ' + data.username;
    document.getElementById('balanceA').textContent = '₹ ' + data.account_a;
    document.getElementById('balanceB').textContent = '₹ ' + data.account_b;
  } catch (err) {
    document.getElementById('welcomeMsg').textContent = 'session unavailable';
  }
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
  window.location.href = '/';
});

document.getElementById('resetBtn').addEventListener('click', async () => {
  const resultEl = document.getElementById('flagResult');
  resultEl.className = 'pending';
  resultEl.textContent = 'resetting...';

  try {
    const res = await fetch('/api/bank/reset', {
      method: 'POST',
      headers: { ...authHeaders() }
    });
    const data = await res.json();

    if (res.ok) {
      resultEl.className = '';
      resultEl.textContent = '';
      await loadDashboard();
    } else {
      resultEl.className = 'pending';
      resultEl.textContent = data.error || 'Reset failed.';
    }
  } catch (err) {
    resultEl.className = 'pending';
    resultEl.textContent = 'Reset request failed.';
  }
});

document.getElementById('checkFlagBtn').addEventListener('click', async () => {
  const resultEl = document.getElementById('flagResult');
  resultEl.className = 'pending';
  resultEl.textContent = 'checking...';

  try {
    const res = await fetch('/api/bank/flag', {
      headers: { ...authHeaders() }
    });
    const data = await res.json();

    if (data.success) {
      resultEl.className = 'success';
      resultEl.textContent = data.flag;
    } else {
      resultEl.className = 'pending';
      resultEl.textContent = data.message || 'Condition not satisfied.';
    }
  } catch (err) {
    resultEl.className = 'pending';
    resultEl.textContent = 'Something interrupted the check.';
  }
});

loadDashboard();
