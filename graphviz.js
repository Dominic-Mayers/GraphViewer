// assets/graph/graphviz.js
import { Graphviz } from "@hpcc-js/wasm"; // adjust relative path if needed

/**
 * Generate an SVG string from a DOT string using Graphviz.
 * @param {string} dot - The DOT graph definition.
 * @returns {Promise<string>} - The SVG string.
 */
export async function generateSVG(dot) {
    // Ensure Graphviz is loaded
    const graphviz = await Graphviz.load();

    // Layout the graph as SVG using the 'dot' engine
    const svgString = await graphviz.dot(dot);

    return svgString;
}
