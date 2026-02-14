import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD9YRO7A4d5_Qa4XB79WCJJAywcXO-ZRMY",
  authDomain: "hrms-ebfe7.firebaseapp.com",
  projectId: "hrms-ebfe7",
  storageBucket: "hrms-ebfe7.firebasestorage.app",
  messagingSenderId: "77581275437",
  appId: "1:77581275437:web:7223c73c5ec33f054843a4",
  measurementId: "G-8PJN8S1GVR"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
