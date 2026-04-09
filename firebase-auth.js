import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVHKOrhYLvw6IfaNMnVTp1L17e2hHGpmQ",
  authDomain: "lifeline-1-8e768.firebaseapp.com",
  projectId: "lifeline-1-8e768",
  storageBucket: "lifeline-1-8e768.firebasestorage.app",
  messagingSenderId: "15945952237",
  appId: "1:15945952237:web:c41b9e3df8980deff0d5e4",
  measurementId: "G-EFZTQ5C9QT"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

window.currentUser = null;

window.signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    window.currentUser = result.user;
    if (window.showToast) window.showToast("Logged in perfectly! 🚀");
    await loadUserData(result.user.uid);
  } catch (error) {
    if (window.showToast) window.showToast("Google Login failed: " + error.message);
  }
};

window.signInGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    window.currentUser = result.user;
    if (window.showToast) window.showToast("Continuing as Guest!");
    if (window.navigateTo) window.navigateTo('screen-onboard');
  } catch (error) {
    if (window.navigateTo) window.navigateTo('screen-onboard');
  }
};

window.signInEmail = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-password').value;
  if (!email || !pass) return window.showToast && window.showToast("Enter email and password");
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    window.currentUser = result.user;
    document.getElementById('email-auth-modal').classList.remove('open');
    if (window.showToast) window.showToast("Logged in successfully! 🚀");
    await loadUserData(result.user.uid);
  } catch (error) {
    if (window.showToast) window.showToast("Login failed: " + error.message);
  }
};

window.signUpEmail = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-password').value;
  if (!email || pass.length < 6) return window.showToast && window.showToast("Invalid email or password too short");
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    window.currentUser = result.user;
    document.getElementById('email-auth-modal').classList.remove('open');
    if (window.showToast) window.showToast("Account created! 🚀");
    if (window.navigateTo) window.navigateTo('screen-onboard');
  } catch (error) {
    if (window.showToast) window.showToast("Signup failed: " + error.message);
  }
};

window.signOutUser = async () => {
  await signOut(auth);
  window.currentUser = null;
  localStorage.removeItem('lifeline_user');
  localStorage.removeItem('lifeline_vault');
  localStorage.removeItem('lifeline_reminders');
  window.location.reload();
};

async function loadUserData(uid) {
  const docRef = doc(db, "users", uid);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    
    // Inject the data into the main app state
    if (window.setAppData) {
      window.setAppData(data.profile, data.vault, data.reminders);
    }
    
    // Refresh UI
    const dashName = document.getElementById('dash-user-name');
    if (dashName && data.profile && data.profile.name) {
       dashName.textContent = data.profile.name.split(' ')[0];
    }
    
    // Skip to dashboard immediately
    if (window.navigateTo) window.navigateTo('screen-dashboard');
  } else {
    // New user in the cloud! Have they already been using the app offline?
    if (window.userProfile && window.userProfile.name) {
      // Absorb their local profile into their new cloud account!
      if (window.triggerCloudSync) window.triggerCloudSync();
      if (window.navigateTo) window.navigateTo('screen-dashboard');
      if (window.showToast) window.showToast('Offline profile synced to cloud!');
    } else {
      // Truly new user: Prefill name from Google/Email profile if possible
      const nameField = document.getElementById('reg-name');
      if (nameField && window.currentUser) {
        if (window.currentUser.displayName) {
          nameField.value = window.currentUser.displayName;
        } else if (window.currentUser.email) {
          nameField.value = window.currentUser.email.split('@')[0];
        }
      }
      if (window.navigateTo) window.navigateTo('screen-register');
    }
  }
}

window.syncToDb = async (payload) => {
  if (!auth.currentUser) return;
  try {
    const docRef = doc(db, "users", auth.currentUser.uid);
    // Use merge so we only update provided fields without wiping others
    await setDoc(docRef, payload, { merge: true });
    console.log("Health Vault synced to cloud securely.");
  } catch(e) {
    console.error("Sync error", e);
  }
};

// Listen for Auth changes automatically
onAuthStateChanged(auth, async (user) => {
  if (user) {
    window.currentUser = user;
    // If we're staring at splash or registration, automatically pull their cloud data
    if (window.currentScreen === 'screen-splash' || window.currentScreen === 'screen-register') {
      await loadUserData(user.uid);
    }
  }
});
