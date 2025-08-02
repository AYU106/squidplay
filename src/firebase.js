// firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDNt8yn9sbL1d5X_pie1-_VPtN96hX127E",
  authDomain: "squidplay-afb84.firebaseapp.com",
  databaseURL: "https://squidplay-afb84-default-rtdb.asia-southeast1.firebasedatabase.app", // ✅ ADD THIS
  projectId: "squidplay-afb84",
  storageBucket: "squidplay-afb84.firebasestorage.app",
  messagingSenderId: "33904655506",
  appId: "1:33904655506:web:e50ba44e9451d870fe3a4b",
  measurementId: "G-WGCM5THTH2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Realtime Database
export const database = getDatabase(app);

export default app;
