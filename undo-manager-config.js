// assets/graph/undo-manager-config.js

import { applyTransformationAndRender } from "./transformation-rendering.js";
import { initUndoRedoStacks, undoHist,  redoHist } from "./undo-manager-jit-tail.js";
import { captureTailFactory } from "./transformations-with-undo.js";

/**
 * Install keyboard listeners for undo/redo.
 *
 * UI responsibility only:
 * - listen to keyboard shortcuts
 * - reuse the standard transformation + rendering orchestration
 *
 * Not exported: used only by initUndoManager().
 *
 * @param {HTMLElement} container
 */
function initUndoRedoListener(container) {
    if (!container) {
        throw new Error("initUndoRedoListener: container is required");
    }

    window.addEventListener("keydown", async (event) => {
        const key = event.key.toLowerCase();
        const ctrlOrMeta = event.ctrlKey || event.metaKey;
        const shift = event.shiftKey;

        if (!ctrlOrMeta)
            return;

        // Undo: Ctrl/Cmd + Z
        if (key === "z" && !shift) {
            event.preventDefault();
            console.log('Start Ctrl-z');
            const captureTail = await captureTailFactory();

            const cmd = undoHist({captureTail});
            if (typeof cmd !== "function") {
                return; 
            }
            await applyTransformationAndRender(
                    cmd,
                    [{captureTail}],
                    container,
                    {preserveView: false}
            );
            console.log('End Ctrl-z');
            return;
        }

        // Redo: Ctrl/Cmd + Y  OR  Ctrl/Cmd + Shift + Z
        if (key === "y" || (key === "z" && shift)) {
            event.preventDefault();
            console.log('Start Ctrl-y');
            const cmd = redoHist();
            if (typeof cmd !== "function") {
                return; 
            }
            
            await applyTransformationAndRender(
                    cmd,
                    [],
                    container,
                    {preserveView: false}
            );
            console.log('End Ctrl-y');
        }
    });
}

/**
 * Initialize undo-manager:
 * - create the initial checkpoint
 * - install keyboard listeners
 *
 * @param {HTMLElement} container
 */
export function initUndoManager(container) {
    if (!container) {
        throw new Error("initUndoManager: container is required");
    }

    initUndoRedoStacks();
    initUndoRedoListener(container);
}