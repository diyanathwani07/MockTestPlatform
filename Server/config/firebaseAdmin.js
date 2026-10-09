const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized) return;
  try {
    const serviceAccountPath = path.join(__dirname, "firebase-admin-key.json");
    
    // 1. Try to load from environment variables (Render/Prod)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines with actual newlines (required for Render env vars)
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/\n/g, '\n')
        })
      });
      console.log("[Firebase Admin] Initialized via Environment Variables");
      isInitialized = true;
    } 
    // 2. Fallback to local JSON file (Local Dev)
    else if (fs.existsSync(serviceAccountPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
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

module.exports = {
  admin,
  initFirebaseAdmin,
};
