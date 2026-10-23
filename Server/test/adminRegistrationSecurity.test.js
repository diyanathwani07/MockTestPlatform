const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const { registerUser } = require("../controllers/authController");

async function runAdminRegistrationSecurityTests() {
  console.log("==================================================");
  console.log(" PREPMARK ADMIN REGISTRATION SECURITY TEST SUITE  ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI missing in .env");
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB for auth security verification.\n");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    return;
  }

  function createMockRes() {
    return {
      statusCode: 200,
      data: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.data = payload;
        return this;
      }
    };
  }

  const origSecret = process.env.ADMIN_SECRET_KEY;
  const createdTestEmails = [];

  try {
    // ── TEST 1: Normal student registration succeeds ──
    console.log("Test 1: Normal student registration");
    const email1 = `test_student_${Date.now()}@example.com`;
    createdTestEmails.push(email1);
    const req1 = {
      body: {
        fullName: "Test Student",
        email: email1,
        password: "Password123!",
        role: "user",
        phone: "9999999999"
      },
      ip: "127.0.0.1"
    };
    const res1 = createMockRes();
    await registerUser(req1, res1);
    assert(res1.statusCode === 201 && res1.data?.user?.role === "user", "Student registers with role 'user' (HTTP 201)");

    // ── TEST 2: Admin registration without key is rejected ──
    console.log("\nTest 2: Admin registration without secret key");
    const email2 = `test_admin_nokey_${Date.now()}@example.com`;
    const req2 = {
      body: {
        fullName: "Fake Admin",
        email: email2,
        password: "Password123!",
        role: "admin"
      },
      ip: "127.0.0.1"
    };
    const res2 = createMockRes();
    await registerUser(req2, res2);
    assert(res2.statusCode === 400 && res2.data?.success === false, "Rejects admin registration when no key is supplied (HTTP 400)");

    // ── TEST 3: Admin registration when server ADMIN_SECRET_KEY is undefined ──
    console.log("\nTest 3: Missing/undefined server ADMIN_SECRET_KEY fails closed");
    delete process.env.ADMIN_SECRET_KEY;
    const email3 = `test_admin_nodef_${Date.now()}@example.com`;
    const req3 = {
      body: {
        fullName: "Fake Admin 2",
        email: email3,
        password: "Password123!",
        role: "admin",
        adminSecretKey: ""
      },
      ip: "127.0.0.1"
    };
    const res3 = createMockRes();
    await registerUser(req3, res3);
    assert(res3.statusCode === 400, "Fails closed when server ADMIN_SECRET_KEY is undefined (HTTP 400)");

    // ── TEST 4: Admin registration when server ADMIN_SECRET_KEY is empty string ──
    console.log("\nTest 4: Empty string server ADMIN_SECRET_KEY fails closed");
    process.env.ADMIN_SECRET_KEY = "";
    const email4 = `test_admin_empty_${Date.now()}@example.com`;
    const req4 = {
      body: {
        fullName: "Fake Admin 3",
        email: email4,
        password: "Password123!",
        role: "admin",
        adminSecretKey: ""
      },
      ip: "127.0.0.1"
    };
    const res4 = createMockRes();
    await registerUser(req4, res4);
    assert(res4.statusCode === 400, "Fails closed when server ADMIN_SECRET_KEY is empty string (HTTP 400)");

    // ── TEST 5: Wrong secret key is rejected ──
    console.log("\nTest 5: Incorrect adminSecretKey is rejected");
    process.env.ADMIN_SECRET_KEY = "ActualSecret123";
    const email5 = `test_admin_wrong_${Date.now()}@example.com`;
    const req5 = {
      body: {
        fullName: "Fake Admin 4",
        email: email5,
        password: "Password123!",
        role: "admin",
        adminSecretKey: "WrongSecret999"
      },
      ip: "127.0.0.1"
    };
    const res5 = createMockRes();
    await registerUser(req5, res5);
    assert(res5.statusCode === 400, "Rejects incorrect key (HTTP 400)");

    // ── TEST 6: Arbitrary privileged roles like 'superadmin' default to 'user' ──
    console.log("\nTest 6: Client requesting 'superadmin' directly cannot elevate privilege");
    const email6 = `test_super_${Date.now()}@example.com`;
    createdTestEmails.push(email6);
    const req6 = {
      body: {
        fullName: "Privilege Escalation Attempt",
        email: email6,
        password: "Password123!",
        role: "superadmin"
      },
      ip: "127.0.0.1"
    };
    const res6 = createMockRes();
    await registerUser(req6, res6);
    assert(res6.statusCode === 201 && res6.data?.user?.role === "user", "Arbitrary requested role 'superadmin' is sanitized to 'user' (HTTP 201)");

    // ── TEST 7: Valid secret key successfully creates admin when authorized ──
    console.log("\nTest 7: Valid secret key creates admin account");
    process.env.ADMIN_SECRET_KEY = "VerifiedSecret2026";
    const email7 = `test_admin_legit_${Date.now()}@example.com`;
    createdTestEmails.push(email7);
    const req7 = {
      body: {
        fullName: "Legit Admin",
        email: email7,
        password: "Password123!",
        role: "admin",
        adminSecretKey: "VerifiedSecret2026"
      },
      ip: "127.0.0.1"
    };
    const res7 = createMockRes();
    await registerUser(req7, res7);
    assert(res7.statusCode === 201 && res7.data?.user?.role === "admin", "Valid secret key creates admin account (HTTP 201)");

  } finally {
    // Clean up created test accounts
    if (createdTestEmails.length > 0) {
      await User.deleteMany({ email: { $in: createdTestEmails } });
    }
    // Restore original env
    if (origSecret !== undefined) {
      process.env.ADMIN_SECRET_KEY = origSecret;
    } else {
      delete process.env.ADMIN_SECRET_KEY;
    }
    await mongoose.disconnect();
  }

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runAdminRegistrationSecurityTests();
