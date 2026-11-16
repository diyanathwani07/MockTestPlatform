const { describe, it } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const Notification = require("../models/Notification");
const NotificationDevice = require("../models/NotificationDevice");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { canManageNotifications } = require("../middleware/adminMiddleware");
const {
  validateDestinationLink,
  adminSendPush,
  adminTestMyDevice,
  getPushCandidates
} = require("../controllers/notificationController");
const notificationService = require("../services/notificationService");

function createMockRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    }
  };
}

describe("Admin Push Notifications Suite (Phase 1)", () => {
  describe("1. Destination Link Security & Sanitization", () => {
    it("should accept null, undefined or empty string as valid optional link", () => {
      assert.deepStrictEqual(validateDestinationLink(null), { isValid: true, sanitized: "" });
      assert.deepStrictEqual(validateDestinationLink(undefined), { isValid: true, sanitized: "" });
      assert.deepStrictEqual(validateDestinationLink("   "), { isValid: true, sanitized: "" });
    });

    it("should accept valid internal paths starting with /", () => {
      const res = validateDestinationLink("/dashboard/exams");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.sanitized, "/dashboard/exams");

      const resWithQuery = validateDestinationLink("/dashboard/results?attemptId=12345");
      assert.strictEqual(resWithQuery.isValid, true);
      assert.strictEqual(resWithQuery.sanitized, "/dashboard/results?attemptId=12345");
    });

    it("should reject external absolute URLs (phishing protection)", () => {
      const httpsRes = validateDestinationLink("https://evil.com/phish");
      assert.strictEqual(httpsRes.isValid, false);
      assert.match(httpsRes.error, /internal path/i);

      const httpRes = validateDestinationLink("http://malicious.org");
      assert.strictEqual(httpRes.isValid, false);

      const protocolRelative = validateDestinationLink("//attacker.com");
      assert.strictEqual(protocolRelative.isValid, false);
    });

    it("should reject javascript: or data: URIs (XSS protection)", () => {
      const jsRes = validateDestinationLink("javascript:alert(1)");
      assert.strictEqual(jsRes.isValid, false);

      const dataRes = validateDestinationLink("data:text/html,<script>alert(1)</script>");
      assert.strictEqual(dataRes.isValid, false);
    });

    it("should reject paths without leading slash", () => {
      const relRes = validateDestinationLink("dashboard/exams");
      assert.strictEqual(relRes.isValid, false);
      assert.match(relRes.error, /must be an internal path/i);
    });
  });

  describe("2. Notification Schema Enums & Integrity", () => {
    it("should include ADMIN_BROADCAST and SUBSCRIPTION_EXPIRED in Notification type enum", () => {
      const typeEnum = Notification.schema.path("type").enumValues;
      assert.ok(typeEnum.includes("ADMIN_BROADCAST"), "ADMIN_BROADCAST missing from Notification type enum");
      assert.ok(typeEnum.includes("SUBSCRIPTION_EXPIRED"), "SUBSCRIPTION_EXPIRED missing from Notification type enum");
      assert.ok(typeEnum.includes("SYSTEM_ALERT"), "SYSTEM_ALERT missing from Notification type enum");
      assert.ok(typeEnum.includes("NEW_EXAM_SERIES"), "NEW_EXAM_SERIES missing from Notification type enum");
    });
  });

  describe("3. Admin Authorization & RBAC Enforcement (canManageNotifications)", () => {
    it("should return 403 when request user is missing or non-admin role", async () => {
      const req = { user: null };
      const res = createMockRes();
      let nextCalled = false;
      await canManageNotifications(req, res, () => { nextCalled = true; });
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    it("should return 403 for standard student role", async () => {
      const req = { user: { _id: new mongoose.Types.ObjectId(), role: "user", permissions: [] } };
      const res = createMockRes();
      let nextCalled = false;
      await canManageNotifications(req, res, () => { nextCalled = true; });
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    it("should return 403 for staff member lacking manage_notifications permission", async () => {
      const req = { user: { _id: new mongoose.Types.ObjectId(), role: "employee", permissions: ["manage_quizzes"] } };
      const res = createMockRes();
      let nextCalled = false;
      await canManageNotifications(req, res, () => { nextCalled = true; });
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(nextCalled, false);
    });

    it("should allow staff member with manage_notifications permission", async () => {
      const req = { user: { _id: new mongoose.Types.ObjectId(), role: "admin", permissions: ["manage_notifications"] } };
      const res = createMockRes();
      let nextCalled = false;
      await canManageNotifications(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true);
    });

    it("should allow staff member with full_access permission", async () => {
      const req = { user: { _id: new mongoose.Types.ObjectId(), role: "manager", permissions: ["full_access"] } };
      const res = createMockRes();
      let nextCalled = false;
      await canManageNotifications(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true);
    });

    it("should allow Super Admin unconditionally", async () => {
      const req = { user: { _id: new mongoose.Types.ObjectId(), role: "superadmin", permissions: [] } };
      const res = createMockRes();
      let nextCalled = false;
      await canManageNotifications(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true);
    });
  });

  describe("4. Push Notification Controller Validation", () => {
    it("should reject invalid targetAudience", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "unknown_audience", title: "Test", message: "Hello" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /invalid target audience/i);
    });

    it("should reject empty or missing title", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "all", title: "   ", message: "Hello" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /title is required/i);
    });

    it("should reject title exceeding 100 characters", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "all", title: "A".repeat(101), message: "Hello" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /cannot exceed 100 characters/i);
    });

    it("should reject empty or missing message", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "all", title: "Notice", message: "" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /message is required/i);
    });

    it("should reject message exceeding 500 characters", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "all", title: "Notice", message: "M".repeat(501) }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /cannot exceed 500 characters/i);
    });

    it("should reject invalid destination links", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "all", title: "Notice", message: "Hello", link: "https://external.com" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /must be an internal path/i);
    });

    it("should reject single audience without a valid student ID", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "single", targetUserId: "invalid-id", title: "Notice", message: "Hello" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /valid student recipient ID is required/i);
    });

    it("should reject selected audience with empty list", async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: "superadmin" },
        body: { targetAudience: "selected", targetUserIds: [], title: "Notice", message: "Hello" }
      };
      const res = createMockRes();
      await adminSendPush(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.payload.message, /at least one student must be selected/i);
    });
  });

  describe("5. End-to-End Push Dispatch Execution (with Mocked Database & FCM)", () => {
    it("should process single student dispatch and record in-app notification", async () => {
      const mockStudentId = new mongoose.Types.ObjectId();
      const mockAdminId = new mongoose.Types.ObjectId();

      const originalUserFindOne = User.findOne;
      const originalNotificationInsertMany = Notification.insertMany;
      const originalAuditCreate = AuditLog.create;
      const originalSendFcmPush = notificationService.sendFcmPush;

      User.findOne = () => ({
        select: () => ({
          lean: async () => ({
            _id: mockStudentId,
            fullName: "Aarav Sharma",
            email: "aarav@prepmark.in"
          })
        })
      });

      let capturedDocs = null;
      Notification.insertMany = async (docs) => {
        capturedDocs = docs;
        return docs;
      };

      AuditLog.create = async () => true;

      let sendFcmPushCalled = false;
      notificationService.sendFcmPush = async (recipients, title, message, link) => {
        sendFcmPushCalled = true;
        assert.deepStrictEqual(recipients, [mockStudentId]);
        assert.strictEqual(title, "Exam Scheduled Tomorrow");
        assert.strictEqual(message, "Make sure to review your notes!");
        assert.strictEqual(link, "/dashboard/exams");
        return {
          tokensTargeted: 1,
          successCount: 1,
          failureCount: 0,
          cleanedTokensCount: 0
        };
      };

      try {
        const req = {
          user: { _id: mockAdminId, fullName: "Admin Priya", email: "admin@prepmark.in", role: "superadmin" },
          body: {
            targetAudience: "single",
            targetUserId: mockStudentId.toString(),
            title: "Exam Scheduled Tomorrow",
            message: "Make sure to review your notes!",
            link: "/dashboard/exams"
          }
        };
        const res = createMockRes();
        await adminSendPush(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.payload.success, true);
        assert.strictEqual(res.payload.totalRecipients, 1);
        assert.strictEqual(res.payload.deviceTokensFound, 1);
        assert.strictEqual(res.payload.fcmAccepted, 1);
        assert.strictEqual(sendFcmPushCalled, true);
        assert.ok(capturedDocs && capturedDocs.length === 1);
        assert.strictEqual(capturedDocs[0].type, "ADMIN_BROADCAST");
        assert.strictEqual(capturedDocs[0].link, "/dashboard/exams");
      } finally {
        User.findOne = originalUserFindOne;
        Notification.insertMany = originalNotificationInsertMany;
        AuditLog.create = originalAuditCreate;
        notificationService.sendFcmPush = originalSendFcmPush;
      }
    });

    it("should handle test notification for admin device (adminTestMyDevice)", async () => {
      const mockAdminId = new mongoose.Types.ObjectId();
      const originalDeviceFind = NotificationDevice.find;
      const originalNotificationCreate = Notification.create;
      const originalSendFcmPush = notificationService.sendFcmPush;

      try {
        // Case A: Admin has no registered device
        NotificationDevice.find = () => ({
          select: async () => []
        });

        const req1 = {
          user: { _id: mockAdminId, fullName: "Admin Priya", email: "admin@prepmark.in" },
          body: { title: "Test Notification", message: "Checking device connectivity", link: "/dashboard" }
        };
        const res1 = createMockRes();
        await adminTestMyDevice(req1, res1);
        assert.strictEqual(res1.statusCode, 200);
        assert.strictEqual(res1.payload.success, false);
        assert.match(res1.payload.message, /no registered push notification devices found/i);

        // Case B: Admin has registered devices
        NotificationDevice.find = () => ({
          select: async () => [{ token: "fcm-admin-token-123", platform: "android" }]
        });

        Notification.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });

        notificationService.sendFcmPush = async (userIds, title, message, link) => ({
          tokensTargeted: 1,
          successCount: 1,
          failureCount: 0,
          cleanedTokensCount: 0
        });

        const res2 = createMockRes();
        await adminTestMyDevice(req1, res2);
        assert.strictEqual(res2.statusCode, 200);
        assert.strictEqual(res2.payload.success, true);
        assert.strictEqual(res2.payload.deviceTokensFound, 1);
        assert.strictEqual(res2.payload.fcmAccepted, 1);
      } finally {
        NotificationDevice.find = originalDeviceFind;
        Notification.create = originalNotificationCreate;
        notificationService.sendFcmPush = originalSendFcmPush;
      }
    });

    it("should retrieve push candidates with device readiness status (getPushCandidates)", async () => {
      const originalUserFind = User.find;
      const originalUserCount = User.countDocuments;
      const originalDeviceFind = NotificationDevice.find;

      const student1 = new mongoose.Types.ObjectId();
      const student2 = new mongoose.Types.ObjectId();

      User.countDocuments = async () => 2;
      User.find = () => ({
        select: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => [
                { _id: student1, fullName: "Student One", email: "s1@prepmark.in", status: "active" },
                { _id: student2, fullName: "Student Two", email: "s2@prepmark.in", status: "active" }
              ]
            })
          })
        })
      });

      NotificationDevice.find = () => ({
        select: () => ({
          lean: async () => [
            { userId: student1, platform: "android", token: "tok1" },
            { userId: student1, platform: "web", token: "tok2" }
          ]
        })
      });

      try {
        const req = { query: { search: "", limit: 10 } };
        const res = createMockRes();
        await getPushCandidates(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.payload.success, true);
        assert.strictEqual(res.payload.count, 2);

        const cand1 = res.payload.data.find(c => c._id.toString() === student1.toString());
        assert.ok(cand1);
        assert.strictEqual(cand1.hasAndroid, true);
        assert.strictEqual(cand1.hasWeb, true);
        assert.strictEqual(cand1.devicesCount, 2);
        assert.strictEqual(cand1.deviceSummary, "Android (FCM Ready)");

        const cand2 = res.payload.data.find(c => c._id.toString() === student2.toString());
        assert.ok(cand2);
        assert.strictEqual(cand2.hasAndroid, false);
        assert.strictEqual(cand2.devicesCount, 0);
        assert.strictEqual(cand2.deviceSummary, "No device registered");
      } finally {
        User.find = originalUserFind;
        User.countDocuments = originalUserCount;
        NotificationDevice.find = originalDeviceFind;
      }
    });
  });
});
