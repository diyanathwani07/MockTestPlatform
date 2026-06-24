import React from "react";

function Timer({ timeLeft }) {
  const formatTime = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")} : ${m.toString().padStart(2, "0")} : ${s.toString().padStart(2, "0")}`;
  };

  return <div className="timer">⏱ {formatTime(timeLeft)}</div>;
}

export default Timer;
