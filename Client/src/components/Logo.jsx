import React from 'react';

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
      <img src="/logo.svg" alt="Logo" style={{ height: current.imgHeight, width: 'auto', display: 'block' }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: '1.1' }}>
        <span style={{ 
          color: '#8b5cf6', 
          fontWeight: 800, 
          fontSize: current.topSize, 
          letterSpacing: '1px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          TEACHING
        </span>
        <span style={{ 
          color: '#fbbf24', 
          fontWeight: 700, 
          fontSize: current.bottomSize,
          fontFamily: 'system-ui, sans-serif'
        }}>
          परीक्षा
        </span>
      </div>
    </div>
  );
};

export default Logo;
