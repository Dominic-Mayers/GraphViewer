// assets/graph/pan-zoom.js
import svgPanZoom from 'svg-pan-zoom';

export function initPanZoom(container) {
    const svg = container.querySelector('svg');
    if (!svg) {
        console.warn('PanZoom: SVG not found');
        return null;
    }

    return svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: false
    });
}