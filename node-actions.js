// assets/graph/node-actions.js
import { expandGroup, collapseGroup } from "./transformations-api.js";
import { restrictToReachableWithUndo } from "./transformations-with-undo.js";
import { applyTransformationAndRender } from "./transformation-rendering.js";

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
      text: "Expand group",
      action: () =>
        applyTransformationAndRender(expandGroup, [nodeId], container, { preserveView: false })
    });
  }

  if (node.groupId) {
    items.push({
      text: "Collapse group",
      action: () =>
        applyTransformationAndRender(collapseGroup, [nodeId], container, { preserveView: false })
    });
  }

  items.push({
    text: "Restrict to reachable",
    action: () =>
      applyTransformationAndRender(restrictToReachableWithUndo, [nodeId], container, { preserveView: false })
  });

  return items;
}