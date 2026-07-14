import React from 'react';

const MathToolbar = ({ onInsert }) => {
  const tools = [
    { label: "Fraction", latex: "\\frac{numerator}{denominator}" },
    { label: "Square Root", latex: "\\sqrt{x}" },
    { label: "Exponents", latex: "x^{2}" },
    { label: "Subscript", latex: "x_{i}" },
    { label: "Integral", latex: "\\int_{a}^{b} x dx" },
    { label: "Summation", latex: "\\sum_{i=1}^{n} x_{i}" },
    { label: "Product", latex: "\\prod_{i=1}^{n} x_{i}" },
    { label: "Limit", latex: "\\lim_{x \\to 0} f(x)" },
    { label: "Matrix", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
    { label: "Alpha (α)", latex: "\\alpha" },
    { label: "Beta (β)", latex: "\\beta" },
    { label: "Pi (π)", latex: "\\pi" },
    { label: "Infinity (∞)", latex: "\\infty" },
    { label: "Inline Math", latex: "$x$", hint: "Place text between $" },
    { label: "Display Math", latex: "$$\nx\n$$", hint: "Place text between $$" },
  ];

  return (
    <div className="math-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
      <div style={{ width: '100%', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Math Quick Insert</div>
      {tools.map(tool => (
        <button
          key={tool.label}
          type="button"
          title={tool.hint || tool.latex}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent losing focus
            const el = document.activeElement;
            if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
              document.execCommand('insertText', false, tool.latex);
            } else {
              navigator.clipboard.writeText(tool.latex);
              alert("Copied " + tool.latex + " to clipboard! Focus a text field to insert directly.");
            }
          }}
          style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.target.style.background = 'var(--bg-hover)'}
          onMouseOut={(e) => e.target.style.background = 'var(--bg-input)'}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
};

export default MathToolbar;
