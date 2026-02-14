// initialize-from-dom.js
// Reads initial "state" from the DOM (currently JSON-encoded SVG string)

const jsonElement = document.getElementById("graph-data");
if (!jsonElement) {
    throw new Error("Initial JSON state element not found in DOM");
}

// Parse JSON string
export const initialFromDOM = JSON.parse(jsonElement.textContent);