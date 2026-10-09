const fs = require('fs');
let t = fs.readFileSync('Client/src/context/ThemeContext.jsx', 'utf8');

const find =     // Add new theme class (only if NOT original)
    if (theme && theme !== "original") {
      root.classList.add(\	heme-\\);
    };

const rep =     // Determine the effective theme based on the required mapping matrix
    let effectiveTheme = theme;
    
    if (theme === "original") {
      effectiveTheme = mode === "dark" ? "vercel" : "retro-arcade";
    } else if (theme === "retro-arcade" && mode === "light") {
      effectiveTheme = "original"; // Use old Original light palette
    } else if (theme === "vercel" && mode === "dark") {
      effectiveTheme = "original"; // Use old Original dark palette
    }

    // Add new theme class (only if NOT original)
    if (effectiveTheme && effectiveTheme !== "original") {
      root.classList.add(\	heme-\\);
    };

if (t.includes(find)) {
    t = t.replace(find, rep);
    fs.writeFileSync('Client/src/context/ThemeContext.jsx', t);
    console.log("Success!");
} else {
    console.log("Could not find block!");
}
