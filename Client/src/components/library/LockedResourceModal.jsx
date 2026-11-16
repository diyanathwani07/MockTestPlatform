import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Crown, ShieldAlert, X, ArrowRight } from "lucide-react";

export default function LockedResourceModal({ isOpen, onClose, resource, examSeriesTitle }) {
  const navigate = useNavigate();

  if (!isOpen || !resource) return null;

  const isPremiumLocked = resource.accessTier === "premium_subscriber";
  const isExamLocked = resource.accessTier === "exam_enrolled";

  const handleAction = () => {
    onClose();
    if (isPremiumLocked) {
      navigate("/dashboard/pricing");
    } else {
      navigate("/dashboard/exams");
    }
  };

  return (
    <div className="sl-modal-overlay" onClick={onClose}>
      <div 
        className="sl-modal-card sl-locked-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sl-modal-close-btn" style={{ position: "absolute", top: "16px", right: "16px" }} onClick={onClose}>
          <X size={18} />
        </button>

        <div className="sl-locked-icon-halo">
          {isPremiumLocked ? <Crown size={32} /> : <Lock size={32} />}
        </div>

        <h3 className="sl-locked-title">
          {isPremiumLocked ? "Premium Study Material" : "Exam Enrollment Required"}
        </h3>

        <p className="sl-locked-desc">
          {isPremiumLocked ? (
            <>
              <strong>"{resource.title}"</strong> is exclusive to PrepMark Premium members. 
              Upgrade your subscription to get unlimited access to all curated notes, formula sheets, and past question breakdowns.
            </>
          ) : (
            <>
              <strong>"{resource.title}"</strong> is part of the 
              {examSeriesTitle ? ` "${examSeriesTitle}"` : " exam"} study bundle. 
              Enroll in this exam series to unlock its entire library of study resources.
            </>
          )}
        </p>

        <div className="sl-locked-actions-row">
          <button className="sl-btn-cancel" onClick={onClose}>
            Maybe Later
          </button>
          <button className="sl-btn-upgrade" onClick={handleAction}>
            <span>{isPremiumLocked ? "View Premium Plans" : "Explore Exams"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
