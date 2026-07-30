import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, X, Play, Clock, FileText } from "lucide-react";
import axios from "axios";
import PhonePeGateway from "./PhonePeGateway";
import "../css/QuizDetailsModal.css";

function QuizDetailsModal({ quiz, onClose, attemptedCount = 0 }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currency, setCurrency] = useState("INR");
  const [showGateway, setShowGateway] = useState(false);

  const plans = quiz.plans && quiz.plans.length > 0 
    ? quiz.plans 
    : [{ durationMonths: 1, price: quiz.price || 99, discountLabel: "90% off" }];

  // Select default plan (e.g. 1st plan)
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      setSelectedPlan(plans[0]);
    }
  }, [plans, selectedPlan]);

  const handleOpenGateway = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to purchase exams.");
      return;
    }
    setShowGateway(true);
  };

  const handlePaymentSuccess = () => {
    setShowGateway(false);
    window.location.reload();
  };

  const displayPrice = currency === "USD" 
    ? `$${((selectedPlan?.price || quiz.price || 99) / 83).toFixed(2)}`
    : `₹${selectedPlan?.price || quiz.price || 99}`;

  const originalPrice = currency === "USD"
    ? `$${(((selectedPlan?.price || quiz.price || 99) * 10) / 83).toFixed(2)}`
    : `₹${Math.round((selectedPlan?.price || quiz.price || 99) * 10)}`;

  return (
    <>
    <div className="qdm-overlay" onClick={onClose}>
      <div className="qdm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Title */}
        <div className="qdm-header">
          <div>
            <span className="qdm-badge">Premium Mock Series</span>
            <h3 className="qdm-title">{quiz.title}</h3>
          </div>
          <button onClick={onClose} className="qdm-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Tab Row */}
        <div className="qdm-tabs">
          {["Overview", "Content"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`qdm-tab ${activeTab === tab ? "qdm-tab-active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Body Grid */}
        <div className="qdm-body">
          {/* Left panel info */}
          <div className="qdm-left-panel">
            {activeTab === "Overview" && (
              <div className="qdm-overview-content">
                <h4 className="qdm-section-title">Description</h4>
                <div className="qdm-description">
                  {quiz.detailedDescription || `${quiz.title} is a complete mock exam practice course specially designed to help you prepare effectively, including topic-wise practice, in-depth subject coverage, and full simulated conditions.`}
                </div>

                <div className="qdm-plans-section">
                  <div className="qdm-offer-label">
                    <span className="qdm-offer-dot"></span>
                    Exclusive Launch Offer
                  </div>
                  {plans.map((p, idx) => (
                    <div key={idx} className="qdm-plan-row" onClick={() => setSelectedPlan(p)}>
                      <input 
                        type="radio" 
                        name="subPlan" 
                        checked={selectedPlan?.durationMonths === p.durationMonths}
                        onChange={() => setSelectedPlan(p)}
                        className="qdm-radio"
                      />
                      <span>{p.durationMonths} Month{p.durationMonths > 1 ? 's' : ''} — <strong>₹{p.price}</strong></span>
                    </div>
                  ))}
                </div>

                <div className="qdm-note-box">
                  <div className="qdm-note-title">🔴 Note:</div>
                  <div className="qdm-note-text">Available only for registered student accounts. Ensure safe network conditions before starting attempt.</div>
                </div>

                <div className="qdm-refund-notice">
                  <AlertTriangle size={14} className="qdm-warning-icon" />
                  <span>Note: No Refund Policy</span>
                </div>
              </div>
            )}

            {activeTab === "Content" && (
              <div className="qdm-content-tab">
                <h4 className="qdm-section-title">Exam Content Overview</h4>
                <div className="qdm-content-items">
                  <div className="qdm-content-item">
                    <FileText size={15} className="qdm-content-icon" />
                    <span>Multiple assessment sections and real-time marking keys.</span>
                  </div>
                  <div className="qdm-content-item">
                    <Clock size={15} className="qdm-content-icon" />
                    <span>Duration configuration: {Math.round(quiz.duration / 60)} minutes total.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel buy trigger */}
          <div className="qdm-right-panel">
            {/* Plan selector header */}
            <div className="qdm-price-section">
              <div className="qdm-price-row">
                <div>
                  <span className="qdm-price-label">PRICE</span>
                  <div className="qdm-price-values">
                    <span className="qdm-current-price">{displayPrice}</span>
                    <span className="qdm-original-price">{originalPrice}</span>
                  </div>
                </div>
                {selectedPlan?.discountLabel && (
                  <span className="qdm-discount-badge">{selectedPlan.discountLabel}</span>
                )}
              </div>

              <div className="qdm-currency-selector">
                <label className="qdm-currency-label">Choose Currency:</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  className="qdm-currency-select"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD (PayPal/Stripe)</option>
                </select>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="qdm-actions">
              <div className="qdm-secured-text">
                Secured Checkout. 100% encrypted gateway.
              </div>
              <button
                onClick={handleOpenGateway}
                className="qdm-buy-btn"
              >
                Buy Now — {displayPrice}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showGateway && (
      <PhonePeGateway
        quiz={quiz}
        amount={selectedPlan?.price || quiz.price || 99}
        planMonths={selectedPlan?.durationMonths || 1}
        onClose={() => setShowGateway(false)}
        onSuccess={handlePaymentSuccess}
      />
    )}
  </>
  );
}

export default QuizDetailsModal;
