import assert from 'node:assert/strict';
import { widthFromPointer } from '../lib/slightnudge/direct-manipulation';

assert.equal(widthFromPointer(672, 100, 196, 'e', 1, 'start'), 768, 'A left-anchored right edge moves one pixel per pointer pixel');
assert.equal(widthFromPointer(672, 100, 148, 'e', 1, 'center'), 768, 'A centered edge moves half the width change');
assert.equal(widthFromPointer(672, 100, 4, 'w', 1, 'end'), 768, 'A right-anchored left edge tracks the pointer');
assert.equal(widthFromPointer(672, 100, 172, 'se', .75, 'start'), 768, 'Fit zoom is applied once');
assert.equal(widthFromPointer(672, 100, 244, 'ne', 1.5, 'start'), 768, '150% zoom preserves CSS-space width');
assert.throws(() => widthFromPointer(672, 100, 196, 'w', 1, 'start'), /anchored/);
assert.throws(() => widthFromPointer(672, 100, 196, 'e', 1, 'end'), /anchored/);
assert.equal(widthFromPointer(672, 100, 148, 'e'), 768, 'Existing centered call contract is retained');
console.log('PASS start/center/end anchoring, zoom, anchored-edge refusal and legacy centered contract');
