import React from "react";
import Timer from "./Timer";

function CandidatePanel({ timeLeft }) {
  return (
    <div className="candidate-panel">
      <h3>Candidate Panel</h3>
      <div className="candidate-info">
        <img src="https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDI1LTA2L3Jhd3BpeGVsb2ZmaWNlN19waG90b19vZl95b3VuZ19pbmRpYW5fc3R1ZGVudF9naXJsX190b3VjaGluZ19vcl9lZDM4YjI0Yi02NjI2LTRiMDgtYjJhNS1kNGI2ZjdkM2Q5NmRfMS5qcGc.jpg" alt="profile" />
        <div>
          <h4>Diya Nathwani</h4>
          <p>BPSC TEST 5</p>
        </div>
      </div>

      <Timer timeLeft={timeLeft} />

      <div className="status-list">
        <p><span className="status-dot answered"></span> Answered</p>
        <p><span className="status-dot not-answered"></span> Not Answered</p>
        <p><span className="status-dot not-visited"></span> Not Visited</p>
        <p><span className="status-dot review"></span> Review</p>
      </div>
    </div>
  );
}

export default CandidatePanel;