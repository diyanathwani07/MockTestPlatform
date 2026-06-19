import React from "react";

// Accept the subject as a prop
function SubjectTabs({ examSubject }) {
  return (
    <div className="top-tabs-container">
      <div className="active-subject-tab">
        {/* Display the dynamically selected subject */}
        {examSubject}
      </div>
    </div>
  );
}

export default SubjectTabs;