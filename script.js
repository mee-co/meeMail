// API base
const API_BASE = 'https://backend-y7gm.onrender.com/api/auth';

// Sidebar navigation
const sidebarLinks = document.querySelectorAll('.sidebar-link[data-section]');
const sections = document.querySelectorAll('.content-section');

sidebarLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = link.getAttribute('data-section');
    // Remove active from all links and sections
    sidebarLinks.forEach(l => l.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    // Activate
    link.classList.add('active');
    document.getElementById(`section-${sectionId}`).classList.add('active');
  });
});

// Sidebar dropdown toggle
const dropdownToggle = document.querySelector('.dropdown-toggle');
dropdownToggle.addEventListener('click', (e) => {
  e.preventDefault();
  const parent = dropdownToggle.parentElement;
  parent.classList.toggle('open');
});

// Dropdown menu links -> modals
document.querySelectorAll('[data-action]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const action = item.getAttribute('data-action');
    if (action === 'change-address') openModal('modal-change');
    if (action === 'delete-address') openModal('modal-delete');
    // Close the dropdown if open (and sidebar dropdown on mobile)
    const dropdown = item.closest('.sidebar-dropdown');
    if (dropdown) dropdown.classList.remove('open');
  });
});

// Modals
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    if (modal) modal.classList.remove('open');
  });
});

// Registration logic (same as before)
const step1Panel = document.getElementById('step1-panel');
const step2Panel = document.getElementById('step2-panel');
const stepDot1 = document.getElementById('step-dot-1');
const stepDot2 = document.getElementById('step-dot-2');
const step1Msg = document.getElementById('step1-message');
const step2Msg = document.getElementById('step2-message');

let currentToken = null;
let currentEmail = null;

// Check for token in URL (after verification)
const params = new URLSearchParams(window.location.search);
const tokenFromUrl = params.get('token');
const emailFromUrl = params.get('email');
if (tokenFromUrl && emailFromUrl) {
  currentToken = tokenFromUrl;
  currentEmail = decodeURIComponent(emailFromUrl);
  switchToStep2();
  // Also switch to Register section if not already active
  document.querySelector('[data-section="register"]').click();
}

document.getElementById('step1-form').addEventListener('submit', async (e) => {
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

document.getElementById('step2-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const meeAddress = document.getElementById('mee-address').value.trim().toLowerCase();
  const password = document.getElementById('mee-password').value;
  const confirm = document.getElementById('mee-confirm').value;
  if (!meeAddress || !password || !confirm) return alert('All fields required.');
  if (password !== confirm) return alert('Passwords do not match.');
  if (!currentToken || !currentEmail) return alert('Invalid session.');

  const btn = document.getElementById('register-btn');
  btn.disabled = true;
  btn.textContent = 'Creating...';
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken, email: currentEmail, meeAddress, password })
    });
    const data = await res.json();
    if (res.ok) {
      step2Msg.textContent = `Welcome, meeian! Your address is ${data.meeAddress}@mee.com.`;
      step2Msg.classList.add('show');
      document.getElementById('step2-form').style.display = 'none';
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
  step2Panel.classList.add('active');
  stepDot1.classList.remove('active');
  stepDot2.classList.add('active');
  step1Msg.classList.remove('show');
}

// Placeholder actions for modals (no backend yet)
document.getElementById('change-address-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Change address feature will be connected to backend soon.');
  closeModal('modal-change');
});
document.getElementById('delete-address-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Delete address feature will be connected to backend soon.');
  closeModal('modal-delete');
});