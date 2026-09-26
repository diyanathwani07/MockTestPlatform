import React from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const PrepMarkMascot = ({ state = "welcome", size = 120 }) => {
  // We are waiting for the actual .lottie file from the user.
  // Replace this placeholder URL once the file is uploaded to Supabase or the public folder.
  const lottieUrl = "/mascot.lottie"; // Temporary placeholder

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
  );
};

export default PrepMarkMascot;
