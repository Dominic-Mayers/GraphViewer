// graph-invariants.js
// Temporary / development-only SPA invariants collection

import { getGraphState } from './graph-state.js';

/**
 * Check that incoming index is consistent with adjacency
 */
export function checkIncomingTranspose() {
    const state = getGraphState();
    const adjacency = state.adjacency;
    const incoming = state.incoming;

    function deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
        const keysA = Object.keys(a).sort();
        const keysB = Object.keys(b).sort();
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            if (keysA[i] !== keysB[i]) return false;
            if (!deepEqual(a[keysA[i]], b[keysA[i]])) return false;
        }
        return true;
    }

    if (deepEqual(adjacency, incoming)) {
        console.log('✅ incoming transpose invariant holds');
    } else {
        console.error('❌ incoming transpose invariant violated');
        console.log('Adjacency:', adjacency);
        console.log('Incoming :', incoming);
    }
}

/**
 * Check that total sum of calls across all edges is preserved
 * Useful after expandGroup/collapseGroup
 */
export function checkTotalCallsInvariant(previousTotal = null) {
    const state = getGraphState();
    let total = 0;
    for (const src in state.adjacency) {
        for (const tgt in state.adjacency[src]) {
            total += state.adjacency[src][tgt].calls ?? state.adjacency[src][tgt] ?? 0;
        }
    }
    if (previousTotal !== null && total !== previousTotal) {
        console.error(`❌ total calls invariant violated: previous=${previousTotal}, current=${total}`);
    } else {
        console.log('✅ total calls invariant holds', total);
    }
    return total;
}


function checkIncExcInvariant() {
    console.log('--- Inclusive/Exclusive time invariant test ---');

    getAllNodes().forEach(G => {
        // ExcT(G) and IncT(G) as stored in the current node
        const ExcT_G = G.ExcT;
        const IncT_G = G.IncT;

        // Outgoing neighbors in the current graph
        const outNeighbors = Object.values(G.out || {});

        // Sum of their inclusive times
        const sumOut = outNeighbors.reduce((sum, m) => sum + m.IncT, 0);

        if (IncT_G === ExcT_G + sumOut) {
            console.log(`✅ Node ${G.id} invariant holds`);
        } else {
            console.error(`❌ Node ${G.id} invariant violated: ${IncT_G} != ${ExcT_G + sumOut}`);
            console.log('ExcT(G):', ExcT_G);
            console.log('Sum of outgoing neighbors IncT:', sumOut);
            console.log('IncT(G):', IncT_G);
        }
    });

    console.log('Inclusive/Exclusive time invariant test complete');
}