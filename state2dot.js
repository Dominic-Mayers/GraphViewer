// state2dot.js
// Converts graph state (nodes + adjacency map) to DOT

import { getGraphState } from './graph-state.js';

export function state2dot(stateParam = null) {
    const state = stateParam || getGraphState();

    if (!state || !state.nodes) {
        return 'digraph G {}';
    }

    let dot = 'digraph G {';
    dot += 'node [shape=box];';

    // ---- Nodes ----
    for (const nodeId in state.nodes) {
        const node = state.nodes[nodeId];
        const attr = node.attributes || {};

        const id = attr.nodeId || nodeId;
        const innerLabel = attr.innerLabel || '';
        const tEx = attr.timeExclusive ?? '';
        const tIn = attr.timeInclusive ?? '';

        const label = `${id}: ${innerLabel}(${tEx}, ${tIn})`;

        dot += `"${id}" [label="${escapeLabel(label)}"];`;
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
                    dot += ` [label="${calls}"]`;
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
