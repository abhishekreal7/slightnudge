import fs from 'node:fs';
import path from 'node:path';
import { withSourceOperationLock, SourceOperationBusyError } from '../../lib/slightnudge/source-operation-lock';

const [root, mode] = process.argv.slice(2);
try {
  withSourceOperationLock(path.join(root, 'locks'), () => {
    if (mode === 'hold') {
      fs.writeFileSync(path.join(root, 'ready'), 'ready');
      const deadline = Date.now() + 10000;
      while (!fs.existsSync(path.join(root, 'go'))) {
        if (Date.now() > deadline) throw new Error('Test barrier timed out');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
    }
    const inside = path.join(root, 'inside');
    fs.mkdirSync(inside); // An overlap must fail, rather than look like serialized work.
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40);
      const counter = path.join(root, 'counter');
      fs.writeFileSync(counter, String((fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0) + 1));
    } finally { fs.rmdirSync(inside); }
  });
} catch (error) {
  if (error instanceof SourceOperationBusyError) process.exitCode = 75;
  else { console.error(error); process.exitCode = 1; }
}
