document.addEventListener('DOMContentLoaded', () => {
    // Redirect if dynamically logged in
    if (localStorage.getItem('uninexus_token')) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const alertBox = document.getElementById('alert-box');

    // UI Toggles
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        alertBox.classList.add('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        alertBox.classList.add('hidden');
    });

    function showAlert(msg, isError = true) {
        alertBox.textContent = msg;
        alertBox.classList.remove('hidden');
        alertBox.className = `mb-4 p-3 rounded text-sm text-center block ${isError ? 'bg-red-500/20 text-red-200 border border-red-500/50' : 'bg-green-500/20 text-green-200 border border-green-500/50'}`;
    }

    // Login Handler
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Login failed');

            localStorage.setItem('uninexus_token', data.session.access_token);
            localStorage.setItem('uninexus_user', JSON.stringify(data.session.user));
            
            window.location.href = 'dashboard.html';
        } catch (err) {
            showAlert(err.message);
        }
    });

    // Registration Handler
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Registration failed');

            showAlert('Welcome! Registration successful. Please login.', false);
            setTimeout(() => {
                showLogin.click();
            }, 1500);
        } catch (err) {
            showAlert(err.message);
        }
    });
});
