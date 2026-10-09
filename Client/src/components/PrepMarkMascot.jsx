import React from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const PrepMarkMascot = ({ state = "welcome", size = 120, scale = 1, lottieFile = "Bag.lottie" }) => {
  const lottieUrl = `/${lottieFile}`;

  return (
    <div
      style={{
        width: size,
        height: size,
        margin: "0 auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", height: "100%", transform: `scale(${scale})` }}>
        <DotLottieReact
          src={lottieUrl}
          loop
          autoplay
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
};

export default PrepMarkMascot;
