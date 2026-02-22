// assets/graph/render-state.js
import { getGraphState } from './graph-state.js';
import { state2dot } from './state2dot.js';
import { generateSVG } from './graphviz.js';
import { renderSVG } from './render-svg.js';

/**
 * Render the graph state into a container.
 * Part 2 compatible: no color-helper logic.
 * 
 * @param {HTMLElement} container
 * @param {Object|null} state - optional state
 * @param {boolean} [preserveView=true] - whether to keep pan/zoom
 */
export async function renderState(container, state = null, preserveView = true) {
    const currentState = state || getGraphState();

    // Convert state → DOT
    const dot = state2dot(currentState);

    // Convert DOT → SVG
    const svgString = await generateSVG(dot);

    // Render SVG with optional view preservation
    renderSVG(container, svgString, preserveView);
}