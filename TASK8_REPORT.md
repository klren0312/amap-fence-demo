# Bug Fix Report — CustomDraw.vue radiusLabel bugs

**Date:** 2026-07-24  
**Commit:** d1eef1e  

## What was fixed

### Bug 1: `finishCircle()` leaks `radiusLabel` on the map

**Problem:** In `finishCircle()`, the `radiusLabel` marker was never removed from the map. The `cleanup()` function checks `if (circleDraft)` but by that point `circleDraft` is already set to `null`, so the radiusLabel cleanup branch was skipped.

**Fix:** Added `draft.radiusLabel.setMap(null)` at line 205 in `finishCircle()`, right after `draft.centerMarker.setMap(null)`.

### Bug 2: `radiusLabel` position never updates during mouse move

**Problem:** In `handleCircleMove()`, only `setContent()` was called on the radiusLabel but never `setPosition()`. The label stayed above the center point instead of following the mouse/edge of the circle.

**Fix:** Added `circleDraft.radiusLabel.setPosition(mouseLngLat)` at line 188 in `handleCircleMove()`, before `setContent()`.

## Files changed

- `src/components/AmapMap/CustomDraw.vue` — 2 targeted edits

## Test results

- TypeScript compilation: pre-existing type errors in `ShapeList.vue` and `CustomDraw.vue` (unrelated to these changes)
- No new issues introduced

## Concerns

None. Both fixes are minimal and follow the existing code patterns.
