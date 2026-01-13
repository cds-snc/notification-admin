// This module used to provide a complex visual normalization helper.
// The project now uses a simple shrink/expand nudge inline in
// SimpleEditor.js. Keep a no-op export here for compatibility so
// existing imports don't break immediately.

export function normalizeSelectionToBlocks() {
  return false;
}

export const normalizeSelectionToVisualPos = normalizeSelectionToBlocks;
