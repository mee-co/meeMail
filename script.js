const SUPABASE_URL = 'https://cmunxpnxknovcvbwykva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdW54cG54a25vdmN2Ynd5a3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjEzMTgsImV4cCI6MjEwMDk5NzMxOH0.rcVrkzJ-mm_m2xnf1jAQEcgfX1ZxWYv1wfgmPBYb0NY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;

// DOM Elements
const publicContainer = document.getElementById('public-container');
const appContainer = document.getElementById('app-container');
const modalOverlay = document.getElementById('modal-overlay');
const modalLoginForm = document.getElementById('modal-login-form');
const modalRegisterForm = document.getElementById('modal-register-form');
const modalTabLogin = document.getElementById('modal-tab-login');
const modalTabRegister = document.getElementById('modal-tab-register');
const modalClose = document.getElementById('modal-close');
const errorPopup = document.getElementById('error-popup');
const errorMessage = document.getElementById('error-message');
const errorClose = document.getElementById('error-close');

const btnLoginHero = document.getElementById('btn-login-hero');
const btnRegisterHero = document.getElementById('btn-register-hero');
const btnLoginNav = document.getElementById('btn-login-nav');
const btnRegisterNav = document.getElementById('btn-register-nav');
const btnCreateAccount = document.getElementById('btn-create-account');

const verificationBar = document.getElementById('verification-bar');
const verifyBtn = document.getElementById('verify-now-btn');
const composeForm = document.getElementById('compose-form');
const composeMsg = document.getElementById('compose-message');
const logoutBtn = document.getElementById('logout-btn');

// ---- Event Listeners ----
function openModal(tab = 'login') {
  modalOverlay.style.display = 'flex';
  if (tab === 'login') {
    modalTabLogin.classList.add('active');
    modalTabRegister.classList.remove('active');
    modalLoginForm.classList.add('active');
    modalRegisterForm.classList.remove('active');
  } else {
    modalTabRegister.classList.add('active');
    modalTabLogin.classList.remove('active');
    modalRegisterForm.classList.add('active');
    modalLoginForm.classList.remove('active');
  }
}
function closeModal() { modalOverlay.style.display = 'none'; }

[btnLoginHero, btnLoginNav].forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openModal('login'); }));
[btnRegisterHero, btnRegisterNav, btnCreateAccount].forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); openModal('register'); }));
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

modalTabLogin.addEventListener('click', () => {
  modalTabLogin.classList.add('active'); modalTabRegister.classList.remove('active');
  modalLoginForm.classList.add('active'); modalRegisterForm.classList.remove('active');
});
modalTabRegister.addEventListener('click', () => {
  modalTabRegister.classList.add('active'); modalTabLogin.classList.remove('active');
  modalRegisterForm.classList.add('active'); modalLoginForm.classList.remove('active');
});

errorClose.addEventListener('click', () => errorPopup.style.display = 'none');
function showError(msg) {
  errorMessage.textContent = msg;
  errorPopup.style.display = 'flex';
}

// ---- Auth Check ----
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
    if (currentProfile && currentProfile.verified) {
      showApp();
    } else {
      // Not verified -> sign out and show error
      await supabase.auth.signOut();
      showError('Your account is not verified. Please verify from your inbox after registration.');
      showPublic();
    }
  } else {
    showPublic();
  }
}

async function loadProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
  if (currentProfile && !currentProfile.verified) {
    verificationBar.style.display = 'flex';
    const { data: msg } = await supabase.from('messages').select('verification_token').eq('to_user', currentUser.id).eq('type', 'verification').maybeSingle();
    if (msg) verifyBtn.dataset.token = msg.verification_token;
  } else {
    verificationBar.style.display = 'none';
  }
}

function showApp() {
  publicContainer.style.display = 'none';
  appContainer.style.display = 'flex';
  closeModal();
  loadInbox(); loadSent();
}
function showPublic() {
  appContainer.style.display = 'none';
  publicContainer.style.display = 'block';
  modalOverlay.style.display = 'none';
}

// ---- Login ----
modalLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const addr = document.getElementById('modal-login-address').value.trim();
  const pass = document.getElementById('modal-login-password').value;
  const email = addr + '@mee.com';
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) {
    document.getElementById('modal-login-message').textContent = 'Invalid credentials or account does not exist.';
    return;
  }
  // Session will be handled by checkSession -> if not verified, it will sign out and show error
  await checkSession();
});

// ---- Register ----
modalRegisterForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('modal-reg-username').value.trim();
  const pass = document.getElementById('modal-reg-password').value;
  const confirm = document.getElementById('modal-reg-confirm').value;

  if (pass !== confirm) {
    document.getElementById('modal-reg-message').textContent = 'Passwords do not match.';
    return;
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    document.getElementById('modal-reg-message').textContent = 'Only lowercase letters, digits, . and - allowed.';
    return;
  }

  const email = username + '@mee.com';
  const { data, error } = await supabase.auth.signUp({ email, password: pass });
  if (error) {
    document.getElementById('modal-reg-message').textContent = error.message;
    return;
  }
  // Auto login after signup
  if (data.user) {
    await supabase.auth.signInWithPassword({ email, password: pass });
    await checkSession();
  }
});

// ---- Logout ----
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null; currentProfile = null;
  showPublic();
});

// ---- Verify ----
verifyBtn.addEventListener('click', async () => {
  const token = verifyBtn.dataset.token;
  if (!token) return;
  const { data, error } = await supabase.rpc('verify_meemail', { p_token: token });
  if (error) showError('Verification failed: ' + error.message);
  else if (data === true) {
    alert('Your account is now verified!');
    currentProfile.verified = true;
    verificationBar.style.display = 'none';
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

document.querySelector('.dropdown-toggle').addEventListener('click', (e) => {
  e.preventDefault();
  e.currentTarget.parentElement.classList.toggle('open');
});

// Load inbox & sent
async function loadInbox() {
  if (!currentUser) return;
  const { data: msgs } = await supabase.from('messages').select('*, from_profile:from_user(mee_address)').eq('to_user', currentUser.id).order('created_at', { ascending: false });
  const cont = document.getElementById('inbox-list');
  cont.innerHTML = '';
  if (msgs.length === 0) cont.innerHTML = '<p style="padding:2rem;text-align:center;color: var(--gray-600);">No messages.</p>';
  else msgs.forEach(m => {
    const div = document.createElement('div');
    div.className = `message-item ${m.read ? '' : 'unread'}`;
    div.innerHTML = `<span class="sender">${m.from_user ? (m.from_profile?.mee_address || 'Unknown') : 'System'}</span><span class="subject">${m.subject}</span><span class="date">${new Date(m.created_at).toLocaleDateString()}</span>`;
    div.addEventListener('click', () => {
      if (!m.read) supabase.from('messages').update({ read: true }).eq('id', m.id).then();
      alert(`Subject: ${m.subject}\n\n${m.body}`);
    });
    cont.appendChild(div);
  });
}

async function loadSent() {
  if (!currentUser) return;
  const { data: msgs } = await supabase.from('messages').select('*, to_profile:to_user(mee_address)').eq('from_user', currentUser.id).order('created_at', { ascending: false });
  const cont = document.getElementById('sent-list');
  cont.innerHTML = '';
  if (msgs.length === 0) cont.innerHTML = '<p style="padding:2rem;text-align:center;color: var(--gray-600);">No sent messages.</p>';
  else msgs.forEach(m => {
    const div = document.createElement('div');
    div.className = 'message-item';
    div.innerHTML = `<span class="sender">To: ${m.to_profile?.mee_address || 'Unknown'}</span><span class="subject">${m.subject}</span><span class="date">${new Date(m.created_at).toLocaleDateString()}</span>`;
    cont.appendChild(div);
  });
}

// Compose
composeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const to = document.getElementById('compose-to').value.trim();
  const subj = document.getElementById('compose-subject').value.trim();
  const body = document.getElementById('compose-body').value.trim();
  if (!to || !subj || !body) return;
  const { data: rec } = await supabase.from('profiles').select('id').eq('mee_address', to).maybeSingle();
  if (!rec) { composeMsg.textContent = 'Recipient not found.'; return; }
  const { error } = await supabase.from('messages').insert({ from_user: currentUser.id, to_user: rec.id, subject: subj, body, type: 'normal' });
  composeMsg.textContent = error ? 'Error sending.' : 'Message sent!';
  if (!error) { composeForm.reset(); loadSent(); }
});

// Init
checkSession();