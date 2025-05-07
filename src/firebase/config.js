// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAUZ8fcR7LKFPfMDUHsz3q8JuzbSaTJOq4",
    authDomain: "bible-ppt-app.firebaseapp.com",
    projectId: "bible-ppt-app",
    storageBucket:"bible-ppt-app.firebasestorage.app",
    messagingSenderId: "826124420823",
    appId: "1:826124420823:web:fea4952ad1603b3aa31292",
    measurementId:"G-JCZK9R74C5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Only initialize analytics on the client side
let analytics = null;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export default app;