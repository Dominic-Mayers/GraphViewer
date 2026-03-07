// assets/graph/fetch-json.js

/**
 * Fetch JSON with consistent error handling.
 * Keeps networking concerns out of transformations.
 *
 * @param {string} url
 * @param {RequestInit} [init]
 * @returns {Promise<any>}
 */
export async function fetchJson(url, init = { method: "GET" }) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetchJson failed (${res.status}) ${url}${text ? `\n${text}` : ""}`);
  }
  return await res.json();
}