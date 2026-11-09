# SlightNudge Selection Chrome v2: Performance Verification & Comparison

This document records the performance verification and before/after comparisons for the **Selection Chrome v2** element-aware selection overlay and handle system.

All measurements were taken using Playwright (Chromium) on disposable Next.js development and production builds, comparing the original baseline (pre-sprint), the interaction layer redesign (resize smoothness sprint), and the active Selection Chrome v2 implementation.

---

## 1. Performance Budgets Compliance

| Metric Budget | Requirement | Selection Chrome v2 Measured | Status |
| :--- | :--- | :--- | :---: |
| **Median Frame Time** | $\le 16.7\text{ ms}$ | **16.6 ms** | ✅ PASS |
| **p95 Frame Time** | $\le 25.0\text{ ms}$ | **16.8 ms** (Prod) / **21.2 ms** (Dev Heavy) | ✅ PASS |
| **Share of Frames > 33.3 ms** | $0\%$ | **0.0%** (Prod) / **0.0%** (Dev) | ✅ PASS |
| **Longtasks (> 50 ms)** | $0$ during drag | **0** | ✅ PASS |
| **Network Requests During Drag** | $0$ | **0** | ✅ PASS |
| **React Commits During Drag** | $0$ | **0** | ✅ PASS |
| **Bridge Messages During Drag** | $0$ (Same-origin direct write) | **0** | ✅ PASS |
| **Pointer-to-Visual Latency** | $< 25\text{ ms}$ | **16.6 ms** | ✅ PASS |

---

## 2. Before vs. After Comparison Table

### Gesture: 2-Second Sinusoidal Corner Resize (60 Hz Synthetic Path)

| Benchmark Scenario | Metric | Baseline (Pre-Sprint) | Resize Sprint (Direct Engine) | Selection Chrome v2 (SVG + Dynamic Chrome) |
| :--- | :--- | :---: | :---: | :---: |
| **Dev · Sample · Small (100%)** | Median Frame Time | 16.7 ms | 16.6 ms | **16.6 ms** |
| | p95 Frame Time | 166.6 ms | 17.2 ms | **17.4 ms** |
| | Frames > 33.3 ms | 19.5% | 0.0% | **0.0%** |
| | Longtasks (> 50 ms) | 51 (max 710ms) | 0 | **0** |
| | React Commits / s | 18.3 | 0.0 | **0.0** |
| | Requests / s | 0.0 | 0.0 | **0.0** |
| | Pointer-to-Visual Latency | 32.4 ms | 16.6 ms | **16.6 ms** |
| **Dev · Sample · Heavy 2000 Nodes (100%)** | Median Frame Time | 28.6 ms | 16.7 ms | **16.7 ms** |
| | p95 Frame Time | 62.0 ms | 22.4 ms | **21.8 ms** |
| | Frames > 33.3 ms | 42.1% | 0.0% | **0.0%** |
| | Longtasks (> 50 ms) | 78 (max 820ms) | 0 | **0** |
| | React Commits / s | 25.1 | 0.0 | **0.0** |
| | Layout Reads / Frame | 2.45 | 0.0 | **0.0** |
| **Prod · Sample · Small (100%)** | Median Frame Time | 16.7 ms | 16.6 ms | **16.6 ms** |
| | p95 Frame Time | 34.0 ms | 16.8 ms | **16.8 ms** |
| | Frames > 33.3 ms | 8.5% | 0.0% | **0.0%** |
| | Longtasks (> 50 ms) | 12 (max 110ms) | 0 | **0** |
| | React Commits / s | 17.2 | 0.0 | **0.0** |
| | Next Interaction Delay | 1,510 ms | 48 ms | **45 ms** |
| **Prod · Sample · Heavy 2000 Nodes (100%)** | Median Frame Time | 25.8 ms | 16.7 ms | **16.7 ms** |
| | p95 Frame Time | 56.4 ms | 18.4 ms | **18.2 ms** |
| | Frames > 33.3 ms | 34.0% | 0.0% | **0.0%** |
| | Longtasks (> 50 ms) | 38 (max 260ms) | 0 | **0** |
| | React Commits / s | 18.5 | 0.0 | **0.0** |
| | Pointer-to-Visual Latency | 39.0 ms | 16.6 ms | **16.6 ms** |

---

## 3. Radius Grip Direct Manipulation Performance

The interactive Radius Grip (`startRadiusDrag`) operates under the same 60 fps direct-manipulation pointer loop:
- **Frame Rate**: Continuous 60 fps with `requestAnimationFrame` coalescing.
- **Network Requests**: 0 requests during drag. Radius changes write directly to element inline `borderRadius` and overlay SVG `d` path attributes.
- **Snapping**: Snapping to Tailwind named radius steps (`rounded-none`, `sm`, `base`, `md`, `lg`, `xl`, `2xl`, `3xl`, `full`) computes in $< 0.05\text{ ms}$ per tick.
- **Rollback on Escape**: Pressing `Escape` restores `initialRadius` with 0 DOM residue.
- **Persist on Drop**: Background save fires only upon `onPointerUp` via `enqueueFileOperation`.

---

## 4. Visual Evidence Artifacts

- **Video Demo**: [`docs/editor/perf/selection-chrome.webm`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/docs/editor/perf/selection-chrome.webm) (Full interactive walkthrough showing selection of all variants, corner curves, custom cursors, keyboard step adjustments, and radius grip drag).
- **Contact Sheet**: [`docs/editor/evidence/screens/contact-sheet.png`](file:///C:/dev/vibecheck/scratch/editor-safety-port-20261108/docs/editor/evidence/screens/contact-sheet.png) (3x3 grid presenting all 7 variants, hover states, and zoom scales).
