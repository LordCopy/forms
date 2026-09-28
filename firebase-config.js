// firebase-config.js - Modular Firebase SDK Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Load configuration from gitignored config.js or injected runtime environment
let config = null;

try {
  const localConfig = await import('./config.js');
  config = localConfig.firebaseConfig;
} catch (e) {
  // Fallback for deployment environments or window injection
  if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) {
    config = window.__FIREBASE_CONFIG__;
  } else {
    console.error("Firebase config is missing! Please create 'config.js' using 'config.example.js' or setup environment variables.");
  }
}

// Initialize Firebase with loaded configuration
const app = initializeApp(config || {});
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances and modular functions to be used across the app
export {
  auth,
  db,
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
};
