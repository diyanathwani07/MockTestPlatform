import React, { useState } from 'react';

const Logo = ({ size = "normal" }) => {
  const [imgError, setImgError] = useState(false);

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
      {!imgError ? (
        <img 
          src="/logo.png" 
          alt="Teaching Pariksha Logo" 
          width={size === "large" ? "150" : "100"}
          height={size === "large" ? "48" : "32"}
          style={{ height: current.imgHeight, width: size === "large" ? "150px" : "100px", display: 'block' }} 
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <img 
            src="/logo.svg" 
            alt="Logo" 
            width={size === "large" ? "48" : "32"}
            height={size === "large" ? "48" : "32"}
            style={{ height: current.imgHeight, width: current.imgHeight, display: 'block' }} 
          />
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
        </>
      )}
    </div>
  );
};

export default Logo;
