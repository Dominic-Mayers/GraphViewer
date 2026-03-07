// assets/graph/transformation-rendering.js
//
// Orchestrates: run a transformation (state mutation) → render pipeline.
// Transformations must NOT render themselves; they only mutate graph-state.
//
// Policy remains here (e.g., preserveView).

import { renderState } from "./render-state.js";

/**
 * Execute a transformation and then render.
 *
 * @param {Function} transformationFn - may be sync or async; must mutate graph-state
 * @param {Array} args - arguments to pass to the transformationFn
 * @param {HTMLElement} container
 * @param {Object} [options]
 * @param {boolean} [options.preserveView=false]
 */
export async function applyTransformationAndRender(
  transformationFn,
  args = [],
  container,
  { preserveView = false } = {}
) {
  console.log("apply transformation and render"); 
  if (!container) throw new Error("applyTransformationAndRender: container is required");
  if (typeof transformationFn !== "function") {
    throw new Error("applyTransformationAndRender: transformationFn must be a function");
  }

  // 1) Mutate state
  await transformationFn(...args);

  // 2) Render from current graph-state
  console.log('Before renderState');
  await renderState(container, null, preserveView);
  console.log('After renderState');
}