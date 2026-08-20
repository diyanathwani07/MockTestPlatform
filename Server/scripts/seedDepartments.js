const Department = require("../models/Department");

const DEFAULT_DEPARTMENTS = [
  {
    name: "Technical Team",
    description: "Full technical features, user management, quiz management, settings, reports, practice tests, support tickets.",
    permissions: [
      "dashboard",
      "create_quiz",
      "edit_quiz",
      "manage_practice_tests",
      "manage_questions",
      "manage_users",
      "manage_results",
      "view_reports",
      "audit_logs",
      "support_tickets",
      "manage_roles"
    ]
  },
  {
    name: "Content Team",
    description: "Create/manage quizzes, questions, subjects, practice tests, and import questions.",
    permissions: [
      "dashboard",
      "create_quiz",
      "edit_quiz",
      "manage_practice_tests",
      "manage_questions"
    ]
  },
  {
    name: "Calling Team",
    description: "Student list, profiles, support tickets, call logs, follow-up notes.",
    permissions: [
      "dashboard",
      "manage_users",
      "support_tickets"
    ]
  },
  {
    name: "YouTube Team",
    description: "Upload videos, manage video library, attach videos to subjects, video analytics.",
    permissions: [
      "dashboard",
      "manage_questions"
    ]
  },
  {
    name: "Faculty",
    description: "Review questions, monitor student performance, view reports, practice tests.",
    permissions: [
      "dashboard",
      "manage_questions",
      "manage_results",
      "view_reports",
      "manage_practice_tests"
    ]
  },
  {
    name: "Operations Team",
    description: "Schedule exams, publish quizzes, student enrollment, notifications, reports.",
    permissions: [
      "dashboard",
      "create_quiz",
      "edit_quiz",
      "manage_users",
      "view_reports"
    ]
  },
  {
    name: "Help and Support",
    description: "Manage student queries and resolve support tickets.",
    permissions: [
      "dashboard",
      "support_tickets"
    ]
  }
];

async function seedDepartments() {
  try {
    for (const deptData of DEFAULT_DEPARTMENTS) {
      const exists = await Department.findOne({ name: deptData.name });
      if (!exists) {
        await Department.create(deptData);
        console.log(`[Seed] Created department: ${deptData.name}`);
      } else {
        // Update to only use simplified panel permissions
        exists.permissions = deptData.permissions;
        exists.description = deptData.description;
        await exists.save();
        console.log(`[Seed] Updated department permissions: ${deptData.name}`);
      }
    }
    console.log("[Seed] Department seeding complete.");
  } catch (err) {
    console.error("[Seed] Department seeding error:", err.message);
  }
}

module.exports = seedDepartments;
