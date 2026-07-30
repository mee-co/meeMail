// Replace with your Render backend URL after deploy
const API_BASE = 'https://backend-y7gm.onrender.com/api/auth';

const step1Panel = document.getElementById('step1-panel');
const step2Panel = document.getElementById('step2-panel');
const step1Form = document.getElementById('step1-form');
const step2Form = document.getElementById('step2-form');
const step1Msg = document.getElementById('step1-message');
const step2Msg = document.getElementById('step2-message');
const stepDot1 = document.getElementById('step-dot-1');
const stepDot2 = document.getElementById('step-dot-2');

let currentToken = null;
let currentEmail = null;

// Check URL params (for return from verification)
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get('token');
const emailFromUrl = params.get('email');
if (tokenFromUrl && emailFromUrl) {
    currentToken = tokenFromUrl;
    currentEmail = decodeURIComponent(emailFromUrl);
    switchToStep2();
}

// Step 1: Send verification
step1Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    if (!name || !email) return alert('Please fill all fields.');

    const btn = document.getElementById('send-verification');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
        const res = await fetch(`${API_BASE}/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        const data = await res.json();
        if (res.ok) {
            step1Msg.textContent = 'Verification email sent! Check your inbox.';
            step1Msg.classList.add('show');
        } else {
            alert(data.error || 'Something went wrong.');
        }
    } catch (err) {
        alert('Network error.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Verification';
    }
});

// Step 2: Complete registration
step2Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const meeAddress = document.getElementById('mee-address').value.trim().toLowerCase();
    const password = document.getElementById('mee-password').value;
    const confirm = document.getElementById('mee-confirm').value;

    if (!meeAddress || !password || !confirm) return alert('All fields required.');
    if (password !== confirm) return alert('Passwords do not match.');
    if (!currentToken || !currentEmail) return alert('Invalid session. Please restart registration.');

    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: currentToken,
                email: currentEmail,
                meeAddress: meeAddress,
                password: password
            })
        });
        const data = await res.json();
        if (res.ok) {
            step2Msg.textContent = `Welcome, meeian! Your address is ${data.meeAddress}@mee.com.`;
            step2Msg.classList.add('show');
            step2Form.style.display = 'none';
        } else {
            alert(data.error || 'Registration failed.');
        }
    } catch (err) {
        alert('Network error.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create mee Address';
    }
});

function switchToStep2() {
    step1Panel.classList.remove('active');
    step1Panel.classList.add('exit-left');
    step2Panel.classList.add('active');
    stepDot1.classList.remove('active');
    stepDot2.classList.add('active');
    step1Msg.classList.remove('show');
}