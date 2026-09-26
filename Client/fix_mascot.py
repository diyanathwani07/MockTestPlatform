with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/PrepMarkMascot.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = '''import React from "react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const PrepMarkMascot = ({ state = "welcome", size = 120 }) => {
  // We are waiting for the actual .lottie file from the user.
  // Replace this placeholder URL once the file is uploaded to Supabase or the public folder.
  const lottieUrl =
    "https://lottie.host/80e9bdbe-b84f-4d92-bf30-5891d4e0e68d/GgVqLw2D4Y.lottie"; // Temporary placeholder

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
'''

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/PrepMarkMascot.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
