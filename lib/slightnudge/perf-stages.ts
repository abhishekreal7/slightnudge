import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

const stages = ['auth', 'lock', 'history-read', 'history-mutation', 'ast-project', 'ast-parse', 'inspect', 'tailwind-compile', 'tailwind-lookup', 'syntactic-parse', 'cas-read', 'atomic-write', 'receipt-write', 'journal-write', 'history-write', 'prewrite-delay'] as const;
const counters = ['history-read-bytes', 'history-write-bytes', 'tailwind-hit', 'tailwind-miss', 'response-bytes'] as const;
export type PerfStage = typeof stages[number];
type Metric = { duration: number; total: number; count: number };
type Frame = { children: number };
type Context = { metrics: Map<PerfStage, Metric>; counts: Map<typeof counters[number], number>; frame?: Frame };
const storage = new AsyncLocalStorage<Context>();
const enabled = () => process.env.SLIGHTNUDGE_TEST === '1' && process.env.NODE_ENV !== 'production';

function span(stage: PerfStage) {
  const context = enabled() && storage.getStore();
  if (!context || !stages.includes(stage)) return undefined;
  const frame = { children: 0 }, started = performance.now();
  const finish = () => {
    const total = performance.now() - started;
    const metric = context.metrics.get(stage) || { duration: 0, total: 0, count: 0 };
    metric.total += total; metric.duration += Math.max(0, total - frame.children); metric.count++;
    context.metrics.set(stage, metric); if (context.frame) context.frame.children += total;
  };
  return { context: { ...context, frame }, finish };
}
export function perfSync<T>(stage: PerfStage, operation: () => T): T {
  const current = span(stage); if (!current) return operation();
  try { return storage.run(current.context, operation); } finally { current.finish(); }
}
export async function perfAsync<T>(stage: PerfStage, operation: () => Promise<T>): Promise<T> {
  const current = span(stage); if (!current) return operation();
  try { return await storage.run(current.context, operation); } finally { current.finish(); }
}
export function perfCount(name: typeof counters[number], value = 1): void {
  const context = enabled() && storage.getStore();
  if (context && counters.includes(name) && Number.isFinite(value) && value >= 0) context.counts.set(name, (context.counts.get(name) || 0) + value);
}
export function perfTimer(stage: PerfStage): () => void {
  const current = span(stage); let finished = false;
  return () => { if (!finished) { finished = true; current?.finish(); } };
}
/** Only fixed metric names and numeric aggregates can leave the request. */
export function withPerfRequest(operation: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (!enabled()) return operation(request);
    const context: Context = { metrics: new Map(), counts: new Map() };
    return storage.run(context, async () => {
      const started = performance.now(), response = await operation(request);
      perfCount('response-bytes', (await response.clone().arrayBuffer()).byteLength);
      const values = ['request;dur=' + (performance.now() - started).toFixed(3)];
      for (const [name, metric] of context.metrics) values.push(`${name};dur=${metric.duration.toFixed(3)}`, `${name}-total;dur=${metric.total.toFixed(3)}`, `${name}-count;dur=${metric.count}`);
      for (const [name, value] of context.counts) values.push(`${name};dur=${value}`);
      const headers = new Headers(response.headers); headers.set('Server-Timing', values.join(','));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    });
  };
}
/** Measurement fixture hook, independent of any source path or stored payload. */
export function perfDelay(): void {
  if (!enabled()) return;
  const delay = Number(process.env.SLIGHTNUDGE_PERF_DELAY_MS);
  if (![0, 500, 1500].includes(delay)) return;
  perfSync('prewrite-delay', () => { if (delay) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay); });
}
