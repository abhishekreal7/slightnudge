import { NextResponse } from 'next/server';
import { getDatabaseRepository } from '@/lib/db/client';

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

    const findings = await repo.getFindings(id);

    // Generate printable HTML document formatted for PDF printing
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShipCheck QA Audit Report - ${run.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
    h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
    .scorecard { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between; }
    .score { font-size: 32px; font-weight: 800; color: #2563eb; }
    .finding { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .severity { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-bottom: 8px; }
    .sev-critical { background: #fee2e2; color: #b91c1c; }
    .sev-high { background: #ffedd5; color: #c2410c; }
    .sev-medium { background: #fef3c7; color: #b45309; }
    .sev-low { background: #f1f5f9; color: #475569; }
    .prompt { background: #0f172a; color: #f8fafc; font-family: monospace; font-size: 11px; padding: 12px; border-radius: 6px; white-space: pre-wrap; margin-top: 12px; }
  </style>
</head>
<body>
  <h1>ShipCheck QA Audit Report</h1>
  <div class="meta">
    Run ID: ${run.id} | Generated: ${new Date().toUTCString()} | Status: ${run.status}
  </div>

  <div class="scorecard">
    <div>
      <div style="font-weight: 700;">Overall Application Health Score</div>
      <div style="font-size: 12px; color: #64748b;">Automated testing completed on cloud Chromium desktop and mobile.</div>
    </div>
    <div class="score">${run.health_score ?? 100}/100</div>
  </div>

  <h2>Confirmed Findings (${findings.length})</h2>
  ${findings
    .map(
      (f) => `
    <div class="finding">
      <span class="severity sev-${f.severity}">${f.severity} - ${f.category}</span>
      <h3 style="margin: 4px 0 8px; font-size: 16px;">${f.title}</h3>
      <p style="font-size: 12px; color: #475569;"><strong>Expected:</strong> ${f.body_json.expected || 'N/A'}</p>
      <p style="font-size: 12px; color: #b91c1c;"><strong>Actual:</strong> ${f.body_json.actual || 'N/A'}</p>
      <p style="font-size: 12px; color: #1e3a8a;"><strong>Suspected Area:</strong> ${f.body_json.likelyCause || 'N/A'}</p>
      
      <div style="font-size: 11px; font-weight: 700; color: #2563eb; margin-top: 12px;">AI Fix Prompt:</div>
      <div class="prompt">${f.fix_prompt}</div>
    </div>
  `
    )
    .join('')}
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="shipcheck-report-${run.id}.html"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate report export' }, { status: 500 });
  }
}
