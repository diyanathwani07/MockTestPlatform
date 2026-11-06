import React, { useMemo } from 'react';
import katex from 'katex';

// Utility to prevent XSS in normal text
const escapeHtml = (unsafe) => {
    return (unsafe || "")
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
};

function renderMarkdownTable(tableBlock) {
  const lines = tableBlock.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return escapeHtml(tableBlock).replace(/\n/g, '<br />');

  const parseRow = (line) => {
    return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  };

  const headerCells = parseRow(lines[0]);
  const bodyRows = lines.slice(1).filter(l => !/^[\|\s\-:]+$/.test(l)).map(parseRow);

  let html = '<div class="table-responsive" style="overflow-x:auto;margin:10px 0;"><table style="width:100%;border-collapse:collapse;border:1px solid var(--border-color,#e2e8f0);font-size:13px;"><thead><tr style="background:rgba(110,63,243,0.08);">';
  headerCells.forEach(cell => {
    html += `<th style="padding:6px 10px;border:1px solid var(--border-color,#e2e8f0);font-weight:600;text-align:left;">${escapeHtml(cell)}</th>`;
  });
  html += '</tr></thead><tbody>';

  bodyRows.forEach((row, idx) => {
    const bg = idx % 2 === 1 ? 'background:rgba(0,0,0,0.02);' : '';
    html += `<tr style="${bg}">`;
    headerCells.forEach((_, cIdx) => {
      const cellVal = row[cIdx] || '';
      html += `<td style="padding:6px 10px;border:1px solid var(--border-color,#e2e8f0);">${escapeHtml(cellVal)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function renderTextWithImages(text) {
  const imgRegex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+|https?:\/\/[^)]+)\)/g;
  let lastIdx = 0;
  let out = "";
  let match;

  while ((match = imgRegex.exec(text)) !== null) {
    const pre = text.substring(lastIdx, match.index);
    out += escapeHtml(pre).replace(/\n/g, '<br />');
    const alt = escapeHtml(match[1] || "Diagram");
    const src = match[2];
    out += `<div style="margin:12px 0;text-align:center;"><img src="${src}" alt="${alt}" style="max-width:100%;max-height:400px;border-radius:8px;border:1px solid var(--border-color,#e2e8f0);display:inline-block;object-fit:contain;" /></div>`;
    lastIdx = imgRegex.lastIndex;
  }

  out += escapeHtml(text.substring(lastIdx)).replace(/\n/g, '<br />');
  return out;
}

function renderTextWithTablesAndImages(text) {
  if (!text) return "";

  const tableRegex = /(?:^|\n\n)(\|[^\n]+\|\n\|[\s\-:|]+\|\n(?:\|[^\n]+\|(?:\n|$))+)/g;
  let lastIdx = 0;
  let out = "";
  let match;

  while ((match = tableRegex.exec(text)) !== null) {
    const preText = text.substring(lastIdx, match.index);
    out += renderTextWithImages(preText);
    out += renderMarkdownTable(match[1]);
    lastIdx = tableRegex.lastIndex;
  }

  out += renderTextWithImages(text.substring(lastIdx));
  return out;
}

// Utility to clean raw HTML entity artifacts such as &nbsp; or non-breaking spaces
const cleanText = (str) => {
  if (!str || typeof str !== 'string') return str || "";
  return str
    .replace(/&nbsp;?/gi, ' ')
    .replace(/&#160;?/g, ' ')
    .replace(/&thinsp;?/gi, ' ')
    .replace(/&ensp;?/gi, ' ')
    .replace(/&emsp;?/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/&amp;/gi, '&');
};

const MathRenderer = ({ text }) => {
  const html = useMemo(() => {
    if (!text) return "";
    if (typeof text !== 'string') return text;
    
    // Clean raw HTML entities like &nbsp; before KaTeX and Markdown parsing
    const cleaned = cleanText(text);

    // Split by $$ first for Display Math
    const displayBlocks = cleaned.split("$$");
    
    let processedHtml = "";
    
    for (let i = 0; i < displayBlocks.length; i++) {
      if (i % 2 === 1) {
        // Inside $$ ... $$
        try {
          processedHtml += katex.renderToString(displayBlocks[i], { displayMode: true, throwOnError: false });
        } catch (e) {
          processedHtml += `$$${escapeHtml(displayBlocks[i])}$$`;
        }
      } else {
        // Normal text, potentially containing inline Math $ ... $
        const inlineBlocks = displayBlocks[i].split("$");
        for (let j = 0; j < inlineBlocks.length; j++) {
          if (j % 2 === 1) {
             // Inside $ ... $
             try {
                processedHtml += katex.renderToString(inlineBlocks[j], { displayMode: false, throwOnError: false });
             } catch (e) {
                processedHtml += `$${escapeHtml(inlineBlocks[j])}$`;
             }
          } else {
             // Normal text with table and image support
             processedHtml += renderTextWithTablesAndImages(inlineBlocks[j]);
          }
        }
      }
    }
    return processedHtml;
  }, [text]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MathRenderer;
