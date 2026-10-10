const culori = require('culori');

const oklchColors = {
  background: "oklch(.96 .02 90.24)",
  foreground: "oklch(.38 .02 64.34)",
  card: "oklch(.99 .01 87.47)",
  card_foreground: "oklch(.38 .02 64.34)",
  popover: "oklch(.99 .01 87.47)",
  popover_foreground: "oklch(.38 .02 64.34)",
  primary: "oklch(.62 .08 65.54)",
  primary_foreground: "oklch(1 0 0)",
  secondary: "oklch(.88 .03 85.57)",
  secondary_foreground: "oklch(.43 .03 64.93)",
  muted: "oklch(.92 .02 83.06)",
  muted_foreground: "oklch(.54 .04 71.17)",
  accent: "oklch(.83 .04 88.81)",
  accent_foreground: "oklch(.38 .02 64.34)",
  destructive: "oklch(.55 .14 32.91)",
  destructive_foreground: "oklch(1 0 0)",
  border: "oklch(.86 .03 84.59)",
  input: "oklch(.86 .03 84.59)",
  ring: "oklch(.62 .08 65.54)",
};

for (const [key, val] of Object.entries(oklchColors)) {
    const parts = val.replace('oklch(', '').replace(')', '').trim().split(' ');
    const l = parseFloat(parts[0]);
    const c = parseFloat(parts[1]);
    const h = parseFloat(parts[2]);
    console.log(`--${key.replace('_', '-')}: ${culori.formatHex({ mode: 'oklch', l, c, h })};`);
}
