/* =========================================================
   LIFELINE – AI HEALTH ASSISTANT  |  app.js
   Lifeline Team · Babcock University
   ========================================================= */

'use strict';

/* ── STATE ─────────────────────────────────────────────────── */
let currentScreen = 'screen-splash';
let previousScreen = null;
let currentSlide = 0;
let reminders = [];
let vaultData = {};
let userProfile = {};
let reminderCheckInterval = null;

window.setAppData = function(profile, vault, rems) {
  userProfile = profile || {};
  vaultData = vault || { ...userProfile };
  reminders = rems || [];
  updateHealthScore();
  if (currentScreen === 'screen-reminder') renderReminders();
};

window.triggerCloudSync = function() {
  if (window.syncToDb) {
    window.syncToDb({ profile: userProfile, vault: vaultData, reminders: reminders });
  }
};

/* ── NAVIGATION ────────────────────────────────────────────── */
function navigateTo(screenId, navBtn) {
  const current = document.getElementById(currentScreen);
  const next    = document.getElementById(screenId);
  if (!next || screenId === currentScreen) return;

  current?.classList.remove('active');
  current?.classList.add('slide-out');
  setTimeout(() => current?.classList.remove('slide-out'), 350);

  next.classList.add('active');
  next.scrollTop = 0;

  previousScreen = currentScreen;
  currentScreen  = screenId;

  // Update bottom nav highlight
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (navBtn) navBtn.classList.add('active');

  // Hook lifecycle
  if (screenId === 'screen-dashboard') onDashboardOpen();
  if (screenId === 'screen-nearby')    loadNearbyCare();
  if (screenId === 'screen-doctors')   loadDoctors();
  if (screenId === 'screen-vault')     loadVault();
  if (screenId === 'screen-reminder')  renderReminders();
}

function goBack() {
  if (previousScreen) navigateTo(previousScreen);
  else navigateTo('screen-dashboard');
}

/* ── ONBOARDING SLIDES ─────────────────────────────────────── */
function gotoSlide(index) {
  const slides = document.querySelectorAll('.onboard-slide');
  const dots   = document.querySelectorAll('.dot');
  const btn    = document.getElementById('onboard-next-btn');

  slides.forEach((s, i) => {
    s.classList.toggle('active', i === index);
  });
  dots.forEach((d, i) => d.classList.toggle('active', i === index));
  currentSlide = index;

  btn.textContent = index === slides.length - 1 ? 'Get Started →' : 'Next →';
}

function nextSlide() {
  const total = document.querySelectorAll('.onboard-slide').length;
  if (currentSlide < total - 1) {
    gotoSlide(currentSlide + 1);
  } else {
    navigateTo('screen-register');
  }
}

/* ── REGISTRATION ──────────────────────────────────────────── */
function completeRegistration() {
  const name      = document.getElementById('reg-name').value.trim();
  const age       = document.getElementById('reg-age').value;
  const gender    = document.getElementById('reg-gender').value;
  const genotype  = document.getElementById('reg-genotype').value;
  const blood     = document.getElementById('reg-blood').value;
  const conditions= document.getElementById('reg-conditions').value.trim();
  const location  = document.getElementById('reg-location').value.trim();

  if (!name) { showToast('Please enter your full name.'); return; }

  userProfile = { name, age, gender, genotype, blood, conditions, location };
  vaultData   = { ...userProfile };

  try { localStorage.setItem('lifeline_user', JSON.stringify(userProfile)); } catch(e) {}
  window.triggerCloudSync();

  showToast('Welcome to Lifeline, ' + name.split(' ')[0] + '! 🎉');
  navigateTo('screen-dashboard');
}

function loadUserProfile() {
  try {
    const saved = localStorage.getItem('lifeline_user');
    if (saved) {
      userProfile = JSON.parse(saved);
      vaultData   = { ...userProfile };
    }
  } catch(e) {}
}

/* ── DASHBOARD ─────────────────────────────────────────────── */
function onDashboardOpen() {
  const name = userProfile.name || 'Friend';
  const firstName = name.split(' ')[0];
  document.getElementById('dash-user-name').textContent = firstName;

  const hr = new Date().getHours();
  let greeting = 'Good morning';
  if (hr >= 12 && hr < 17) greeting = 'Good afternoon';
  else if (hr >= 17)       greeting = 'Good evening';
  document.getElementById('dash-time-greeting').textContent = greeting + ',';

  updateDashboardAlerts();
  updateHealthScore();
}

function updateHealthScore() {
  // Compute a simple illustrative score
  let score = 60;
  if (userProfile.blood)     score += 8;
  if (userProfile.genotype)  score += 8;
  if (userProfile.age)       score += 4;
  if (reminders.length > 0)  score += 10;
  score = Math.min(score, 98);
  document.getElementById('dash-score').textContent = score;
}

function updateDashboardAlerts() {
  const alertEl = document.getElementById('dash-reminder-alert');
  const descEl  = alertEl.querySelector('.alert-desc');
  const now = new Date();
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  const dueRem = reminders.find(r => r.time === hhmm);
  if (dueRem) {
    descEl.innerHTML = `<strong>${dueRem.name}</strong> – ${dueRem.dose} is due now!`;
  } else if (reminders.length > 0) {
    const next = reminders[0];
    descEl.innerHTML = `Next: <strong>${next.name}</strong> at ${next.time}`;
  } else {
    descEl.innerHTML = `No reminders set yet. <a href="#" onclick="navigateTo('screen-reminder');return false;">Add one →</a>`;
  }
}

/* ── MEDICATION REMINDERS ──────────────────────────────────── */
function loadReminders() {
  try {
    const saved = localStorage.getItem('lifeline_reminders');
    if (saved) reminders = JSON.parse(saved);
  } catch(e) {}
}

function saveReminders() {
  try { localStorage.setItem('lifeline_reminders', JSON.stringify(reminders)); } catch(e) {}
}

function showAddReminder() {
  document.getElementById('add-reminder-modal').classList.add('open');
}
function hideAddReminder() {
  document.getElementById('add-reminder-modal').classList.remove('open');
}

function addReminder() {
  const name  = document.getElementById('rem-name').value.trim();
  const dose  = document.getElementById('rem-dose').value.trim();
  const freq  = document.getElementById('rem-freq').value;
  const time  = document.getElementById('rem-time').value;
  const notes = document.getElementById('rem-notes').value.trim();

  if (!name) { showToast('Please enter a medication name.'); return; }
  if (!time)  { showToast('Please set a time.'); return; }

  reminders.push({ id: Date.now(), name, dose, freq, time, notes });
  saveReminders();
  window.triggerCloudSync();
  hideAddReminder();
  clearForm(['rem-name','rem-dose','rem-notes']);
  document.getElementById('rem-time').value = '08:00';
  renderReminders();
  showToast('Reminder saved! 💊');
}

function deleteReminder(id) {
  reminders = reminders.filter(r => r.id !== id);
  saveReminders();
  window.triggerCloudSync();
  renderReminders();
  showToast('Reminder removed.');
}

function renderReminders() {
  const list  = document.getElementById('reminders-list');
  const empty = document.getElementById('reminder-empty');
  list.innerHTML = '';

  if (reminders.length === 0) {
    empty.style.display = 'flex';
    list.style.display  = 'none';
    return;
  }
  empty.style.display = 'none';
  list.style.display  = 'block';

  reminders.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'reminder-card';
    card.style.animationDelay = (i * 0.06) + 's';
    card.innerHTML = `
      <div class="rem-icon">💊</div>
      <div class="rem-info">
        <div class="rem-name">${escHtml(r.name)}</div>
        <div class="rem-detail">${escHtml(r.dose || '')} · ${escHtml(r.freq)} ${r.notes ? '· ' + escHtml(r.notes) : ''}</div>
      </div>
      <div class="rem-time">${escHtml(r.time)}</div>
      <button class="rem-del-btn" onclick="deleteReminder(${r.id})" title="Delete">✕</button>
    `;
    list.appendChild(card);
  });
}

function startReminderCheck() {
  clearInterval(reminderCheckInterval);
  reminderCheckInterval = setInterval(() => {
    const now  = new Date();
    const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const due  = reminders.find(r => r.time === hhmm);
    if (due && now.getSeconds() < 30) {
      showToast('💊 Time for ' + due.name + ' – ' + due.dose);
      if ('vibrate' in navigator) navigator.vibrate([200,100,200]);
    }
  }, 30000);
}

/* ── NEARBY CARE ───────────────────────────────────────────── */
const careData = [
  { type:'hospital', name:'Lagos Island General Hospital', dist:'1.2 km', phone:'tel:+2348033000100', tags:['24/7','A&E','ICU'] },
  { type:'hospital', name:'Babcock University Teaching Hospital', dist:'0.8 km', phone:'tel:+2348023456789', tags:['Specialist','Teaching'] },
  { type:'hospital', name:'Reddington Hospital', dist:'3.4 km', phone:'tel:+2348099000200', tags:['Private','Specialist'] },
  { type:'hospital', name:'Lagos State University Teaching Hospital', dist:'5.1 km', phone:'tel:+2348055123456', tags:['24/7','Teaching'] },
  { type:'pharmacy', name:'MedPlus Pharmacy', dist:'0.5 km', phone:'tel:+2348066001122', tags:['Open 24/7','NAFDAC'] },
  { type:'pharmacy', name:'HealthPlus Pharmacy', dist:'1.1 km', phone:'tel:+2348077002233', tags:['Prescription','OTC'] },
  { type:'pharmacy', name:'Drugfield Pharmacy', dist:'2.3 km', phone:'tel:+2348088003344', tags:['Prescription','Delivery'] },
  { type:'ngo', name:'Action Health Incorporated', dist:'2.0 km', phone:'tel:+2341234567890', tags:['Youth Health','Free Consult'] },
  { type:'ngo', name:'Society for Family Health', dist:'3.8 km', phone:'tel:+2342345678901', tags:['Maternal Health','Free Drugs'] },
  { type:'ngo', name:'WARDC Health Outreach', dist:'4.5 km', phone:'tel:+2343456789012', tags:['Community','Free Test'] },
];

const typeEmoji = { hospital:'🏥', pharmacy:'💊', ngo:'🤝' };

let activeFilter = 'all';

function filterNearby(type, btn) {
  activeFilter = type;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCareList();
}

function loadNearbyCare() {
  const label = document.getElementById('nearby-location-label');
  label.textContent = userProfile.location
    ? '📍 ' + userProfile.location
    : '📍 Lagos, Nigeria (default)';
  renderCareList();
}

function renderCareList() {
  const list = document.getElementById('care-list');
  list.innerHTML = '';
  const filtered = activeFilter === 'all' ? careData : careData.filter(c => c.type === activeFilter);

  filtered.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'care-card';
    card.style.animationDelay = (i * 0.05) + 's';
    card.innerHTML = `
      <div class="care-badge ${c.type}">${typeEmoji[c.type]}</div>
      <div class="care-info">
        <div class="care-name">${escHtml(c.name)}</div>
        <div class="care-dist">📍 ~${escHtml(c.dist)} away</div>
        <a class="care-phone" href="${c.phone}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.06 1.18 2 2 0 012 .02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg>
          Call
        </a>
        <div class="care-tags">${c.tags.map(t => `<span class="care-tag">${t}</span>`).join('')}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

/* ── DOCTORS ───────────────────────────────────────────────── */
const doctorsData = [
  {
    name: 'Dr. Adaeze Okonkwo',
    initials: 'AO',
    specialty: 'General Practice',
    meta: 'MDCN Reg. · 8 yrs exp. · Lagos',
    available: true,
    fee: '₦1,500',
  },
  {
    name: 'Dr. Emeka Nwosu',
    initials: 'EN',
    specialty: 'Internal Medicine',
    meta: 'MDCN Reg. · 12 yrs exp. · Abuja',
    available: true,
    fee: '₦2,000',
  },
  {
    name: 'Dr. Fatima Bello',
    initials: 'FB',
    specialty: 'Paediatrics',
    meta: 'MDCN Reg. · 6 yrs exp. · Ibadan',
    available: false,
    fee: '₦1,800',
  },
  {
    name: 'Dr. Chukwuemeka Eze',
    initials: 'CE',
    specialty: 'Cardiology',
    meta: 'MDCN Reg. · 15 yrs exp. · Lagos',
    available: true,
    fee: '₦3,000',
  },
  {
    name: 'Dr. Ngozi Adeleke',
    initials: 'NA',
    specialty: 'Gynaecology & Obstetrics',
    meta: 'MDCN Reg. · 10 yrs exp. · Port Harcourt',
    available: true,
    fee: '₦2,500',
  },
];

let selectedDoctor = null;

function loadDoctors() {
  const list = document.getElementById('doctors-list');
  list.innerHTML = '';
  doctorsData.forEach((d, i) => {
    const card = document.createElement('div');
    card.className = 'doctor-card';
    card.style.animationDelay = (i * 0.07) + 's';
    card.innerHTML = `
      <div class="doc-avatar">${escHtml(d.initials)}</div>
      <div class="doc-info">
        <div class="doc-name">${escHtml(d.name)}</div>
        <div class="doc-specialty">${escHtml(d.specialty)}</div>
        <span class="doc-verified">✔ MDCN Verified</span>
        <div class="doc-meta">${escHtml(d.meta)} · Fee: <strong>${escHtml(d.fee)}</strong></div>
        <div class="doc-actions">
          ${d.available
            ? `<button class="doc-btn primary-btn" data-idx="${i}" data-action="book">Book Appointment</button>
               <button class="doc-btn chat-btn"    data-idx="${i}" data-action="chat">Chat</button>`
            : `<button class="doc-btn" disabled style="opacity:.5;cursor:not-allowed">Unavailable</button>`
          }
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  // Attach events after render (safe: no inline quote issues)
  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const doc = doctorsData[+btn.dataset.idx];
      if (btn.dataset.action === 'book') openBookModal(doc.name);
      else chatWithDoctor(doc.name);
    });
  });
}

function openBookModal(doctorName) {
  selectedDoctor = doctorName;
  document.getElementById('book-doctor-name').textContent = 'Booking with: ' + doctorName;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('book-date').min  = today;
  document.getElementById('book-date').value = today;
  document.getElementById('book-modal').classList.add('open');
}
function hideBookModal() {
  document.getElementById('book-modal').classList.remove('open');
}
function confirmBooking() {
  const date   = document.getElementById('book-date').value;
  const time   = document.getElementById('book-time').value;
  const reason = document.getElementById('book-reason').value.trim();
  if (!date)   { showToast('Please select a date.'); return; }
  if (!reason) { showToast('Please describe your concern.'); return; }
  hideBookModal();
  showToast(`Appointment with ${selectedDoctor} on ${date} at ${time} confirmed! 📅`);
}
function chatWithDoctor(name) {
  showToast(`Opening chat with ${name}... 💬`);
}

/* ── HEALTH VAULT ──────────────────────────────────────────── */
function loadVault() {
  if (vaultData.blood)    document.getElementById('vi-blood').textContent    = vaultData.blood;
  if (vaultData.genotype) document.getElementById('vi-genotype').textContent = vaultData.genotype;
  if (vaultData.age)      document.getElementById('vi-age').textContent      = vaultData.age + ' yrs';
  if (vaultData.gender)   document.getElementById('vi-gender').textContent   = vaultData.gender;

  if (vaultData.conditions)    document.getElementById('vault-conditions').value    = vaultData.conditions;
  if (vaultData.allergies)     document.getElementById('vault-allergies').value     = vaultData.allergies || '';
  if (vaultData.prescriptions) document.getElementById('vault-prescriptions').value = vaultData.prescriptions || '';

  // Compute score independently (don't rely on #dash-score DOM which may not be set)
  let score = 60;
  if (vaultData.blood)     score += 8;
  if (vaultData.genotype)  score += 8;
  if (vaultData.age)       score += 4;
  if (reminders.length > 0) score += 10;
  score = Math.min(score, 98);
  document.getElementById('vault-score-num').textContent = score;
  // Also keep dash-score in sync
  const dashScore = document.getElementById('dash-score');
  if (dashScore) dashScore.textContent = score;
  const circ = 2 * Math.PI * 50; // r=50
  const offset = circ - (score / 100) * circ;
  const ring = document.querySelector('.score-ring circle:nth-child(2)');
  if (ring) ring.setAttribute('stroke-dashoffset', offset.toFixed(1));

  const lbl = document.getElementById('vault-score-label');
  if (lbl) {
    if (score >= 80)      lbl.textContent = 'Excellent – Great health habits!';
    else if (score >= 60) lbl.textContent = 'Good – Keep up the healthy habits!';
    else if (score >= 40) lbl.textContent = 'Fair – Let\'s work on those habits.';
    else                  lbl.textContent = 'Needs attention – See a doctor soon.';
  }
}

function saveVault() {
  vaultData.conditions    = document.getElementById('vault-conditions').value;
  vaultData.allergies     = document.getElementById('vault-allergies').value;
  vaultData.prescriptions = document.getElementById('vault-prescriptions').value;
  try { localStorage.setItem('lifeline_vault', JSON.stringify(vaultData)); } catch(e) {}
  window.triggerCloudSync();
  showToast('Health data saved securely. 🔒');
}

function logVitals() {
  const bp     = document.getElementById('vital-bp').value.trim();
  const pulse  = document.getElementById('vital-pulse').value.trim();
  const temp   = document.getElementById('vital-temp').value.trim();
  const weight = document.getElementById('vital-weight').value.trim();
  if (!bp && !pulse && !temp && !weight) { showToast('Please enter at least one vital.'); return; }
  vaultData.vitals = { bp, pulse, temp, weight, logged: new Date().toISOString() };
  try { localStorage.setItem('lifeline_vault', JSON.stringify(vaultData)); } catch(e) {}
  window.triggerCloudSync();
  showToast('Vitals logged! 📊');
}

/* ── AI SYMPTOM CHECKER ────────────────────────────────────── */
const healthKB = [
  {
    keys: ['fever','temperature','hot','pyrexia','high temp'],
    response: `<strong>Possible conditions:</strong><br>• Malaria (very common in Nigeria)<br>• Typhoid fever<br>• Viral infection or flu<br><br><strong>Immediate steps:</strong><br>1. Take your temperature — fever is ≥ 37.5°C<br>2. Stay hydrated (ORS or clean water)<br>3. Paracetamol 500mg–1g can reduce fever<br>4. <span style="color:var(--coral)">See a doctor if fever persists beyond 2 days or exceeds 39°C</span><br><br>🚨 <em>For a child with high fever + fits, go to A&E immediately.</em>`,
  },
  {
    keys: ['headache','head pain','migraine'],
    response: `<strong>Possible causes:</strong><br>• Dehydration<br>• Tension headache<br>• Malaria<br>• Hypertension (if you have high BP)<br><br><strong>Self-care:</strong><br>1. Drink 2+ glasses of water<br>2. Rest in a cool, dark room<br>3. Paracetamol or Ibuprofen (with food) for pain<br><br><span style="color:var(--coral)">⚠️ Seek urgent care if headache is sudden and severe ("thunderclap"), or comes with vision changes, vomiting, or stiff neck.</span>`,
  },
  {
    keys: ['vomit','vomiting','nausea','throwing up'],
    response: `<strong>Possible causes:</strong><br>• Food poisoning<br>• Gastroenteritis<br>• Malaria<br>• Typhoid<br><br><strong>Steps:</strong><br>1. Sip ORS (Oral Rehydration Salts) frequently<br>2. Avoid solid food for 2–4 hours<br>3. Introduce bland foods (plain rice, crackers, banana) when tolerated<br><br><span style="color:var(--coral)">⚠️ See a doctor if vomiting blood, unable to keep fluids down for 6+ hours, or signs of severe dehydration.</span>`,
  },
  {
    keys: ['diarrhea','diarrhoea','loose stool','runny stool','stomach','stomach pain','abdominal'],
    response: `<strong>Possible causes:</strong><br>• Food poisoning / contaminated water<br>• Gastroenteritis (infection)<br>• Irritable Bowel Syndrome (IBS)<br><br><strong>Treatment:</strong><br>1. ORS solution is essential — prevents dehydration<br>2. Avoid dairy, greasy food<br>3. Zinc supplements reduce severity in children<br><br><span style="color:var(--coral)">⚠️ Go to hospital if: blood in stool, diarrhea > 3 days, very young child or elderly patient.</span>`,
  },
  {
    keys: ['weakness','fatigue','tired','yellow eyes','jaundice','pale','yellow skin'],
    response: `<strong>Possible conditions:</strong><br>• Malaria (yellow eyes = cerebral malaria risk)<br>• Hepatitis (Hep A, B, or E)<br>• Anaemia (common with sickle cell)<br>• Liver disease<br><br><span style="color:var(--coral);font-weight:700">⚠️ Yellow eyes (jaundice) is a RED FLAG. Please visit a hospital or doctor TODAY.</span><br><br>While waiting:<br>• Avoid alcohol completely<br>• Stay hydrated<br>• Do not take Paracetamol (it stresses the liver)`,
  },
  {
    keys: ['malaria','mosquito','shivering','chills','rigors'],
    response: `<strong>Malaria Information:</strong><br>Malaria is a leading cause of illness in Nigeria. Symptoms include fever, chills, headache, and body aches — usually 7–14 days after a mosquito bite.<br><br><strong>What to do:</strong><br>1. Get tested — RDT (Rapid Diagnostic Test) is available at most pharmacies<br>2. If positive, seek MDCN-verified prescription for Artemether-Lumefantrine (Coartem)<br>3. Do NOT self-medicate with chloroquine — high resistance in Nigeria<br><br><span style="color:var(--coral)">⚠️ Children and pregnant women must see a doctor urgently.</span><br><br><strong>Prevention:</strong> Sleep under treated nets, use mosquito repellent.`,
  },
  {
    keys: ['hypertension','blood pressure','high bp','bp'],
    response: `<strong>Managing Hypertension:</strong><br>Normal BP is below 120/80 mmHg. Hypertension is consistent readings above 140/90 mmHg.<br><br><strong>Lifestyle changes:</strong><br>1. Reduce salt intake drastically (avoid Maggi season, excess salt)<br>2. Exercise 30 min most days (walking counts!)<br>3. Manage stress — it raises BP<br>4. Avoid excessive alcohol<br>5. Monitor BP at home or at a pharmacy<br><br><strong>Medications:</strong> Amlodipine, Losartan, Hydrochlorothiazide are commonly prescribed. <em>Never stop without consulting your doctor.</em><br><br><span style="color:var(--coral)">⚠️ BP above 180/120 = hypertensive crisis. Call 112 or go to A&E immediately.</span>`,
  },
  {
    keys: ['diabetes','sugar','blood sugar','glucose'],
    response: `<strong>Managing Diabetes (Type 2):</strong><br>Common symptoms: excessive thirst, frequent urination, blurred vision, slow wound healing.<br><br><strong>Daily management:</strong><br>1. Monitor blood sugar regularly (glucometers are available at pharmacies)<br>2. Low-glycaemic diet: reduce white rice, bread, sugary drinks. Eat more vegetables, beans, whole grains<br>3. Exercise daily — even 20-min walks lower blood sugar<br>4. Take medications as prescribed (Metformin is common first-line)<br><br><span style="color:var(--coral)">⚠️ Symptoms of very low sugar (hypoglycaemia): sweating, shaking, confusion. Eat/drink sugar immediately, then seek help.</span>`,
  },
  {
    keys: ['sickle cell','sickle','ss','crisis','bone pain'],
    response: `<strong>Sickle Cell Disease Management:</strong><br><strong>During a vaso-occlusive crisis (pain episode):</strong><br>1. Hydrate aggressively — drink lots of water<br>2. Analgesics: Ibuprofen or Paracetamol for mild-moderate pain<br>3. Warm compress on painful areas<br>4. Avoid cold temperatures and dehydration as triggers<br><br><strong>Going to hospital:</strong> Severe crisis usually requires IV fluids, stronger pain relief, and oxygen — go to A&E.<br><br><strong>Daily prevention:</strong><br>• Take Folic Acid daily<br>• Take Hydroxyurea if prescribed<br>• Penicillin prophylaxis in children<br><br>📌 Always carry your medical ID.`,
  },
  {
    keys: ['cough','cold','flu','sore throat','runny nose','sneeze','congestion'],
    response: `<strong>Cold & Flu / Upper Respiratory Infection:</strong><br><br><strong>Self-care:</strong><br>1. Rest and hydrate — fluids are key<br>2. Honey and warm lemon water soothes sore throats<br>3. OTC options: Loratadine (antihistamine), saline nasal spray<br>4. Paracetamol or Ibuprofen for fever and pain<br><br><strong>When to worry:</strong><br><span style="color:var(--coral)">⚠️ See a doctor if: cough produces blood or green sputum, difficulty breathing, persistent fever > 3 days, chest pain. These may indicate pneumonia or TB.</span>`,
  },
  {
    keys: ['medication','drug','medicine','tablet','prescription','dose'],
    response: `<strong>Medication Safety Tips:</strong><br>1. <strong>Never buy prescription drugs without a prescription</strong> from an MDCN-registered doctor<br>2. Complete your full antibiotic course — stopping early causes resistance<br>3. Store medications away from heat, light, and moisture<br>4. Check expiry dates — expired medications can be harmful<br>5. Do not share prescription medications with others<br><br><strong>Common dangerous combos to avoid:</strong><br>• Ibuprofen + Blood pressure meds (may raise BP)<br>• Alcohol + Any medication<br>• Multiple pain relievers at the same time<br><br>📱 Use Lifeline's Med Reminders to stay on track!`,
  },
  {
    keys: ['emergency','urgent','dying','accident','unconscious','chest pain','stroke','heart attack'],
    response: `<span style="color:var(--coral);font-weight:800;font-size:1.05rem">🚨 CALL 112 IMMEDIATELY</span><br><br>This sounds like a potential emergency. Please:<br>1. <strong>Call 112</strong> (Nigeria Emergency Number)<br>2. <strong>LASAMBUS: 199</strong> (Lagos Ambulance Service)<br>3. Head to the nearest A&E hospital<br><br>While waiting for help:<br>• Keep the person calm and still<br>• If unconscious but breathing: recovery position<br>• If not breathing: begin CPR if trained<br>• For heart attack: aspirin 300mg (chewed) if not allergic<br><br>Click the 🚨 Emergency SOS button at the bottom of your home screen.`,
  },
];

const fallbackResponses = [
  `I don't have specific information about that combination of symptoms in my database, but I'd recommend consulting one of our verified doctors for a proper assessment. Shall I help you book an appointment? You can also visit the <strong>Find Care</strong> section to locate a nearby clinic.`,
  `That's a valid health concern. For personalized advice, I suggest speaking with one of our MDCN-verified doctors. You can also check the <strong>Find Care</strong> section for nearby hospitals. Remember: Lifeline provides health information — always confirm with a qualified professional.`,
  `I understand your concern. While I'm trained for common Nigerian health conditions, I'd recommend seeing a doctor for this issue. Use the <strong>Doctors</strong> tab to book a quick teleconsultation. Don't forget — in emergencies, always call <strong>112</strong>.`,
];

function getAIResponse(message) {
  const msg = message.toLowerCase();
  for (const item of healthKB) {
    if (item.keys.some(k => msg.includes(k))) {
      return item.response;
    }
  }
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

function sendMessage() {
  const input = document.getElementById('ai-input');
  const text  = input.value.trim();
  if (!text) return;

  appendUserMessage(text);
  input.value = '';
  input.style.height = 'auto';

  // Show typing indicator
  const typingId = appendBotTyping();

  setTimeout(() => {
    removeBotTyping(typingId);
    const response = getAIResponse(text);
    appendBotMessage(response);
  }, 900 + Math.random() * 600);
}

function sendPreset(text) {
  document.getElementById('ai-input').value = text;
  sendMessage();
}

function appendUserMessage(text) {
  const msgs = document.getElementById('ai-messages');
  const div  = document.createElement('div');
  div.className = 'ai-msg user-msg';
  div.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBotMessage(html) {
  const msgs = document.getElementById('ai-messages');
  const div  = document.createElement('div');
  div.className = 'ai-msg bot-msg';
  div.innerHTML = `
    <div class="bot-avatar">
      <svg viewBox="0 0 30 30" fill="none"><path d="M5 11C5 7.69 7.69 5 11 5C12.66 5 14.16 5.67 15 6.8C15.84 5.67 17.34 5 19 5C22.31 5 25 7.69 25 11C25 17.5 15 25 15 25C15 25 5 17.5 5 11Z" fill="url(#hgb)"/><defs><linearGradient id="hgb" x1="5" y1="5" x2="25" y2="25"><stop stop-color="#4A90E2"/><stop offset="1" stop-color="#2BC3A3"/></linearGradient></defs></svg>
    </div>
    <div class="msg-bubble">${html}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBotTyping() {
  const msgs = document.getElementById('ai-messages');
  const id   = 'typing-' + Date.now();
  const div  = document.createElement('div');
  div.className = 'ai-msg bot-msg';
  div.id = id;
  div.innerHTML = `
    <div class="bot-avatar">
      <svg viewBox="0 0 30 30" fill="none"><path d="M5 11C5 7.69 7.69 5 11 5C12.66 5 14.16 5.67 15 6.8C15.84 5.67 17.34 5 19 5C22.31 5 25 7.69 25 11C25 17.5 15 25 15 25C15 25 5 17.5 5 11Z" fill="url(#hgt)"/><defs><linearGradient id="hgt" x1="5" y1="5" x2="25" y2="25"><stop stop-color="#4A90E2"/><stop offset="1" stop-color="#2BC3A3"/></linearGradient></defs></svg>
    </div>
    <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeBotTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

/* ── EMERGENCY ─────────────────────────────────────────────── */
function showEmergency() {
  document.getElementById('emergency-modal').classList.add('open');
  loadEmergencyHospitals();
}
function hideEmergency() {
  document.getElementById('emergency-modal').classList.remove('open');
}

function loadEmergencyHospitals() {
  const list = document.getElementById('emer-hosp-list');
  list.innerHTML = '';
  const hospitals = careData.filter(c => c.type === 'hospital').slice(0, 3);
  hospitals.forEach(h => {
    const item = document.createElement('div');
    item.className = 'mini-hosp-item';
    item.innerHTML = `<span>🏥 ${escHtml(h.name)}</span><a href="${h.phone}">Call</a>`;
    list.appendChild(item);
  });
}

/* ── UTILITY ───────────────────────────────────────────────── */
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clearForm(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* ── INIT ──────────────────────────────────────────────────── */
function init() {
  loadUserProfile();
  loadReminders();

  // Check if returning user — skip to dashboard
  if (userProfile.name) {
    // Brief splash then go straight to dashboard
    setTimeout(() => {
      navigateTo('screen-dashboard');
      // Highlight home nav
      const homeNav = document.querySelector('.nav-item');
      if (homeNav) homeNav.classList.add('active');
    }, 1800);
  }

  startReminderCheck();
}

// Close modals on backdrop click
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// Handle back button / swipe
window.addEventListener('popstate', goBack);

// PWA: Register service worker (graceful)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', init);
