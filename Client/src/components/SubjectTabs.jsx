import React from "react";

function SubjectTabs({ examSubject }) {
  return (
    <div className="quiz-sub-stripe" style={{ padding: "10px 20px", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-card)" }}>
      <span className="exam-subject-badge" style={{ fontWeight: "bold", color: "var(--violet)" }}>
        {examSubject}
      </span>
    </div>
  );
}

export default SubjectTabs;
