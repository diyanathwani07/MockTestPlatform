import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';

const Logo = ({ size = "normal" }) => {
  const styles = {
    normal: {
      imgHeight: '32px',
      gap: '8px',
      topSize: '14px',
      bottomSize: '15px',
    },
    large: {
      imgHeight: '48px',
      gap: '12px',
      topSize: '20px',
      bottomSize: '22px',
    }
  };

  const current = styles[size] || styles.normal;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: current.gap, userSelect: 'none' }}>
      <>
        <GraduationCap 
          color="#fbbf24" 
          size={size === "large" ? 48 : 32} 
        />
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', lineHeight: '1.1' }}>
          <span style={{ 
            color: '#ffffff', 
            fontWeight: 800, 
            fontSize: current.topSize, 
            letterSpacing: '0.5px',
            fontFamily: 'system-ui, sans-serif'
          }}>
            Prep
          </span>
          <span style={{ 
            color: '#fbbf24', 
            fontWeight: 700, 
            fontSize: current.topSize,
            fontFamily: 'system-ui, sans-serif'
          }}>
            Mark
          </span>
        </div>
      </>
    </div>
  );
};

export default Logo;
