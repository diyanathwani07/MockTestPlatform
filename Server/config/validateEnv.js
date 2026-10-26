/**
 * Safe startup environment variable validation.
 * Verifies existence of required variables without exposing secret values in logs.
 */
function validateStartupEnv() {
  const hasMongoUri = Boolean((process.env.MONGO_URI && process.env.MONGO_URI.trim()) || (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()));
  const missingCritical = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
    missingCritical.push("JWT_SECRET");
  }
  if (!hasMongoUri) {
    missingCritical.push("MONGO_URI / MONGODB_URI");
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
    missingCritical.push("GEMINI_API_KEY");
  }

  const optional = [
    { key: "FIREBASE_SERVICE_ACCOUNT_PATH", purpose: "Native FCM Push Notifications" },
    { key: "CLIENT_URL", purpose: "Production CORS Whitelist" }
  ];

  if (missingCritical.length > 0) {
    console.warn(`[Startup Warning] Missing critical environment variables: ${missingCritical.join(", ")}`);
  } else {
    console.log("[Startup] Core environment variables validated successfully ✅");
  }

  optional.forEach(({ key, purpose }) => {
    if (!process.env[key] || process.env[key].trim() === "") {
      console.log(`[Startup Notice] Optional ${key} not set (${purpose}). Falling back to local/default mode.`);
    }
  });

  return {
    valid: missingCritical.length === 0,
    missingCritical
  };
}

module.exports = { validateStartupEnv };
