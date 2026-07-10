const Role = require("./models/Role");

const ALL_PERMISSIONS = [
  "dashboard","manage_users","create_quiz","edit_quiz","delete_quiz","manage_questions","question_bank","practice_tests","manage_results","view_reports","audit_logs","support_tickets","manage_subjects","manage_notifications","manage_videos","upload_videos","ai_chat_settings","website_settings","system_settings","manage_roles","manage_faculty","manage_students","preview_as_student","publish_quiz","export_reports","import_questions","manage_practice_tests","view_analytics","manage_banners","manage_faqs","student_dashboard","my_exams","results","leaderboard","help_support"
];

const DEFAULT_ROLES = [
  {
    name: "Technical Team",
    slug: "technical_team",
    description: "Full system access. Manages roles, settings, and all platform features.",
    color: "#6E3FF3",
    isSystem: true,
    full_access: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "Content Team",
    slug: "content_team",
    description: "Creates and manages quizzes, questions, and practice modules.",
    color: "#3B82F6",
    isSystem: true,
    full_access: false,
    permissions: ["dashboard","create_quiz","edit_quiz","manage_questions","question_bank","practice_tests","import_questions","preview_as_student","manage_practice_tests"],
  },
  {
    name: "Calling Team",
    slug: "calling_team",
    description: "Manages student outreach, follow-ups, and support tickets.",
    color: "#10B981",
    isSystem: true,
    full_access: false,
    permissions: ["dashboard","manage_students","support_tickets"],
  },
  {
    name: "YouTube Team",
    slug: "youtube_team",
    description: "Manages video content, uploads, and analytics.",
    color: "#EF4444",
    isSystem: true,
    full_access: false,
    permissions: ["dashboard","manage_videos","upload_videos","view_analytics"],
  },
  {
    name: "Faculty",
    slug: "faculty",
    description: "Reviews questions, monitors student performance, and manages practice tests.",
    color: "#F59E0B",
    isSystem: true,
    full_access: false,
    permissions: ["dashboard","manage_questions","question_bank","practice_tests","manage_results","view_reports"],
  },
  {
    name: "Operations Team",
    slug: "operations_team",
    description: "Schedules and publishes quizzes, manages student enrollment and notifications.",
    color: "#8B5CF6",
    isSystem: true,
    full_access: false,
    permissions: ["dashboard","publish_quiz","manage_results","view_reports","manage_notifications","support_tickets","view_analytics"],
  },
  {
    name: "Student",
    slug: "student",
    description: "Standard student access to exams, practice, results, and support.",
    color: "#64748B",
    isSystem: true,
    full_access: false,
    permissions: ["student_dashboard","my_exams","practice_tests","results","leaderboard","help_support"],
  },
];

async function seedRoles() {
  try {
    for (const roleData of DEFAULT_ROLES) {
      const exists = await Role.findOne({ slug: roleData.slug });
      if (!exists) {
        await Role.create(roleData);
        console.log(`[Seed] Created role: ${roleData.name}`);
      }
    }
    console.log("[Seed] Role seeding complete.");
  } catch (err) {
    console.error("[Seed] Role seeding error:", err.message);
  }
}

module.exports = seedRoles;
