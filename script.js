// Supabase কনফিগ
const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

// DOM
const appContainer = document.getElementById('app-container');
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const logoutBtn = document.getElementById('logout-btn');
const verificationBar = document.getElementById('verification-bar');
const verifyBtn = document.getElementById('verify-now-btn');
const composeForm = document.getElementById('compose-form');
const composeMsg = document.getElementById('compose-message');

// Auth tab toggle
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

// Check session
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
    showApp();
  } else {
    showAuth();
  }
}

async function loadProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
  // Show/hide verification bar
  if (currentProfile && !currentProfile.verified) {
    verificationBar.style.display = 'flex';
    // Find verification token
    const { data: msgData } = await supabase.from('messages')
      .select('verification_token')
      .eq('to_user', currentUser.id)
      .eq('type', 'verification')
      .maybeSingle();
    if (msgData) {
      verifyBtn.dataset.token = msgData.verification_token;
    }
  } else {
    verificationBar.style.display = 'none';
  }
}

function showApp() {
  authContainer.style.display = 'none';
  appContainer.style.display = 'flex';
  loadInbox();
  loadSent();
}

function showAuth() {
  appContainer.style.display = 'none';
  authContainer.style.display = 'flex';
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-address').value.trim();
  const password = document.getElementById('login-password').value;
  const email = username + '@mee.com';

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('login-message').textContent = error.message;
  } else {
    await checkSession();
  }
});

// Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  if (password !== confirm) {
    document.getElementById('reg-message').textContent = 'Passwords do not match';
    return;
  }
  const email = username + '@mee.com';

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    document.getElementById('reg-message').textContent = error.message;
  } else {
    // Auto login after signup
    if (data.user) {
      await supabase.auth.signInWithPassword({ email, password });
      await checkSession();
    }
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showAuth();
});

// Verify button
verifyBtn.addEventListener('click', async () => {
  const token = verifyBtn.dataset.token;
  if (!token) return;
  const { data, error } = await supabase.rpc('verify_meemail', { p_token: token });
  if (error) {
    alert('Verification failed: ' + error.message);
  } else if (data === true) {
    alert('Your account is now verified!');
    verificationBar.style.display = 'none';
    currentProfile.verified = true;
  }
});

// Sidebar navigation
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + link.dataset.section).classList.add('active');
  });
});

// Dropdown toggle
document.querySelector('.dropdown-toggle').addEventListener('click', (e) => {
  e.preventDefault();
  e.currentTarget.parentElement.classList.toggle('open');
});

// Load inbox
async function loadInbox() {
  if (!currentUser) return;
  const { data: messages } = await supabase.from('messages')
    .select('*, from_profile:from_user(mee_address)')
    .eq('to_user', currentUser.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('inbox-list');
  container.innerHTML = '';
  if (messages.length === 0) {
    container.innerHTML = '<p style="padding:2rem; text-align:center; color: var(--gray-600);">No messages yet.</p>';
    return;
  }
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
      alert(`Subject: ${msg.subject}\n\n${msg.body}`);
    });
    container.appendChild(div);
  });
}

// Load sent
async function loadSent() {
  if (!currentUser) return;
  const { data: messages } = await supabase.from('messages')
    .select('*, to_profile:to_user(mee_address)')
    .eq('from_user', currentUser.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('sent-list');
  container.innerHTML = '';
  if (messages.length === 0) {
    container.innerHTML = '<p style="padding:2rem; text-align:center; color: var(--gray-600);">No sent messages.</p>';
    return;
  }
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message-item';
    div.innerHTML = `
      <span class="sender">To: ${msg.to_profile?.mee_address || 'Unknown'}</span>
      <span class="subject">${msg.subject}</span>
      <span class="date">${new Date(msg.created_at).toLocaleDateString()}</span>
    `;
    container.appendChild(div);
  });
}

// Compose
composeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const toAddress = document.getElementById('compose-to').value.trim();
  const subject = document.getElementById('compose-subject').value.trim();
  const body = document.getElementById('compose-body').value.trim();
  if (!toAddress || !subject || !body) return;

  // Find recipient profile
  const { data: profiles } = await supabase.from('profiles')
    .select('id').eq('mee_address', toAddress).maybeSingle();
  if (!profiles) {
    composeMsg.textContent = 'Recipient not found.';
    return;
  }

  const { error } = await supabase.from('messages').insert({
    from_user: currentUser.id,
    to_user: profiles.id,
    subject,
    body,
    type: 'normal'
  });
  if (error) {
    composeMsg.textContent = 'Error sending message.';
  } else {
    composeMsg.textContent = 'Message sent!';
    composeForm.reset();
    loadSent();
  }
});

// Start
checkSession();