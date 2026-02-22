// assets/graph/state2dot.js
// Converts graph state (nodes + adjacency map) to DOT

import { getGraphState } from './graph-state.js';

export function state2dot(stateParam = null) {
    const state = stateParam || getGraphState();

    if (!state || !state.nodes) {
        return 'digraph G {}';
    }

    let dot = 'digraph G {';

    // ---- Nodes ----
    const fontName = "Courier-Bold";  
    const fallback = "sans-serif";
    const weight = "normal"; 
    const fontSizePt = 14;
    
    //In dot, if you want bold for Courier, use Courier-Bold.
    const dotFontName = (fontName === "Courier" && weight === "bold") 
    ? "Courier-Bold" 
    : fontName;
    
    for (const nodeId in state.nodes) {
        const node = state.nodes[nodeId];
        const attr = node.attributes || {};

        const id = nodeId || attr.nodeId;
        const innerLabel = attr.innerLabel || '';
        const tEx = attr.timeExclusive ?? '';
        const tIn = attr.timeInclusive ?? '';

        // `${id}: ${innerLabel}(${tEx}, ${tIn})`;
        const label = `${id}: ${innerLabel}(${tEx}, ${tIn})`;
        const width = getGraphvizNodeWidth(label, weight, fontSizePt, fontName, fallback); 
        dot += `"${id}" [ id="${id}"  shape="rect" style="${weight}, filled" fixedsize=true width="${width}" `;  
        dot += `label="${escapeLabel(label)}" fontname="${dotFontName}" fontsize=${fontSizePt} margin=0];`;
    }

    // ---- Edges ----
    if (state.adjacency) {
        for (const sourceId in state.adjacency) {
            const targets = state.adjacency[sourceId];

            for (const targetId in targets) {
                const arrow = targets[targetId];
                const calls = arrow.calls ?? '';

                dot += `"${sourceId}" -> "${targetId}"`;
                if (calls !== '') {
                    dot += `[label=" ${calls}"]`;
                }
                dot += ';';
            }
        }
    }

    dot += '}';

    return dot;
}

// Escape quotes and backslashes for DOT labels
function escapeLabel(text) {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

/**
 * Universal Node Width for hpcc-js/wasm (96 DPI Standard)
 * @param {string} label - The text content.
 * @param {string} weight - Explicit weight ("bold", "normal", "700").
 * @param {number} fontSizePt - Font size in points.
 * @param {string} fontName - The primary font family (e.g., "Courier-Bold", "Arial").
 * @param {string} fallback - The generic CSS fallback ("monospace", "sans-serif", "serif").
 */
function getGraphvizNodeWidth(label, weight = "bold", fontSizePt = 14, fontName = "Courier-Bold",  fallback = "monospace") {
  const canvas = getGraphvizNodeWidth.canvas || (getGraphvizNodeWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  
  // 1. Determine the actual intent
  // We use the explicit weight, but if fontName implies bold and weight is normal,
  // we treat it as an intentional bold request.
  const isBoldIntent = weight === "bold" || /bold/i.test(fontName);
  const activeWeight = isBoldIntent ? "bold" : weight;

  // 2. Clean the family name for the browser (removes -Bold if present)
  const family = fontName.replace(/-Bold/i, "");

  // 3. Set the context font (e.g., "bold 14pt Courier, monospace")
  context.font = `${activeWeight} ${fontSizePt}pt "${family}", ${fallback}`;
  
  const pixelWidth = context.measureText(label).width;
  
  // 4. Return width in inches (96 DPI with 20px safety buffer)
  return (pixelWidth + 20) / 96;
}
