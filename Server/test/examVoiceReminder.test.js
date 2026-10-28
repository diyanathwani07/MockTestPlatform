const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const VoiceSetting = require("../models/VoiceSetting");
const Schedule = require("../models/Schedule");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  scheduleExamReminder,
  getExamReminders,
  cancelExamReminder,
  getEligibleExamsForReminders
} = require("../controllers/aiVoiceController");

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

function createChainableQuery(result) {
  const obj = {
    select: () => obj,
    populate: () => obj,
    sort: () => obj,
    skip: () => obj,
    limit: () => obj,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return obj;
}

test("Exam & Quiz Voice Reminder Scheduling Suite", async (t) => {
  // Stash original methods
  const origVoiceSettingFindOne = VoiceSetting.findOne;
  const origQuizFindById = Quiz.findById;
  const origQuizFind = Quiz.find;
  const origUserFindById = User.findById;
  const origUserFind = User.find;
  const origScheduleFindOne = Schedule.findOne;
  const origScheduleFind = Schedule.find;
  const origScheduleCreate = Schedule.create;
  const origScheduleCount = Schedule.countDocuments;
  const origAuditLogCreate = AuditLog.create;

  t.after(() => {
    VoiceSetting.findOne = origVoiceSettingFindOne;
    Quiz.findById = origQuizFindById;
    Quiz.find = origQuizFind;
    User.findById = origUserFindById;
    User.find = origUserFind;
    Schedule.findOne = origScheduleFindOne;
    Schedule.find = origScheduleFind;
    Schedule.create = origScheduleCreate;
    Schedule.countDocuments = origScheduleCount;
    AuditLog.create = origAuditLogCreate;
  });

  const testStudentId = new mongoose.Types.ObjectId().toString();
  const otherStudentId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const quizId = new mongoose.Types.ObjectId().toString();

  const mockAdminUser = {
    _id: adminId,
    name: "Admin User",
    email: "admin@example.com",
    role: "admin"
  };

  const mockStudentUser = {
    _id: testStudentId,
    name: "Rahul Sharma",
    fullName: "Rahul Sharma",
    email: "rahul@example.com",
    role: "student",
    phone: "+919876543210"
  };

  const mockQuiz = {
    _id: quizId,
    title: "JEE Advanced Mock Test 1",
    published: true,
    status: "Published",
    scheduledDate: new Date(Date.now() + 86400000 * 2), // 2 days in future
    duration: 180,
    totalMarks: 300,
    category: "JEE"
  };

  const mockVoiceSettings = {
    enabled: true,
    callingSchedule: {
      enabled: false,
      allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      startTime: "00:00",
      endTime: "23:59",
      timeZone: "Asia/Kolkata"
    },
    defaultVoice: "Kore",
    defaultLanguage: "en-US",
    retryRules: {
      maxAttempts: 3,
      retryDelayMinutes: 10
    }
  };

  AuditLog.create = async () => ({ _id: "audit-123" });

  // Reset base mocks before each test
  function resetBaseMocks() {
    VoiceSetting.findOne = () => createChainableQuery({ ...mockVoiceSettings });
    Quiz.findById = () => createChainableQuery({ ...mockQuiz });
    User.findById = () => createChainableQuery({ ...mockStudentUser });
    User.find = () => createChainableQuery([{ ...mockStudentUser }]);
    Schedule.findOne = () => createChainableQuery(null);
  }

  // 1. Master switch enforcement
  await t.test("1. Rejects scheduling when VoiceSetting.enabled is false", async () => {
    VoiceSetting.findOne = () => createChainableQuery({ ...mockVoiceSettings, enabled: false });

    const req = {
      user: mockStudentUser,
      body: {
        quizId: quizId,
        timingType: "EXACT_TIME",
        customScheduledTime: new Date(Date.now() + 3600000).toISOString()
      }
    };
    const res = createMockRes();

    await scheduleExamReminder(req, res);
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.data.message, /Voice reminder service is currently disabled/i);
  });

  // 2. Invalid quiz ID validation
  await t.test("2. Rejects scheduling with invalid or non-existent quizId", async () => {
    resetBaseMocks();

    // Invalid format
    const reqInvalid = {
      user: mockStudentUser,
      body: { quizId: "not-an-id", timingType: "EXACT_TIME", customScheduledTime: new Date(Date.now() + 3600000).toISOString() }
    };
    const resInvalid = createMockRes();
    await scheduleExamReminder(reqInvalid, resInvalid);
    assert.strictEqual(resInvalid.statusCode, 400);

    // Non-existent quiz
    Quiz.findById = () => createChainableQuery(null);
    const reqNotFound = {
      user: mockStudentUser,
      body: { quizId: new mongoose.Types.ObjectId().toString(), timingType: "EXACT_TIME", customScheduledTime: new Date(Date.now() + 3600000).toISOString() }
    };
    const resNotFound = createMockRes();
    await scheduleExamReminder(reqNotFound, resNotFound);
    assert.strictEqual(resNotFound.statusCode, 404);
  });

  // 3. Past or too-soon scheduled date
  await t.test("3. Rejects scheduled date in the past or within buffer", async () => {
    resetBaseMocks();

    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const req = {
      user: mockStudentUser,
      body: { quizId: quizId, timingType: "EXACT_TIME", customScheduledTime: pastDate }
    };
    const res = createMockRes();

    await scheduleExamReminder(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.data.message, /reminder time is in the past/i);
  });

  // 4. Role Authorization: Student cannot schedule for another recipient
  await t.test("4. Enforces student role can only schedule for self", async () => {
    resetBaseMocks();

    let createdScheduleData = null;
    Schedule.create = async (data) => {
      createdScheduleData = data;
      return {
        ...data,
        _id: "sched-101",
        populate: async () => createdScheduleData
      };
    };

    const req = {
      user: mockStudentUser,
      body: {
        quizId: quizId,
        recipients: [otherStudentId], // Malicious student attempts to target someone else
        timingType: "EXACT_TIME",
        customScheduledTime: new Date(Date.now() + 3600000).toISOString()
      }
    };
    const res = createMockRes();

    await scheduleExamReminder(req, res);
    assert.strictEqual(res.statusCode, 201);
    // Verified: Recipient was forced to student's own ID
    assert.strictEqual(createdScheduleData.user.toString(), testStudentId);
  });

  // 5. Duplicate reminder prevention
  await t.test("5. Prevents duplicate pending reminders for same user and quiz", async () => {
    resetBaseMocks();

    // Existing active schedule found
    Schedule.findOne = () => createChainableQuery({
      _id: "sched-existing",
      status: "PENDING",
      scheduledTime: new Date(Date.now() + 7200000)
    });

    const req = {
      user: mockStudentUser,
      body: {
        quizId: quizId,
        timingType: "EXACT_TIME",
        customScheduledTime: new Date(Date.now() + 3600000).toISOString()
      }
    };
    const res = createMockRes();

    await scheduleExamReminder(req, res);
    assert.strictEqual(res.statusCode, 409);
    assert.match(res.data.message, /already active/i);
  });

  // 6. Calling hours window enforcement
  await t.test("6. Rejects reminder scheduling outside allowed calling window", async () => {
    resetBaseMocks();
    VoiceSetting.findOne = () => createChainableQuery({
      ...mockVoiceSettings,
      callingSchedule: {
        enabled: true,
        allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        startTime: "10:00",
        endTime: "18:00",
        timeZone: "Asia/Kolkata"
      }
    });

    // Pick 03:00 AM IST (outside 10:00-18:00 IST)
    const midnightIST = new Date();
    midnightIST.setUTCHours(21, 30, 0, 0); // 03:00 AM IST next day
    if (midnightIST.getTime() <= Date.now()) {
      midnightIST.setDate(midnightIST.getDate() + 1);
    }

    const req = {
      user: mockStudentUser,
      body: {
        quizId: quizId,
        timingType: "EXACT_TIME",
        customScheduledTime: midnightIST.toISOString()
      }
    };
    const res = createMockRes();

    await scheduleExamReminder(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.data.message, /falls outside the permitted calling window/i);
  });

  // 7. Successful scheduling & template placeholder resolution
  await t.test("7. Resolves placeholders and creates schedule for exam", async () => {
    resetBaseMocks();

    let createdRecord = null;
    Schedule.create = async (doc) => {
      createdRecord = doc;
      return {
        ...doc,
        _id: "sched-success-1",
        populate: async () => ({ ...doc, _id: "sched-success-1", quiz: mockQuiz })
      };
    };

    const futureExamDate = new Date(Date.now() + 86400000 * 2);
    Quiz.findById = () => createChainableQuery({
      ...mockQuiz,
      scheduledDate: futureExamDate
    });

    const req = {
      user: mockStudentUser,
      body: {
        quizId: quizId,
        timingType: "1_HOUR_BEFORE",
        reminderAudioText: "Namaste {studentName}, your exam {taskTitle} will start on {examDate} at {examTime}."
      }
    };
    const res = createMockRes();

    await scheduleExamReminder(req, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(createdRecord.reminderAudioText.includes("Rahul Sharma"));
    assert.ok(createdRecord.reminderAudioText.includes("JEE Advanced Mock Test 1"));
    assert.strictEqual(createdRecord.callType, "EXAM_REMINDER");
    assert.strictEqual(createdRecord.reminderTimingType, "1_HOUR_BEFORE");
  });

  // 8. Role scoping in getExamReminders
  await t.test("8. Role scoping: Students only see their own reminders, Admin sees all", async () => {
    resetBaseMocks();

    let capturedQuery = null;
    Schedule.find = (query) => {
      capturedQuery = query;
      const chain = {
        populate: () => chain,
        sort: () => chain,
        limit: () => Promise.resolve([
          { _id: "s1", user: { _id: testStudentId, name: "Rahul" }, quiz: mockQuiz, status: "PENDING" }
        ])
      };
      return chain;
    };

    // Student request
    const studentReq = {
      user: mockStudentUser,
      query: { status: "PENDING" }
    };
    const studentRes = createMockRes();
    await getExamReminders(studentReq, studentRes);

    assert.strictEqual(studentRes.statusCode, 200);
    assert.strictEqual(capturedQuery.user.toString(), testStudentId);

    // Admin request
    const adminReq = {
      user: mockAdminUser,
      query: { status: "PENDING" }
    };
    const adminRes = createMockRes();
    await getExamReminders(adminReq, adminRes);

    assert.strictEqual(adminRes.statusCode, 200);
    assert.strictEqual(capturedQuery.user, undefined); // Admin query is not locked to a single user
  });

  // 9. Cancellation security and state protection
  await t.test("9. Cancellation: Pending reminder can be cancelled, completed cannot", async () => {
    resetBaseMocks();

    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const otherUserScheduleId = new mongoose.Types.ObjectId().toString();
    const completedScheduleId = new mongoose.Types.ObjectId().toString();
    const validScheduleId = new mongoose.Types.ObjectId().toString();

    // 9a. Non-existent schedule
    Schedule.findOne = () => createChainableQuery(null);
    const reqNotFound = {
      user: mockStudentUser,
      params: { id: nonExistentId }
    };
    const resNotFound = createMockRes();
    await cancelExamReminder(reqNotFound, resNotFound);
    assert.strictEqual(resNotFound.statusCode, 404);

    // 9b. Student cannot cancel another student's reminder (scoped query returns 404)
    Schedule.findOne = (query) => {
      if (query.user && query.user.toString() === testStudentId) {
        return createChainableQuery(null); // not found for this student
      }
      return createChainableQuery({
        _id: otherUserScheduleId,
        user: new mongoose.Types.ObjectId(otherStudentId),
        status: "PENDING"
      });
    };
    const reqUnauthorized = {
      user: mockStudentUser,
      params: { id: otherUserScheduleId }
    };
    const resUnauthorized = createMockRes();
    await cancelExamReminder(reqUnauthorized, resUnauthorized);
    assert.strictEqual(resUnauthorized.statusCode, 404);

    // 9c. Cannot cancel COMPLETED or PROCESSING schedule
    const completedSchedule = {
      _id: completedScheduleId,
      user: new mongoose.Types.ObjectId(testStudentId),
      status: "COMPLETED",
      save: async function () { return this; }
    };
    Schedule.findOne = () => createChainableQuery(completedSchedule);
    const reqCompleted = {
      user: mockStudentUser,
      params: { id: completedScheduleId }
    };
    const resCompleted = createMockRes();
    await cancelExamReminder(reqCompleted, resCompleted);
    assert.strictEqual(resCompleted.statusCode, 400);
    assert.match(resCompleted.data.message, /already completed/i);

    // 9d. Successfully cancels PENDING schedule
    let savedSchedule = null;
    const pendingSchedule = {
      _id: validScheduleId,
      user: new mongoose.Types.ObjectId(testStudentId),
      status: "PENDING",
      save: async function () {
        savedSchedule = this;
        return this;
      }
    };
    Schedule.findOne = () => createChainableQuery(pendingSchedule);
    const reqValid = {
      user: mockStudentUser,
      params: { id: validScheduleId }
    };
    const resValid = createMockRes();
    await cancelExamReminder(reqValid, resValid);
    assert.strictEqual(resValid.statusCode, 200);
    assert.strictEqual(resValid.data.success, true);
    assert.strictEqual(savedSchedule.status, "CANCELLED");
  });

  // 10. Eligible exams retrieval
  await t.test("10. Retrieves eligible published quizzes for reminders", async () => {
    resetBaseMocks();
    Quiz.find = () => ({
      select: () => ({
        sort: () => ({
          limit: () => Promise.resolve([mockQuiz])
        })
      })
    });

    const req = { user: mockStudentUser };
    const res = createMockRes();
    await getEligibleExamsForReminders(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.length, 1);
    assert.strictEqual(res.data.data[0].title, "JEE Advanced Mock Test 1");
  });
});
