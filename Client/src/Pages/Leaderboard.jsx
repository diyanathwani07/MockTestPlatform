import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { Info, BookOpen, FileText, Calendar, Search, ChevronDown, ChevronRight, Trophy, Users, CheckCircle, Percent, User } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Leaderboard.css";

function Leaderboard() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("All Exams");
  const [searchTerm, setSearchTerm] = useState("");

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/leaderboard`);
        setResults(res.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const uniqueExams = Array.from(new Set(results.map(r => r.examName || r.quizTitle || r.subject || "Mock Test")));

  const filteredResults = results.filter(r => {
    const examMatch = selectedExam === "All Exams" || (r.examName || r.quizTitle || r.subject || "Mock Test") === selectedExam;
    const nameMatch = (r.userId?.fullName || r.userId?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return examMatch && nameMatch;
  });

  const userRankIndex = filteredResults.findIndex(r => r.userId && (r.userId._id === currentUser?.id || r.userId === currentUser?.id));
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : "-";
  const userStat = userRankIndex >= 0 ? filteredResults[userRankIndex] : null;

  const podiumRaw = filteredResults.slice(0, 3);
  const podiumData = [];
  if (podiumRaw[1]) podiumData.push({ rank: 2, name: podiumRaw[1].userId?.fullName || podiumRaw[1].userId?.name || "User", score: `${podiumRaw[1].score} / ${podiumRaw[1].total}`, avatar: podiumRaw[1].userId?.avatar || "https://i.pravatar.cc/150?img=47" });
  if (podiumRaw[0]) podiumData.push({ rank: 1, name: podiumRaw[0].userId?.fullName || podiumRaw[0].userId?.name || "User", score: `${podiumRaw[0].score} / ${podiumRaw[0].total}`, avatar: podiumRaw[0].userId?.avatar || "https://i.pravatar.cc/150?img=11" });
  if (podiumRaw[2]) podiumData.push({ rank: 3, name: podiumRaw[2].userId?.fullName || podiumRaw[2].userId?.name || "User", score: `${podiumRaw[2].score} / ${podiumRaw[2].total}`, avatar: podiumRaw[2].userId?.avatar || "https://i.pravatar.cc/150?img=12" });

  const tableData = filteredResults.slice(3).map((r, idx) => ({
    rank: idx + 4,
    name: r.userId?.fullName || r.userId?.name || "User",
    isYou: r.userId && (r.userId._id === currentUser?.id || r.userId === currentUser?.id),
    score: `${r.score} / ${r.total}`,
    accuracy: `${Math.round((r.correct / (r.correct + r.incorrect || 1)) * 100) || 0}%`,
    percentile: `${r.percentage || Math.round((r.score / r.total) * 100)}%`,
    avatar: r.userId?.avatar || `https://i.pravatar.cc/150?img=${idx + 15}`
  }));

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Leaderboard" />
        <div className="lb-container">
          
          {/* Header */}
          <div className="lb-header">
            <div className="lb-title-area">
              <h1>Leaderboard</h1>
              <p>Compete with other learners and see where you stand.</p>
            </div>
            <div className="lb-info-pill">
              <Info className="lb-info-icon" size={16} />
              Leaderboard updates every 10 minutes.
            </div>
          </div>

          {/* Filters */}
          <div className="lb-filters">
            <select className="lb-filter-select" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
              <option value="All Exams">All Exams</option>
              {uniqueExams.map((exam, i) => (
                <option key={i} value={exam}>{exam}</option>
              ))}
            </select>
            
            <div className="lb-search">
              <Search className="lb-icon" size={16} />
              <input 
                type="text" 
                placeholder="Search students" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>

          {/* Body Grid */}
          <div className="lb-body-grid">
            
            {/* Left Column */}
            <div className="lb-left-col">
              
              {/* Rank Card */}
              <div className="lb-card lb-rank-card">
                <div className="lb-card-header">
                  <div className="lb-icon-box"><Trophy size={20} /></div>
                  <h3>Your Rank</h3>
                </div>
                <h2 className="lb-rank-huge">#{userRank}</h2>
                <p className="lb-rank-msg">Great job! Keep improving. ✨</p>
                
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><FileText size={14} className="lb-icon" /> Score</div>
                  <div className="lb-stat-value purple">{userStat ? `${userStat.score} / ${userStat.total}` : "-"}</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Percent size={14} className="lb-icon" /> Percentile</div>
                  <div className="lb-stat-value purple">{userStat ? `${userStat.percentage || Math.round((userStat.score / userStat.total) * 100)}%` : "-"}</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><CheckCircle size={14} className="lb-icon" /> Accuracy</div>
                  <div className="lb-stat-value purple">{userStat ? `${Math.round((userStat.correct / (userStat.correct + userStat.incorrect || 1)) * 100) || 0}%` : "-"}</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Users size={14} className="lb-icon" /> Students</div>
                  <div className="lb-stat-value purple">{filteredResults.length}</div>
                </div>

                <button className="lb-btn-primary">
                  View My Result <ChevronRight size={16} />
                </button>
              </div>

              {/* About This Test Card */}
              <div className="lb-card lb-about-card">
                <div className="lb-card-header">
                  <div className="lb-icon-box"><FileText size={20} /></div>
                  <h3>About This Test</h3>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Info size={14} className="lb-icon" /> Total Questions</div>
                  <div className="lb-stat-value">150</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Trophy size={14} className="lb-icon" /> Total Marks</div>
                  <div className="lb-stat-value">150</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Percent size={14} className="lb-icon" /> Negative Marking</div>
                  <div className="lb-stat-value">No</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Calendar size={14} className="lb-icon" /> Duration</div>
                  <div className="lb-stat-value">150 Min</div>
                </div>
                <div className="lb-stat-row">
                  <div className="lb-stat-label"><Calendar size={14} className="lb-icon" /> Completed On</div>
                  <div className="lb-stat-value">12 May 2025</div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="lb-right-col">
              
              {/* Podium */}
              <div className="lb-podium-container">
                <div className="lb-confetti"></div>
                
                {podiumData.map((spot, index) => (
                  <div className={`lb-podium-spot lb-spot-${spot.rank}`} key={spot.rank} style={{ order: spot.rank === 1 ? 2 : spot.rank === 2 ? 1 : 3 }}>
                    {spot.rank === 1 && <Trophy className="lb-crown" size={24} fill="currentColor" />}
                    <div className="lb-podium-avatar">
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)' }}>
                        <User size={32} color="var(--text-muted)" />
                      </div>
                    </div>
                    <div className={`lb-badge ${spot.rank === 1 ? 'gold' : spot.rank === 2 ? 'silver' : 'bronze'}`}>
                      {spot.rank}
                    </div>
                    <div className="lb-podium-name">{spot.name}</div>
                    <div className="lb-podium-score">{spot.score}</div>
                    <div className="lb-pillar"></div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                    <th>Percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.rank}>
                      <td className="rank">{row.rank}</td>
                      <td className="student">
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={18} color="var(--text-muted)" />
                        </div>
                        <span className={row.isYou ? 'you' : ''}>{row.name} {row.isYou && "(You)"}</span>
                      </td>
                      <td className="score">{row.score}</td>
                      <td className="accuracy">{row.accuracy}</td>
                      <td className="percentile">{row.percentile}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="lb-view-more">
                <button>View More <ChevronDown size={14} /></button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
