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
    // 1. Check specified service account path or auto-find in config/
    let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(__dirname, "..", process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.join(__dirname, "tp-ai-apk-firebase-adminsdk-fbsvc-462b133f81.json");

    if (!fs.existsSync(serviceAccountPath)) {
      const altKey = path.join(__dirname, "firebase-admin-key.json");
      if (fs.existsSync(altKey)) {
        serviceAccountPath = altKey;
      } else {
        const configFiles = fs.readdirSync(__dirname);
        const autoKey = configFiles.find(f => f.includes("firebase-adminsdk") && f.endsWith(".json"));
        if (autoKey) {
          serviceAccountPath = path.join(__dirname, autoKey);
        }
      }
    }

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log(`[Firebase Admin] Initialized successfully using ${path.basename(serviceAccountPath)}`);
      isInitialized = true;
      return;
    }

    // 2. Try to load from environment variables (Render/Prod)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      let key = process.env.FIREBASE_PRIVATE_KEY.trim();
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
      return;
    }

    throw new Error("Missing Firebase credentials (no valid JSON file and no env vars).");
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
