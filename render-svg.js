// assets/graph/render-svg.js
import { insertSVG } from './insert-svg.js';
import { initPanZoom } from './pan-zoom.js';
import { initPopupMenu } from './popup-menu.js';

/**
 * Render SVG, initialize pan/zoom and popup menu.
 * Preserves zoom/pan if requested.
 * 
 * @param {HTMLElement} container
 * @param {string} svgString
 * @param {boolean} [preserveView=true] - whether to preserve pan/zoom
 */
export function renderSVG(container, svgString, preserveView = true) {
    let oldPan = null;
    let oldZoom = null;

    // Save old pan/zoom if needed
    if (preserveView && window.graphDebug?.panZoom) {
        const oldPanZoom = window.graphDebug.panZoom;
        oldPan = oldPanZoom.getPan();
        oldZoom = oldPanZoom.getZoom();
        oldPanZoom.destroy();
    }

    // Insert new SVG
    insertSVG(container, svgString);

    // Initialize pan/zoom
    const panZoomInstance = initPanZoom(container);

    // Restore previous zoom/pan
    if (preserveView && panZoomInstance && oldPan && oldZoom != null) {
        panZoomInstance.zoom(oldZoom);
        panZoomInstance.pan(oldPan);
    }

    // Initialize popup menu
    initPopupMenu(container);

    // Expose for debugging
    window.graphDebug = {
        container,
        panZoom: panZoomInstance
    };
}