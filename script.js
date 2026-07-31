document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginMsg = document.getElementById('login-message');
  const registerMsg = document.getElementById('register-message');
  const regUsername = document.getElementById('reg-username');
  const usernameStatus = document.getElementById('username-status');
  const registerSubmit = document.getElementById('register-submit-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const composeBtn = document.getElementById('compose-btn');
  const composeBtnMobile = document.getElementById('compose-btn-mobile');
  const composeModal = document.getElementById('compose-modal');
  const composeForm = document.getElementById('compose-form');
  const composeMsg = document.getElementById('compose-message');
  const snackbar = document.getElementById('snackbar');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const userBtn = document.getElementById('user-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const currentAddressSpan = document.getElementById('current-address');
  const backBtn = document.getElementById('back-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const inboxSection = document.getElementById('section-inbox');
  const messageViewSection = document.getElementById('section-message-view');
  const messageDetail = document.getElementById('message-detail');
  const inboxCountSpan = document.getElementById('inbox-count');
  const searchInput = document.getElementById('search-input');

  let currentUser = null;
  let currentProfile = null;
  let previousSection = 'inbox';
  let allMessages = [];

  function showSnackbar(message, type = 'info') {
    snackbar.textContent = message;
    snackbar.style.background = type === 'error' ? '#dc2626' : 'var(--black)';
    snackbar.classList.add('show');
    setTimeout(() => snackbar.classList.remove('show'), 3000);
  }

  function toggleModal(modal, show) {
    if (show) modal.classList.add('open');
    else modal.classList.remove('open');
  }

  function setActiveTab(tab, form) {
    tabLogin.classList.remove('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    tab.classList.add('active');
    form.classList.add('active');
  }

  tabLogin.addEventListener('click', () => setActiveTab(tabLogin, loginForm));
  tabRegister.addEventListener('click', () => setActiveTab(tabRegister, registerForm));

  document.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('ri-eye-line', isPassword);
      icon.classList.toggle('ri-eye-off-line', !isPassword);
    });
  });

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      authContainer.style.display = 'none';
      appContainer.style.display = 'block';
      if (currentProfile) currentAddressSpan.textContent = currentProfile.mee_address;
      loadInbox();
      supabase.channel('messages-' + currentUser.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user=eq.${currentUser.id}` }, () => {
          if (inboxSection.classList.contains('active')) loadInbox();
        })
        .subscribe();
    } else {
      authContainer.style.display = 'flex';
      appContainer.style.display = 'none';
    }
  }
  checkSession();

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = data;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const email = username + '@mee.com';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const { data: profile } = await supabase.from('profiles').select('verified').eq('mee_address', email).maybeSingle();
        if (profile && !profile.verified) {
          showSnackbar('Your account is not yet verified. Please check your inbox.', 'error');
        } else {
          showSnackbar('Invalid credentials or account does not exist.', 'error');
        }
      } else {
        showSnackbar(error.message, 'error');
      }
    } else {
      checkSession();
    }
  });

  const allowedPattern = /^[a-z0-9._-]+$/;
  let debounceTimer;
  regUsername.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const username = regUsername.value.trim();
    if (!username) { usernameStatus.textContent = ''; registerSubmit.disabled = true; return; }
    debounceTimer = setTimeout(async () => {
      if (!allowedPattern.test(username)) {
        usernameStatus.textContent = 'Only lowercase letters, digits, dots, and hyphens.';
        usernameStatus.style.color = 'red';
        registerSubmit.disabled = true;
        return;
      }
      const email = username + '@mee.com';
      const { data, error } = await supabase.from('profiles').select('mee_address').eq('mee_address', email).maybeSingle();
      if (error) { usernameStatus.textContent = 'Error checking availability.'; registerSubmit.disabled = true; return; }
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

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = regUsername.value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const confirm = document.getElementById('reg-confirm').value.trim();
    if (password !== confirm) { registerMsg.textContent = 'Passwords do not match.'; return; }
    if (password.length < 6) { registerMsg.textContent = 'Password must be at least 6 characters.'; return; }
    const email = username + '@mee.com';
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { registerMsg.textContent = error.message; }
    else {
      registerMsg.textContent = 'Account created! You can now login.';
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email, password });
        checkSession();
      }, 1000);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    appContainer.style.display = 'none';
    authContainer.style.display = 'flex';
  });

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
      previousSection = section;
      sidebar.classList.remove('show');
    });
  });

  menuToggle.addEventListener('click', () => sidebar.classList.toggle('show'));
  userBtn.addEventListener('click', () => userDropdown.classList.toggle('show'));
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) userDropdown.classList.remove('show');
  });

  async function loadInbox() {
    if (!currentUser) return;
    const { data: messages, error } = await supabase.from('messages')
      .select('*, from_profile:from_user(mee_address)')
      .eq('to_user', currentUser.id)
      .order('created_at', { ascending: false });
    const container = document.getElementById('inbox-list');
    if (error) {
      container.innerHTML = `<div class="empty-state"><i class="ri-error-warning-line"></i><p>Error loading messages: ${error.message}</p></div>`;
      return;
    }
    allMessages = messages || [];
    updateInboxDisplay();
  }

  function updateInboxDisplay() {
    const container = document.getElementById('inbox-list');
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = allMessages.filter(msg => {
      return msg.subject.toLowerCase().includes(searchTerm) ||
             (msg.from_profile?.mee_address || '').toLowerCase().includes(searchTerm) ||
             msg.body.toLowerCase().includes(searchTerm);
    });
    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="ri-inbox-line"></i><p>No messages found</p></div>`;
    } else {
      container.innerHTML = '';
      filtered.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message-item ${msg.read ? '' : 'unread'}`;
        div.innerHTML = `
          <span class="sender">${msg.from_user ? (msg.from_profile?.mee_address || 'Unknown') : 'System'}</span>
          <span class="subject">${msg.subject}</span>
          <span class="snippet">${msg.body.substring(0, 60)}</span>
          <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
        `;
        div.addEventListener('click', () => {
          if (!msg.read) supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
          viewMessage(msg);
        });
        container.appendChild(div);
      });
    }
    // Update unread count
    const unreadCount = allMessages.filter(m => !m.read).length;
    inboxCountSpan.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    inboxCountSpan.textContent = unreadCount;
  }

  searchInput.addEventListener('input', updateInboxDisplay);
  refreshBtn.addEventListener('click', loadInbox);

  async function loadSent() {
    if (!currentUser) return;
    const { data: messages, error } = await supabase.from('messages')
      .select('*, to_profile:to_user(mee_address)')
      .eq('from_user', currentUser.id)
      .order('created_at', { ascending: false });
    const container = document.getElementById('sent-list');
    if (error) {
      container.innerHTML = `<div class="empty-state"><i class="ri-error-warning-line"></i><p>Error: ${error.message}</p></div>`;
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="ri-send-plane-line"></i><p>No sent messages</p></div>`;
    } else {
      container.innerHTML = '';
      messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'message-item';
        div.innerHTML = `
          <span class="sender">To: ${msg.to_profile?.mee_address || 'Unknown'}</span>
          <span class="subject">${msg.subject}</span>
          <span class="snippet">${msg.body.substring(0, 60)}</span>
          <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
        `;
        div.addEventListener('click', () => viewMessage(msg));
        container.appendChild(div);
      });
    }
  }

  function viewMessage(msg) {
    previousSection = document.querySelector('.content-section.active').id.replace('section-', '');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    messageViewSection.classList.add('active');
    messageDetail.innerHTML = `
      <div style="border-bottom:1px solid var(--gray-200); padding-bottom:1rem; margin-bottom:1.5rem">
        <h2 style="font-size:1.5rem">${msg.subject}</h2>
        <p style="color:var(--gray-600); margin-top:0.5rem">
          <strong>From:</strong> ${msg.from_user ? (msg.from_profile?.mee_address || 'Unknown') : 'System'}<br>
          <strong>To:</strong> ${msg.to_user ? (msg.to_profile?.mee_address || 'Unknown') : currentProfile?.mee_address}<br>
          <strong>Date:</strong> ${new Date(msg.created_at).toLocaleString()}
        </p>
      </div>
      <div style="white-space:pre-wrap">${msg.body}</div>
    `;
  }

  backBtn.addEventListener('click', () => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${previousSection}`).classList.add('active');
    messageViewSection.classList.remove('active');
    if (previousSection === 'inbox') loadInbox();
    if (previousSection === 'sent') loadSent();
  });

  [composeBtn, composeBtnMobile].forEach(btn => btn.addEventListener('click', () => toggleModal(composeModal, true)));
  document.querySelectorAll('.modal-close').forEach(close => close.addEventListener('click', () => toggleModal(composeModal, false)));
  window.addEventListener('click', (e) => { if (e.target === composeModal) toggleModal(composeModal, false); });

  composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const toAddress = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();
    if (!toAddress || !subject || !body) return;
    const { data: profiles, error } = await supabase.from('profiles').select('id').eq('mee_address', toAddress).maybeSingle();
    if (error || !profiles) { composeMsg.textContent = 'Recipient not found.'; return; }
    const { error: insertError } = await supabase.from('messages').insert({ from_user: currentUser.id, to_user: profiles.id, subject, body });
    if (insertError) {
      composeMsg.textContent = 'Error sending message: ' + insertError.message;
    } else {
      composeMsg.textContent = 'Message sent!';
      composeForm.reset();
      setTimeout(() => {
        toggleModal(composeModal, false);
        showSnackbar('Message sent successfully');
        loadSent();
      }, 1000);
    }
  });
});
