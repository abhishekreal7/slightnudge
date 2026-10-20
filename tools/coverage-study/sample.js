import fs from 'fs';
import path from 'path';
import { parseCoverageStudy } from './parse-study.js';

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function sampleCommits(seed = 42, countPerBucket = 10) {
  const rows = parseCoverageStudy();
  const rng = mulberry32(seed);

  const buckets = {
    REPRODUCED: rows.filter(r => r.verdict === 'REPRODUCED'),
    PARTIAL: rows.filter(r => r.verdict === 'PARTIAL'),
    REFUSED: rows.filter(r => r.verdict === 'REFUSED'),
    UNSUPPORTED: rows.filter(r => r.verdict === 'UNSUPPORTED'),
  };

  const sampled = [];

  for (const [bucket, items] of Object.entries(buckets)) {
    // Fisher-Yates shuffle with fixed seed
    const pool = [...items];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, countPerBucket);
    sampled.push(...picked);
  }

  return { seed, sampled };
}

if (process.argv[1] && process.argv[1].endsWith('sample.js')) {
  const { seed, sampled } = sampleCommits(42, 10);
  console.log(`Sampled 40 commits using Mulberry32 PRNG with SEED=${seed}`);
  sampled.forEach(s => {
    console.log(`[${s.verdict}] #${s.idx} ${s.repo}@${s.sha} (${s.category})`);
  });
}
