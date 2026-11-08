import assert from 'node:assert/strict';
import { perfSync, perfAsync, perfCount, withPerfRequest, perfDelay } from '../lib/slightnudge/perf-stages';

const environment: Record<string, string | undefined> = process.env;
const saved = { ...environment };
const request = new Request('http://example.invalid/api');
const canaries = ['C:/private/project.tsx', '<h1>private source</h1>', 'private-session-token', 'record-id-123'];
const handler = withPerfRequest(async () => {
  perfSync('auth', () => 1);
  perfSync(canaries.join(' ') as Parameters<typeof perfSync>[0], () => 2);
  perfCount('history-read-bytes', 123);
  await perfAsync('inspect', async () => { await Promise.resolve(); perfSync('ast-project', () => 3); });
  perfDelay();
  return new Response(JSON.stringify({ unchanged: true }), { status: 409, headers: { 'x-original': 'kept' } });
});
try {
  for (const mode of ['development', 'production']) for (const flag of [undefined, '', '0', 'true', '1']) {
    environment.NODE_ENV = mode;
    if (flag === undefined) delete environment.SLIGHTNUDGE_TEST; else environment.SLIGHTNUDGE_TEST = flag;
    environment.SLIGHTNUDGE_PERF_DELAY_MS = '500';
    const started = performance.now(), response = await handler(request);
    assert.equal(response.status, 409); assert.equal(response.headers.get('x-original'), 'kept');
    assert.equal(await response.text(), '{"unchanged":true}');
    const header = response.headers.get('Server-Timing');
    if (mode === 'development' && flag === '1') {
      assert.ok(header); assert.match(header, /auth;dur=/); assert.match(header, /ast-project-count;dur=1/);
      assert.match(header, /history-read-bytes;dur=123/); assert.match(header, /response-bytes;dur=18/);
      assert.ok(performance.now() - started >= 490, 'Guarded test-only delay runs');
      assert.ok(!canaries.some(value => header.includes(value))); assert.ok(!/private|record-id/.test(header));
    } else {
      assert.equal(header, null, 'Inactive instrumentation adds no header');
      assert.ok(performance.now() - started < 450, 'Inactive instrumentation never delays the request');
    }
  }
  environment.NODE_ENV = 'development'; environment.SLIGHTNUDGE_TEST = '1'; delete environment.SLIGHTNUDGE_PERF_DELAY_MS;
  const concurrent = withPerfRequest(async (request: Request) => {
    const count = Number(new URL(request.url).searchParams.get('count'));
    await perfAsync('inspect', async () => { await new Promise(resolve => setTimeout(resolve, 5)); perfCount('history-read-bytes', count); });
    return new Response('ok');
  });
  const responses = await Promise.all([11, 29].map(count => concurrent(new Request('http://example.invalid/?count=' + count))));
  assert.match(responses[0].headers.get('Server-Timing') || '', /history-read-bytes;dur=11(?:,|$)/);
  assert.match(responses[1].headers.get('Server-Timing') || '', /history-read-bytes;dur=29(?:,|$)/);
  console.log('PASS perf guard: exact opt-in, production/unset/other values inert, no headers/delay when inactive, unchanged status/body/headers, fixed private-free metrics and concurrent request isolation');
} finally { for (const key of new Set([...Object.keys(environment), ...Object.keys(saved)])) { if (saved[key] === undefined) delete environment[key]; else environment[key] = saved[key]; } }
