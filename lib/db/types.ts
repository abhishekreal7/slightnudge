export type RunKind = 'preview' | 'full';
export type RunStatus = 'queued' | 'running' | 'partial' | 'completed' | 'failed' | 'refunded';
export type PipelineStageName = 'preflight' | 'discovery' | 'planning' | 'execution' | 'analysis' | 'report';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory =
  | 'functional'
  | 'validation'
  | 'UX'
  | 'mobile'
  | 'accessibility'
  | 'performance'
  | 'security-hygiene';
export type FindingConfidence = 'high' | 'medium' | 'low';
export type ScenarioVerdict = 'passed' | 'failed' | 'skipped' | 'error';
export type OwnershipMethod = 'meta_tag' | 'file_upload' | 'dns_txt';

export interface ProfileRecord {
  id: string;
  email: string;
  created_at: string;
}

export interface SiteRecord {
  id: string;
  user_id: string;
  url: string;
  hostname: string;
  verification_token: string;
  ownership_method: OwnershipMethod | null;
  ownership_verified_at: string | null;
  created_at: string;
}

export interface RunLimits {
  maxSteps?: number;
  maxMinutes?: number;
  maxScenarios?: number;
  maxPages?: number;
  maxCostCredits?: number;
}

export interface RunRecord {
  id: string;
  user_id: string;
  site_id: string;
  kind: RunKind;
  status: RunStatus;
  stage: PipelineStageName;
  progress: number;
  notes: string | null;
  credentials_encrypted: string | null;
  limits_json: RunLimits;
  hyperbrowser_session_ids: string[];
  cost_credits: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  health_score: number | null;
  created_at: string;
}

export interface ScenarioRecord {
  id: string;
  run_id: string;
  title: string;
  viewport: 'desktop' | 'mobile';
  verdict: ScenarioVerdict;
  steps_json: Array<{
    stepNumber: number;
    action: string;
    goal?: string;
    screenshotId?: string;
    error?: string;
  }>;
  evidence_json: {
    consoleErrors?: Array<{ type: string; text: string }>;
    networkFailures?: Array<{ url: string; status?: number; error?: string }>;
    screenshotIds?: string[];
    overflowDetected?: boolean;
    scrollWidth?: number;
    viewportWidth?: number;
    videoTimestampRange?: { startSec: number; endSec: number };
  };
  created_at?: string;
}

export interface FindingBody {
  stepsToReproduce: string[];
  expected: string;
  actual: string;
  likelyCause?: string;
  evidence: {
    screenshotIds?: string[];
    consoleLines?: string[];
    networkEntries?: Array<{ url: string; status?: number; error?: string }>;
    videoTimestamp?: number;
  };
}

export interface FindingRecord {
  id: string;
  run_id: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  body_json: FindingBody;
  fix_prompt: string;
  confidence: FindingConfidence;
  created_at?: string;
}

export interface ArtifactRecord {
  id: string;
  run_id: string;
  type: 'screenshot' | 'video' | 'pdf';
  storage_path: string;
  meta_json: Record<string, any>;
  created_at?: string;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  run_id: string;
  dodo_payment_id: string;
  amount_usd: number;
  status: 'succeeded' | 'failed' | 'refunded';
  created_at?: string;
}

export interface JobRecord {
  id: string;
  run_id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  attempts: number;
  run_after: string;
  locked_by: string | null;
  locked_at: string | null;
  last_error: string | null;
  created_at?: string;
}
