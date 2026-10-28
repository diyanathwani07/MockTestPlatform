const { initializeApp, cert, getApps, getApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const fs = require("fs");

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized || getApps().length > 0) {
    isInitialized = true;
    return;
  }
  try {
    const serviceAccountPath = path.join(__dirname, "firebase-admin-key.json");
    
    // 1. Try to load from environment variables (Render/Prod)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      let key = process.env.FIREBASE_PRIVATE_KEY.trim();
      // Strip accidental wrapping quotes (single or double) from .env or Render dashboard
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1).trim();
      }
      key = key.replace(/\\n/g, "\n");

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID.trim(),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
          privateKey: key
        })
      });
      console.log("[Firebase Admin] Initialized via Environment Variables");
      isInitialized = true;
    } 
    // 2. Fallback to local JSON file (Local Dev)
    else if (fs.existsSync(serviceAccountPath)) {
      initializeApp({
        credential: cert(require(serviceAccountPath)),
      });
      console.log("[Firebase Admin] Initialized via local JSON file");
      isInitialized = true;
    } 
    else {
      throw new Error("Missing Firebase credentials (no env vars and no JSON file).");
    }
  } catch (error) {
    console.warn("[Firebase Admin] Could not initialize:", error.message);
  }
}

// Unified admin-compatible proxy so callers using admin.apps or admin.messaging() work seamlessly on v14
const admin = {
  get apps() {
    return getApps();
  },
  messaging() {
    return getMessaging();
  },
  getApps,
  getApp,
  initializeApp,
  cert
};

module.exports = {
  admin,
  initFirebaseAdmin,
  getMessaging,
  getApps
};
