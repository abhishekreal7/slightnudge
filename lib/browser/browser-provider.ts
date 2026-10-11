export type ViewportMode = 'desktop' | 'mobile';

export interface ViewportConfig {
  width: number;
  height: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  userAgent?: string;
}

export const VIEWPORT_PRESETS: Record<ViewportMode, ViewportConfig> = {
  desktop: {
    width: 1280,
    height: 800,
    isMobile: false,
    hasTouch: false,
  },
  mobile: {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  },
};

export interface CreateSessionOptions {
  viewport?: ViewportMode | ViewportConfig;
  enableVideo?: boolean;
  enableWebRecording?: boolean;
  timeoutMinutes?: number;
}

export interface BrowserSession {
  id: string;
  wsEndpoint?: string;
  liveUrl?: string;
  viewport: ViewportConfig;
  createdAt: string;
}

export interface AgentTaskOptions {
  maxSteps?: number;
  messageContext?: string;
}

export interface AgentTaskResult {
  jobId?: string;
  success: boolean;
  steps: Array<{
    stepNumber: number;
    action: string;
    goal?: string;
    error?: string;
  }>;
  summary: string;
  error?: string;
}

export interface NetworkFailure {
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  errorText?: string;
  timestamp: number;
}

export interface ConsoleMessageEntry {
  type: string;
  text: string;
  location?: string;
  timestamp: number;
}

export interface RecordedEvidence {
  consoleErrors: ConsoleMessageEntry[];
  networkFailures: NetworkFailure[];
  screenshots: Array<{
    id: string;
    label: string;
    bufferBase64: string;
    timestamp: number;
  }>;
  durationMs: number;
}

export interface SessionCostReport {
  creditsUsed: number;
  browserTimeCredits: number;
  proxyDataCredits: number;
  estimatedCostUsd: number;
}

export interface BrowserProvider {
  name: string;
  createSession(options?: CreateSessionOptions): Promise<BrowserSession>;
  connectPlaywright(session: BrowserSession): Promise<{
    browser: any;
    context: any;
    page: any;
  }>;
  runAgentTask(sessionId: string, task: string, options?: AgentTaskOptions): Promise<AgentTaskResult>;
  getRecordingUrl(sessionId: string): Promise<{ videoUrl?: string; webUrl?: string }>;
  getSessionCost(sessionId: string): Promise<SessionCostReport>;
  stopSession(sessionId: string): Promise<void>;
}
