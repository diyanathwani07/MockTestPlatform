import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import PrepMarkMascot from "../components/PrepMarkMascot";
import { ArrowRight, ArrowLeft, Target } from "lucide-react";

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [step, setStep] = useState(1);
  const [examSeries, setExamSeries] = useState([]);
  
  const [formData, setFormData] = useState({
    name: user?.fullName || "",
    examCategory: "", // Will hold the selected broad category if any, or we can just use examSeries directly
    examId: "", // Selected exam series
    goal: "",
    experience: "",
    preferences: []
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user already completed onboarding, redirect to dashboard
    if (user?.onboardingCompleted) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: Bearer  } : {};
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series`, { headers });
        setExamSeries(res.data.data || res.data || []);
      } catch (err) {
        console.error("Error fetching exams:", err);
      }
    };
    fetchExams();
  }, []);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePreference = (pref) => {
    setFormData(prev => {
      const current = prev.preferences;
      if (current.includes(pref)) {
        return { ...prev, preferences: current.filter(p => p !== pref) };
      } else {
        return { ...prev, preferences: [...current, pref] };
      }
    });
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const finishOnboarding = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !user) {
        // Guest mode onboarding
        localStorage.setItem("pendingOnboardingData", JSON.stringify(formData));
        navigate("/register");
        return;
      }

      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        fullName: formData.name,
        onboardingCompleted: true,
        onboardingData: formData
      }, {
        headers: { Authorization: Bearer  }
      });

      const updatedUser = { ...user, fullName: formData.name, onboardingCompleted: true, onboardingData: formData };
      login({ user: updatedUser, token });
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to save onboarding:", err);
      alert("Failed to save onboarding progress. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const renderProgress = () => {
    const totalSteps = 6;
    return (
      <div className="flex justify-center items-center space-x-2 mb-8">
        {[...Array(totalSteps)].map((_, i) => (
          <div 
            key={i} 
            style={{
              width: "8px", 
              height: "8px", 
              borderRadius: "50%", 
              background: i < step ? "var(--primary)" : "var(--border-color)",
              transition: "background 0.3s ease"
            }} 
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-body)", display: "flex", flexDirection: "column", padding: "20px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", width: "100%", justifyContent: "center" }}>
        
        {step > 1 && step < 7 && renderProgress()}

        <div style={{ backgroundColor: "var(--bg-card)", padding: "32px 24px", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", border: "1px solid var(--border-color)", textAlign: "center" }}>
          
          <PrepMarkMascot state={step === 6 ? "success" : "welcome"} />

          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="animate-fade-in mt-6">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px" }}>
                Hey! 👋 I'm your PrepMark study buddy.
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.5", marginBottom: "32px" }}>
                I'll help you find the right tests, practice smarter, and keep track of your progress.
              </p>
              <button 
                onClick={nextStep}
                style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "var(--primary)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              >
                Let's Get Started <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 2: NAME */}
          {step === 2 && (
            <div className="animate-fade-in mt-6">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "24px" }}>
                First, what should I call you?
              </h2>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter your name"
                style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-body)", color: "var(--text-primary)", fontSize: "16px", marginBottom: "24px", outline: "none" }}
              />
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={prevStep} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
                <button 
                  onClick={nextStep}
                  disabled={!formData.name.trim()}
                  style={{ flex: 1, padding: "16px", borderRadius: "12px", background: formData.name.trim() ? "var(--primary)" : "var(--border-color)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: formData.name.trim() ? "pointer" : "not-allowed" }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: EXAM SELECTION */}
          {step === 3 && (
            <div className="animate-fade-in mt-6 text-left">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px", textAlign: "center" }}>
                What are you preparing for?
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px", textAlign: "center" }}>
                Choose your exam so we can personalize your PrepMark experience.
              </p>
              
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "grid", gap: "12px", marginBottom: "24px" }}>
                {examSeries.map(exam => (
                  <button
                    key={exam._id}
                    onClick={() => updateField("examId", exam._id)}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: `2px solid ${formData.examId === exam._id ? "var(--primary)" : "var(--border-color)"}`,
                      background: formData.examId === exam._id ? "rgba(138, 85, 252, 0.05)" : "var(--bg-body)",
                      color: "var(--text-primary)",
                      fontWeight: formData.examId === exam._id ? "600" : "400",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <span>{exam.title || exam.name}</span>
                    {formData.examId === exam._id && <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--primary)" }} />}
                  </button>
                ))}
                
                <button
                  onClick={() => updateField("examId", "other")}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: `2px solid ${formData.examId === "other" ? "var(--primary)" : "var(--border-color)"}`,
                    background: formData.examId === "other" ? "rgba(138, 85, 252, 0.05)" : "var(--bg-body)",
                    color: "var(--text-primary)",
                    fontWeight: formData.examId === "other" ? "600" : "400",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <span>Other / I haven't decided yet</span>
                  {formData.examId === "other" && <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--primary)" }} />}
                </button>

                {examSeries.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No exams found. You can skip this step.</p>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={prevStep} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
                <button 
                  onClick={() => {
                    if (!formData.examId) {
                      alert("Please choose an exam or select 'Other / I haven't decided yet' to continue.");
                      return;
                    }
                    nextStep();
                  }}
                  style={{ flex: 1, padding: "16px", borderRadius: "12px", background: "var(--primary)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: "pointer" }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: GOAL */}
          {step === 4 && (
            <div className="animate-fade-in mt-6">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "24px" }}>
                What's your main goal?
              </h2>
              <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
                {["Practice regularly", "Prepare for my upcoming exam", "Improve my weak subjects", "Take mock tests", "Track my progress"].map(goal => (
                  <button
                    key={goal}
                    onClick={() => updateField("goal", goal)}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: `2px solid ${formData.goal === goal ? "var(--primary)" : "var(--border-color)"}`,
                      background: formData.goal === goal ? "rgba(138, 85, 252, 0.05)" : "var(--bg-body)",
                      color: "var(--text-primary)",
                      fontWeight: formData.goal === goal ? "600" : "400",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    {goal}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={prevStep} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
                <button 
                  onClick={nextStep}
                  disabled={!formData.goal}
                  style={{ flex: 1, padding: "16px", borderRadius: "12px", background: formData.goal ? "var(--primary)" : "var(--border-color)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: formData.goal ? "pointer" : "not-allowed" }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: EXPERIENCE LEVEL */}
          {step === 5 && (
            <div className="animate-fade-in mt-6">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "24px" }}>
                How would you describe your preparation?
              </h2>
              <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
                {["Just getting started", "I've started preparing", "I'm already practicing", "I'm preparing seriously"].map(exp => (
                  <button
                    key={exp}
                    onClick={() => updateField("experience", exp)}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: `2px solid ${formData.experience === exp ? "var(--primary)" : "var(--border-color)"}`,
                      background: formData.experience === exp ? "rgba(138, 85, 252, 0.05)" : "var(--bg-body)",
                      color: "var(--text-primary)",
                      fontWeight: formData.experience === exp ? "600" : "400",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    {exp}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={prevStep} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
                <button 
                  onClick={nextStep}
                  disabled={!formData.experience}
                  style={{ flex: 1, padding: "16px", borderRadius: "12px", background: formData.experience ? "var(--primary)" : "var(--border-color)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: formData.experience ? "pointer" : "not-allowed" }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: STUDY PREFERENCE */}
          {step === 6 && (
            <div className="animate-fade-in mt-6">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "24px" }}>
                What would you like to focus on?
              </h2>
              <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
                {["Mock Tests", "Practice Tests", "Flashcards", "Previous Questions"].map(pref => {
                  const isSelected = formData.preferences.includes(pref) || formData.preferences.includes("All of these");
                  return (
                    <button
                      key={pref}
                      onClick={() => togglePreference(pref)}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: `2px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`,
                        background: isSelected ? "rgba(138, 85, 252, 0.05)" : "var(--bg-body)",
                        color: "var(--text-primary)",
                        fontWeight: isSelected ? "600" : "400",
                        textAlign: "left",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <span>{pref}</span>
                      {isSelected && <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--primary)" }} />}
                    </button>
                  );
                })}
                <button
                  onClick={() => setFormData(prev => ({ ...prev, preferences: ["All of these"] }))}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: `2px solid ${formData.preferences.includes("All of these") ? "var(--primary)" : "var(--border-color)"}`,
                    background: formData.preferences.includes("All of these") ? "rgba(138, 85, 252, 0.05)" : "var(--bg-body)",
                    color: "var(--text-primary)",
                    fontWeight: formData.preferences.includes("All of these") ? "600" : "400",
                    textAlign: "center",
                    cursor: "pointer"
                  }}
                >
                  All of these
                </button>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={prevStep} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}><ArrowLeft size={20} /></button>
                <button 
                  onClick={nextStep}
                  disabled={formData.preferences.length === 0}
                  style={{ flex: 1, padding: "16px", borderRadius: "12px", background: formData.preferences.length > 0 ? "var(--primary)" : "var(--border-color)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: formData.preferences.length > 0 ? "pointer" : "not-allowed" }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: COMPLETE */}
          {step === 7 && (
            <div className="animate-fade-in mt-6">
              <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px" }}>
                You're all set, <span style={{ color: "var(--primary)" }}>{formData.name.split(" ")[0]}</span>! 🎉
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.5", marginBottom: "16px" }}>
                Your PrepMark journey starts here.
              </p>
              
              {formData.examId && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(138, 85, 252, 0.1)", color: "var(--primary)", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", marginBottom: "32px" }}>
                  <Target size={16} /> Preparing for: {formData.examId === "other" ? "Your Exam" : (examSeries.find(e => e._id === formData.examId)?.title || "Your Exam")}
                </div>
              )}

              <button 
                onClick={finishOnboarding}
                disabled={loading}
                style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "var(--primary)", color: "white", fontWeight: "600", fontSize: "16px", border: "none", cursor: loading ? "wait" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              >
                {loading ? "Saving..." : (!user ? "Create Account" : "Go to Dashboard")}
                {!loading && <ArrowRight size={20} />}
              </button>
            </div>
          )}

        </div>
      </div>
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
