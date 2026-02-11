import { ctxmenu } from "ctxmenu";

export function initPopupMenu(containerDiv) {
    const svg = containerDiv.querySelector('svg');
    if (!svg) {
        console.warn('PopupMenu: SVG not found');
        return;
    }

    svg.addEventListener('contextmenu', event => {
        
        
        let target = event.target;

        // If it's a text node or non-element, move to parent
        if (!(target instanceof Element)) {
            target = target.parentElement;
        }

        if (!target) return;
        
        const node = target.closest('.node');
        if (!node) return;
        console.log('node:', node.id); 

        event.stopPropagation();
        event.preventDefault();

        // The actions are to be replaced by state transformations on the graph. 
        const menuDef = [
            {
                text: "Alert action !",
                action: () => alert("Clicked node " + node.id ) 
            }, 
            {
                text: "Console action !",
                action: () => console.log("Clicked node " + node.id) 
            }
        ];
                
        ctxmenu.show( menuDef, event); 
    });
}