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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize the Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
// Optional: Add scopes you might need
// googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');