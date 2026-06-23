import React from "react";

function Timer({ timeLeft }) {
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="timer-box-panel">
      <h3>Time Left</h3>
      <div className="timer-display">
        <div className="timer">
          {String(hours).padStart(2, "0")} : {String(minutes).padStart(2, "0")} : {String(seconds).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

export default Timer;