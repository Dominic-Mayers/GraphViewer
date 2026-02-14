// render-state.js
// Orchestrates rendering: graph state → DOT → SVG → DOM

import { getGraphState } from './graph-state.js';
import { state2dot } from './state2dot.js';
import { generateSVG } from './graphviz.js';
import { renderSVG } from './render-svg.js';

/**
 * Renders the graph into a container.
 * @param {HTMLElement} container - DOM element to render SVG in
 * @param {Object|null} state - optional state to render; defaults to current graph state
 */
export async function renderState(container, state = null) {
    const currentState = state || getGraphState();

    // 1. State → DOT
    const dot = state2dot(currentState);

    // 2. DOT → SVG string
    const svgString = await generateSVG(dot);

    // 3. Insert SVG into container
    renderSVG(container, svgString);
}
