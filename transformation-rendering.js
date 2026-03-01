// assets/graph/transformation-rendering.js
import { renderState } from './render-state.js';

/**
 * Rendering layer wrapper.
 * Executes a transformation and then renders.
 *
 * Prototype version:
 * - Assumes stateChanged = true
 * - Hard-codes preserveView = false
 *
 * @param {Function} transformation - function to execute
 * @param {Array} args - arguments for transformation
 * @param {HTMLElement} container - graph container
 */
export async function applyTransformationAndRender(transformation, args, container) {
    try {
        // Execute transformation (state mutation only)
        await transformation(...args);

        // Always re-render, do NOT preserve view (prototype safety)
        await renderState(container, null, false);

    } catch (err) {
        console.error('Transformation failed:', err);
    }
}