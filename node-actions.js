// assets/graph/node-actions.js
import { expandGroup, restrictToReachable } from './transformations.js';

/**
 * Returns menu items for a given node.
 * @param {Object} node - The node object from graph state
 * @param {string} nodeId - The node's ID
 * @param {HTMLElement} container - The graph container
 */
export function getNodeMenuItems(node, nodeId, container) {
    const items = [];

    if (node.isGroup) {
        items.push({
            text: 'Expand group',
            action: () => expandGroup(nodeId, container)
        });
    }

    items.push({
        text: 'Restrict to reachable',
        action: () => restrictToReachable(nodeId, container)
    });

    // Additional node-dependent actions can be added here
    return items;
}