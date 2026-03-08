// assets/graph/graph-app.js

import { initializeGraphFromDOM } from "./initialize-from-html.js";
import { renderState } from "./render-state.js";
import { initUndoManager } from "./undo-manager-config.js";

const container = document.getElementById("graph-container");

if (!container) {
    console.error("Graph container not found");
} else {
    (async () => {
        try {
            initializeGraphFromDOM();
            await renderState(container);
            initUndoManager(container);
        } catch (err) {
            console.error("Failed to initialize graph:", err);
        }
    })();
}