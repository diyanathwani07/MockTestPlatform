const Department = require("./models/Department");

const DEFAULT_DEPARTMENTS = [
  {
    name: "Technical Team",
    description: "Full technical features, user management, quiz management, settings, reports, practice tests, support tickets.",
    permissions: [
      "dashboard",
      "manage_users",
      "create_quiz",
      "edit_quiz",
      "delete_quiz",
      "manage_questions",
      "question_bank",
      "import_questions",
      "practice_tests",
      "manage_practice_tests",
      "support_tickets",
      "view_reports",
      "manage_settings",
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
      "delete_quiz",
      "manage_questions",
      "question_bank",
      "import_questions",
      "manage_subjects",
      "practice_tests",
      "manage_practice_tests"
    ]
  },
  {
    name: "Calling Team",
    description: "Student list, profiles, support tickets, call logs, follow-up notes.",
    permissions: [
      "dashboard",
      "student_list",
      "student_profiles",
      "support_tickets",
      "call_logs",
      "follow_up_notes"
    ]
  },
  {
    name: "YouTube Team",
    description: "Upload videos, manage video library, attach videos to subjects, video analytics.",
    permissions: [
      "dashboard",
      "upload_videos",
      "manage_videos",
      "attach_videos",
      "video_analytics"
    ]
  },
  {
    name: "Faculty",
    description: "Review questions, monitor student performance, view reports, practice tests.",
    permissions: [
      "dashboard",
      "review_questions",
      "student_performance",
      "view_reports",
      "practice_tests"
    ]
  },
  {
    name: "Operations Team",
    description: "Schedule exams, publish quizzes, student enrollment, notifications, reports.",
    permissions: [
      "dashboard",
      "schedule_exams",
      "publish_quizzes",
      "student_enrollment",
      "manage_notifications",
      "view_reports"
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
      }
    }
    console.log("[Seed] Department seeding complete.");
  } catch (err) {
    console.error("[Seed] Department seeding error:", err.message);
  }
}

module.exports = seedDepartments;
