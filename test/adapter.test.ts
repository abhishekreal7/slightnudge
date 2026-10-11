import { bridgeClient } from '../lib/slightnudge/next-source-adapter';
import fs from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`✅ [PASS] ${message}`);
}

async function runAdapterTests() {
  console.log('====================================================');
  console.log('🧪 SLIGHTNUDGE ADAPTER & ASSET REGEX TESTS');
  console.log('====================================================\n');

  // 1. Stock loader has eslint-disable
  const loaderPath = path.resolve('lib/slightnudge/next-source-loader.cjs');
  const loaderContent = fs.readFileSync(loaderPath, 'utf8');
  assert(loaderContent.startsWith('/* eslint-disable */'), 'next-source-loader.cjs starts with /* eslint-disable */');

  // 2. bridgeClient has valid JS syntax and valid regex
  assert(typeof bridgeClient === 'string' && bridgeClient.length > 0, 'bridgeClient script is generated as a string');

  // Verify bridgeClient does not have unescaped malformed regex like /^/slightnudge-assets/
  assert(!bridgeClient.includes('/^/slightnudge-assets/'), 'bridgeClient does NOT contain malformed /^/slightnudge-assets/ regex');

  // Extract the asset-path regex from bridgeClient
  const regexMatch = bridgeClient.match(/\/(\^\\\/slightnudge-assets.+?)\/([gimsuy]*)\.test/);
  assert(Boolean(regexMatch), 'Found asset-path regex pattern in bridgeClient script');

  const patternBody = regexMatch![1];
  const flags = regexMatch![2];
  const generatedRegex = new RegExp(patternBody, flags);

  // Positive test cases
  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  assert(generatedRegex.test(`/slightnudge-assets/${validUuid}.png`), 'Regex matches valid PNG asset path');
  assert(generatedRegex.test(`/slightnudge-assets/${validUuid}.jpg`), 'Regex matches valid JPG asset path');
  assert(generatedRegex.test(`/slightnudge-assets/${validUuid}.jpeg`), 'Regex matches valid JPEG asset path');
  assert(generatedRegex.test(`/slightnudge-assets/${validUuid}.webp`), 'Regex matches valid WEBP asset path');
  assert(generatedRegex.test(`/slightnudge-assets/${validUuid}.gif`), 'Regex matches valid GIF asset path');
  assert(generatedRegex.test(`/slightnudge-assets/${validUuid.toUpperCase()}.PNG`), 'Regex is case-insensitive for UUID and extension');

  // Negative test cases
  assert(!generatedRegex.test(`/slightnudge-assets/${validUuid}.svg`), 'Regex rejects unsupported SVG extension');
  assert(!generatedRegex.test(`/slightnudge-assets/${validUuid}.exe`), 'Regex rejects executable extension');
  assert(!generatedRegex.test(`/slightnudge-assets/not-a-uuid.png`), 'Regex rejects invalid UUID');
  assert(!generatedRegex.test(`/other-dir/${validUuid}.png`), 'Regex rejects non-slightnudge path');
  assert(!generatedRegex.test(`https://malicious.com/slightnudge-assets/${validUuid}.png`), 'Regex rejects absolute URL');
  assert(!generatedRegex.test(`/slightnudge-assets/${validUuid}.png/extra`), 'Regex rejects path with trailing segment');

  // Syntax check: bridgeClient must execute without SyntaxError
  let scriptParseOk = true;
  try {
    new Function(bridgeClient);
  } catch (err) {
    scriptParseOk = false;
    console.error('bridgeClient script parse error:', err);
  }
  assert(scriptParseOk, 'bridgeClient script parses cleanly as valid JavaScript in Function()');

  console.log('\n====================================================');
  console.log('🎉 ALL ADAPTER TESTS PASSED!');
  console.log('====================================================\n');
}

runAdapterTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
