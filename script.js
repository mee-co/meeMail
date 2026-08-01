document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // DOM refs
  const headerSigninBtn = document.getElementById('header-signin-btn');
  const userMenu = document.getElementById('user-menu');
  const userBtn = document.getElementById('user-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const avatarImg = document.getElementById('avatar-img');
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
  const manageAccountBtn = document.getElementById('manage-account-btn');
  const manageSection = document.getElementById('section-manage-account');
  const saveAvatarBtn = document.getElementById('save-avatar-btn');
  const avatarFileInput = document.getElementById('avatar-file-input');
  const manageAvatarImg = document.getElementById('manage-avatar-img');
  const manageAvatarInitial = document.getElementById('manage-avatar-initial');
  const manageAddress = document.getElementById('manage-address');
  const manageMessage = document.getElementById('manage-message');
  const snackbar = document.getElementById('snackbar');
  const container = document.getElementById('container');
  const registerToggle = document.getElementById('register');
  const loginToggle = document.getElementById('login');
  const refreshBtn = document.getElementById('refresh-btn');
  const fabCompose = document.getElementById('fab-compose-btn');

  let currentUser = null;
  let currentProfile = null;
  let accounts = JSON.parse(localStorage.getItem('meeMailAccounts') || '[]');

  // ---- Sliding toggle ----
  registerToggle.addEventListener('click', () => container.classList.add("active"));
  loginToggle.addEventListener('click', () => container.classList.remove("active"));

  // ---- Helpers ----
  function showSnackbar(msg, type='info') {
    snackbar.textContent = msg;
    snackbar.style.background = type === 'error' ? '#dc2626' : 'var(--black)';
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 3000);
  }
  function toggleModal(modal, show) { modal.classList.toggle('open', show); }

  function updateAvatars(profile) {
    const url = profile?.avatar_url || '';
    const initial = profile?.mee_address ? profile.mee_address.charAt(0).toUpperCase() : '?';
    if (url) {
      avatarImg.src = url; avatarImg.style.display = 'block'; avatarInitial.style.display = 'none';
    } else {
      avatarImg.style.display = 'none'; avatarInitial.textContent = initial; avatarInitial.style.display = 'flex';
    }
    if (manageSection) {
      if (url) {
        manageAvatarImg.src = url; manageAvatarImg.style.display = 'block'; manageAvatarInitial.style.display = 'none';
      } else {
        manageAvatarImg.style.display = 'none'; manageAvatarInitial.textContent = initial; manageAvatarInitial.style.display = 'flex';
      }
    }
  }

  async function refreshUI() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      publicSections.style.display = 'none';
      appContainer.style.display = 'block';
      userMenu.style.display = 'block';
      headerSigninBtn.style.display = 'none';
      menuToggle.style.display = 'block';
      if (currentProfile) {
        dropdownAddress.textContent = currentProfile.mee_address;
        updateAvatars(currentProfile);
      }
      loadInbox();
      renderOtherAccounts();
      if (window.deferredPrompt) installBtn.style.display = 'flex';
      else installBtn.style.display = 'none';
    } else {
      currentUser = null; currentProfile = null;
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

  // Multi-account
  function storeAccount(email, refreshToken) {
    accounts = accounts.filter(a => a.email !== email);
    accounts.push({ email, refreshToken, lastUsed: Date.now() });
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
    if (other.length === 0) { otherAccountsSection.style.display = 'none'; return; }
    otherAccountsSection.style.display = 'block';
    other.forEach(acc => {
      const div = document.createElement('div');
      div.className = 'other-account-item';
      div.innerHTML = `<span class="mini-avatar">${acc.email.charAt(0).toUpperCase()}</span> ${acc.email} <button class="remove-acc" data-email="${acc.email}">Remove</button>`;
      div.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-acc')) { e.stopPropagation(); removeAccount(acc.email); renderOtherAccounts(); return; }
        switchAccount(acc.email);
      });
      otherAccountsList.appendChild(div);
    });
  }
  async function switchAccount(email) {
    const acc = accounts.find(a => a.email === email);
    if (!acc) return;
    const { error } = await supabase.auth.setSession({ access_token: '', refresh_token: acc.refreshToken });
    if (error) { showSnackbar('Failed to switch account', 'error'); return; }
    await refreshUI();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (session && currentProfile) {
      storeAccount(currentProfile.mee_address, session.refresh_token);
    }
  });

  // Sidebar navigation
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${section}`).classList.add('active');
      if (section === 'inbox') loadInbox();
      if (section === 'sent') loadSent();
      if (section === 'manage-account') loadManageAccount();
    });
  });

  menuToggle.addEventListener('click', () => sidebar.classList.toggle('show'));

  function loadManageAccount() {
    if (!currentProfile) return;
    manageAddress.value = currentProfile.mee_address || '';
    updateAvatars(currentProfile);
  }

  // Avatar upload
  saveAvatarBtn.addEventListener('click', async () => {
    const file = avatarFileInput.files[0];
    if (!file) { manageMessage.textContent = 'Please select an image.'; return; }
    if (file.size > 2 * 1024 * 1024) { manageMessage.textContent = 'File too large. Max 2 MB.'; return; }
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
    if (uploadError) { manageMessage.textContent = 'Upload failed: ' + uploadError.message; return; }
    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id);
    if (updateError) { manageMessage.textContent = 'Update failed: ' + updateError.message; }
    else {
      currentProfile.avatar_url = publicUrl;
      updateAvatars(currentProfile);
      manageMessage.textContent = 'Profile picture updated!';
      showSnackbar('Avatar updated successfully');
    }
  });

  // Modal open handlers
  headerSigninBtn.addEventListener('click', () => {
    toggleModal(authModal, true);
    container.classList.remove('active');
  });
  document.getElementById('hero-get-started-btn').addEventListener('click', () => {
    toggleModal(authModal, true);
    container.classList.add('active');
  });
  userBtn.addEventListener('click', () => userDropdown.classList.toggle('show'));
  window.addEventListener('click', (e) => { if (!e.target.closest('.user-menu')) userDropdown.classList.remove('show'); });
  manageAccountBtn.addEventListener('click', () => {
    userDropdown.classList.remove('show');
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelector('.sidebar-link[data-section="manage-account"]').classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    manageSection.classList.add('active');
    loadManageAccount();
  });
  addAccountBtn.addEventListener('click', () => {
    userDropdown.classList.remove('show');
    toggleModal(authModal, true);
    container.classList.remove('active');
  });
  installBtn.addEventListener('click', () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => { window.deferredPrompt = null; installBtn.style.display = 'none'; });
    }
  });
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    userDropdown.classList.remove('show');
    refreshUI();
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

  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const email = username + '@mee.com';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById('login-message').textContent = error.message;
    } else {
      toggleModal(authModal, false);
      refreshUI();
    }
  });

  // Register
  const regName = document.getElementById('reg-name');
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
    const name = regName.value.trim();
    const username = regUsername.value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    if (password !== confirm) { document.getElementById('register-message').textContent = 'Passwords do not match.'; return; }
    const email = username + '@mee.com';
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
      document.getElementById('register-message').textContent = error.message;
    } else {
      document.getElementById('register-message').textContent = 'Account created! You can now login.';
      setTimeout(() => { toggleModal(authModal, false); refreshUI(); }, 1000);
    }
  });

  // Close modals
  document.querySelectorAll('.modal-close').forEach(close => close.addEventListener('click', () => close.closest('.modal').classList.remove('open')));
  window.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('open'); });

  // Compose (FAB)
  fabCompose.addEventListener('click', () => toggleModal(composeModal, true));
  document.getElementById('compose-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const toAddress = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();
    if (!toAddress || !subject || !body) return;
    const { data: profiles, error } = await supabase.from('profiles').select('id').eq('mee_address', toAddress).maybeSingle();
    if (error || !profiles) { document.getElementById('compose-message').textContent = 'Recipient not found.'; return; }
    const { error: insertError } = await supabase.from('messages').insert({ from_user: currentUser.id, to_user: profiles.id, subject, body });
    if (insertError) {
      document.getElementById('compose-message').textContent = 'Error sending message.';
    } else {
      document.getElementById('compose-message').textContent = 'Message sent!';
      setTimeout(() => { toggleModal(composeModal, false); loadSent(); }, 1000);
    }
  });

  // Inbox / Sent
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
      supabase.from('messages').update({ read: true }).eq('id', id).then();
    });
  }
  document.getElementById('back-btn').addEventListener('click', () => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-inbox').classList.add('active');
    document.querySelector('.sidebar-link[data-section="inbox"]').classList.add('active');
  });

  refreshBtn.addEventListener('click', loadInbox);

  // Initial
  refreshUI();
});
