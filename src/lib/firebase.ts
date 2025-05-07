import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAUZ8fcR7LKFPfMDUHsz3q8JuzbSaTJOq4",
  authDomain: "bible-ppt-app.firebaseapp.com",
  projectId: "bible-ppt-app",
  storageBucket:"bible-ppt-app.firebasestorage.app",
  messagingSenderId: "826124420823",
  appId: "1:826124420823:web:fea4952ad1603b3aa31292"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app); 