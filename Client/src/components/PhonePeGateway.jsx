import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/PhonePeGateway.css";

/* ─── Fake transaction ID generator ─── */
const genTxnId = () =>
  "T" + Date.now().toString().slice(-10) + Math.random().toString(36).slice(2, 6).toUpperCase();

/* ─── PhonePe SVG Logo (inline so no external dependency) ─── */
const PhonePeLogo = () => (
  <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="#5f259f" />
    <path
      d="M65 28H47C38.7 28 32 34.7 32 43v14c0 8.3 6.7 15 15 15h4v10l14-10H65c8.3 0 15-6.7 15-15V43c0-8.3-6.7-15-15-15z"
      fill="white"
    />
    <circle cx="50" cy="50" r="8" fill="#5f259f" />
    <circle cx="50" cy="50" r="4" fill="white" />
  </svg>
);

/* ─── Fake QR Code SVG ─── */
const FakeQR = () => (
  <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <rect width="140" height="140" fill="white" />
    {/* Corner squares */}
    <rect x="10" y="10" width="35" height="35" fill="#5f259f" rx="4" />
    <rect x="17" y="17" width="21" height="21" fill="white" rx="2" />
    <rect x="22" y="22" width="11" height="11" fill="#5f259f" rx="1" />
    <rect x="95" y="10" width="35" height="35" fill="#5f259f" rx="4" />
    <rect x="102" y="17" width="21" height="21" fill="white" rx="2" />
    <rect x="107" y="22" width="11" height="11" fill="#5f259f" rx="1" />
    <rect x="10" y="95" width="35" height="35" fill="#5f259f" rx="4" />
    <rect x="17" y="102" width="21" height="21" fill="white" rx="2" />
    <rect x="22" y="107" width="11" height="11" fill="#5f259f" rx="1" />
    {/* Data dots */}
    {[55,60,65,70,75,80,85].map((x, i) =>
      [55,60,65,70,75,80,85].map((y, j) =>
        (i + j) % 3 !== 0 ? <rect key={`${i}-${j}`} x={x} y={y} width="4" height="4" fill="#5f259f" rx="0.5" /> : null
      )
    )}
    {[10,15,20,25,30].map((x, i) =>
      [55,60,65,70].map((y, j) =>
        (i * j) % 2 === 0 ? <rect key={`l${i}-${j}`} x={x} y={y} width="4" height="4" fill="#5f259f" rx="0.5" /> : null
      )
    )}
    {[95,100,105,110,115,120,125].map((x, i) =>
      [55,60,65,70].map((y, j) =>
        (i + j) % 2 === 0 ? <rect key={`r${i}-${j}`} x={x} y={y} width="4" height="4" fill="#5f259f" rx="0.5" /> : null
      )
    )}
    {[55,60,65,70].map((x, i) =>
      [10,15,20,25,30,35,40].map((y, j) =>
        (i * 2 + j) % 3 !== 1 ? <rect key={`t${i}-${j}`} x={x} y={y} width="4" height="4" fill="#5f259f" rx="0.5" /> : null
      )
    )}
    {[55,60,65,70].map((x, i) =>
      [100,105,110,115,120,125].map((y, j) =>
        (i + j * 2) % 3 !== 2 ? <rect key={`b${i}-${j}`} x={x} y={y} width="4" height="4" fill="#5f259f" rx="0.5" /> : null
      )
    )}
  </svg>
);

/* ─── Tick animation ─── */
const AnimatedTick = () => (
  <div className="pp-tick-circle">
    <svg viewBox="0 0 52 52" className="pp-checkmark">
      <circle className="pp-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
      <path className="pp-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
  </div>
);

/* ─── UPI Apps list ─── */
const UPI_APPS = [
  { name: "PhonePe", color: "#5f259f", icon: "₱" },
  { name: "Google Pay", color: "#4285F4", icon: "G" },
  { name: "Paytm", color: "#00BAF2", icon: "P" },
  { name: "BHIM", color: "#004C8F", icon: "B" },
];

function PhonePeGateway({ quiz, amount, planMonths, onClose, onSuccess, type = "exam", planId }) {
  const [step, setStep] = useState("options"); // options | upi-id | qr | processing | success | failed
  const [selectedUpiApp, setSelectedUpiApp] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");
  const [txnId, setTxnId] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [processingMsg, setProcessingMsg] = useState("Connecting to bank...");

  const merchantName = "MockTestSeries";
  const displayAmount = `₹${amount}`;

  /* Processing messages rotation */
  useEffect(() => {
    if (step !== "processing") return;
    const msgs = [
      "Connecting to bank...",
      "Verifying UPI ID...",
      "Authenticating payment...",
      "Confirming with merchant...",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      setProcessingMsg(msgs[i]);
    }, 700);

    /* Simulate 3s processing then success */
    const timer = setTimeout(async () => {
      clearInterval(interval);
      try {
        const token = localStorage.getItem("token");
        if (type === "ai-plan") {
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/admin/ai-plans/subscribe`,
            { planId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/purchase/exam`,
            { examId: quiz?._id, planMonths: planMonths || 1 },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
        setTxnId(genTxnId());
        setStep("success");
      } catch (err) {
        console.error(err);
        setStep("failed");
      }
    }, 3000);

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [step]);

  /* Countdown after success */
  useEffect(() => {
    if (step !== "success") return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); onSuccess(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const validateAndPay = () => {
    if (!upiId.match(/^[\w.\-]{3,}@[\w]{3,}$/)) {
      setUpiError("Enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    setUpiError("");
    setStep("processing");
  };

  return (
    <div className="pp-overlay" onClick={step !== "processing" ? onClose : undefined}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="pp-header">
          <div className="pp-header-left">
            <PhonePeLogo />
            <div>
              <div className="pp-brand-name">PhonePe</div>
              <div className="pp-brand-sub">Secure Payment Gateway</div>
            </div>
          </div>
          {step !== "processing" && (
            <button className="pp-close" onClick={onClose}>✕</button>
          )}
        </div>

        {/* ── Order Summary Strip ── */}
        <div className="pp-order-strip">
          <div className="pp-order-merchant">
            <span className="pp-merchant-icon">🎓</span>
            <div>
              <div className="pp-merchant-name">{merchantName}</div>
              <div className="pp-merchant-item">{type === "ai-plan" ? "AI Subscription Plan" : quiz?.title}</div>
            </div>
          </div>
          <div className="pp-order-amount">{displayAmount}</div>
        </div>

        {/* ══════════════ STEP: OPTIONS ══════════════ */}
        {step === "options" && (
          <div className="pp-body">
            <div className="pp-section-title">Choose Payment Method</div>

            {/* UPI Apps */}
            <div className="pp-upi-apps-label">UPI Apps</div>
            <div className="pp-upi-apps-grid">
              {UPI_APPS.map(app => (
                <button
                  key={app.name}
                  className={`pp-upi-app-btn ${selectedUpiApp === app.name ? "pp-upi-app-selected" : ""}`}
                  onClick={() => setSelectedUpiApp(app.name)}
                >
                  <div className="pp-app-icon" style={{ background: app.color }}>{app.icon}</div>
                  <span className="pp-app-name">{app.name}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="pp-divider"><span>OR</span></div>

            {/* Other options */}
            <div className="pp-other-methods">
              <button className="pp-method-row" onClick={() => setStep("upi-id")}>
                <span className="pp-method-icon">📱</span>
                <div className="pp-method-text">
                  <div className="pp-method-name">Enter UPI ID</div>
                  <div className="pp-method-sub">Pay using any UPI ID</div>
                </div>
                <span className="pp-chevron">›</span>
              </button>
              <button className="pp-method-row" onClick={() => setStep("qr")}>
                <span className="pp-method-icon">⬛</span>
                <div className="pp-method-text">
                  <div className="pp-method-name">Scan QR Code</div>
                  <div className="pp-method-sub">Use any UPI scanner</div>
                </div>
                <span className="pp-chevron">›</span>
              </button>
            </div>

            <button
              className="pp-pay-btn"
              disabled={!selectedUpiApp}
              onClick={() => { if (selectedUpiApp) setStep("processing"); }}
            >
              {selectedUpiApp ? `Pay ${displayAmount} via ${selectedUpiApp}` : `Pay ${displayAmount}`}
            </button>
            <div className="pp-secure-note">🔒 256-bit encrypted · RBI compliant</div>
          </div>
        )}

        {/* ══════════════ STEP: UPI ID ══════════════ */}
        {step === "upi-id" && (
          <div className="pp-body">
            <button className="pp-back-btn" onClick={() => setStep("options")}>← Back</button>
            <div className="pp-section-title">Enter UPI ID</div>
            <div className="pp-upi-input-wrap">
              <input
                type="text"
                className={`pp-upi-input ${upiError ? "pp-input-error" : ""}`}
                placeholder="yourname@upi"
                value={upiId}
                onChange={e => { setUpiId(e.target.value); setUpiError(""); }}
                autoFocus
              />
              {upiError && <div className="pp-error-text">{upiError}</div>}
              <div className="pp-upi-hint">Example: 9876543210@ybl · name@okaxis</div>
            </div>

            <div className="pp-upi-supported">
              <div className="pp-supported-label">Supported UPI handles</div>
              <div className="pp-handles">
                {["@ybl", "@upi", "@okaxis", "@okhdfcbank", "@okicici", "@paytm"].map(h => (
                  <span key={h} className="pp-handle-chip">{h}</span>
                ))}
              </div>
            </div>

            <button className="pp-pay-btn" onClick={validateAndPay}>
              Verify & Pay {displayAmount}
            </button>
            <div className="pp-secure-note">🔒 Your UPI ID is never stored</div>
          </div>
        )}

        {/* ══════════════ STEP: QR ══════════════ */}
        {step === "qr" && (
          <div className="pp-body pp-qr-body">
            <button className="pp-back-btn" onClick={() => setStep("options")}>← Back</button>
            <div className="pp-section-title">Scan & Pay</div>
            <div className="pp-qr-wrap">
              <FakeQR />
              <div className="pp-qr-overlay-text">DEMO</div>
            </div>
            <div className="pp-qr-instructions">
              <div className="pp-qr-step"><span className="pp-qr-num">1</span> Open any UPI app</div>
              <div className="pp-qr-step"><span className="pp-qr-num">2</span> Tap Scan / Pay QR</div>
              <div className="pp-qr-step"><span className="pp-qr-num">3</span> Scan this code</div>
            </div>
            <button className="pp-pay-btn" onClick={() => setStep("processing")}>
              I've Paid — Confirm
            </button>
          </div>
        )}

        {/* ══════════════ STEP: PROCESSING ══════════════ */}
        {step === "processing" && (
          <div className="pp-body pp-processing-body">
            <div className="pp-spinner-wrap">
              <div className="pp-spinner" />
              <div className="pp-processing-amount">{displayAmount}</div>
            </div>
            <div className="pp-processing-msg">{processingMsg}</div>
            <div className="pp-processing-sub">Please do not close this window or press back</div>
            <div className="pp-processing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* ══════════════ STEP: SUCCESS ══════════════ */}
        {step === "success" && (
          <div className="pp-body pp-success-body">
            <AnimatedTick />
            <div className="pp-success-title">Payment Successful!</div>
            <div className="pp-success-amount">{displayAmount}</div>
            <div className="pp-success-to">Paid to {merchantName}</div>

            <div className="pp-txn-card">
              <div className="pp-txn-row">
                <span className="pp-txn-label">Transaction ID</span>
                <span className="pp-txn-value">{txnId}</span>
              </div>
              <div className="pp-txn-row">
                <span className="pp-txn-label">Status</span>
                <span className="pp-txn-status">Success</span>
              </div>
              <div className="pp-txn-row">
                <span className="pp-txn-label">Date & Time</span>
                <span className="pp-txn-value">
                  {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            </div>

            <div className="pp-countdown-note">
              Redirecting in {countdown}s…
            </div>
            <button className="pp-done-btn" onClick={onSuccess}>
              Continue to Exam →
            </button>
          </div>
        )}

        {/* ══════════════ STEP: FAILED ══════════════ */}
        {step === "failed" && (
          <div className="pp-body pp-failed-body">
            <div className="pp-fail-icon">✕</div>
            <div className="pp-fail-title">Payment Failed</div>
            <div className="pp-fail-sub">Something went wrong. Please try again.</div>
            <button className="pp-pay-btn" onClick={() => setStep("options")}>Try Again</button>
            <button className="pp-cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhonePeGateway;
