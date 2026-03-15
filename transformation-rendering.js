// assets/graph/transformation-rendering.js
//
// Orchestrates: run a transformation (state mutation) → render pipeline.
// Transformations must NOT render themselves; they only mutate graph-state.
//
// Policy remains here (e.g., preserveView).

import { renderState } from "./render-state.js";
import { getCurrentCommand, undoManager } from "./undo-manager-jit-tail.js"; 

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
    if (!container)
        throw new Error("applyTransformationAndRender: container is required");
    if (typeof transformationFn !== "function") {
        throw new Error("applyTransformationAndRender: transformationFn must be a function. It is ", JSON.stringify(transformationFn));
    }
    const currentCommand = getCurrentCommand();
    console.log('Before ', transformationFn.name, '(', JSON.stringify(args), '), currentCommand.redo.url =', currentCommand.redo.url );
    console.log('currentCommand?.redo?.isTail =', currentCommand?.redo?.isTail);
    console.log('transformationFn.name = ', transformationFn.name); 
    console.log('transformationFn?.isMajor = ', transformationFn?.isMajor); 
    if (currentCommand?.redo?.isTail && currentCommand.undo?.isSync ) {
        console.log('Undoing before transformation when current undo command is major and redo is tail')
        await currentCommand.undo.cmd();
        undoManager.undo();
    }

    // 1) Mutate state
    await transformationFn(...args);

    // 2) Render from current graph-state
    await renderState(container, null, preserveView);

}