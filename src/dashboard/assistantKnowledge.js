/* Opening prompts for the assistant's empty state.
 *
 * All this file holds now. It used to carry a local corpus — PRODUCT_FACTS,
 * TOPICS and a FALLBACK string — that the store answered from before the agent
 * shipped. The server answers now, and it can see the workspace; a second copy
 * of the launch terms sitting in the frontend would drift from billing.py and
 * be quoted with total confidence (ai.md §6 makes the same point about the
 * backend's own knowledge base).
 *
 * These are questions, not answers, so there is nothing here to go stale —
 * each one is sent to the agent like anything typed.
 */
export const SUGGESTIONS = [
  "How does verification billing work?",
  "How do I collect a deposit over M-Pesa?",
  "What's in my fleet right now?",
  "How do I give a booking agent limited access?",
];
