import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectionStyleFor,
  parseBorderRadius,
  buildRoundedRectPath,
  buildCornerArcPath,
  RADIUS_SCALE_STEPS,
  findNearestRadiusStep,
  type SelectionInfo,
  type SelectionChromeStyle,
} from '../components/slightnudge/selection-style';

describe('selectionStyleFor decision engine', () => {
  // 1-10: Radius parsing tests
  describe('parseBorderRadius', () => {
    it('1. parses plain px string', () => {
      const r = parseBorderRadius('8px', 100, 100);
      assert.deepEqual(r, { tl: 8, tr: 8, br: 8, bl: 8 });
    });

    it('2. parses numeric radius', () => {
      const r = parseBorderRadius(12, 100, 100);
      assert.deepEqual(r, { tl: 12, tr: 12, br: 12, bl: 12 });
    });

    it('3. parses rem and em units based on 16px root', () => {
      const rRem = parseBorderRadius('0.5rem', 100, 100);
      assert.deepEqual(rRem, { tl: 8, tr: 8, br: 8, bl: 8 });
      const rEm = parseBorderRadius('1.5em', 100, 100);
      assert.deepEqual(rEm, { tl: 24, tr: 24, br: 24, bl: 24 });
    });

    it('4. parses percentage radius relative to dimension', () => {
      const r = parseBorderRadius('50%', 100, 60);
      // 50% of min(100, 60) = 30px
      assert.deepEqual(r, { tl: 30, tr: 30, br: 30, bl: 30 });
    });

    it('5. parses 9999px large radius and clamps to half min dimension', () => {
      const r = parseBorderRadius('9999px', 200, 60);
      assert.deepEqual(r, { tl: 30, tr: 30, br: 30, bl: 30 });
    });

    it('6. parses 2-value CSS shorthand (top-left/bottom-right, top-right/bottom-left)', () => {
      const r = parseBorderRadius('8px 16px', 100, 100);
      assert.deepEqual(r, { tl: 8, tr: 16, br: 8, bl: 16 });
    });

    it('7. parses 3-value CSS shorthand (top-left, top-right/bottom-left, bottom-right)', () => {
      const r = parseBorderRadius('8px 16px 24px', 100, 100);
      assert.deepEqual(r, { tl: 8, tr: 16, br: 24, bl: 16 });
    });

    it('8. parses 4-value CSS shorthand (tl, tr, br, bl)', () => {
      const r = parseBorderRadius('4px 8px 12px 16px', 100, 100);
      assert.deepEqual(r, { tl: 4, tr: 8, br: 12, bl: 16 });
    });

    it('9. parses elliptical syntax (50% / 20%)', () => {
      const r = parseBorderRadius('50% / 20%', 100, 100);
      // Takes the primary horizontal/vertical radius clamped
      assert.equal(r.tl > 0, true);
    });

    it('10. parses calc() expression', () => {
      const r = parseBorderRadius('calc(1rem - 4px)', 100, 100);
      assert.deepEqual(r, { tl: 12, tr: 12, br: 12, bl: 12 });
    });

    it('11. handles object input with per-corner radii', () => {
      const r = parseBorderRadius({ topLeft: '6px', topRight: 10, bottomRight: '1rem', bottomLeft: 0 }, 100, 100);
      assert.deepEqual(r, { tl: 6, tr: 10, br: 16, bl: 0 });
    });
  });

  // 12-45: Table-driven selectionStyleFor tests
  const testCases: { name: string; input: SelectionInfo; expectedVariant: string; expectedHandles: string[]; lockedAspect?: boolean }[] = [
    // Degenerate cases
    {
      name: '12. zero width and height',
      input: { width: 0, height: 0, tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: [],
    },
    {
      name: '13. zero width with positive height',
      input: { width: 0, height: 50, tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: [],
    },
    {
      name: '14. display: contents generates no box handles',
      input: { width: 100, height: 50, display: 'contents', tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: [],
    },
    {
      name: '15. display: none generates no handles',
      input: { width: 100, height: 50, display: 'none', tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: [],
    },

    // Tiny elements (< 24 screen px)
    {
      name: '16. tiny square element under 24px screen size has single corner handle',
      input: { width: 16, height: 16, zoom: 1, tag: 'div' },
      expectedVariant: 'tiny',
      expectedHandles: ['se'],
    },
    {
      name: '17. tiny element zoomed out (100px at 0.2 zoom = 20 screen px)',
      input: { width: 100, height: 100, zoom: 0.2, tag: 'div' },
      expectedVariant: 'tiny',
      expectedHandles: ['se'],
    },
    {
      name: '18. element under 40 screen px suppresses edge handles',
      input: { width: 30, height: 100, zoom: 1, tag: 'div' },
      expectedVariant: 'dots',
      // width is 30 (< 40), so 'n' and 's' edge handles are hidden; height is 100 (>= 40), so 'w' and 'e' are present
      expectedHandles: ['nw', 'ne', 'se', 'sw', 'w', 'e'],
    },

    // Dots variant (radius < 6px)
    {
      name: '19. default sharp rectangle (0px radius)',
      input: { width: 200, height: 100, borderRadius: '0px', tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
    {
      name: '20. small radius (4px, under 6px threshold)',
      input: { width: 200, height: 100, borderRadius: '4px', tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
    {
      name: '21. section container with default styling',
      input: { width: 800, height: 400, tag: 'section', isContainer: true },
      expectedVariant: 'dots',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },

    // Arc variant (6px <= radius < 45% of shorter side)
    {
      name: '22. rounded card with 8px radius',
      input: { width: 200, height: 100, borderRadius: '8px', tag: 'div' },
      expectedVariant: 'arc',
      // width=200, height=100 both >= 48px, so all 4 corners + 4 edges
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
    {
      name: '23. card with 16px radius',
      input: { width: 240, height: 120, borderRadius: '16px', tag: 'div' },
      expectedVariant: 'arc',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
    {
      name: '24. card with short height (<48px) suppresses vertical edge handles',
      input: { width: 200, height: 44, borderRadius: '8px', tag: 'div' },
      expectedVariant: 'arc',
      // height 44 < 48, so 'w' and 'e' edge handles hidden; width 200 >= 48, so 'n' and 's' shown
      expectedHandles: ['nw', 'n', 'ne', 's', 'se', 'sw'],
    },
    {
      name: '25. arc variant with unequal corners',
      input: { width: 200, height: 100, borderRadius: '12px 0px 12px 0px', tag: 'div' },
      expectedVariant: 'arc',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },

    // Capsule variant (radius >= 45% of shorter side and width != height)
    {
      name: '26. wide pill button (9999px radius, 160x40)',
      input: { width: 160, height: 40, borderRadius: '9999px', tag: 'button', isControl: true },
      expectedVariant: 'arc',
      // Single corner arc handle at bottom-right (se), matching iOS 18 Control Center
      expectedHandles: ['se'],
    },
    {
      name: '27. tall vertical pill badge (50% radius, 40x120)',
      input: { width: 40, height: 120, borderRadius: '50%', tag: 'div' },
      expectedVariant: 'capsule',
      expectedHandles: ['n', 'e', 's', 'w'],
    },
    {
      name: '28. capsule button with 20px radius on 40px height',
      input: { width: 140, height: 40, borderRadius: '20px', tag: 'button' },
      expectedVariant: 'capsule',
      expectedHandles: ['n', 'e', 's', 'w'],
    },

    // Circle variant (width within 2% of height and radius ~50%)
    {
      name: '29. perfect avatar circle (100x100, 50% radius)',
      input: { width: 100, height: 100, borderRadius: '50%', tag: 'div' },
      expectedVariant: 'circle',
      expectedHandles: ['nw', 'ne', 'se', 'sw'],
      lockedAspect: true,
    },
    {
      name: '30. rounded icon button (48x48, 9999px radius)',
      input: { width: 48, height: 48, borderRadius: '9999px', tag: 'button' },
      expectedVariant: 'circle',
      expectedHandles: ['nw', 'ne', 'se', 'sw'],
      lockedAspect: true,
    },
    {
      name: '31. circle within 2% dimension tolerance (101x100, 50px radius)',
      input: { width: 101, height: 100, borderRadius: '50px', tag: 'div' },
      expectedVariant: 'circle',
      expectedHandles: ['nw', 'ne', 'se', 'sw'],
      lockedAspect: true,
    },
    {
      name: '32. circle outside 2% dimension tolerance falls back to capsule',
      input: { width: 105, height: 100, borderRadius: '50px', tag: 'div' },
      expectedVariant: 'capsule',
      expectedHandles: ['n', 'e', 's', 'w'],
    },

    // Text variant (inline text, headings, paragraphs)
    {
      name: '33. paragraph text element (width-only resize)',
      input: { width: 300, height: 80, tag: 'p', isText: true },
      expectedVariant: 'text',
      expectedHandles: ['w', 'e'],
    },
    {
      name: '34. heading element h1 (width-only resize)',
      input: { width: 500, height: 60, tag: 'h1' },
      expectedVariant: 'text',
      expectedHandles: ['w', 'e'],
    },
    {
      name: '35. inline span (width-only resize)',
      input: { width: 120, height: 24, tag: 'span', display: 'inline' },
      expectedVariant: 'text',
      expectedHandles: ['w', 'e'],
    },
    {
      name: '36. role="heading" detected as text',
      input: { width: 400, height: 40, role: 'heading', tag: 'div' },
      expectedVariant: 'text',
      expectedHandles: ['w', 'e'],
    },

    // Media variant (images, video, svg, canvas)
    {
      name: '37. image element with locked aspect',
      input: { width: 400, height: 300, tag: 'img', isMedia: true },
      expectedVariant: 'media',
      expectedHandles: ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'],
      lockedAspect: true,
    },
    {
      name: '38. video element with locked aspect',
      input: { width: 640, height: 360, tag: 'video' },
      expectedVariant: 'media',
      expectedHandles: ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'],
      lockedAspect: true,
    },
    {
      name: '39. svg icon element with locked aspect',
      input: { width: 64, height: 64, tag: 'svg' },
      expectedVariant: 'media',
      expectedHandles: ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'],
      lockedAspect: true,
    },
    {
      name: '40. canvas element with locked aspect',
      input: { width: 300, height: 200, tag: 'canvas' },
      expectedVariant: 'media',
      expectedHandles: ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'],
      lockedAspect: true,
    },

    // Zoom variations (25% to 400%)
    {
      name: '41. element at zoom 25% (0.25x scale)',
      input: { width: 120, height: 120, zoom: 0.25, tag: 'div' },
      expectedVariant: 'dots',
      // Screen size: 30x30px. Both >= 24, but sides < 40, so edge handles hidden
      expectedHandles: ['nw', 'ne', 'se', 'sw'],
    },
    {
      name: '42. element at zoom 200% (2.0x scale)',
      input: { width: 100, height: 50, zoom: 2.0, borderRadius: '8px', tag: 'div' },
      expectedVariant: 'arc',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
    {
      name: '43. element at zoom 400% (4.0x scale)',
      input: { width: 100, height: 100, zoom: 4.0, borderRadius: '50%', tag: 'div' },
      expectedVariant: 'circle',
      expectedHandles: ['nw', 'ne', 'se', 'sw'],
      lockedAspect: true,
    },

    // Hysteresis behavior
    {
      name: '44. hysteresis prevents flickering at 6px border threshold (radius 5.5px with currentVariant arc stays arc)',
      input: { width: 200, height: 100, borderRadius: '5.5px', currentVariant: 'arc', tag: 'div' },
      expectedVariant: 'arc',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
    {
      name: '45. hysteresis prevents flickering at 6px border threshold (radius 6.5px with currentVariant dots stays dots)',
      input: { width: 200, height: 100, borderRadius: '6.5px', currentVariant: 'dots', tag: 'div' },
      expectedVariant: 'dots',
      expectedHandles: ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
    },
  ];

  for (const tc of testCases) {
    it(tc.name, () => {
      const res = selectionStyleFor(tc.input);
      assert.equal(res.variant, tc.expectedVariant, `Expected variant ${tc.expectedVariant} for ${tc.name}, got ${res.variant}`);
      assert.deepEqual(
        [...res.visibleHandles].sort(),
        [...tc.expectedHandles].sort(),
        `Handles mismatch for ${tc.name}`
      );
      if (tc.lockedAspect !== undefined) {
        assert.equal(res.lockedAspect, tc.lockedAspect, `Expected lockedAspect ${tc.lockedAspect} for ${tc.name}`);
      }
    });
  }

  // Handle overlap assertion
  it('46. handles never overlap on tiny elements', () => {
    const res = selectionStyleFor({ width: 18, height: 18, zoom: 1, tag: 'div' });
    assert.equal(res.visibleHandles.length, 1);
    assert.equal(res.visibleHandles[0], 'se');
  });

  // Radius grip availability test
  it('47. provides radius grip for styleable non-text elements with positive size', () => {
    const res = selectionStyleFor({ width: 120, height: 80, borderRadius: '8px', tag: 'div' });
    assert.equal(res.radiusGrip.visible, true);
    assert.equal(typeof res.radiusGrip.inset, 'number');
  });

  it('48. suppresses radius grip on text and zero-size elements', () => {
    const resText = selectionStyleFor({ width: 120, height: 80, tag: 'p', isText: true });
    assert.equal(resText.radiusGrip.visible, false);

    const resZero = selectionStyleFor({ width: 0, height: 0, tag: 'div' });
    assert.equal(resZero.radiusGrip.visible, false);
  });

  // 49-53: Geometry and arc tests
  describe('Geometry calculations', () => {
    it('49. buildRoundedRectPath outputs valid closed SVG path', () => {
      const p = buildRoundedRectPath(-2, -2, 104, 104, { tl: 10, tr: 10, br: 10, bl: 10 });
      assert.equal(p.startsWith('M 8 -2'), true);
      assert.equal(p.endsWith('Z'), true);
      assert.equal(p.includes('A 10 10'), true);
    });

    it('50. buildCornerArcPath stays within 1px of corner radius curve', () => {
      const W = 120, H = 80;
      const r = 16;
      const radii = { tl: r, tr: r, br: r, bl: r };
      for (const corner of ['nw', 'ne', 'se', 'sw'] as const) {
        const arc = buildCornerArcPath(corner, W, H, radii, 1.0);
        assert.equal(arc.length >= 14 && arc.length <= 28, true);
        // Verify center point distance to corner center equals R = r + 2 within 0.1px
        const xc = corner.includes('w') ? r : W - r;
        const yc = corner.includes('n') ? r : H - r;
        const dist = Math.hypot(arc.center.x - xc, arc.center.y - yc);
        assert.ok(Math.abs(dist - (r + 2)) < 0.1, `Corner ${corner} arc drifted: ${dist} vs ${r + 2}`);
      }
    });

    it('51. radius scale steps contain Tailwind presets from none to full', () => {
      assert.equal(RADIUS_SCALE_STEPS.length, 9);
      assert.equal(RADIUS_SCALE_STEPS[0].token, 'rounded-none');
      assert.equal(RADIUS_SCALE_STEPS[RADIUS_SCALE_STEPS.length - 1].token, 'rounded-full');
    });

    it('52. findNearestRadiusStep snaps accurately to nearest step', () => {
      assert.equal(findNearestRadiusStep(0, 50).token, 'rounded-none');
      assert.equal(findNearestRadiusStep(3.2, 50).token, 'rounded'); // 3.2 is closer to 4 than 2
      assert.equal(findNearestRadiusStep(7.8, 50).token, 'rounded-lg'); // 7.8 is close to 8
      assert.equal(findNearestRadiusStep(15, 50).token, 'rounded-2xl'); // 15 is close to 16
      assert.equal(findNearestRadiusStep(49, 50).token, 'rounded-full'); // 49 of 50 is full
    });
  });
});
