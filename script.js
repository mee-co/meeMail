document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // DOM এলিমেন্ট
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
  const composeModal = document.getElementById('compose-modal');
  const composeForm = document.getElementById('compose-form');
  const composeMsg = document.getElementById('compose-message');
  const popup = document.getElementById('popup');
  const popupMsg = document.getElementById('popup-message');
  const popupClose = document.getElementById('popup-close');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const userBtn = document.getElementById('user-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const currentAddressSpan = document.getElementById('current-address');
  const backBtn = document.getElementById('back-btn');
  const inboxSection = document.getElementById('section-inbox');
  const messageViewSection = document.getElementById('section-message-view');
  const messageDetail = document.getElementById('message-detail');

  let currentUser = null;
  let currentProfile = null;
  let previousSection = 'inbox';

  // ======== অথেনটিকেশন ট্যাব ========
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  // ======== পাসওয়ার্ড টগল ========
  document.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', () => {
      const input = icon.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.classList.toggle('ri-eye-line', !isPassword);
      icon.classList.toggle('ri-eye-off-line', isPassword);
    });
  });

  // ======== পপআপ ========
  function showPopup(message) {
    popupMsg.textContent = message;
    popup.classList.add('show');
  }
  popupClose.addEventListener('click', () => popup.classList.remove('show'));

  // ======== সেশন ম্যানেজমেন্ট ========
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      await loadProfile();
      authContainer.style.display = 'none';
      appContainer.style.display = 'flex';
      if (currentProfile) {
        currentAddressSpan.textContent = currentProfile.mee_address;
      }
      loadInbox();
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

  // ======== লগইন ========
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
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
      checkSession();
    }
  });

  // ======== ইউজারনেম ভ্যালিডেশন ========
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
  }

  // ======== রেজিস্ট্রেশন ========
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
      registerMsg.textContent = error.message;
    } else {
      registerMsg.textContent = 'Account created! You can now login.';
      // অটো লগইন
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email, password });
        checkSession();
      }, 1000);
    }
  });

  // ======== লগআউট ========
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    appContainer.style.display = 'none';
    authContainer.style.display = 'flex';
  });

  // ======== সাইডবার নেভিগেশন ========
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      const targetSection = document.getElementById(`section-${section}`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      if (section === 'inbox') loadInbox();
      if (section === 'sent') loadSent();
      previousSection = section;
      sidebar.classList.remove('show'); // মোবাইলে সাইডবার হাইড
    });
  });

  // ======== মোবাইল মেনু টগল ========
  menuToggle.addEventListener('click', () => sidebar.classList.toggle('show'));

  // ======== ইউজার ড্রপডাউন ========
  userBtn.addEventListener('click', () => userDropdown.classList.toggle('show'));
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      userDropdown.classList.remove('show');
    }
  });

  // ======== ইনবক্স লোড ========
  async function loadInbox() {
    if (!currentUser) return;
    const { data: messages, error } = await supabase.from('messages')
      .select('*, from_profile:from_user(mee_address)')
      .eq('to_user', currentUser.id)
      .order('created_at', { ascending: false });

    const container = document.getElementById('inbox-list');
    if (error) {
      container.innerHTML = `<p>Error loading messages: ${error.message}</p>`;
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--gray-600);">No messages yet.</p>';
      return;
    }
    container.innerHTML = '';
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `message-item ${msg.read ? '' : 'unread'}`;
      div.innerHTML = `
        <span class="sender">${msg.from_user ? (msg.from_profile?.mee_address || 'Unknown') : 'System'}</span>
        <span class="subject">${msg.subject}</span>
        <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
      `;
      div.addEventListener('click', () => {
        // Mark as read
        if (!msg.read) supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
        viewMessage(msg);
      });
      container.appendChild(div);
    });
  }

  // ======== সেন্ট লোড ========
  async function loadSent() {
    if (!currentUser) return;
    const { data: messages, error } = await supabase.from('messages')
      .select('*, to_profile:to_user(mee_address)')
      .eq('from_user', currentUser.id)
      .order('created_at', { ascending: false });

    const container = document.getElementById('sent-list');
    if (error) {
      container.innerHTML = `<p>Error loading messages: ${error.message}</p>`;
      return;
    }
    if (messages.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--gray-600);">No sent messages.</p>';
      return;
    }
    container.innerHTML = '';
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'message-item';
      div.innerHTML = `
        <span class="sender">To: ${msg.to_profile?.mee_address || 'Unknown'}</span>
        <span class="subject">${msg.subject}</span>
        <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
      `;
      div.addEventListener('click', () => viewMessage(msg));
      container.appendChild(div);
    });
  }

  // ======== মেসেজ ভিউ ========
  function viewMessage(msg) {
    previousSection = document.querySelector('.content-section.active').id.replace('section-', '');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    messageViewSection.classList.add('active');
    messageDetail.innerHTML = `
      <div style="border-bottom: 1px solid var(--gray-200); padding-bottom: 1rem; margin-bottom: 1.5rem;">
        <h2 style="font-size: 1.5rem;">${msg.subject}</h2>
        <p style="color: var(--gray-600); margin-top: 0.5rem;">
          <strong>From:</strong> ${msg.from_user ? (msg.from_profile?.mee_address || 'Unknown') : 'System'}<br>
          <strong>To:</strong> ${msg.to_user ? (msg.to_profile?.mee_address || 'Unknown') : currentProfile?.mee_address}<br>
          <strong>Date:</strong> ${new Date(msg.created_at).toLocaleString()}
        </p>
      </div>
      <div style="white-space: pre-wrap;">${msg.body}</div>
    `;
  }

  backBtn.addEventListener('click', () => {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const prevSection = document.getElementById(`section-${previousSection}`);
    if (prevSection) prevSection.classList.add('active');
    messageViewSection.classList.remove('active');
  });

  // ======== কম্পোজ মোডাল ========
  composeBtn.addEventListener('click', () => composeModal.classList.add('open'));
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => composeModal.classList.remove('open'));
  });
  window.addEventListener('click', (e) => {
    if (e.target === composeModal) composeModal.classList.remove('open');
  });

  composeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const toAddress = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();
    if (!toAddress || !subject || !body) return;

    // রিসিপিয়েন্ট খোঁজা
    const { data: profiles, error } = await supabase.from('profiles')
      .select('id')
      .eq('mee_address', toAddress)
      .maybeSingle();
    if (error || !profiles) {
      composeMsg.textContent = 'Recipient not found.';
      return;
    }

    const { error: insertError } = await supabase.from('messages').insert({
      from_user: currentUser.id,
      to_user: profiles.id,
      subject,
      body
    });
    if (insertError) {
      composeMsg.textContent = 'Error sending message: ' + insertError.message;
    } else {
      composeMsg.textContent = 'Message sent successfully!';
      composeForm.reset();
      setTimeout(() => {
        composeModal.classList.remove('open');
        loadSent();
      }, 1500);
    }
  });

  // ইভেন্ট লিসেনার (রিয়েলটাইম)
  supabase
    .channel('messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user=eq.${currentUser?.id}` }, () => {
      if (inboxSection.classList.contains('active')) loadInbox();
    })
    .subscribe();
});