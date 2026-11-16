const dotenv = require("dotenv");
const path = require("path");
const https = require("https");

dotenv.config({ path: path.join(__dirname, "../.env") });

const cloudinaryService = require("../services/cloudinaryService");

async function runLiveCloudinarySuite() {
  console.log("============================================================");
  console.log("  PREPMARK STUDY LIBRARY - LIVE CLOUDINARY INTEGRATION SUITE ");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? "- " + detail : ""}`);
      failed++;
    }
  }

  function fetchUrl(url) {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode, body }));
        })
        .on("error", reject);
    });
  }

  try {
    // -------------------------------------------------------------
    // 1. LIVE EXPIRATION REJECTION TEST
    // -------------------------------------------------------------
    console.log("--- 1. Testing Live Expiry Enforcement ---");
    const expiredUrl = cloudinaryService.generateSignedViewUrl(
      "study_library/test_integration_asset",
      "pdf",
      "raw",
      "authenticated",
      -60 // Expired 60 seconds ago
    );

    const expiredResponse = await fetchUrl(expiredUrl);
    assert(
      expiredResponse.statusCode === 401 && expiredResponse.body.includes("Stale request"),
      "Cloudinary API strictly rejects expired URL with HTTP 401 Unauthorized ('Stale request')",
      `Got HTTP ${expiredResponse.statusCode}: ${expiredResponse.body}`
    );

    // -------------------------------------------------------------
    // 2. LIVE TAMPER-RESISTANCE REJECTION TEST
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Live Tamper-Resistance Enforcement ---");
    const validUrl = cloudinaryService.generateSignedViewUrl(
      "study_library/test_integration_asset",
      "pdf",
      "raw",
      "authenticated",
      3600
    );

    // Tamper with expires_at parameter by extending it by 100,000 seconds
    const tamperedUrl = validUrl.replace(/expires_at=\d+/, "expires_at=" + (Math.floor(Date.now() / 1000) + 100000));
    const tamperedResponse = await fetchUrl(tamperedUrl);
    assert(
      tamperedResponse.statusCode === 401 && tamperedResponse.body.includes("Invalid Signature"),
      "Cloudinary API strictly rejects tampered URL parameters with HTTP 401 Unauthorized ('Invalid Signature')",
      `Got HTTP ${tamperedResponse.statusCode}: ${tamperedResponse.body}`
    );

    // -------------------------------------------------------------
    // 3. NON-DESTRUCTIVE AUTHENTICATED ASSET LOOKUP TEST
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Non-Destructive Active Delivery URL Signature ---");
    // Requesting a non-destructive dedicated test public ID
    const activeTestResponse = await fetchUrl(validUrl);
    assert(
      activeTestResponse.statusCode === 404 && activeTestResponse.body.includes("Resource not found"),
      "Cloudinary API successfully validates signature & active expiration window (HTTP 404 Resource not found; non-destructive)",
      `Got HTTP ${activeTestResponse.statusCode}: ${activeTestResponse.body}`
    );

  } catch (err) {
    console.error("Cloudinary Live Integration Suite Exception:", err);
    failed++;
  }

  console.log("\n============================================================");
  console.log(`  LIVE CLOUDINARY SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveCloudinarySuite();
