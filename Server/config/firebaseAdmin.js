const admin = require("firebase-admin");
const path = require("path");

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized) return;
  try {
    const serviceAccountPath = path.join(__dirname, "firebase-admin-key.json");
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
    console.log("[Firebase Admin] Initialized successfully");
    isInitialized = true;
  } catch (error) {
    console.warn("[Firebase Admin] Could not initialize (check firebase-admin-key.json):", error.message);
  }
}

module.exports = {
  admin,
  initFirebaseAdmin,
};
