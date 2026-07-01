// Auth — talks to POST /login, stores role in sessionStorage
const Auth = (() => {
  const KEY = 'dripvault_role';

  async function login(password) {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.role) {
      sessionStorage.setItem(KEY, data.role);
      return data.role;
    }
    return null;
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    window.location.href = '/index.html';
  }

  function getRole() {
    return sessionStorage.getItem(KEY);
  }

  function requireRole(expected) {
    const role = getRole();
    if (expected === 'admin' && role !== 'admin') {
      window.location.href = '/index.html';
    } else if (expected === 'customer' && role !== 'customer' && role !== 'admin') {
      window.location.href = '/index.html';
    }
  }

  return { login, logout, getRole, requireRole };
})();
