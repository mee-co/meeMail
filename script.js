document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // DOM refs
  const headerSigninBtn = document.getElementById('header-signin-btn');
  const userMenu = document.getElementById('user-menu');
  const userBtn = document.getElementById('user-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const avatarInitial = document.getElementById('avatar-initial');
  const dropdownAddress = document.getElementById('dropdown-address');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const publicSections = document.getElementById('public-sections');
  const appContainer = document.getElementById('app-container');
  const authModal = document.getElementById('auth-modal');
  const composeModal = document.getElementById('compose-modal');
  const logoutBtn = document.getElementById('logout-btn');
  const installBtn = document.getElementById('install-btn');
  const addAccountBtn = document.getElementById('add-account-btn');
  const otherAccountsList = document.getElementById('other-accounts-list');
  const otherAccountsSection = document.getElementById('other-accounts-section');

  let currentUser = null;
  let currentProfile = null;
  let accounts = JSON.parse(localStorage.getItem('meeMailAccounts') || '[]');

  // ---------- helpers ----------
  function showSnackbar(msg, type='info') {
    const snackbar = document.getElementById('snackbar');
    snackbar.textContent = msg;
    snackbar.style.background = type==='error' ? '#dc2626' : 'var(--black)';
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 3000);
  }
  function toggleModal(modal, show) { modal.classList.toggle('open', show); }
  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
  }

  // Update UI based on login state
  async function refreshUI() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      // switch to app view
      publicSections.style.display = 'none';
      appContainer.style.display = 'block';
      userMenu.style.display = 'block';
      headerSigninBtn.style.display = 'none';
      menuToggle.style.display = 'block';
      // update avatar
      if (currentProfile) {
        const addr = currentProfile.mee_address;
        avatarInitial.textContent = addr.charAt(0).toUpperCase();
        dropdownAddress.textContent = addr;
      }
      loadInbox();
      // render other accounts
      renderOtherAccounts();
      // show install button if PWA not installed
      if (window.deferredPrompt) {
        installBtn.style.display = 'flex';
      }
    } else {
      currentUser = null;
      currentProfile = null;
      publicSections.style.display = 'block';
      appContainer.style.display = 'none';
      userMenu.style.display = 'none';
      headerSigninBtn.style.display = 'block';
      menuToggle.style.display = 'none';
    }
  }

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = data;
  }

  // ---- Multi-account storage ----
  function storeAccount(email, refreshToken) {
    // Remove existing entry for this email, then add
    accounts = accounts.filter(a => a.email !== email);
    accounts.push({ email, refreshToken, lastUsed: Date.now() });
    // Keep last 5 accounts
    if (accounts.length > 5) accounts = accounts.slice(-5);
    localStorage.setItem('meeMailAccounts', JSON.stringify(accounts));
  }
  function removeAccount(email) {
    accounts = accounts.filter(a => a.email !== email);
    localStorage.setItem('meeMailAccounts', JSON.stringify(accounts));
  }

  function renderOtherAccounts() {
    otherAccountsList.innerHTML = '';
    const other = accounts.filter(a => a.email !== (currentProfile?.mee_address || ''));
    if (other.length === 0) {
      otherAccountsSection.style.display = 'none';
      return;
    }
    otherAccountsSection.style.display = 'block';
    other.forEach(acc => {
      const div = document.createElement('div');
      div.className = 'other-account-item';
      div.innerHTML = `<span class="mini-avatar">${acc.email.charAt(0).toUpperCase()}</span> ${acc.email} <button class="remove-acc" data-email="${acc.email}">Remove</button>`;
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-acc')) {
          e.stopPropagation();
          removeAccount(acc.email);
          renderOtherAccounts();
          return;
        }
        switchAccount(acc.email);
      });
      otherAccountsList.appendChild(div);
    });
  }

  async function switchAccount(email) {
    const acc = accounts.find(a => a.email === email);
    if (!acc) return;
    const { error } = await supabase.auth.setSession({ access_token: '', refresh_token: acc.refreshToken });
    if (error) {
      showSnackbar('Failed to switch account', 'error');
      return;
    }
    // After setting session, supabase will refresh the token automatically; we must store the new refresh token.
    // We'll listen to auth state change later, but for now just reload UI.
    await refreshUI();
  }

  // On auth state change, store refresh token
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && currentUser && currentProfile) {
      const email = currentProfile.mee_address;
      const refreshToken = session.refresh_token;
      storeAccount(email, refreshToken);
    }
  });

  // ---- Event Listeners ----
  headerSigninBtn.addEventListener('click', () => {
    toggleModal(authModal, true);
    document.getElementById('tab-login').click();
  });
  document.getElementById('hero-get-started-btn').addEventListener('click', () => {
    toggleModal(authModal, true);
    document.getElementById('tab-register').click();
  });

  // Auth tabs
  document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
  });
  document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    document.getElementById('login-form').classList.remove('active');
  });

  // Password toggle
  document.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('ri-eye-line', isPassword);
      icon.classList.toggle('ri-eye-off-line', !isPassword);
    });
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const email = username + '@mee.com';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById('login-message').textContent = error.message;
    } else {
      toggleModal(authModal, false);
      refreshUI();
    }
  });

  // Register form
  const regUsername = document.getElementById('reg-username');
  const usernameStatus = document.getElementById('username-status');
  const registerSubmit = document.getElementById('register-submit-btn');
  const allowedPattern = /^[a-z0-9._-]+$/;
  let debounceTimer;
  regUsername.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const username = regUsername.value.trim();
    if (!username) { usernameStatus.textContent = ''; registerSubmit.disabled = true; return; }
    debounceTimer = setTimeout(async () => {
      if (!allowedPattern.test(username)) {
        usernameStatus.textContent = 'Only lowercase letters, digits, dots, and hyphens.'; usernameStatus.style.color = 'red'; registerSubmit.disabled = true; return;
      }
      const email = username + '@mee.com';
      const { data, error } = await supabase.from('profiles').select('mee_address').eq('mee_address', email).maybeSingle();
      if (error) { usernameStatus.textContent = 'Error checking availability.'; registerSubmit.disabled = true; return; }
      if (data) {
        usernameStatus.textContent = 'This address is already taken.'; usernameStatus.style.color = 'red'; registerSubmit.disabled = true;
      } else {
        usernameStatus.textContent = 'Available!'; usernameStatus.style.color = 'green'; registerSubmit.disabled = false;
      }
    }, 300);
  });
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = regUsername.value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    if (password !== confirm) { document.getElementById('register-message').textContent = 'Passwords do not match.'; return; }
    const email = username + '@mee.com';
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      document.getElementById('register-message').textContent = error.message;
    } else {
      document.getElementById('register-message').textContent = 'Account created! You can now login.';
      setTimeout(() => {
        toggleModal(authModal, false);
        refreshUI();
      }, 1000);
    }
  });

  // User menu toggle
  userBtn.addEventListener('click', () => userDropdown.classList.toggle('show'));
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) userDropdown.classList.remove('show');
  });

  // Manage account (placeholder)
  document.getElementById('manage-account-btn').addEventListener('click', () => {
    showSnackbar('Account management coming soon');
    userDropdown.classList.remove('show');
  });

  // Add another account
  addAccountBtn.addEventListener('click', () => {
    userDropdown.classList.remove('show');
    toggleModal(authModal, true);
    document.getElementById('tab-login').click();
    // We'll store the new account after successful login via onAuthStateChange
  });

  // Install PWA
  installBtn.addEventListener('click', () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    userDropdown.classList.remove('show');
    refreshUI();
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-'+section).classList.add('active');
      if (section === 'inbox') loadInbox();
      if (section === 'sent') loadSent();
    });
  });

  menuToggle.addEventListener('click', () => sidebar.classList.toggle('show'));

  // Compose modal
  document.getElementById('compose-btn').addEventListener('click', () => toggleModal(composeModal, true));
  document.querySelectorAll('.modal-close').forEach(close => close.addEventListener('click', () => {
    close.closest('.modal').classList.remove('open');
  }));
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.classList.remove('open');
  });

  document.getElementById('compose-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const toAddress = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();
    if (!toAddress || !subject || !body) return;
    const { data: profiles, error } = await supabase.from('profiles').select('id').eq('mee_address', toAddress).maybeSingle();
    if (error || !profiles) {
      document.getElementById('compose-message').textContent = 'Recipient not found.';
      return;
    }
    const { error: insertError } = await supabase.from('messages').insert({
      from_user: currentUser.id,
      to_user: profiles.id,
      subject,
      body
    });
    if (insertError) {
      document.getElementById('compose-message').textContent = 'Error sending message.';
    } else {
      document.getElementById('compose-message').textContent = 'Message sent!';
      setTimeout(() => {
        toggleModal(composeModal, false);
        loadSent();
      }, 1000);
    }
  });

  // Inbox / Sent functions (same as before but simplified)
  async function loadInbox() {
    if (!currentUser) return;
    const { data: messages, error } = await supabase.from('messages')
      .select('*, from_profile:from_user(mee_address)')
      .eq('to_user', currentUser.id)
      .order('created_at', { ascending: false });
    const container = document.getElementById('inbox-list');
    if (error) { container.innerHTML = `<div class="empty-state"><i class="ri-error-warning-line"></i><p>Error</p></div>`; return; }
    if (!messages.length) { container.innerHTML = `<div class="empty-state"><i class="ri-inbox-line"></i><p>No messages yet</p></div>`; return; }
    container.innerHTML = messages.map(msg => `
      <div class="message-item ${msg.read ? '' : 'unread'}" data-id="${msg.id}">
        <span class="sender">${msg.from_user ? (msg.from_profile?.mee_address || 'Unknown') : 'System'}</span>
        <span class="subject">${msg.subject}</span>
        <span class="snippet">${msg.body.substring(0,50)}</span>
        <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
      </div>
    `).join('');
    document.querySelectorAll('#inbox-list .message-item').forEach(item => {
      item.addEventListener('click', () => viewMessage(item.dataset.id));
    });
  }
  async function loadSent() {
    const { data: messages } = await supabase.from('messages')
      .select('*, to_profile:to_user(mee_address)')
      .eq('from_user', currentUser.id)
      .order('created_at', { ascending: false });
    const container = document.getElementById('sent-list');
    container.innerHTML = messages.length ? messages.map(msg => `
      <div class="message-item" data-id="${msg.id}">
        <span class="sender">To: ${msg.to_profile?.mee_address || 'Unknown'}</span>
        <span class="subject">${msg.subject}</span>
        <span class="snippet">${msg.body.substring(0,50)}</span>
        <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
      </div>
    `).join('') : `<div class="empty-state"><i class="ri-send-plane-line"></i><p>No sent messages</p></div>`;
  }
  function viewMessage(id) {
    // fetch message details
    supabase.from('messages').select('*, from_profile:from_user(mee_address), to_profile:to_user(mee_address)').eq('id', id).single().then(({ data: msg }) => {
      const detail = document.getElementById('message-detail');
      detail.innerHTML = `
        <div style="border-bottom:1px solid var(--gray-200); padding-bottom:1rem; margin-bottom:1.5rem">
          <h2>${msg.subject}</h2>
          <p>From: ${msg.from_user ? (msg.from_profile?.mee_address || 'Unknown') : 'System'}<br>
             To: ${msg.to_user === currentUser.id ? 'You' : (msg.to_profile?.mee_address || 'All meeians')}<br>
             Date: ${new Date(msg.created_at).toLocaleString()}</p>
        </div>
        <div style="white-space:pre-wrap">${msg.body}</div>
      `;
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-message-view').classList.add('active');
      // Mark read
      supabase.from('messages').update({ read: true }).eq('id', id).then();
    });
  }
  document.getElementById('back-btn').addEventListener('click', () => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-inbox').classList.add('active');
  });

  // Initial UI
  refreshUI();
});
