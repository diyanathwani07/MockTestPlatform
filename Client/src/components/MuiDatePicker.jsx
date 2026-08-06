import React from 'react';
import { Calendar } from 'lucide-react';

function MuiDatePicker({ value, onChange, label = "mm-dd-yyyy" }) {
  return (
    <div 
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'var(--bg-card, #ffffff)',
        border: '2px solid var(--border-color, #ECE9F7)',
        borderRadius: '100px',
        padding: '0 14px',
        height: '38px',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      }}
      className="custom-date-picker-container"
    >
      <Calendar size={14} style={{ color: 'var(--text-secondary, #666666)', flexShrink: 0 }} />
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontSize: '12px',
          color: 'var(--text-primary, #000000)',
          fontWeight: '500',
          width: '100%',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        placeholder={label}
      />
      <style>{`
        /* Style native date picker indicators dynamically */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
        body.dark-mode input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
    </div>
  );
}

export default MuiDatePicker;
