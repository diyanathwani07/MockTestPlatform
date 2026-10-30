import React, { useState, useEffect } from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle, Target } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { SkeletonExamCard } from "@/components/ui/skeleton";
import "../css/StudentDashboard.css"; 
import "../css/Practice.css";

function StudentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          setLoading(false);
          return;
        }
        const user = JSON.parse(userStr);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id || user._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setResults(res.data);
      } catch (error) {
        console.error("Error fetching results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  // Group by Exam Name only
  const examGroups = results.reduce((acc, result) => {
    const groupKey = result.examName ? result.examName.trim() : "General Mock Tests";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(result);
    return acc;
  }, {});

  const examNames = Object.keys(examGroups);

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Results" />
        <div className="sd-content" style={{ paddingTop: '20px' }}>
          {loading ? (
            <div className="practice-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonExamCard key={i} />
              ))}
            </div>
          ) : examNames.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon" style={{ width: "120px", height: "120px", margin: "0 auto" }}>
                <DotLottieReact src="/idk.lottie" loop autoplay />
              </div>
              <h3>No Results Found</h3>
              <p>You haven't attempted any exams yet.</p>
            </div>
          ) : (
            <div className="practice-grid">
              {examNames.map((examName, index) => {
                const group = examGroups[examName];
                const count = group.length;
                
                const avgScore = group.reduce((sum, r) => sum + (r.percentage || ((r.score / (r.total || 1)) * 100)), 0) / count;
                
                return (
                  <div key={examName} className="practice-card student-result-card">
                    <h3 className="practice-quiz-title">{examName}</h3>

                    <div className="practice-meta-grid">
                      <div className="meta-item">
                        <CheckCircle size={14} />
                        <span>{count} Attempt{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="meta-item">
                        <Target size={14} />
                        <span>Avg Score: {avgScore.toFixed(0)}%</span>
                      </div>
                    </div>

                    <button 
                      className="practice-start-btn"
                      onClick={() => navigate(`/dashboard/results/${encodeURIComponent(examName)}`)}
                    >
                      <FileText size={16} />
                      View Results &gt;
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentResults;

