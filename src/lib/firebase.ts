import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB5dQAnCz4Lm8gwE5Efxr8InKlqwCByRWI",
  authDomain: "paakashala12.firebaseapp.com",
  databaseURL: "https://paakashala12-default-rtdb.firebaseio.com",
  projectId: "paakashala12",
  storageBucket: "paakashala12.firebasestorage.app",
  messagingSenderId: "329072152032",
  appId: "1:329072152032:web:d97777297d5c96d7dd6f85",
  measurementId: "G-W7HRPC629K"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getDatabase(app);
