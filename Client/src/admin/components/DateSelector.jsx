import React from 'react';

const DateSelector = ({ onChange }) => {
  return (
    <div className="pill-date-container">
      <span className="pill-icon">📅</span>
      <input 
        type="date" 
        className="pill-date-input"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default DateSelector;