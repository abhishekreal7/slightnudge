import assert from 'node:assert/strict';
import { renderJsxText } from '../lib/slightnudge/jsx-text';

for (const [source, expected] of [
  ['Simple heading', 'Simple heading'],
  ['  Same-line spacing  ', '  Same-line spacing  '],
  ['\n    A clean, modular starter\n    built for real projects.\n  ', 'A clean, modular starter built for real projects.'],
  ['\r\n\tFirst line\r\n\tsecond line\r\n', 'First line second line'],
  ['Keep &amp; compare &lt;code&gt; &quot;exactly&quot;', 'Keep & compare <code> "exactly"'],
  ['A&nbsp;B &#169; &#x1F600;', 'A\u00a0B © 😀'],
  ['\n   \n   ', ''],
]) assert.equal(renderJsxText(source), expected);
console.log('PASS JSX rendered text: multiline indentation, CRLF/tabs, same-line whitespace, named/numeric entities, Unicode and empty text');
