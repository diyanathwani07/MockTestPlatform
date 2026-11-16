import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import StudentLibraryOverview from "../components/library/StudentLibraryOverview";
import StudentFolderView from "../components/library/StudentFolderView";
import StudentResourceViewerModal from "../components/library/StudentResourceViewerModal";
import LockedResourceModal from "../components/library/LockedResourceModal";
import "../css/StudentDashboard.css";
import "../css/StudentLibrary.css";

export default function StudentLibrary() {
  const { folderId, examSeriesId } = useParams();
  const navigate = useNavigate();

  const [browseData, setBrowseData] = useState({
    globalTree: [],
    examTrees: [],
    enrolledExams: []
  });
  const [loadingBrowse, setLoadingBrowse] = useState(true);

  // Modal States
  const [viewerResource, setViewerResource] = useState(null);
  const [lockedResource, setLockedResource] = useState(null);

  // Fetch initial library browse data
  useEffect(() => {
    let isMounted = true;
    const fetchBrowse = async () => {
      setLoadingBrowse(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/library/folders/browse`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (isMounted) {
          setBrowseData({
            globalTree: res.data.globalTree || [],
            examTrees: res.data.examTrees || [],
            enrolledExams: res.data.enrolledExams || []
          });
        }
      } catch (err) {
        console.error("Failed to load student library browse data:", err);
      } finally {
        if (isMounted) setLoadingBrowse(false);
      }
    };

    fetchBrowse();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Find exam series title for locked modal context
  const currentExamInfo = browseData.enrolledExams.find(
    (e) => e._id.toString() === examSeriesId
  );

  return (
    <div className="sd-layout student-library-page">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Study Library" />

        <div className="sd-content" style={{ paddingTop: "20px" }}>
          <div className="sl-content-container">
            {folderId ? (
              /* Drilldown into specific Folder (Unlimited Nesting) */
              <StudentFolderView
                folderId={folderId}
                onNavigateFolder={(id) => navigate(`/dashboard/library/folder/${id}`)}
                onBackToLibrary={() => navigate("/dashboard/library")}
                onOpenResource={(res) => setViewerResource(res)}
                onLockedClick={(res) => setLockedResource(res)}
              />
            ) : examSeriesId ? (
              /* Exam Series Folder Root List */
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <button
                    onClick={() => navigate("/dashboard/library")}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "transparent",
                      border: "1px solid var(--border-color, #E2E8F0)",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                    title="Back to Study Library"
                  >
                    ←
                  </button>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>
                      {currentExamInfo?.title || "Exam"} Study Materials
                    </h2>
                    <p style={{ margin: "2px 0 0 0", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                      Select a study folder to access subject notes and mock papers.
                    </p>
                  </div>
                </div>

                {/* Show Folders for this Exam Series */}
                {(() => {
                  const matchingTree = browseData.examTrees.find(
                    (t) => t.examSeriesId?.toString() === examSeriesId
                  );
                  const folders = matchingTree?.tree || [];

                  if (folders.length === 0) {
                    return (
                      <div className="sl-empty-state">
                        <h4 className="sl-empty-title">No Study Materials Added Yet</h4>
                        <p className="sl-empty-desc">
                          The study materials for this exam series are being prepared and will be published soon.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="sl-folders-grid">
                      {folders.map((f) => (
                        <div
                          key={f._id}
                          className="sl-folder-card"
                          onClick={() => navigate(`/dashboard/library/folder/${f._id}`)}
                        >
                          <div className="sl-folder-card-top">
                            <div
                              className="sl-folder-icon-pill"
                              style={{
                                backgroundColor: f.color ? `${f.color}20` : "rgba(139, 92, 246, 0.12)",
                                color: f.color || "#8B5CF6"
                              }}
                            >
                              📁
                            </div>
                            <span className="sl-tier-badge tier-enrolled">Exam Material</span>
                          </div>
                          <div>
                            <h4 className="sl-folder-name">{f.name}</h4>
                            <p className="sl-folder-desc">{f.description || "Course study materials and revision notes."}</p>
                          </div>
                          <div className="sl-folder-card-footer">
                            <span>Browse Materials</span>
                            <span>→</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Overview Home Page */
              <StudentLibraryOverview
                globalTree={browseData.globalTree}
                examTrees={browseData.examTrees}
                enrolledExams={browseData.enrolledExams}
                loading={loadingBrowse}
                onSelectFolder={(id) => navigate(`/dashboard/library/folder/${id}`)}
                onSelectExam={(id) => navigate(`/dashboard/library/exam/${id}`)}
                onOpenResource={(res) => setViewerResource(res)}
                onLockedClick={(res) => setLockedResource(res)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Resource Viewer Modal ── */}
      {viewerResource && (
        <StudentResourceViewerModal
          isOpen={!!viewerResource}
          onClose={() => setViewerResource(null)}
          resourceId={viewerResource._id}
          initialResource={viewerResource}
        />
      )}

      {/* ── Locked Explainer Modal ── */}
      {lockedResource && (
        <LockedResourceModal
          isOpen={!!lockedResource}
          onClose={() => setLockedResource(null)}
          resource={lockedResource}
          examSeriesTitle={currentExamInfo?.title}
        />
      )}
    </div>
  );
}
