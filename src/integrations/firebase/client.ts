// Firebase web client — publishable config (safe in browser bundle).
// Fill in your project's values below OR set them as VITE_FIREBASE_* env vars.
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "REPLACE_ME",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "REPLACE_ME.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "https://REPLACE_ME-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "REPLACE_ME",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "REPLACE_ME.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

export const isFirebaseConfigured = !config.databaseURL.includes("REPLACE_ME");

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

export function getFirebaseDb(): Database | null {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured) return null;
  if (!_app) _app = getApps()[0] ?? initializeApp(config);
  if (!_db) _db = getDatabase(_app);
  return _db;
}