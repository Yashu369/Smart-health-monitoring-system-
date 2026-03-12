<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vitals AI | Secure Health Monitor Pro</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-database-compat.js"></script>

  <style>
    body { font-family: 'Outfit', sans-serif; background-color: #09090b; color: #fafafa; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .glass-panel { background: rgba(24, 24, 27, 0.8); backdrop-filter: blur(16px); border: 1px solid rgba(63, 63, 70, 0.4); }
    .critical-glow { box-shadow: 0 0 20px rgba(244, 63, 94, 0.2); border-color: rgba(244, 63, 94, 0.5) !important; animation: pulse-border 2s infinite; }
    @keyframes pulse-border { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .feature-input { background: #18181b; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 12px; font-size: 0.875rem; width: 100%; color: white; outline: none; transition: border 0.2s; }
    .feature-input:focus { border-color: #06b6d4; }
    label { font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; display: block; }
    .captcha-bg {
      background:
        linear-gradient(135deg, rgba(255,255,255,0.98), rgba(207,250,254,0.98)),
        repeating-linear-gradient(45deg, #ffffff, #ffffff 12px, #ecfeff 12px, #ecfeff 24px);
      box-shadow: inset 0 0 0 1px rgba(8,145,178,0.35);
    }
    .captcha-code {
      min-width: 8.5rem;
      min-height: 3rem;
      letter-spacing: 0.3rem;
      text-shadow: none;
    }
    .otp-box { width: 3rem; height: 3.5rem; text-align: center; background: #09090b; border: 1px solid #3f3f46; border-radius: 12px; font-size: 1.5rem; font-weight: bold; color: #06b6d4; outline: none; }
    .otp-box:focus { border-color: #06b6d4; }
  </style>
</head>

<body class="antialiased overflow-x-hidden">

<!-- AUTH UI -->
<div id="authPage" class="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500">
  <div class="absolute inset-0 opacity-30" style="background: radial-gradient(circle at center, #1e1b4b 0%, #000 100%);"></div>

  <div class="glass-panel p-10 rounded-3xl w-full max-w-md relative z-10">
    <div class="mb-8 text-center">
      <div class="w-16 h-16 bg-cyan-500 rounded-2xl mb-4 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
        <svg class="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
      </div>

      <h2 id="authTitle" class="text-3xl font-bold tracking-tight uppercase">System<span class="text-cyan-500">Access</span></h2>
      <p id="authSub" class="text-zinc-500 mt-2 font-light text-sm">Verify medical credentials to proceed</p>
    </div>

    <!-- Login / Register Form -->
    <div id="mainForm" class="space-y-4">
      <input id="contactInput" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4" placeholder="Email">
      <input id="passInput" type="password" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4" placeholder="Password">

      <div class="bg-zinc-950 p-3 rounded-xl border border-zinc-800 space-y-3">
         <div class="flex items-center justify-between gap-3">
           <div class="relative w-full">
             <input id="captchaDisplay" type="text" readonly
               class="captcha-bg captcha-code mono text-2xl font-bold px-4 py-3 rounded-xl border border-cyan-500/30 text-center w-full"
               style="color:#0f172a !important; -webkit-text-fill-color:#0f172a !important; opacity:1 !important; caret-color:transparent; background-color:#ecfeff;" />
             <div id="captchaFallback" class="pointer-events-none absolute inset-0 flex items-center justify-center mono text-2xl font-bold tracking-[0.3rem]"
               style="color:#0f172a;">ABCDE</div>
           </div>
           <button type="button" onclick="generateCaptcha()"
             class="shrink-0 px-3 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/40 text-[10px] font-bold uppercase">
             Refresh
           </button>
         </div>
         <input id="captchaInput" class="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center mono uppercase tracking-[0.3em]" placeholder="Enter captcha code">
      </div>

      <button id="authBtn" onclick="handleAuth()" 
        class="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl text-xs uppercase">
        Authorize
      </button>

      <p id="authError" class="text-rose-500 text-[10px] font-bold text-center hidden uppercase">Error: Access Denied</p>
      <p id="authSuccess" class="text-emerald-400 text-[10px] font-bold text-center hidden uppercase">Reset email sent.</p>

      <div class="text-center pt-2 space-y-2">
        <button id="forgotBtn" onclick="handleForgotPassword()"
          class="text-cyan-500 text-[10px] hover:text-cyan-400 uppercase font-bold">
          Forgot Password?
        </button>
      </div>

      <div class="text-center">
        <button id="switchBtn" onclick="toggleMode()" 
          class="text-zinc-500 text-[10px] hover:text-cyan-500 uppercase font-bold">
          New System? Register Admin
        </button>
      </div>
    </div>
  </div>
</div>

<!-- DASHBOARD -->
<div id="dashboard" class="hidden min-h-screen">

  <!-- HEADER -->
  <header class="p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 sticky top-0 backdrop-blur-md">
    <div class="flex items-center gap-4">
      <div id="netStatus"
        class="px-3 py-1 bg-emerald-500/10 rounded-md text-[10px] font-bold tracking-[0.2em] text-emerald-400 border border-emerald-500/30 uppercase">
        Online
      </div>

      <h1 class="text-lg font-semibold tracking-tight">Vitals<span class="text-zinc-500 font-normal">Monitor v2.0</span></h1>
    </div>

    <div class="flex items-center gap-6">
      <div class="hidden md:flex flex-col items-end">
        <span id="userTag" class="text-xs font-mono text-cyan-500 font-bold">Doctor</span>
        <span id="baselineTag" class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Learning baseline</span>
        <span id="syncStatus" class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Last Sync: --</span>
      </div>

      <button onclick="logout()"
        class="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full">
        <svg class="w-5 h-5 text-zinc-500 hover:text-rose-500" fill="none" stroke="currentColor"
             viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
      </button>
    </div>
  </header>

  <!-- MAIN CONTENT -->
  <main class="p-4 md:p-6 max-w-[1600px] mx-auto grid grid-cols-12 gap-4 md:gap-6">

    <!-- LEFT CARDS (HR, SpO2, Temp) -->
    <div class="col-span-12 lg:col-span-4 space-y-6">

      <div class="glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div id="hrLine" class="absolute bottom-0 left-0 h-1 bg-rose-500" style="width: 0%"></div>
        <span class="text-xs text-zinc-500 uppercase font-bold tracking-widest">Pulse Rate</span>
        <div class="flex items-baseline gap-2 mt-2">
          <span id="heartRate" class="text-7xl font-bold mono">--</span>
          <span class="text-zinc-500 italic">BPM</span>
        </div>
      </div>

      <div class="glass-panel rounded-3xl p-6">
        <span class="text-xs text-zinc-500 uppercase font-bold block">Oxygen Level (SpO2)</span>
        <div class="flex items-baseline gap-2">
          <span id="spo2" class="text-7xl font-bold mono text-cyan-500">--</span>
          <span class="text-zinc-500 italic">%</span>
        </div>
      </div>

      <div class="glass-panel rounded-3xl p-6">
        <span class="text-xs text-zinc-500 uppercase font-bold block">Core Temperature</span>
        <div class="flex items-baseline gap-2">
          <span id="temp" class="text-7xl font-bold mono">--</span>
          <span class="text-zinc-500 italic">°C</span>
        </div>
      </div>
    </div>

    <!-- RIGHT CARDS -->
    <div class="col-span-12 lg:col-span-8 space-y-6">

      <!-- ML PREDICTION -->
      <div id="mlStatusCard" class="glass-panel rounded-3xl p-8 border-l-4 border-l-cyan-500">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 class="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Edge + Cloud Predictive Engine</h3>
            <p id="riskText" class="text-2xl font-bold text-emerald-500">System Ready</p>
          </div>
          <div class="text-right">
            <span id="riskPercent" class="text-4xl mono font-bold text-cyan-500">0%</span>
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Calculated Risk</p>
          </div>
        </div>
      </div>

      <!-- SYSTEM FLOW -->
      <div class="glass-panel rounded-3xl p-8">
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 class="text-cyan-500 text-xs uppercase font-bold tracking-widest">Alert Automation Pipeline</h3>
            <p class="text-zinc-400 text-sm mt-2">End-to-end path from on-device detection to AI-generated caregiver escalation.</p>
          </div>
          <span class="mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-full uppercase">Live Architecture</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Step 1</p>
            <p class="mt-2 font-semibold">Sensors</p>
            <p class="text-xs text-zinc-400 mt-2">Pulse, SpO2, temperature, and motion streams are captured continuously.</p>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Step 2</p>
            <p class="mt-2 font-semibold">ESP32</p>
            <p class="text-xs text-zinc-400 mt-2">Edge logic filters noise and flags abnormal events before upload.</p>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Step 3</p>
            <p class="mt-2 font-semibold">Firebase Database</p>
            <p class="text-xs text-zinc-400 mt-2">Realtime telemetry and patient metadata are stored for downstream workflows.</p>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Step 4</p>
            <p class="mt-2 font-semibold">Cloud Function</p>
            <p class="text-xs text-zinc-400 mt-2">A serverless trigger evaluates new records and prepares an incident payload.</p>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Step 5</p>
            <p class="mt-2 font-semibold">Gemini</p>
            <p class="text-xs text-zinc-400 mt-2">AI generates a plain-language explanation of the anomaly and urgency.</p>
          </div>

          <div class="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Step 6</p>
            <p class="mt-2 font-semibold">Email / SMS</p>
            <p class="text-xs text-zinc-400 mt-2">Caregivers receive the alert summary with vitals, risk score, and next action.</p>
          </div>
        </div>
      </div>

      <!-- DATASET INPUT -->
      <div class="glass-panel rounded-3xl p-8">
        <h3 class="text-cyan-500 text-xs uppercase font-bold tracking-widest mb-6 flex items-center gap-2">
          <span class="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span> Dataset Input Buffer
        </h3>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label>Age</label><input type="number" id="f_age" class="feature-input" value="45"></div>
          <div><label>Gender</label><select id="f_gender" class="feature-input"><option>Male</option><option>Female</option></select></div>
          <div><label>Resp. Rate</label><input type="number" id="f_resp" class="feature-input" value="18"></div>
          <div><label>HRV</label><input type="number" id="f_hrv" class="feature-input" value="45"></div>
          <div><label>Mean HR</label><input type="number" id="f_meanhr" class="feature-input" value="72"></div>
          <div><label>Pulse Trend</label><input type="number" id="f_ptrend" class="feature-input" value="0.2"></div>
          <div><label>SpO2 Avg</label><input type="number" id="f_spo2avg" class="feature-input" value="98"></div>
          <div><label>Temp Trend</label><input type="number" id="f_ttrend" class="feature-input" value="0.1"></div>
          <div><label>Stress</label><select id="f_stress" class="feature-input"><option>Low</option><option>Moderate</option><option>High</option></select></div>
          <div><label>Activity</label><select id="f_activity" class="feature-input"><option>Resting</option><option>Walking</option></select></div>
          <div><label>Position</label><select id="f_pos" class="feature-input"><option>Supine</option><option>Standing</option></select></div>
          <div><label>Amb. Temp</label><input type="number" id="f_amb" class="feature-input" value="24"></div>
          <div><label>Motion</label><input type="number" id="f_acc" class="feature-input" value="0.01"></div>
        </div>
      </div>

      <!-- PROFILE -->
      <div class="glass-panel rounded-3xl p-8">
        <h3 class="text-cyan-500 text-xs uppercase font-bold tracking-widest mb-6">Patient & Care Team Profile</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label>Patient Name</label><input id="p_name" class="feature-input"></div>
          <div><label>Patient ID</label><input id="p_id" class="feature-input" placeholder="SHMS-1001"></div>
          <div><label>Doctor</label><input id="p_doctor" class="feature-input"></div>
          <div class="md:col-span-3"><label>Caregiver Emails</label><input id="p_caregivers" class="feature-input"></div>
          <div class="md:col-span-3"><label>Caregiver Phones</label><input id="p_phones" class="feature-input"></div>
        </div>

        <div class="mt-4">
          <button onclick="saveProfileToCloud()" class="bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-xl text-xs uppercase font-bold">
            Save Profile
          </button>
        </div>
      </div>

      <!-- ALERTS -->
      <div class="glass-panel rounded-3xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-cyan-500 text-xs uppercase font-bold tracking-widest">Live Alert Log</h3>
          <span id="alertCount" class="text-[10px] text-zinc-500 uppercase font-bold">0 Alerts</span>
        </div>
        <div id="alertLog" class="space-y-2 max-h-44 overflow-y-auto">
          <p class="text-zinc-500 text-xs">No alerts triggered yet.</p>
        </div>
      </div>

      <!-- CHART -->
      <div class="glass-panel rounded-3xl p-8 h-[300px]">
        <canvas id="healthChart"></canvas>
      </div>

      <!-- BUTTONS -->
      <div class="flex gap-4">

        <button onclick="simulateCritical()"
          class="flex-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 py-4 rounded-2xl text-[10px] font-bold uppercase">
          Test Critical
        </button>

        <button onclick="resetVitals()"
          class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl text-[10px] font-bold uppercase">
          Reset Baseline
        </button>
      </div>
    </div>
  </main>
</div>


<!-- SCRIPT START -->
<script>
let chart, history = [];
let mode = "LOGIN";
let activeCaptcha = "";
let firebaseReady = false;
let auth = null;
let db = null;
let dashboardUnlocked = false;
let offlineQueue = [];
let currentUid = "";
let alertLogItems = [];
let patientSubscriptions = [];
let simInterval = null;
const PROFILE_CACHE_KEY = 'shms_profile_';
const LATEST_CACHE_KEY = 'shms_latest_';

const firebaseConfig = {
  authDomain: "smart-health-monitoring-cd2dd.firebaseapp.com",
  databaseURL: "https://smart-health-monitoring-cd2dd-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "smart-health-monitoring-cd2dd",
  storageBucket: "smart-health-monitoring-cd2dd.firebasestorage.app",
  messagingSenderId: "684256142867",
  appId: "1:684256142867:web:cf6e3365411d142699c1e6",
  measurementId: "G-4W3MJDZG53"
};

const BASELINE_WINDOW = 12;
const TREND_WINDOW = 5;
const baseline = {
  hr: [],
  temp: [],
  spo2: [],
  ready: false,
  meanHr: 75,
  meanTemp: 36.8,
  meanSpo2: 98
};

window.onload = () => {
  generateCaptcha();
  setMode("LOGIN");
  loadOfflineQueue();
  initFirebase();
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('online', flushOfflineQueue);
  window.addEventListener('offline', updateNetworkStatus);
};

function hasFirebaseConfig() {
  return (
    !!firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("PASTE_") &&
    !!firebaseConfig.databaseURL &&
    !firebaseConfig.databaseURL.startsWith("PASTE_")
  );
}

function initFirebase() {
  const errorMsg = document.getElementById('authError');
  if (!hasFirebaseConfig()) {
    errorMsg.innerText = "ADD FIREBASE CONFIG IN SCRIPT TO ENABLE LOGIN";
    errorMsg.classList.remove('hidden');
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.database();
    firebaseReady = true;

    auth.onAuthStateChanged(async (user) => {
      if (user && user.emailVerified) {
        currentUid = user.uid;
        document.getElementById('userTag').innerText = user.email;
        unlockDashboard();
        await restoreBaselineFromCloud();
        subscribePatientStreams();
        flushOfflineQueue();
      } else {
        clearPatientSubscriptions();
        currentUid = "";
      }
    });
  } catch (e) {
    errorMsg.innerText = "FIREBASE INIT FAILED";
    errorMsg.classList.remove('hidden');
    console.error(e);
  }
}

function updateNetworkStatus() {
  const el = document.getElementById('netStatus');
  if (!el) return;
  if (navigator.onLine) {
    el.textContent = 'Online';
    el.className = 'px-3 py-1 bg-emerald-500/10 rounded-md text-[10px] font-bold tracking-[0.2em] text-emerald-400 border border-emerald-500/30 uppercase';
  } else {
    el.textContent = 'Offline Edge Mode';
    el.className = 'px-3 py-1 bg-amber-500/10 rounded-md text-[10px] font-bold tracking-[0.2em] text-amber-400 border border-amber-500/30 uppercase';
  }
}

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  activeCaptcha = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  document.getElementById('captchaDisplay').value = activeCaptcha;
  document.getElementById('captchaFallback').textContent = activeCaptcha;
}

function setMode(newMode) {
  mode = newMode;
  const title = document.getElementById('authTitle');
  const sub = document.getElementById('authSub');
  const btn = document.getElementById('authBtn');
  const switchBtn = document.getElementById('switchBtn');
  const forgotBtn = document.getElementById('forgotBtn');

  if (mode === "REGISTER") {
    title.innerHTML = "New<span class='text-cyan-500'>Register</span>";
    sub.innerText = "Create secure admin credentials";
    btn.innerText = "Register & Proceed";
    switchBtn.innerText = "Existing Admin? Access Portal";
    forgotBtn.classList.add('hidden');
  } else {
    title.innerHTML = "System<span class='text-cyan-500'>Access</span>";
    sub.innerText = "Verify credentials for live monitoring";
    btn.innerText = "Authorize";
    switchBtn.innerText = "New System? Register Admin";
    forgotBtn.classList.remove('hidden');
  }
}

function toggleMode() {
  setMode(mode === "LOGIN" ? "REGISTER" : "LOGIN");
}

function resetAuthMessages() {
  document.getElementById('authError').classList.add('hidden');
  document.getElementById('authSuccess').classList.add('hidden');
}

function showAuthError(message) {
  const errorMsg = document.getElementById('authError');
  const successMsg = document.getElementById('authSuccess');
  successMsg.classList.add('hidden');
  errorMsg.innerText = message;
  errorMsg.classList.remove('hidden');
}

function showAuthSuccess(message) {
  const errorMsg = document.getElementById('authError');
  const successMsg = document.getElementById('authSuccess');
  errorMsg.classList.add('hidden');
  successMsg.innerText = message;
  successMsg.classList.remove('hidden');
}

function handleForgotPassword() {
  const contact = document.getElementById('contactInput').value.trim();

  resetAuthMessages();

  if (!firebaseReady || !auth) {
    showAuthError("FIREBASE NOT READY");
    return;
  }

  if (!contact.includes('@')) {
    showAuthError("ENTER YOUR EMAIL FIRST");
    return;
  }

  auth.sendPasswordResetEmail(contact)
    .then(() => {
      showAuthSuccess("PASSWORD RESET EMAIL SENT");
    })
    .catch((e) => {
      showAuthError(String(e.message || 'RESET FAILED').toUpperCase());
    });
}

function handleAuth() {
  const contact = document.getElementById('contactInput').value.trim();
  const pass = document.getElementById('passInput').value;
  const captcha = document.getElementById('captchaInput').value.toUpperCase();
  resetAuthMessages();

  if (!firebaseReady) {
    showAuthError("FIREBASE NOT READY");
    return;
  }

  if (captcha !== activeCaptcha) {
    showAuthError("CAPTCHA FAILED");
    generateCaptcha();
    return;
  }

  if (!contact.includes('@')) {
    showAuthError("USE A VALID EMAIL FOR FIREBASE AUTH");
    return;
  }

  if (mode === "REGISTER") {
    if (pass.length < 6) {
      showAuthError("PASSWORD MUST BE 6+ CHARACTERS");
      return;
    }

    auth.createUserWithEmailAndPassword(contact, pass)
      .then(async ({ user }) => {
        await user.sendEmailVerification();
        await auth.signOut();
        alert("Registered. Verify your email, then login.");
        setMode("LOGIN");
      })
      .catch((e) => {
        showAuthError(String(e.message || 'REGISTER FAILED').toUpperCase());
      });
  } else {
    auth.signInWithEmailAndPassword(contact, pass)
      .then(async ({ user }) => {
        if (!user.emailVerified) {
          await auth.signOut();
          showAuthError("VERIFY EMAIL FIRST, THEN LOGIN");
          return;
        }
        unlockDashboard();
      })
      .catch((e) => {
        showAuthError(String(e.message || 'LOGIN FAILED').toUpperCase());
        generateCaptcha();
      });
  }
}

function unlockDashboard() {
  if (dashboardUnlocked) return;
  const authPage = document.getElementById('authPage');
  const dashboard = document.getElementById('dashboard');

  authPage.classList.add('opacity-0');
  setTimeout(() => {
    authPage.classList.add('hidden');
    dashboard.classList.remove('hidden');
    dashboardUnlocked = true;
    initChart();
  }, 300);
}

function getProfileCacheKey(uid) {
  return PROFILE_CACHE_KEY + uid;
}

function getLatestCacheKey(uid) {
  return LATEST_CACHE_KEY + uid;
}

function cacheProfile(uid, profile) {
  if (!uid) return;
  localStorage.setItem(getProfileCacheKey(uid), JSON.stringify(profile));
}

function cacheLatest(uid, latest) {
  if (!uid) return;
  localStorage.setItem(getLatestCacheKey(uid), JSON.stringify(latest));
}

function restoreCachedProfile(uid) {
  if (!uid) return;
  const raw = localStorage.getItem(getProfileCacheKey(uid));
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    document.getElementById('p_name').value = p.patientName || '';
    document.getElementById('p_id').value = p.patientId || '';
    document.getElementById('p_doctor').value = p.doctor || '';
    document.getElementById('p_caregivers').value = (p.caregiverEmails || []).join(', ');
    document.getElementById('p_phones').value = (p.caregiverPhones || []).join(', ');
  } catch (_) {
  }
}

function restoreCachedLatest(uid) {
  if (!uid) return;
  const raw = localStorage.getItem(getLatestCacheKey(uid));
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (typeof d.heartRate === 'number' && typeof d.spo2 === 'number' && typeof d.temp === 'number') {
      updateUI({ heartRate: d.heartRate, spo2: d.spo2, temp: d.temp }, { allowAlert: false });
      updateSyncStatus(d.timestamp);
    }
  } catch (_) {
  }
}

function initChart() {
  const canvas = document.getElementById('healthChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Heart Rate', data: [], borderColor: '#f43f5e', borderWidth: 3, tension: 0.4, pointRadius: 0 },
        { label: 'SpO2', data: [], borderColor: '#06b6d4', borderWidth: 2, tension: 0.4, pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { grid: { color: 'rgba(63, 63, 70, 0.2)' }, ticks: { color: '#71717a' } }
      }
    }
  });
}

function average(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function learnBaseline(d) {
  if (baseline.ready) return;

  baseline.hr.push(d.heartRate);
  baseline.temp.push(d.temp);
  baseline.spo2.push(d.spo2);

  if (baseline.hr.length >= BASELINE_WINDOW) {
    baseline.meanHr = average(baseline.hr);
    baseline.meanTemp = average(baseline.temp);
    baseline.meanSpo2 = average(baseline.spo2);
    baseline.ready = true;
    saveBaselineToCloud();
  }

  const baseTag = document.getElementById('baselineTag');
  if (!baseTag) return;
  if (baseline.ready) {
    baseTag.innerText = 'Baseline locked';
  } else {
    baseTag.innerText = 'Learning baseline (' + baseline.hr.length + '/' + BASELINE_WINDOW + ')';
  }
}

function getTrendScore() {
  const recent = history.slice(-TREND_WINDOW);
  if (recent.length < TREND_WINDOW) return 0;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const hrRise = Math.max(0, last.heartRate - first.heartRate) / 25;
  const tempRise = Math.max(0, last.temp - first.temp) / 1.5;
  return Math.min(1, (hrRise * 0.5) + (tempRise * 0.5));
}

function mlPredictRisk(d) {
  const targetHr = baseline.ready ? baseline.meanHr : 75;
  const targetTemp = baseline.ready ? baseline.meanTemp : 36.8;
  const targetSpo2 = baseline.ready ? baseline.meanSpo2 : 98;

  const hrDev = Math.abs(d.heartRate - targetHr) / 55;
  const tempDev = Math.abs(d.temp - targetTemp) / 2.2;
  const spo2Dev = Math.max(0, targetSpo2 - d.spo2) / 8;
  const trend = getTrendScore();

  const currentCritical =
    (d.heartRate > 135 ? 0.35 : 0) +
    (d.spo2 < 88 ? 0.4 : 0) +
    (d.temp > 38.5 ? 0.35 : 0);

  let score = (0.25 * hrDev) + (0.25 * tempDev) + (0.15 * spo2Dev) + (0.1 * trend) + currentCritical;
  score = Math.min(1, Math.max(0, score));

  return {
    risk: Math.round(score * 100),
    trend: Math.round(trend * 100),
    level: score > 0.7 ? 'HIGH' : score > 0.4 ? 'MEDIUM' : 'LOW'
  };
}

function updateUI(d, options = { allowAlert: true }) {
  learnBaseline(d);

  document.getElementById('heartRate').textContent = d.heartRate;
  document.getElementById('spo2').textContent = d.spo2;
  document.getElementById('temp').textContent = Number(d.temp).toFixed(1);
  document.getElementById('hrLine').style.width = Math.min(100, d.heartRate / 2) + '%';

  history.push(d);
  if (history.length > 30) history.shift();

  const ml = mlPredictRisk(d);
  const card = document.getElementById('mlStatusCard');
  const riskText = document.getElementById('riskText');
  const riskPercent = document.getElementById('riskPercent');
  riskPercent.textContent = ml.risk + '%';

  if (ml.level === 'HIGH') {
    card.className = 'glass-panel rounded-3xl p-8 border-l-4 border-l-rose-500 critical-glow bg-rose-500/5';
    riskText.innerText = 'CRITICAL: Early Warning Triggered';
    riskText.className = 'text-2xl font-bold text-rose-500';
  } else if (ml.level === 'MEDIUM') {
    card.className = 'glass-panel rounded-3xl p-8 border-l-4 border-l-amber-500';
    riskText.innerText = 'Moderate Risk: Observe Trend (' + ml.trend + '%)';
    riskText.className = 'text-2xl font-bold text-amber-400';
  } else {
    card.className = 'glass-panel rounded-3xl p-8 border-l-4 border-l-cyan-500';
    riskText.innerText = baseline.ready ? 'System Normal (Personalized Baseline)' : 'System Normal (Learning Baseline)';
    riskText.className = 'text-2xl font-bold text-emerald-500';
  }

  if (chart) {
    chart.data.labels = history.map((_, i) => i);
    chart.data.datasets[0].data = history.map(h => h.heartRate);
    chart.data.datasets[1].data = history.map(h => h.spo2);
    chart.update('none');
  }
}

function parseCSV(value) {
  return String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
}

function readProfileFromForm() {
  return {
    patientName: document.getElementById('p_name').value.trim(),
    patientId: document.getElementById('p_id').value.trim() || 'SHMS-1001',
    doctor: document.getElementById('p_doctor').value.trim(),
    caregiverEmails: parseCSV(document.getElementById('p_caregivers').value),
    caregiverPhones: parseCSV(document.getElementById('p_phones').value)
  };
}

async function saveProfileToCloud() {
  if (!firebaseReady || !currentUid) {
    alert('Login required before saving profile.');
    return;
  }
  try {
    const profile = readProfileFromForm();
    profile.updatedAt = new Date().toISOString();
    await db.ref('patients/' + currentUid + '/profile').set(profile);
    cacheProfile(currentUid, profile);
    updateSyncStatus(profile.updatedAt);
    alert('Patient profile saved.');
  } catch (err) {
    console.error('Profile save failed', err);
    alert('Profile save failed: ' + (err && err.message ? err.message : 'Unknown error'));
  }
}

function updateSyncStatus(isoTime) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.textContent = isoTime ? ('Last Sync: ' + new Date(isoTime).toLocaleTimeString()) : 'Last Sync: --';
}

function syncToFirebase() {
  const profile = readProfileFromForm();
  const payload = {
    id: currentUid || document.getElementById('userTag').innerText,
    patientId: profile.patientId,
    patientName: profile.patientName,
    doctor: profile.doctor,
    caregiverEmails: profile.caregiverEmails,
    caregiverPhones: profile.caregiverPhones,
    heartRate: Number(document.getElementById('heartRate').textContent),
    spo2: Number(document.getElementById('spo2').textContent),
    temp: Number(document.getElementById('temp').textContent),
    risk: Number(document.getElementById('riskPercent').textContent.replace('%', '')),
    baselineReady: baseline.ready,
    network: navigator.onLine ? 'online' : 'offline-buffered',
    timestamp: new Date().toISOString()
  };

  if (!firebaseReady || !currentUid) {
    alert('Login required before sync.');
    return;
  }

  if (navigator.onLine) {
    const latestRef = db.ref('patients/' + currentUid + '/latest');
    const historyRef = db.ref('patients/' + currentUid + '/history').push();
    Promise.all([latestRef.set(payload), historyRef.set(payload)])
      .then(() => {
        saveBaselineToCloud();
        updateSyncStatus(payload.timestamp);
        alert('Data packet synced to Firebase Realtime Database.');
      })
      .catch(() => {
        queueOfflinePayload(payload);
        alert('Sync failed. Payload moved to offline queue.');
      });
  } else {
    queueOfflinePayload(payload);
    alert('Offline mode active. Payload buffered and will sync when internet returns.');
  }
}

function queueOfflinePayload(payload) {
  offlineQueue.push(payload);
  localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
}

function loadOfflineQueue() {
  try {
    offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  } catch {
    offlineQueue = [];
  }
}

async function flushOfflineQueue() {
  if (!firebaseReady || !currentUid || !navigator.onLine || offlineQueue.length === 0) return;
  const queueCopy = [...offlineQueue];
  for (const payload of queueCopy) {
    const latestRef = db.ref('patients/' + currentUid + '/latest');
    const historyRef = db.ref('patients/' + currentUid + '/history').push();
    await Promise.all([latestRef.set(payload), historyRef.set(payload)]);
    updateSyncStatus(payload.timestamp);
  }
  offlineQueue = [];
  localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
}

function saveBaselineToCloud() {
  if (!firebaseReady || !currentUid || !baseline.ready) return;
  const payload = {
    meanHr: baseline.meanHr,
    meanTemp: baseline.meanTemp,
    meanSpo2: baseline.meanSpo2,
    ready: baseline.ready,
    updatedAt: new Date().toISOString()
  };
  db.ref('patients/' + currentUid + '/baseline').set(payload);
}

async function restoreBaselineFromCloud() {
  if (!firebaseReady || !currentUid) return;
  const snap = await db.ref('patients/' + currentUid + '/baseline').get();
  if (!snap.exists()) return;
  const data = snap.val();
  baseline.meanHr = Number(data.meanHr) || baseline.meanHr;
  baseline.meanTemp = Number(data.meanTemp) || baseline.meanTemp;
  baseline.meanSpo2 = Number(data.meanSpo2) || baseline.meanSpo2;
  baseline.ready = !!data.ready;
  const baseTag = document.getElementById('baselineTag');
  if (baseTag && baseline.ready) baseTag.innerText = 'Baseline locked';
}

function renderAlertLog() {
  const logEl = document.getElementById('alertLog');
  const countEl = document.getElementById('alertCount');
  if (!logEl || !countEl) return;

  countEl.textContent = alertLogItems.length + ' Alerts';
  if (alertLogItems.length === 0) {
    logEl.innerHTML = '<p class="text-zinc-500 text-xs">No alerts triggered yet.</p>';
    return;
  }

  logEl.innerHTML = alertLogItems.slice(0, 20).map((a) => {
    const color = a.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400';
    const icon = a.severity === 'HIGH' ? '▲' : '●';
    return '<div class="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">' +
      '<div class="flex items-center justify-between mb-1">' +
      '<span class="text-[11px] font-bold uppercase tracking-widest ' + color + '">' + icon + ' ' + a.severity + '</span>' +
      '<span class="text-[10px] text-zinc-500">' + new Date(a.timestamp).toLocaleString() + '</span>' +
      '</div>' +
      '<p class="text-sm text-zinc-300">' + a.message + '</p>' +
      '</div>';
  }).join('');
}

function clearPatientSubscriptions() {
  patientSubscriptions.forEach((s) => s.ref.off('value', s.cb));
  patientSubscriptions = [];
}

async function subscribePatientStreams() {
  if (!firebaseReady || !currentUid) return;
  clearPatientSubscriptions();
  restoreCachedProfile(currentUid);
  restoreCachedLatest(currentUid);

  const latestRef = db.ref('patients/' + currentUid + '/latest');
  const latestCb = (snap) => {
    if (!snap.exists()) return;
    const d = snap.val();
    if (typeof d.heartRate === 'number' && typeof d.spo2 === 'number' && typeof d.temp === 'number') {
      cacheLatest(currentUid, d);
      updateUI({ heartRate: d.heartRate, spo2: d.spo2, temp: d.temp }, { allowAlert: false });
      updateSyncStatus(d.timestamp);
    }
  };
  latestRef.on('value', latestCb);
  patientSubscriptions.push({ ref: latestRef, cb: latestCb });

  const profileRef = db.ref('patients/' + currentUid + '/profile');
  const profileCb = (snap) => {
    if (!snap.exists()) return;
    const p = snap.val();
    cacheProfile(currentUid, p);
    document.getElementById('p_name').value = p.patientName || '';
    document.getElementById('p_id').value = p.patientId || '';
    document.getElementById('p_doctor').value = p.doctor || '';
    document.getElementById('p_caregivers').value = (p.caregiverEmails || []).join(', ');
    document.getElementById('p_phones').value = (p.caregiverPhones || []).join(', ');
  };
  profileRef.on('value', profileCb);
  patientSubscriptions.push({ ref: profileRef, cb: profileCb });

  const alertsRef = db.ref('patients/' + currentUid + '/alerts').limitToLast(20);
  const alertsCb = (snap) => {
    if (!snap.exists()) {
      alertLogItems = [];
      renderAlertLog();
      return;
    }
    const items = Object.values(snap.val());
    items.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    alertLogItems = items;
    renderAlertLog();
  };
  alertsRef.on('value', alertsCb);
  patientSubscriptions.push({ ref: alertsRef, cb: alertsCb });

}

function simulateCritical() {
  const critical = { heartRate: 138, spo2: 84, temp: 39.1 };
  updateUI(critical);

  if (!firebaseReady || !currentUid) {
    return;
  }

  const profile = readProfileFromForm();
  const payload = {
    id: currentUid,
    patientId: profile.patientId,
    patientName: profile.patientName,
    doctor: profile.doctor,
    caregiverEmails: profile.caregiverEmails,
    caregiverPhones: profile.caregiverPhones,
    heartRate: critical.heartRate,
    spo2: critical.spo2,
    temp: critical.temp,
    temperature: critical.temp,
    edgeRisk: 95,
    edgeAlert: true,
    edgeReason: 'presentation_critical_test',
    network: navigator.onLine ? 'ui-critical-test' : 'offline-ui-test',
    timestamp: new Date().toISOString()
  };

  const latestRef = db.ref('patients/' + currentUid + '/latest');
  const historyRef = db.ref('patients/' + currentUid + '/history').push();
  Promise.all([latestRef.set(payload), historyRef.set(payload)])
    .then(() => {
      cacheLatest(currentUid, payload);
      updateSyncStatus(payload.timestamp);
    })
    .catch((err) => {
      console.error('Critical test sync failed', err);
      alert('Critical test sync failed: ' + (err && err.message ? err.message : 'Unknown error'));
    });
}

function resetVitals() {
  updateUI({ heartRate: 72, spo2: 98, temp: 36.6 });
}

function startSimulation() {
  if (simInterval) return;
  simInterval = setInterval(() => {
    const fakeHR = Math.round(70 + Math.random() * 30);
    const fakeSpO2 = Math.round(95 + Math.random() * 4);
    const fakeTemp = 36.4 + Math.random() * 0.8;
    updateUI({ heartRate: fakeHR, spo2: fakeSpO2, temp: fakeTemp });
  }, 1500);
}

function stopSimulation() {
  clearInterval(simInterval);
  simInterval = null;
}

function logout() {
  stopSimulation();
  if (!firebaseReady || !auth) {
    location.reload();
    return;
  }
  auth.signOut().finally(() => location.reload());
}
</script>
</body>
</html>
