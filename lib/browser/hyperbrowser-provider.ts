import { Hyperbrowser } from '@hyperbrowser/sdk';
import { chromium } from 'playwright-core';
import {
  BrowserProvider,
  BrowserSession,
  CreateSessionOptions,
  SessionCostReport,
  VIEWPORT_PRESETS,
  ViewportConfig,
  AgentTaskOptions,
  AgentTaskResult,
} from './browser-provider';

export class HyperbrowserProvider implements BrowserProvider {
  public readonly name = 'hyperbrowser';
  private client: Hyperbrowser;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.HYPERBROWSER_API_KEY;
    if (!key) {
      throw new Error('Hyperbrowser API key missing. Set HYPERBROWSER_API_KEY in environment.');
    }
    this.client = new Hyperbrowser({ apiKey: key });
  }

  async createSession(options?: CreateSessionOptions): Promise<BrowserSession> {
    let vp: ViewportConfig = VIEWPORT_PRESETS.desktop;
    if (options?.viewport) {
      if (typeof options.viewport === 'string') {
        vp = VIEWPORT_PRESETS[options.viewport];
      } else {
        vp = options.viewport;
      }
    }

    const session = await this.client.sessions.create({
      screen: {
        width: vp.width,
        height: vp.height,
      },
      enableVideoWebRecording: options?.enableVideo ?? true,
      enableWebRecording: options?.enableWebRecording ?? true,
      enableLogCapture: true,
      useStealth: true,
      acceptCookies: true,
    });

    return {
      id: session.id,
      wsEndpoint: session.wsEndpoint,
      liveUrl: session.liveUrl,
      viewport: vp,
      createdAt: session.createdAt || new Date().toISOString(),
    };
  }

  async connectPlaywright(session: BrowserSession): Promise<{
    browser: any;
    context: any;
    page: any;
  }> {
    if (!session.wsEndpoint) {
      throw new Error(`Session ${session.id} does not have a wsEndpoint`);
    }

    const browser = await chromium.connectOverCDP(session.wsEndpoint);
    const existingContexts = browser.contexts();
    let context = existingContexts.length > 0 ? existingContexts[0] : await browser.newContext();

    const pages = context.pages();
    let page = pages.length > 0 ? pages[0] : await context.newPage();

    // Set viewport dimensions
    await page.setViewportSize({
      width: session.viewport.width,
      height: session.viewport.height,
    });

    return { browser, context, page };
  }

  async runAgentTask(
    sessionId: string,
    task: string,
    options?: AgentTaskOptions
  ): Promise<AgentTaskResult> {
    try {
      const response = await this.client.agents.browserUse.startAndWait({
        task,
        sessionId,
        maxSteps: options?.maxSteps || 15,
        messageContext: options?.messageContext,
      });

      const rawResp = response as any;
      const steps = (rawResp.steps || []).map((step: any, index: number) => ({
        stepNumber: index + 1,
        action: typeof step === 'string' ? step : JSON.stringify(step.action || step),
        goal: step.goal,
        error: step.error,
      }));

      return {
        jobId: rawResp.id || sessionId,
        success: rawResp.status === 'completed',
        steps,
        summary: rawResp.output || 'Browser-use agent task completed',
      };
    } catch (err: any) {
      return {
        success: false,
        steps: [],
        summary: `Agent execution failed: ${err.message}`,
        error: err.message,
      };
    }
  }

  async getRecordingUrl(sessionId: string): Promise<{ videoUrl?: string; webUrl?: string }> {
    let videoUrl: string | undefined;
    let webUrl: string | undefined;

    try {
      const videoResp = await this.client.sessions.getVideoRecordingURL(sessionId);
      videoUrl = (videoResp as any)?.recordingUrl || (videoResp as any)?.url;
    } catch (err) {
      // Recording might still be rendering or disabled
    }

    try {
      const webResp = await this.client.sessions.getRecordingURL(sessionId);
      webUrl = (webResp as any)?.recordingUrl || (webResp as any)?.url;
    } catch (err) {
      // rrweb recording might be pending
    }

    return { videoUrl, webUrl };
  }

  async getSessionCost(sessionId: string): Promise<SessionCostReport> {
    try {
      const session = await this.client.sessions.get(sessionId);
      const creditsUsed = session.creditsUsed ?? session.creditBreakdown?.creditsUsed ?? 0;
      const browserTimeCredits = session.creditBreakdown?.browserTimeCreditsUsed ?? 0;
      const proxyDataCredits = session.creditBreakdown?.proxyDataCreditsUsed ?? 0;

      // 1 credit is typically $0.01 to $0.05 depending on plan, default to standard tier estimate
      const estimatedCostUsd = creditsUsed * 0.02;

      return {
        creditsUsed,
        browserTimeCredits,
        proxyDataCredits,
        estimatedCostUsd,
      };
    } catch (err) {
      return {
        creditsUsed: 0,
        browserTimeCredits: 0,
        proxyDataCredits: 0,
        estimatedCostUsd: 0,
      };
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      await this.client.sessions.stop(sessionId);
    } catch (err: any) {
      // Suppress already closed errors
      if (!err?.message?.includes('already') && !err?.message?.includes('not found')) {
        console.warn(`[Hyperbrowser] Warning stopping session ${sessionId}:`, err.message);
      }
    }
  }
}
