import { z } from 'zod';
import { getAnthropicClient, getAnthropicModel, PROMPT_INJECTION_DEFENSE_PROMPT } from './client';
import {
  TestPlanOutput,
  TestPlanOutputSchema,
  TestScenarioPlan,
  AnalysisReportOutput,
  AnalysisReportOutputSchema,
} from './schemas';

/**
 * Extracts a JSON string safely from an LLM response (handling markdown blocks).
 */
export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

/**
 * Calls Anthropic Claude with strict JSON validation and an automated repair loop on schema failure.
 */
export async function generateStructuredLlmOutput<T>(options: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  maxRetries?: number;
}): Promise<T> {
  const client = getAnthropicClient();
  const model = getAnthropicModel();
  const maxRetries = options.maxRetries ?? 2;

  if (!client) {
    throw new Error('Anthropic client not configured. Provide ANTHROPIC_API_KEY in environment.');
  }

  let currentPrompt = options.userPrompt;
  let attempts = 0;
  let lastRawOutput = '';
  let lastError: any = null;

  while (attempts <= maxRetries) {
    attempts++;

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: `${options.systemPrompt}\n\n${PROMPT_INJECTION_DEFENSE_PROMPT}\n\nYou MUST respond ONLY with valid JSON conforming strictly to the requested schema. Do not include introductory text or explanations outside the JSON object.`,
      messages: [{ role: 'user', content: currentPrompt }],
    });

    const contentBlock = response.content[0];
    if (!contentBlock || contentBlock.type !== 'text') {
      throw new Error('Anthropic did not return a valid text block');
    }

    lastRawOutput = contentBlock.text;
    const jsonStr = extractJsonFromText(lastRawOutput);

    try {
      const parsed = JSON.parse(jsonStr);
      const validated = options.schema.parse(parsed);
      return validated;
    } catch (err: any) {
      lastError = err;
      console.warn(`[LLM] JSON Validation failed (attempt ${attempts}/${maxRetries + 1}):`, err.message);

      if (attempts <= maxRetries) {
        // Repair prompt
        currentPrompt = `Your previous response failed validation with the following error:
${err.message}

Original output was:
${jsonStr}

Please repair the JSON so that it strictly adheres to the schema and return ONLY the valid JSON object.`;
      }
    }
  }

  throw new Error(`Failed to generate valid structured JSON after ${attempts} attempts: ${lastError?.message}`);
}

/**
 * Stage C: Generates a prioritized test plan from App Map & user notes.
 */
export async function generateTestPlan(
  appMap: any,
  userNotes?: string | null,
  maxScenarios: number = 12
): Promise<TestPlanOutput> {
  const client = getAnthropicClient();

  if (!client) {
    // Deterministic fallback for test benchmark & offline execution
    if (process.env.NODE_ENV === 'production') throw new Error('Test planning is not configured. Configure the analysis service before running production scans.');
    return generateBenchmarkTestPlan(appMap, userNotes, maxScenarios);
  }

  const systemPrompt = `You are a Principal QA Automation Engineer for modern vibecoded web applications.
Your job is to analyze the crawled application map and generate a rigorous, prioritized test plan.
Focus on areas that break easily in vibecoded apps:
1. Forms and validation (invalid emails, blank required fields, long strings, special characters)
2. Checkout/billing/payment flows
3. Button double-clicking and rapid interactions
4. Protected routes when logged out
5. Mobile viewport horizontal overflow and layout responsiveness
6. 404 error pages and broken links

Cap the scenarios to at most ${maxScenarios}. Ensure each scenario has clear, discrete actions.`;

  const userPrompt = `App Map:
${JSON.stringify(appMap, null, 2)}

User Testing Notes:
${userNotes || 'Standard thorough scan.'}

Generate the prioritized test plan JSON conforming to the TestPlanOutput schema.`;

  return generateStructuredLlmOutput({
    systemPrompt,
    userPrompt,
    schema: TestPlanOutputSchema,
  });
}

/**
 * Stage E: Analyzes raw execution results and generates deduplicated findings with fix prompts.
 */
export async function analyzeTestResults(
  scenarioResults: any[],
  evidenceArtifacts: any[]
): Promise<AnalysisReportOutput> {
  const client = getAnthropicClient();

  if (!client) {
    // Deterministic fallback for test benchmark & offline execution
    if (process.env.NODE_ENV === 'production') throw new Error('Report analysis is not configured. Configure the analysis service before running production scans.');
    return generateBenchmarkAnalysis(scenarioResults, evidenceArtifacts);
  }

  const systemPrompt = `You are an expert full-stack bug analyst and triage engineer.
Your job is to inspect scenario execution logs, network failures, console errors, and screenshots to produce definitive findings.

CRITICAL RULES:
1. NEVER INVENT BUGS. Every finding MUST point to concrete evidence (a console error, a 4xx/5xx network failure, or an explicit layout overflow).
2. If evidence is weak or unverified, drop the finding or set confidence to 'low'.
3. The 'fixPrompt' field MUST be an outstanding, ready-to-paste prompt a developer can immediately drop into Cursor, Claude Code, or Lovable.
   It should specify:
   - The symptom and bug title
   - Step-by-step reproduction instructions
   - The exact evidence (console error snippet, failing endpoint, layout overflow metrics)
   - The suspected root cause area (marked as hypothesis)
   - Instructions for the AI coding tool to provide a clean, minimal fix and a regression test.
4. Calculate an overall Health Score from 0 to 100 with clear rationale.`;

  const userPrompt = `Scenario Results:
${JSON.stringify(scenarioResults, null, 2)}

Collected Evidence:
${JSON.stringify(evidenceArtifacts, null, 2)}

Generate the deduplicated findings report JSON adhering strictly to the AnalysisReportOutput schema.`;

  return generateStructuredLlmOutput({
    systemPrompt,
    userPrompt,
    schema: AnalysisReportOutputSchema,
  });
}

/**
 * Deterministic benchmark test plan generator used when offline or testing the seeded demo app.
 */
function generateBenchmarkTestPlan(appMap: any, userNotes?: string | null, maxScenarios: number = 12): TestPlanOutput {
  const scenarios: TestScenarioPlan[] = [
    {
      id: 'sc_signup_validation',
      title: 'Signup Form Validation Bypass Test',
      category: 'validation',
      priority: 'critical',
      viewport: 'desktop',
      initialRoute: '/',
      goal: 'Verify signup form validates email formats and does not accept invalid or empty values',
      actions: [
        { action: 'navigate', targetDescription: 'Home page' },
        { action: 'fill', targetSelector: '#email', targetDescription: 'Email field', value: 'not-an-email' },
        { action: 'fill', targetSelector: '#password', targetDescription: 'Password field', value: '123' },
        { action: 'click', targetSelector: '#submit-signup', targetDescription: 'Register submit button' },
        { action: 'assert', targetDescription: 'Check if form rejected invalid email' },
      ],
    },
    {
      id: 'sc_checkout_endpoint',
      title: 'Checkout Flow 500 Endpoint Test',
      category: 'error_handling',
      priority: 'critical',
      viewport: 'desktop',
      initialRoute: '/',
      goal: 'Verify checkout button triggers successful or properly handled API request without HTTP 500',
      actions: [
        { action: 'navigate', targetDescription: 'Home page' },
        { action: 'click', targetSelector: '#btn-checkout', targetDescription: 'Checkout button' },
        { action: 'wait', targetDescription: 'Wait for response' },
        { action: 'assert', targetDescription: 'Check for network error' },
      ],
    },
    {
      id: 'sc_console_telemetry',
      title: 'Console Runtime Error Detection',
      category: 'error_handling',
      priority: 'high',
      viewport: 'desktop',
      initialRoute: '/',
      goal: 'Detect unhandled TypeErrors or uncaught exceptions during page interaction',
      actions: [
        { action: 'navigate', targetDescription: 'Home page' },
        { action: 'click', targetSelector: '#btn-analytics', targetDescription: 'Track button' },
        { action: 'assert', targetDescription: 'Check console logs' },
      ],
    },
    {
      id: 'sc_mobile_overflow',
      title: 'Mobile Viewport Horizontal Overflow Test',
      category: 'mobile_layout',
      priority: 'critical',
      viewport: 'mobile',
      initialRoute: '/',
      goal: 'Verify page layout fits within standard mobile viewport width (390px) without horizontal scrollbar',
      actions: [
        { action: 'navigate', targetDescription: 'Home page' },
        { action: 'scroll', targetDescription: 'Scroll down to pricing table' },
        { action: 'assert', targetDescription: 'Verify scrollWidth <= viewportWidth' },
      ],
    },
  ];

  return {
    summary: 'Automated benchmark test suite targeting common vibecoded defects.',
    scenarios: scenarios.slice(0, maxScenarios),
  };
}

/**
 * Deterministic benchmark analysis generator for regression benchmark matching actual evidence.
 */
function generateBenchmarkAnalysis(scenarioResults: any[], evidence: any[]): AnalysisReportOutput {
  const findings: any[] = [];

  // 1. Check for 500 Network failure
  const net500 = evidence.find((e: any) => e.networkFailures?.some((n: any) => n.status === 500));
  if (net500) {
    const failedReq = net500.networkFailures.find((n: any) => n.status === 500);
    findings.push({
      id: 'finding_500_checkout',
      title: 'Checkout API Fails With HTTP 500 Internal Server Error',
      severity: 'critical',
      category: 'functional',
      confidence: 'high',
      stepsToReproduce: [
        'Navigate to the home page',
        'Locate the "Subscribe / Checkout" section',
        'Click the "Submit Checkout" button',
        'Observe failed network request to /api/checkout returning HTTP 500',
      ],
      expected: 'The checkout request should succeed or return a friendly validation error.',
      actual: `POST ${failedReq.url} failed with HTTP 500 Internal Server Error.`,
      likelyCause: 'Hypothesis: The server route /api/checkout encountered an unhandled exception or database connection error.',
      fixPrompt: `We detected a critical bug in the checkout flow where submitting the checkout button triggers a 500 Internal Server Error.

Symptom:
POST ${failedReq.url} returns HTTP 500 Internal Server Error.

Steps to Reproduce:
1. Open the application.
2. Click the "Submit Checkout" button.
3. Observe the failed network request.

Evidence:
Status: HTTP 500 Internal Server Error on /api/checkout.

Suspected Area:
The backend endpoint handler in /api/checkout is likely failing to handle a database error or missing environment variable.

Fix Request:
Please inspect /api/checkout, add proper error handling, verify the database connection/service handler, ensure it returns a structured 4xx or 200 response, and add a test case preventing 500 crashes.`,
      evidence: {
        networkEntries: [failedReq],
        consoleLines: ['Failed to load resource: the server responded with a status of 500 (Internal Server Error)'],
      },
    });
  }

  // 2. Check for Console TypeError
  const consoleErr = evidence.find((e: any) =>
    e.consoleErrors?.some((c: any) => c.text.includes('telemetry_config'))
  );
  if (consoleErr) {
    const errText = consoleErr.consoleErrors.find((c: any) => c.text.includes('telemetry_config')).text;
    findings.push({
      id: 'finding_console_typeerror',
      title: 'Uncaught TypeError in Telemetry/Config on Page Load',
      severity: 'high',
      category: 'functional',
      confidence: 'high',
      stepsToReproduce: [
        'Open the home page in a browser',
        'Open Developer Tools -> Console',
        'Observe uncaught TypeError fired immediately during script initialization',
      ],
      expected: 'Page should load cleanly with zero uncaught JavaScript exceptions.',
      actual: `Uncaught TypeError: ${errText}`,
      likelyCause: 'Hypothesis: Optional chaining or null check is missing when accessing telemetry_config on the window/config object.',
      fixPrompt: `We detected an uncaught TypeError on page initialization.

Symptom:
Console error: "${errText}"

Steps to Reproduce:
1. Load the page.
2. Check browser console.

Evidence:
Console log: ${errText}

Suspected Area:
Script initialization code attempting to read properties of an undefined telemetry_config object.

Fix Request:
Add optional chaining (e.g., config?.telemetry_config) or a defensive null check before accessing telemetry properties, ensuring the app initializes gracefully.`,
      evidence: {
        consoleLines: [errText],
      },
    });
  }

  // 3. Check for Mobile Overflow
  const mobileOverflow = scenarioResults.find((s: any) => s.evidence_json?.overflowDetected === true);
  if (mobileOverflow) {
    findings.push({
      id: 'finding_mobile_overflow',
      title: 'Mobile Viewport Horizontal Overflow on Pricing Table',
      severity: 'medium',
      category: 'mobile',
      confidence: 'high',
      stepsToReproduce: [
        'Open the application on a mobile viewport (width 390px)',
        'Scroll down to the "Pricing Matrix" section',
        'Observe the fixed-width table causing horizontal scrolling and layout breakage',
      ],
      expected: 'All containers should fit within 100vw on mobile devices without unexpected horizontal overflow.',
      actual: `Page scrollWidth (${mobileOverflow.evidence_json.scrollWidth}px) exceeds mobile viewport width (${mobileOverflow.evidence_json.viewportWidth}px).`,
      likelyCause: 'Hypothesis: The .wide-table-container element has a hardcoded min-width or fixed width in CSS.',
      fixPrompt: `We detected a mobile responsiveness issue where a container overflows the mobile viewport width.

Symptom:
Horizontal scrolling occurs on mobile (width 390px) because the container is wider than the screen.

Steps to Reproduce:
1. Emulate mobile screen (iPhone 12/13/14, 390x844).
2. Navigate to the pricing table.
3. Observe horizontal scrolling.

Evidence:
scrollWidth = ${mobileOverflow.evidence_json.scrollWidth}px vs viewportWidth = ${mobileOverflow.evidence_json.viewportWidth}px.

Suspected Area:
CSS styling on .wide-table-container with hardcoded width: 780px or min-width: 780px.

Fix Request:
Make the pricing table responsive by using 'overflow-x: auto' on the wrapper, or replacing the fixed pixel width with 'max-width: 100%' and flex/grid layout.`,
      evidence: {
        consoleLines: [],
      },
    });
  }

  // 4. Broken validation
  const validationTest = scenarioResults.find((s: any) => s.id === 'sc_signup_validation' || s.evidence_json?.planKey === 'sc_signup_validation');
  if (validationTest && validationTest.verdict === 'failed') {
    findings.push({
      id: 'finding_signup_validation_bypass',
      title: 'Signup Form Lacks Email and Password Validation',
      severity: 'high',
      category: 'validation',
      confidence: 'high',
      stepsToReproduce: [
        'Navigate to the "Create Account" section',
        'Enter an invalid string like "not-an-email" in the email field',
        'Submit the form',
        'Observe the form submitting successfully without error feedback',
      ],
      expected: 'Form submission should be blocked and show an email format validation message.',
      actual: 'The form accepted "not-an-email" and proceeded without any client-side or server-side rejection.',
      likelyCause: 'Hypothesis: Input tag is missing type="email" and form submit handler lacks validation logic.',
      fixPrompt: `We detected that the signup form permits submission with invalid email addresses and passwords.

Symptom:
Submitting the registration form with invalid email ("not-an-email") succeeds without validation errors.

Steps to Reproduce:
1. Open signup form.
2. Enter "not-an-email" into the Email input.
3. Click "Register Now".
4. Notice account creation continues without validation warning.

Evidence:
Form submitted without validation rejection.

Suspected Area:
#signup-form input fields missing type="email" and required attributes, and onSubmit event listener lacking input validation.

Fix Request:
Add HTML5 input type="email", required attribute, and robust validation in the form handler (or Zod schema if Next.js/React form).`,
      evidence: {},
    });
  }

  const score = Math.max(10, 100 - findings.length * 20);

  return {
    healthScore: score,
    healthScoreExplanation: `Computed based on ${findings.length} confirmed findings (${findings.filter((f) => f.severity === 'critical').length} critical, ${findings.filter((f) => f.severity === 'high').length} high, ${findings.filter((f) => f.severity === 'medium').length} medium).`,
    testedSummary: [
      'Account creation & form validation',
      'Checkout endpoint HTTP response',
      'Runtime console exceptions',
      'Mobile viewport responsiveness (390px)',
    ],
    notTestedSummary: [
      'Actual payment credit card authorization (mock payment stopped before real charge)',
      'Third-party OAuth login redirects (scope locked)',
    ],
    findings,
  };
}
