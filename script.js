document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // DOM elements
  const publicSite = document.getElementById('public-site');
  const appContainer = document.getElementById('app-container');
  const loginModal = document.getElementById('login-modal');
  const registerModal = document.getElementById('register-modal');
  const popup = document.getElementById('popup');
  const popupMsg = document.getElementById('popup-message');
  const popupClose = document.getElementById('popup-close');
  const mobileToggle = document.getElementById('mobile-toggle');
  const mainNav = document.getElementById('main-nav');

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginMsg = document.getElementById('login-message');
  const registerMsg = document.getElementById('register-message');
  const regUsername = document.getElementById('reg-username');
  const usernameStatus = document.getElementById('username-status');
  const registerSubmit = document.getElementById('register-submit-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // ======= PASSWORD TOGGLE =======
  document.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling; // the <input>
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('ri-eye-line', !isPassword);
      icon.classList.toggle('ri-eye-off-line', isPassword);
    });
  });

  // ======= MODAL LOGIC =======
  function openModal(modal) { modal.classList.add('open'); }
  function closeModal(modal) { modal.classList.remove('open'); }

  const loginBtns = ['login-btn', 'hero-login-btn', 'sign-in-accounts-btn'];
  const registerBtns = ['register-btn', 'hero-register-btn', 'create-account-btn'];

  loginBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => openModal(loginModal));
  });
  registerBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => openModal(registerModal));
  });

  document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      closeModal(loginModal);
      closeModal(registerModal);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === loginModal) closeModal(loginModal);
    if (e.target === registerModal) closeModal(registerModal);
  });

  // Mobile menu toggle
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => mainNav.classList.toggle('show'));
  }

  // Popup
  function showPopup(message) {
    popupMsg.textContent = message;
    popup.classList.add('show');
  }
  if (popupClose) {
    popupClose.addEventListener('click', () => popup.classList.remove('show'));
  }

  // ======= SESSION CHECK =======
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      publicSite.style.display = 'none';
      appContainer.style.display = 'flex';
    } else {
      publicSite.style.display = 'block';
      appContainer.style.display = 'none';
    }
  }
  checkSession();

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      appContainer.style.display = 'none';
      publicSite.style.display = 'block';
    });
  }

  // ======= USERNAME VALIDATION =======
  const allowedPattern = /^[a-z0-9._-]+$/;
  let debounceTimer;
  if (regUsername) {
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
        // Check availability via Supabase (public read policy needed)
        const { data, error } = await supabase.from('profiles')
          .select('mee_address')
          .eq('mee_address', email)
          .maybeSingle();
        if (error) {
          console.error('Availability check error:', error);
          usernameStatus.textContent = 'Error checking availability.';
          usernameStatus.style.color = 'red';
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
  }

  // ======= REGISTER =======
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = regUsername.value.trim();
      const password = document.getElementById('reg-password').value.trim();
      const confirm = document.getElementById('reg-confirm').value.trim();
      if (password !== confirm) {
        registerMsg.textContent = 'Passwords do not match.';
        return;
      }
      if (password.length < 6) {
        registerMsg.textContent = 'Password must be at least 6 characters.';
        return;
      }
      const email = username + '@mee.com';
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('duplicate')) {
          registerMsg.textContent = 'This address is already taken.';
        } else {
          registerMsg.textContent = error.message;
        }
      } else {
        registerMsg.textContent = 'Account created! Please check your inbox for verification.';
        setTimeout(async () => {
          await supabase.auth.signInWithPassword({ email, password });
          closeModal(registerModal);
          checkSession();
        }, 1500);
      }
    });
  }

  // ======= LOGIN =======
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      const email = username + '@mee.com';
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
        closeModal(loginModal);
        checkSession();
      }
    });
  }
});