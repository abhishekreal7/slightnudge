import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import {
  IDENTITY_MATRIX,
  degToRad,
  matCompose,
  matRotate,
  matScale,
  matSkew,
  matTranslate,
  nearEqual,
  predictElementScreenRect,
  solveResize,
  type CanvasSpace,
  type ElementTransformFrame,
  type HandleId,
  type Matrix2D,
} from '../../lib/editor/geometry';

const ORACLE_SEED = 2026111099;
const TARGET_ORACLE_CASES = 1050;

/** Deterministic SplitMix32 PRNG (seeded, no Math.random). */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let t = state ^ (state >>> 16);
    t = Math.imul(t, 0x85ebca6b) >>> 0;
    t = t ^ (t >>> 13);
    t = Math.imul(t, 0xc2b2ae35) >>> 0;
    t = t ^ (t >>> 16);
    return (t >>> 0) / 4294967296;
  };
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + (max - min) * rng();
}

function randInt(rng: () => number, min: number, maxInclusive: number): number {
  return Math.floor(rng() * (maxInclusive - min + 1)) + min;
}

interface GeneratedLayerSpec {
  id: string;
  position: 'relative' | 'static';
  width: number;
  height: number;
  borderTop: number;
  borderLeft: number;
  borderRight: number;
  borderBottom: number;
  padTop: number;
  padLeft: number;
  padRight: number;
  padBottom: number;
  marginLeft: number;
  marginTop: number;
  scrollX: number;
  scrollY: number;
  overflow: 'visible' | 'auto';
  direction: 'ltr' | 'rtl';
  writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
  tx: number;
  ty: number;
  rotDeg: number;
  sx: number;
  sy: number;
  skewXDeg: number;
  skewYDeg: number;
  originKind: 'center' | 'top-left' | 'px';
  originX: number;
  originY: number;
  matrix: Matrix2D;
  cssTransform: string;
  cssOrigin: string;
}

interface GeneratedTreeCase {
  caseIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  depth: number;
  nodes: GeneratedLayerSpec[];
}

function makeTransformSpec(rng: () => number, allowFlip = true): {
  tx: number;
  ty: number;
  rotDeg: number;
  sx: number;
  sy: number;
  skewXDeg: number;
  skewYDeg: number;
  matrix: Matrix2D;
  cssTransform: string;
} {
  const tx = Number(randRange(rng, -24, 24).toFixed(2));
  const ty = Number(randRange(rng, -24, 24).toFixed(2));
  const rotDeg = Number(randRange(rng, -180, 180).toFixed(2));
  const flipX = allowFlip && rng() < 0.2 ? -1 : 1;
  const flipY = allowFlip && rng() < 0.15 ? -1 : 1;
  const sx = Number((flipX * randRange(rng, 0.6, 1.6)).toFixed(3));
  const sy = Number((flipY * randRange(rng, 0.6, 1.6)).toFixed(3));
  const skewXDeg = rng() < 0.35 ? Number(randRange(rng, -15, 15).toFixed(2)) : 0;
  const skewYDeg = rng() < 0.25 ? Number(randRange(rng, -12, 12).toFixed(2)) : 0;

  const matrix = matCompose(
    matTranslate(tx, ty),
    matRotate(degToRad(rotDeg)),
    matSkew(degToRad(skewXDeg), degToRad(skewYDeg)),
    matScale(sx, sy)
  );
  // Exact left-to-right CSS transform list order
  const cssTransform = `translate(${tx}px, ${ty}px) rotate(${rotDeg}deg) skew(${skewXDeg}deg, ${skewYDeg}deg) scale(${sx}, ${sy})`;
  return { tx, ty, rotDeg, sx, sy, skewXDeg, skewYDeg, matrix, cssTransform };
}

function buildRandomTreeCase(rng: () => number, caseIndex: number): GeneratedTreeCase {
  const depth = randInt(rng, 2, 4);
  const zoom = Number(randRange(rng, 0.35, 2.5).toFixed(3));
  const panX = randInt(rng, 10, 80);
  const panY = randInt(rng, 10, 60);
  const nodes: GeneratedLayerSpec[] = [];

  for (let d = 0; d < depth; d++) {
    const isTarget = d === depth - 1;
    const width = isTarget ? randInt(rng, 40, 120) : randInt(rng, 180, 340);
    const height = isTarget ? randInt(rng, 24, 90) : randInt(rng, 140, 260);
    const isScrollable = !isTarget && rng() < 0.7;
    // Notice CSS offsetParent rules cleanly tested across both `relative` and `static` unscrolled / scrolled parents!
    const position: 'relative' | 'static' = rng() < 0.75 ? 'relative' : 'static';
    const hasTransform = rng() < 0.85;
    const t = hasTransform
      ? makeTransformSpec(rng, true)
      : {
          tx: 0,
          ty: 0,
          rotDeg: 0,
          sx: 1,
          sy: 1,
          skewXDeg: 0,
          skewYDeg: 0,
          matrix: IDENTITY_MATRIX,
          cssTransform: 'none',
        };

    const originChoices = ['center', 'top-left', 'px'] as const;
    const originKind = originChoices[randInt(rng, 0, 2)];
    const ox = randInt(rng, 0, width);
    const oy = randInt(rng, 0, height);
    const originX = originKind === 'top-left' ? 0 : originKind === 'center' ? width / 2 : ox;
    const originY = originKind === 'top-left' ? 0 : originKind === 'center' ? height / 2 : oy;
    const cssOrigin =
      originKind === 'top-left' ? '0px 0px' : originKind === 'center' ? '50% 50%' : `${ox}px ${oy}px`;

    const direction = d === 0 || rng() < 0.25 ? (rng() < 0.3 ? 'rtl' : 'ltr') : 'ltr';
    const wmRoll = rng();
    const writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr' =
      !isTarget && wmRoll < 0.16 ? 'vertical-rl' : !isTarget && wmRoll < 0.3 ? 'vertical-lr' : 'horizontal-tb';

    nodes.push({
      id: `n-${caseIndex}-${d}`,
      position,
      width,
      height,
      borderTop: randInt(rng, 0, 6),
      borderLeft: randInt(rng, 0, 6),
      borderRight: randInt(rng, 0, 6),
      borderBottom: randInt(rng, 0, 6),
      padTop: randInt(rng, 2, 16),
      padLeft: randInt(rng, 2, 16),
      padRight: randInt(rng, 2, 16),
      padBottom: randInt(rng, 2, 16),
      marginLeft: d === 0 ? 0 : randInt(rng, 0, 12),
      marginTop: d === 0 ? 0 : randInt(rng, 0, 12),
      scrollX: isScrollable ? randInt(rng, 0, 45) : 0,
      scrollY: isScrollable ? randInt(rng, 0, 45) : 0,
      overflow: isScrollable ? 'auto' : 'visible',
      direction,
      writingMode,
      ...t,
      originKind,
      originX,
      originY,
      cssOrigin,
    });
  }

  return { caseIndex, zoom, panX, panY, depth, nodes };
}

interface ExtractedDomStep {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  scrollLeft: number;
  scrollTop: number;
}

interface EvaluatedTreeResult {
  caseIndex: number;
  steps: ExtractedDomStep[];
  actualRect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  viewportScroll: { x: number; y: number };
}

describe('browser-oracle differential tests (Playwright Chromium)', () => {
  it(
    `matches getBoundingClientRect within 0.5px across ${TARGET_ORACLE_CASES} random nested transformed cases (seed=${ORACLE_SEED})`,
    async () => {
      const rng = createRng(ORACLE_SEED);
      const cases: GeneratedTreeCase[] = [];
      for (let i = 0; i < TARGET_ORACLE_CASES; i++) {
        cases.push(buildRandomTreeCase(rng, i));
      }

      let browser: Browser | null = null;
      const disagreements: Array<{
        caseIndex: number;
        maxErr: number;
        predicted: { left: number; top: number; right: number; bottom: number };
        actual: { left: number; top: number; right: number; bottom: number };
        spec: GeneratedTreeCase;
      }> = [];

      try {
        browser = await chromium.launch({ headless: true });
        const page: Page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.setContent(
          '<!doctype html><html><head><style>html,body{margin:0;padding:0;scrollbar-width:none;}*::-webkit-scrollbar{display:none;}</style></head><body><div id="stage"></div></body></html>'
        );

        // Process in batches of 50 to keep Chromium layout instantaneous (~2s total for 1050 cases)
        const batchSize = 50;
        for (let b = 0; b < cases.length; b += batchSize) {
          const batch = cases.slice(b, b + batchSize);
          const batchResults = await page.evaluate((trees: GeneratedTreeCase[]): EvaluatedTreeResult[] => {
            const stage = document.getElementById('stage')!;
            const results: EvaluatedTreeResult[] = [];

            for (const tree of trees) {
              stage.innerHTML = '';
              // Canvas wrapper with zoom + pan translate (exact 2D CSS transform wrapper)
              const wrapper = document.createElement('div');
              wrapper.style.position = 'absolute';
              wrapper.style.left = '0px';
              wrapper.style.top = '0px';
              wrapper.style.transformOrigin = '0px 0px';
              wrapper.style.transform = `translate(${tree.panX}px, ${tree.panY}px) scale(${tree.zoom})`;
              stage.appendChild(wrapper);

              let parentEl: HTMLElement = wrapper;
              const domNodes: HTMLElement[] = [];

              for (let d = 0; d < tree.nodes.length; d++) {
                const n = tree.nodes[d];
                const el = document.createElement('div');
                el.style.boxSizing = 'border-box';
                el.style.position = n.position;
                el.style.width = `${n.width}px`;
                el.style.height = `${n.height}px`;
                el.style.borderStyle = 'solid';
                el.style.borderColor = 'transparent';
                el.style.borderWidth = `${n.borderTop}px ${n.borderRight}px ${n.borderBottom}px ${n.borderLeft}px`;
                el.style.padding = `${n.padTop}px ${n.padRight}px ${n.padBottom}px ${n.padLeft}px`;
                el.style.marginLeft = `${n.marginLeft}px`;
                el.style.marginTop = `${n.marginTop}px`;
                el.style.overflow = n.overflow;
                el.style.direction = n.direction;
                el.style.writingMode = n.writingMode;
                el.style.transformOrigin = n.cssOrigin;
                el.style.transform = n.cssTransform;
                parentEl.appendChild(el);
                if (n.overflow === 'auto') {
                  const spacer = document.createElement('div');
                  spacer.style.width = `${n.width + 120}px`;
                  spacer.style.height = `${n.height + 120}px`;
                  spacer.style.pointerEvents = 'none';
                  el.appendChild(spacer);
                }
                domNodes.push(el);
                parentEl = el;
              }

              // Force layout and apply scrolls after children exist
              for (let d = 0; d < tree.nodes.length - 1; d++) {
                const n = tree.nodes[d];
                const el = domNodes[d];
                if (n.overflow === 'auto') {
                  const signX = n.direction === 'rtl' || n.writingMode === 'vertical-rl' ? -1 : 1;
                  el.scrollLeft = signX * n.scrollX;
                  el.scrollTop = n.scrollY;
                }
              }

              const steps: ExtractedDomStep[] = [];
              for (let d = 0; d < domNodes.length; d++) {
                const el = domNodes[d];
                const prevEl = d === 0 ? wrapper : domNodes[d - 1];
                let offsetX: number;
                let offsetY: number;
                if (d === 0) {
                  // wrapper has clientLeft = 0, clientTop = 0, scrollLeft = 0, scrollTop = 0
                  offsetX = el.offsetLeft;
                  offsetY = el.offsetTop;
                } else if (el.offsetParent === prevEl) {
                  offsetX = prevEl.clientLeft + el.offsetLeft;
                  offsetY = prevEl.clientTop + el.offsetTop;
                } else {
                  offsetX = el.offsetLeft - prevEl.offsetLeft;
                  offsetY = el.offsetTop - prevEl.offsetTop;
                }
                steps.push({
                  offsetX,
                  offsetY,
                  width: el.offsetWidth,
                  height: el.offsetHeight,
                  scrollLeft: el.scrollLeft,
                  scrollTop: el.scrollTop,
                });
              }

              const target = domNodes[domNodes.length - 1];
              const rect = target.getBoundingClientRect();
              results.push({
                caseIndex: tree.caseIndex,
                steps,
                actualRect: {
                  left: rect.left,
                  top: rect.top,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                },
                viewportScroll: { x: window.scrollX, y: window.scrollY },
              });
            }

            return results;
          }, batch);

          for (const res of batchResults) {
            const spec = cases[res.caseIndex];
            const space: CanvasSpace = {
              originX: 0,
              originY: 0,
              panX: spec.panX,
              panY: spec.panY,
              zoom: spec.zoom,
            };
            const chain: ElementTransformFrame[] = spec.nodes.map((node, idx) => ({
              offsetX: res.steps[idx].offsetX,
              offsetY: res.steps[idx].offsetY,
              width: res.steps[idx].width,
              height: res.steps[idx].height,
              scrollLeft: res.steps[idx].scrollLeft,
              scrollTop: res.steps[idx].scrollTop,
              transform: node.matrix,
              transformOrigin:
                node.originKind === 'center' ? undefined : { x: node.originX, y: node.originY },
            }));

            const pred = predictElementScreenRect(chain, space, res.viewportScroll);
            const maxErr = Math.max(
              Math.abs(pred.bounds.left - res.actualRect.left),
              Math.abs(pred.bounds.top - res.actualRect.top),
              Math.abs(pred.bounds.right - res.actualRect.right),
              Math.abs(pred.bounds.bottom - res.actualRect.bottom)
            );
            if (maxErr > 0.5) {
              disagreements.push({
                caseIndex: res.caseIndex,
                maxErr,
                predicted: {
                  left: pred.bounds.left,
                  top: pred.bounds.top,
                  right: pred.bounds.right,
                  bottom: pred.bounds.bottom,
                },
                actual: {
                  left: res.actualRect.left,
                  top: res.actualRect.top,
                  right: res.actualRect.right,
                  bottom: res.actualRect.bottom,
                },
                spec,
              });
            }
          }
        }

        assert.equal(
          disagreements.length,
          0,
          `Found ${disagreements.length}/${TARGET_ORACLE_CASES} disagreements > 0.5px. First case: ${JSON.stringify(
            disagreements[0]
          )}`
        );
      } finally {
        if (browser) await browser.close();
      }
    }
  );

  it('drives real pointer events on transformed/rotated/flipped harness and matches solveResize within 0.5px', async () => {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const page: Page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

      const configurations: Array<{
        label: string;
        zoom: number;
        rotDeg: number;
        scaleX: number;
        scaleY: number;
        startRect: { left: number; top: number; width: number; height: number };
        handle: HandleId;
        delta: { x: number; y: number };
      }> = [
        {
          label: 'zoom 0.5 rotated 25deg SE corner',
          zoom: 0.5,
          rotDeg: 25,
          scaleX: 1,
          scaleY: 1,
          startRect: { left: 100, top: 80, width: 200, height: 120 },
          handle: 'se',
          delta: { x: 60, y: 35 },
        },
        {
          label: 'zoom 2.0 flipped scaleX(-1) rotated -18deg NW corner',
          zoom: 2.0,
          rotDeg: -18,
          scaleX: -1,
          scaleY: 1,
          startRect: { left: 60, top: 40, width: 140, height: 80 },
          handle: 'nw',
          delta: { x: -45, y: 20 },
        },
        {
          label: 'zoom 1.25 rotated 45deg E edge',
          zoom: 1.25,
          rotDeg: 45,
          scaleX: 1,
          scaleY: 1,
          startRect: { left: 140, top: 100, width: 180, height: 90 },
          handle: 'e',
          delta: { x: 40, y: 40 },
        },
      ];

      for (const cfg of configurations) {
        const elementMatrix = matCompose(
          matTranslate(40, 30),
          matScale(cfg.zoom, cfg.zoom),
          matTranslate(cfg.startRect.left, cfg.startRect.top)
        );
        // Box interior transform (around center of current box? Keeping origin top-left 0,0 makes CSS left/top independent of resize origin shifts)
        const boxTransform = matCompose(
          elementMatrix,
          matRotate(degToRad(cfg.rotDeg)),
          matScale(cfg.scaleX, cfg.scaleY)
        );
        const startLocalRect = { left: 0, top: 0, width: cfg.startRect.width, height: cfg.startRect.height };

        let pointerStart = { x: 0, y: 0 };
        let latestPrediction = solveResize({
          startRect: startLocalRect,
          handle: cfg.handle,
          pointerDeltaScreen: { x: 0, y: 0 },
          elementToScreen: boxTransform,
        });

        // #rotator carries the affine rotate/scale around #target's top-left; #target's CSS left/top/width/height live in #rotator's local axes
        await page.setContent(`
          <!doctype html>
          <html><body style="margin:0">
            <div id="wrap" style="position:absolute;left:40px;top:30px;transform-origin:0 0;transform:scale(${cfg.zoom})">
              <div id="rotator" style="position:absolute;left:${cfg.startRect.left}px;top:${cfg.startRect.top}px;transform-origin:0 0;transform:rotate(${cfg.rotDeg}deg) scale(${cfg.scaleX}, ${cfg.scaleY});">
                <div id="target" style="position:absolute;left:0px;top:0px;width:${cfg.startRect.width}px;height:${cfg.startRect.height}px;background:#0ccb8b;"></div>
              </div>
            </div>
          </body></html>
        `);

        // Acquire initial handle screen point and drag with real Playwright pointer events
        pointerStart = latestPrediction.handlePointScreen;
        await page.mouse.move(pointerStart.x, pointerStart.y);
        await page.mouse.down();

        const steps = 5;
        for (let s = 1; s <= steps; s++) {
          const dx = (cfg.delta.x * s) / steps;
          const dy = (cfg.delta.y * s) / steps;
          latestPrediction = solveResize({
            startRect: startLocalRect,
            handle: cfg.handle,
            pointerDeltaScreen: { x: dx, y: dy },
            elementToScreen: boxTransform,
          });
          await page.mouse.move(pointerStart.x + dx, pointerStart.y + dy);
          // Harness writes solver output local left/top/width/height to target style
          await page.evaluate((r) => {
            const el = document.getElementById('target')!;
            el.style.left = `${r.left}px`;
            el.style.top = `${r.top}px`;
            el.style.width = `${r.width}px`;
            el.style.height = `${r.height}px`;
          }, latestPrediction.rect);
        }
        await page.mouse.up();

        const rendered = await page.evaluate(() => {
          const r = document.getElementById('target')!.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        });

        const diff = Math.max(
          Math.abs(rendered.left - latestPrediction.screenBounds.left),
          Math.abs(rendered.top - latestPrediction.screenBounds.top),
          Math.abs(rendered.right - latestPrediction.screenBounds.right),
          Math.abs(rendered.bottom - latestPrediction.screenBounds.bottom),
          Math.abs(rendered.width - latestPrediction.screenBounds.width),
          Math.abs(rendered.height - latestPrediction.screenBounds.height)
        );
        assert.ok(
          diff <= 0.5,
          `Pointer resize harness (${cfg.label}) diverged by ${diff}px: rendered=${JSON.stringify(
            rendered
          )} predicted=${JSON.stringify(latestPrediction.screenBounds)}`
        );
      }
    } finally {
      if (browser) await browser.close();
    }
  });

  it('documents legitimate browser divergence on out-of-scope CSS zoom property and 3D transforms', async () => {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(`
        <!doctype html><body style="margin:0">
          <div id="cssZoomWrap" style="position:relative;zoom:1.5">
            <div id="zoomBox" style="position:relative;left:20px;top:20px;width:100px;height:50px"></div>
          </div>
          <div id="perspWrap" style="position:relative;perspective:250px">
            <div id="box3d" style="position:relative;left:50px;top:50px;width:120px;height:80px;transform:rotateX(40deg) rotateY(30deg)"></div>
          </div>
        </body>
      `);

      const obs = await page.evaluate(() => {
        const zb = document.getElementById('zoomBox')!.getBoundingClientRect();
        const b3d = document.getElementById('box3d')!.getBoundingClientRect();
        return { zb, b3d };
      });
      // Non-standard CSS `zoom` scales viewport rect to 150x75 while unscaled affine prediction without CSS-zoom leaves 100x50 -> measurable divergence > 0.5px!
      const flatPred = predictElementScreenRect(
        [{ offsetX: 20, offsetY: 20, width: 100, height: 50 }],
        { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 }
      );
      assert.ok(Math.abs(obs.zb.width - flatPred.bounds.width) > 10, 'Expected CSS zoom property divergence');

      // 3D perspective produces trapezoidal keystone distortion not captureable by flat 2D affine matrix -> document measurable divergence
      const pred3dAs2d = predictElementScreenRect(
        [{ offsetX: 50, offsetY: 50, width: 120, height: 80 }],
        { originX: 0, originY: 0, panX: 0, panY: 0, zoom: 1 }
      );
      assert.ok(Math.abs(obs.b3d.width - pred3dAs2d.bounds.width) > 5, 'Expected 3D perspective divergence');
      assert.ok(nearEqual(flatPred.bounds.width, 100));
    } finally {
      if (browser) await browser.close();
    }
  });
});
