// Firebase Configuration for SuccessApp
const firebaseConfig = {
  apiKey: "AIzaSyB7fKF9ZjconhOj1ba1Ky0JrjX8PNGO7z0",
  authDomain: "successapp-bd617.firebaseapp.com",
  projectId: "successapp-bd617",
  storageBucket: "successapp-bd617.firebasestorage.app",
  messagingSenderId: "565008624075",
  appId: "1:565008624075:web:519725431660b3bb56ee4e",
  measurementId: "G-JW805RSECT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Auth
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure sessions persist across reloads
try {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
  console.warn('Could not set auth persistence:', e);
}

// Export for use in other scripts
window.db = db;
window.auth = auth;
window.googleProvider = googleProvider;
