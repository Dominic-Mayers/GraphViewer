// assets/graph/popup-menu.js
import { ctxmenu } from "ctxmenu";
import { getNodeMenuItems } from './node-actions.js';
import { getGraphState } from './graph-state.js';

/**
 * Initialize the context menu for nodes in the SVG graph.
 * @param {HTMLElement} containerDiv - The container holding the SVG
 */
export function initPopupMenu(containerDiv) {
    const svg = containerDiv.querySelector('svg');
    if (!svg) {
        console.warn('PopupMenu: SVG not found');
        return;
    }

    svg.addEventListener('contextmenu', event => {
        event.preventDefault();
        event.stopPropagation();

        let target = event.target instanceof Element ? event.target : event.parentElement;
        if (!target) return;

        // Find the node element (rect, g, etc.)
        const nodeElement = target.closest('.node');
        if (!nodeElement) return;

        const nodeId = nodeElement.id;
        const state = getGraphState();
        const node = state.nodes[nodeId];
        if (!node) return;

        // Use getNodeMenuItems to dynamically get menu actions
        const menuDef = getNodeMenuItems(node, nodeId, containerDiv);

        // Show the menu
        ctxmenu.show(menuDef, event);
    });
}