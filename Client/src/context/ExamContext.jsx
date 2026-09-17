import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const ExamContext = createContext();

export function ExamProvider({ children }) {
  const [selectedExam, setSelectedExamState] = useState(() => {
    try {
      const stored = localStorage.getItem("selectedExamSeriesId");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedStructure, setSelectedStructureState] = useState(() => {
    try {
      const stored = localStorage.getItem("selectedExamStructure");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedSubject, setSelectedSubjectState] = useState(() => {
    try {
      const stored = localStorage.getItem("selectedExamSubject");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isChangeExamOpen, setIsChangeExamOpen] = useState(false);

  const setSelectedExam = (examObj) => {
    // If selected exam is changing to a different exam, clear structure & subject
    const isDifferentExam = !selectedExam || !examObj || selectedExam._id !== examObj._id;
    
    setSelectedExamState(examObj);
    if (examObj) {
      localStorage.setItem("selectedExamSeriesId", JSON.stringify(examObj));
    } else {
      localStorage.removeItem("selectedExamSeriesId");
    }

    if (isDifferentExam) {
      setSelectedStructureState(null);
      setSelectedSubjectState(null);
      localStorage.removeItem("selectedExamStructure");
      localStorage.removeItem("selectedExamSubject");
    }
  };

  const setSelectedStructure = (structureObj) => {
    setSelectedStructureState(structureObj);
    if (structureObj) {
      localStorage.setItem("selectedExamStructure", JSON.stringify(structureObj));
    } else {
      localStorage.removeItem("selectedExamStructure");
    }
  };

  const setSelectedSubject = (subjectObjOrName) => {
    setSelectedSubjectState(subjectObjOrName);
    if (subjectObjOrName) {
      localStorage.setItem("selectedExamSubject", JSON.stringify(subjectObjOrName));
    } else {
      localStorage.removeItem("selectedExamSubject");
    }
  };

  const setFullExamSelection = ({ exam, structure, subject }) => {
    setSelectedExamState(exam);
    if (exam) {
      localStorage.setItem("selectedExamSeriesId", JSON.stringify(exam));
    } else {
      localStorage.removeItem("selectedExamSeriesId");
    }

    setSelectedStructureState(structure || null);
    if (structure) {
      localStorage.setItem("selectedExamStructure", JSON.stringify(structure));
    } else {
      localStorage.removeItem("selectedExamStructure");
    }

    setSelectedSubjectState(subject || null);
    if (subject) {
      localStorage.setItem("selectedExamSubject", JSON.stringify(subject));
    } else {
      localStorage.removeItem("selectedExamSubject");
    }
  };

  const openChangeExamModal = () => setIsChangeExamOpen(true);
  const closeChangeExamModal = () => setIsChangeExamOpen(false);

  // Sync / re-verify exam object on launch if needed
  useEffect(() => {
    if (selectedExam && selectedExam._id) {
      const verifyExam = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/exam-series`);
          const latest = (res.data || []).find((s) => s._id === selectedExam._id);
          if (latest) {
            if (!selectedExam || String(latest._id) !== String(selectedExam._id)) {
              setSelectedExamState(latest);
              localStorage.setItem("selectedExamSeriesId", JSON.stringify(latest));
            }
          }
        } catch {
          // ignore offline/network errors, rely on cached value
        }
      };
      verifyExam();
    }
  }, []);

  return (
    <ExamContext.Provider
      value={{
        selectedExam,
        setSelectedExam,
        selectedStructure,
        setSelectedStructure,
        selectedSubject,
        setSelectedSubject,
        setFullExamSelection,
        isChangeExamOpen,
        openChangeExamModal,
        closeChangeExamModal,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error("useExam must be used within an ExamProvider");
  }
  return context;
}
