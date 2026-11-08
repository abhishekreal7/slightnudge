import assert from 'node:assert/strict';
import {
  enqueueFileOperation,
  getFileQueueStatus,
  subscribeQueueState,
  cancelPendingFileOperations,
  type QueueNotification,
} from '../lib/slightnudge/client';

console.log('Testing client-side ordered operation queue...');

async function runTests() {
  // 1. Operations on the same file run strictly sequentially (FIFO)
  {
    const file = 'app/components/Header.tsx';
    const executionOrder: number[] = [];
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const op1 = enqueueFileOperation(file, async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise(resolve => setTimeout(resolve, 50));
      executionOrder.push(1);
      concurrentCount--;
      return 'res1';
    });

    const op2 = enqueueFileOperation(file, async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise(resolve => setTimeout(resolve, 20));
      executionOrder.push(2);
      concurrentCount--;
      return 'res2';
    });

    const [r1, r2] = await Promise.all([op1, op2]);
    assert.equal(r1, 'res1');
    assert.equal(r2, 'res2');
    assert.deepEqual(executionOrder, [1, 2], 'Operations on same file must complete in FIFO order');
    assert.equal(maxConcurrent, 1, 'Operations on same file must NEVER run concurrently');
  }
  console.log('PASS: Same-file operations are sequential and never concurrent');

  // 2. Operations on different files can run concurrently
  {
    const fileA = 'app/page.tsx';
    const fileB = 'app/footer.tsx';
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const opA = enqueueFileOperation(fileA, async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise(resolve => setTimeout(resolve, 50));
      concurrentCount--;
      return 'A';
    });

    const opB = enqueueFileOperation(fileB, async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise(resolve => setTimeout(resolve, 50));
      concurrentCount--;
      return 'B';
    });

    await Promise.all([opA, opB]);
    assert.equal(maxConcurrent, 2, 'Operations on different files should run concurrently');
  }
  console.log('PASS: Different-file operations run concurrently');

  // 3. Failed operation calls onRollback and does not break subsequent operations
  {
    const file = 'app/failing.tsx';
    let rolledBack = false;

    const failingOp = enqueueFileOperation(
      file,
      async () => {
        throw new Error('Disk full');
      },
      {
        onRollback: () => {
          rolledBack = true;
        },
      }
    );

    await assert.rejects(failingOp, /Disk full/);
    assert.equal(rolledBack, true, 'Failed operation must trigger onRollback');

    // Subsequent operation on the same file should still work
    const recoveryOp = await enqueueFileOperation(file, async () => 'recovered');
    assert.equal(recoveryOp, 'recovered');
  }
  console.log('PASS: Rollback on error and queue recovers for next operations');

  // 4. Saving -> Saved indicator notifications
  {
    const notifications: QueueNotification[] = [];
    const unsubscribe = subscribeQueueState(state => {
      notifications.push({ ...state });
    });

    await enqueueFileOperation('app/saved.tsx', async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      return 'ok';
    });

    // Wait for saved state transition
    await new Promise(resolve => setTimeout(resolve, 60));
    unsubscribe();

    const states = notifications.map(n => n.status);
    assert.ok(states.includes('saving'), 'Notification stream must include saving state');
    assert.ok(states.includes('saved'), 'Notification stream must include saved state');
  }
  console.log('PASS: Saving and Saved indicator notifications');

  // 5. Cancel pending operations (e.g. for Discard / Undo)
  {
    const file = 'app/cancel.tsx';
    let op2Started = false;

    const op1 = enqueueFileOperation(file, async () => {
      await new Promise(resolve => setTimeout(resolve, 60));
      return 'op1';
    });

    const op2 = enqueueFileOperation(file, async () => {
      op2Started = true;
      return 'op2';
    });

    const rejection = assert.rejects(op2, /cancelled/i);

    // Cancel pending unstarted operations on this file
    const cancelledCount = cancelPendingFileOperations(file);
    assert.equal(cancelledCount, 1, 'Should cancel 1 pending unstarted operation');

    await op1;
    await rejection;
    assert.equal(op2Started, false, 'Cancelled operation must not start');
  }
  console.log('PASS: Cancel pending operations');

  console.log('\nALL CLIENT QUEUE TESTS PASSED!\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
