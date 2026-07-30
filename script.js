const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const publicSite = document.getElementById('public-site');
const appContainer = document.getElementById('app-container');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const popup = document.getElementById('popup');
const popupMsg = document.getElementById('popup-message');
const popupClose = document.getElementById('popup-close');
const mobileToggle = document.getElementById('mobile-toggle');
const mainNav = document.getElementById('main-nav');

// Open modals from various buttons
function bindModalOpen(selector, modal) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => modal.classList.add('open'));
  });
}
bindModalOpen('#login-btn, #hero-login-btn, #sign-in-accounts-btn', loginModal);
bindModalOpen('#register-btn, #hero-register-btn, #create-account-btn', registerModal);

// Close modals
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    loginModal.classList.remove('open');
    registerModal.classList.remove('open');
  });
});
window.addEventListener('click', (e) => {
  if (e.target === loginModal) loginModal.classList.remove('open');
  if (e.target === registerModal) registerModal.classList.remove('open');
});

// Mobile menu toggle
mobileToggle.addEventListener('click', () => mainNav.classList.toggle('show'));

// Popup utility
function showPopup(msg) {
  popupMsg.textContent = msg;
  popup.classList.add('show');
}
popupClose.addEventListener('click', () => popup.classList.remove('show'));

// Session check
let currentUser = null;
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    publicSite.style.display = 'none';
    appContainer.style.display = 'flex';
    // Future: load inbox, etc.
  }
}
checkSession();

// Username validation & availability checker
const regUsername = document.getElementById('reg-username');
const usernameStatus = document.getElementById('username-status');
const registerSubmit = document.getElementById('register-submit-btn');
const allowedPattern = /^[a-z0-9._-]+$/;
let debounceTimer;

regUsername.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const username = regUsername.value.trim();
  if (!username) {
    usernameStatus.textContent = '';
    registerSubmit.disabled = true;
    return;
  }
  debounceTimer = setTimeout(async () => {
    if (!allowedPattern.test(username)) {
      usernameStatus.textContent = 'Only lowercase letters, digits, dots, and hyphens.';
      usernameStatus.style.color = 'red';
      registerSubmit.disabled = true;
      return;
    }
    const email = username + '@mee.com';
    const { data, error } = await supabase.from('profiles')
      .select('mee_address')
      .eq('mee_address', email)
      .maybeSingle();
    if (error) {
      usernameStatus.textContent = 'Error checking availability.';
      registerSubmit.disabled = true;
      return;
    }
    if (data) {
      usernameStatus.textContent = 'This address is already taken.';
      usernameStatus.style.color = 'red';
      registerSubmit.disabled = true;
    } else {
      usernameStatus.textContent = 'Available!';
      usernameStatus.style.color = 'green';
      registerSubmit.disabled = false;
    }
  }, 300);
});

// Register form handler
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = regUsername.value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const registerMsg = document.getElementById('register-message');
  if (password !== confirm) {
    registerMsg.textContent = 'Passwords do not match.';
    return;
  }
  const email = username + '@mee.com';
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    registerMsg.textContent = error.message;
  } else {
    registerMsg.textContent = 'Account created! Please check your inbox for verification.';
    // Auto login after a short delay
    setTimeout(async () => {
      await supabase.auth.signInWithPassword({ email, password });
      registerModal.classList.remove('open');
      checkSession();
    }, 1500);
  }
});

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const email = username + '@mee.com';
  const loginMsg = document.getElementById('login-message');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      const { data: profile } = await supabase.from('profiles')
        .select('verified')
        .eq('mee_address', email)
        .maybeSingle();
      if (profile && !profile.verified) {
        showPopup('Your account is not yet verified. Please check your inbox.');
      } else {
        showPopup('Invalid credentials or account does not exist.');
      }
    } else {
      showPopup(error.message);
    }
  } else {
    loginModal.classList.remove('open');
    checkSession();
  }
});

// Logout (in app placeholder)
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  appContainer.style.display = 'none';
  publicSite.style.display = 'block';
});