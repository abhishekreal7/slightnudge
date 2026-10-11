import { NextResponse } from 'next/server';
import { getDatabaseRepository } from '@/lib/db/client';
import { FindingRecord } from '@/lib/db/types';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repo = getDatabaseRepository();
    const run = await repo.getRun(id);

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const scenarios = await repo.getScenarios(id);
    const rawFindings = await repo.getFindings(id);

    let processedFindings: FindingRecord[] = [];
    let lockedCount = 0;

    if (run.kind === 'preview') {
      // Server-side blurring: return ONE finding fully, redact the rest
      if (rawFindings.length > 0) {
        processedFindings.push(rawFindings[0]);
      }

      if (rawFindings.length > 1) {
        lockedCount = rawFindings.length - 1;
        for (let i = 1; i < rawFindings.length; i++) {
          processedFindings.push({
            id: `locked_${i}`,
            run_id: run.id,
            severity: rawFindings[i].severity,
            category: rawFindings[i].category,
            title: 'Protected Finding (Paid Scan Only)',
            body_json: {
              stepsToReproduce: ['[Redacted - Unlock with full scan]'],
              expected: '[Redacted]',
              actual: '[Redacted]',
              evidence: {},
            },
            fix_prompt: '[Unlock full scan to view ready-to-paste fix prompt]',
            confidence: rawFindings[i].confidence,
          });
        }
      }
    } else {
      processedFindings = rawFindings;
    }

    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        kind: run.kind,
        status: run.status,
        stage: run.stage,
        progress: run.progress,
        notes: run.notes,
        health_score: run.health_score,
        started_at: run.started_at,
        finished_at: run.finished_at,
        error: run.error,
        cost_credits: run.cost_credits,
      },
      scenariosCount: scenarios.length,
      findings: processedFindings,
      totalFindingsCount: rawFindings.length,
      lockedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to retrieve run details' }, { status: 500 });
  }
}
