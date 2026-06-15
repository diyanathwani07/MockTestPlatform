import React from "react";

function SubjectTabs({ activeSubject, setActiveSubject }) {
  const subjects = ["Aptitude", "Reasoning", "English"];

  return (
    <div className="subject-tabs">
      {subjects.map((sub) => (
        <button
          key={sub}
          className={activeSubject === sub ? "active" : ""}
          onClick={() => setActiveSubject(sub)}
        >
          {sub}
        </button>
      ))}
    </div>
  );
}

export default SubjectTabs;