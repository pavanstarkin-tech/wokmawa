import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, update } from "firebase/database";
import { MENU, CATEGORIES } from "../src/lib/paakashala-menu";

const firebaseConfig = {
  apiKey: "AIzaSyB5dQAnCz4Lm8gwE5Efxr8InKlqwCByRWI",
  authDomain: "paakashala12.firebaseapp.com",
  databaseURL: "https://paakashala12-default-rtdb.firebaseio.com",
  projectId: "paakashala12",
  storageBucket: "paakashala12.firebasestorage.app",
  messagingSenderId: "329072152032",
  appId: "1:329072152032:web:d97777297d5c96d7dd6f85",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASS = "admin@gmail.com";

async function run() {
  console.log("Authenticating...");
  try {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    console.log("Logged in successfully.");
  } catch (e: any) {
    if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") {
      console.log("Admin account not found, creating it...");
      await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
      console.log("Admin account created and logged in.");
    } else {
      console.error("Auth error:", e);
      process.exit(1);
    }
  }

  console.log("Structuring Menu Data...");
  // Group menu by type -> category
  const structuredMenu: any = {
    veg: {},
    nonVeg: {}
  };

  for (const item of MENU) {
    const typeKey = item.type === "veg" ? "veg" : "nonVeg";
    // Sanitize category string for Firebase path (no special chars)
    const catKey = item.category.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    if (!structuredMenu[typeKey][catKey]) {
      structuredMenu[typeKey][catKey] = [];
    }
    
    // Add available: true to all existing items
    structuredMenu[typeKey][catKey].push({
      ...item,
      available: true
    });
  }

  // Convert arrays to JSON strings as requested
  const firebaseMenuNode: any = {
    veg: {},
    nonVeg: {}
  };

  for (const type of ["veg", "nonVeg"]) {
    for (const cat of Object.keys(structuredMenu[type])) {
      firebaseMenuNode[type][cat] = {
        productsJson: JSON.stringify(structuredMenu[type][cat])
      };
    }
  }

  console.log("Writing to Realtime Database...");
  const updates = {
    "restaurant/settings": {
      restaurantName: "Paakashala",
      logoUrl: "",
      currency: "INR",
      taxes: 5
    },
    "restaurant/menu": firebaseMenuNode,
    "restaurant/tables/1A": { active: true },
    "restaurant/tables/1B": { active: true }
  };

  try {
    await update(ref(db), updates);
    console.log("✅ Migration successful!");
  } catch (e) {
    console.error("Database error:", e);
  }

  process.exit(0);
}

run();
