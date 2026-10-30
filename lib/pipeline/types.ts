import { FindingRecord, RunLimits, RunRecord, ScenarioRecord } from '../db/types';
import { AnalysisReportOutput, TestPlanOutput } from '../llm/schemas';

export interface PipelineConfig {
  allowLocalhost?: boolean;
  skipOwnershipCheck?: boolean; // For CLI benchmark and local testing
  limits?: RunLimits;
}

export interface AppMapRoute {
  url: string;
  path: string;
  title?: string;
  hasForms: boolean;
  formsCount: number;
  interactiveElements: {
    buttons: string[];
    inputs: string[];
    links: string[];
  };
}

export interface AppMap {
  targetUrl: string;
  hostname: string;
  frameworkHints: string[];
  pagesFound: number;
  routes: AppMapRoute[];
  authRoutes: string[];
  checkoutRoutes: string[];
}

export interface PipelineContext {
  run: RunRecord;
  targetUrl: string;
  hostname: string;
  config: PipelineConfig;
  appMap?: AppMap;
  testPlan?: TestPlanOutput;
  scenarioKeys?: Record<string, string>;
  scenarioResults: ScenarioRecord[];
  analysis?: AnalysisReportOutput;
  findings: FindingRecord[];
  artifacts: Array<{
    type: 'screenshot' | 'video' | 'pdf';
    path: string;
    meta?: any;
  }>;
  hyperbrowserSessionIds: string[];
  totalCreditsUsed: number;
}
