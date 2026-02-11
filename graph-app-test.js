// graph-app-test.js
// Entrypoint – no exports

import { initialFromDOM } from './initialize-from-dom.js';
import { renderSVG } from './render-svg.js';

const container = document.getElementById('graph-container');


if (!container) {
    console.error('Graph container not found');
} else if (! initialFromDOM || typeof initialFromDOM !== 'string' ) { 
    console.error('Initial SVG state is invalid:', initialFromDOM);
} else {
    // Render SVG (Eventually, we will have to render State).
    renderSVG(container, initialFromDOM);
}
