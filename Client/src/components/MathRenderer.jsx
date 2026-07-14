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

const MathRenderer = ({ text }) => {
  const html = useMemo(() => {
    if (!text) return "";
    if (typeof text !== 'string') return text;
    
    // Split by $$ first for Display Math
    const displayBlocks = text.split("$$");
    
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
             // Normal plain text
             processedHtml += escapeHtml(inlineBlocks[j]).replace(/\n/g, '<br />');
          }
        }
      }
    }
    return processedHtml;
  }, [text]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MathRenderer;
