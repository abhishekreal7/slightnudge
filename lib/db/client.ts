import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ArtifactRecord,
  FindingRecord,
  JobRecord,
  OrderRecord,
  ProfileRecord,
  RunRecord,
  ScenarioRecord,
  SiteRecord,
} from './types';

let supabaseServiceClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseServiceClient) return supabaseServiceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceKey && !url.includes('your-project')) {
    supabaseServiceClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    return supabaseServiceClient;
  }
  return null;
}

export interface IDatabaseRepository {
  createRun(run: Partial<RunRecord>): Promise<RunRecord>;
  getRun(id: string): Promise<RunRecord | null>;
  updateRun(id: string, updates: Partial<RunRecord>): Promise<RunRecord>;
  saveScenarios(scenarios: ScenarioRecord[]): Promise<void>;
  getScenarios(runId: string): Promise<ScenarioRecord[]>;
  saveFindings(findings: FindingRecord[]): Promise<void>;
  getFindings(runId: string): Promise<FindingRecord[]>;
  saveArtifact(artifact: ArtifactRecord): Promise<void>;
  getArtifacts(runId: string): Promise<ArtifactRecord[]>;
  createJob(job: Partial<JobRecord>): Promise<JobRecord>;
  claimNextJob(workerId: string): Promise<JobRecord | null>;
  completeJob(id: string): Promise<void>;
  failJob(id: string, error: string): Promise<void>;
  createOrder(order: Partial<OrderRecord>): Promise<OrderRecord>;
  getOrdersByPaymentId(paymentId: string): Promise<OrderRecord[]>;
}

export class MemoryDatabaseRepository implements IDatabaseRepository {
  public runs: Map<string, RunRecord> = new Map();
  public scenarios: Map<string, ScenarioRecord[]> = new Map();
  public findings: Map<string, FindingRecord[]> = new Map();
  public artifacts: Map<string, ArtifactRecord[]> = new Map();
  public jobs: Map<string, JobRecord> = new Map();

  async createRun(run: Partial<RunRecord>): Promise<RunRecord> {
    const id = run.id || `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full: RunRecord = {
      id,
      user_id: run.user_id || 'test_user_id',
      site_id: run.site_id || 'test_site_id',
      kind: run.kind || 'full',
      status: run.status || 'queued',
      stage: run.stage || 'preflight',
      progress: run.progress || 0,
      notes: run.notes || null,
      credentials_encrypted: run.credentials_encrypted || null,
      limits_json: run.limits_json || {},
      hyperbrowser_session_ids: run.hyperbrowser_session_ids || [],
      cost_credits: run.cost_credits || 0,
      started_at: run.started_at || null,
      finished_at: run.finished_at || null,
      error: run.error || null,
      health_score: run.health_score || null,
      created_at: new Date().toISOString(),
    };
    this.runs.set(id, full);
    return full;
  }

  async getRun(id: string): Promise<RunRecord | null> {
    return this.runs.get(id) || null;
  }

  async updateRun(id: string, updates: Partial<RunRecord>): Promise<RunRecord> {
    const existing = this.runs.get(id);
    if (!existing) throw new Error(`Run ${id} not found`);
    const updated = { ...existing, ...updates };
    this.runs.set(id, updated);
    return updated;
  }

  async saveScenarios(scenarios: ScenarioRecord[]): Promise<void> {
    for (const sc of scenarios) {
      const list = this.scenarios.get(sc.run_id) || [];
      list.push(sc);
      this.scenarios.set(sc.run_id, list);
    }
  }

  async getScenarios(runId: string): Promise<ScenarioRecord[]> {
    return this.scenarios.get(runId) || [];
  }

  async saveFindings(findings: FindingRecord[]): Promise<void> {
    for (const f of findings) {
      const list = this.findings.get(f.run_id) || [];
      list.push(f);
      this.findings.set(f.run_id, list);
    }
  }

  async getFindings(runId: string): Promise<FindingRecord[]> {
    return this.findings.get(runId) || [];
  }

  async saveArtifact(artifact: ArtifactRecord): Promise<void> {
    const list = this.artifacts.get(artifact.run_id) || [];
    list.push(artifact);
    this.artifacts.set(artifact.run_id, list);
  }

  async getArtifacts(runId: string): Promise<ArtifactRecord[]> {
    return this.artifacts.get(runId) || [];
  }

  async createJob(job: Partial<JobRecord>): Promise<JobRecord> {
    const id = job.id || `job_${Date.now()}`;
    const fullJob: JobRecord = {
      id,
      run_id: job.run_id || '',
      type: job.type || 'test_run',
      status: job.status || 'queued',
      attempts: 0,
      run_after: job.run_after || new Date().toISOString(),
      locked_by: null,
      locked_at: null,
      last_error: null,
      created_at: new Date().toISOString(),
    };
    this.jobs.set(id, fullJob);
    return fullJob;
  }

  async claimNextJob(workerId: string): Promise<JobRecord | null> {
    const now = new Date().toISOString();
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' && job.run_after <= now) {
        job.status = 'running';
        job.locked_by = workerId;
        job.locked_at = now;
        job.attempts += 1;
        return job;
      }
    }
    return null;
  }

  async completeJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'completed';
    }
  }

  async failJob(id: string, error: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'failed';
      job.last_error = error;
    }
  }

  public orders: Map<string, OrderRecord> = new Map();

  async createOrder(order: Partial<OrderRecord>): Promise<OrderRecord> {
    const id = order.id || `ord_${Date.now()}`;
    const fullOrder: OrderRecord = {
      id,
      user_id: order.user_id || 'default_user',
      run_id: order.run_id || '',
      dodo_payment_id: order.dodo_payment_id || '',
      amount_usd: order.amount_usd || 9.99,
      status: order.status || 'succeeded',
      created_at: new Date().toISOString(),
    };
    this.orders.set(id, fullOrder);
    return fullOrder;
  }

  async getOrdersByPaymentId(paymentId: string): Promise<OrderRecord[]> {
    return Array.from(this.orders.values()).filter((o) => o.dodo_payment_id === paymentId);
  }
}

export class SupabaseDatabaseRepository implements IDatabaseRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async createRun(run: Partial<RunRecord>): Promise<RunRecord> {
    const { data, error } = await this.client
      .from('runs')
      .insert(run)
      .select()
      .single();
    if (error) throw new Error(`Supabase createRun error: ${error.message}`);
    return data as RunRecord;
  }

  async getRun(id: string): Promise<RunRecord | null> {
    const { data, error } = await this.client
      .from('runs')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as RunRecord;
  }

  async updateRun(id: string, updates: Partial<RunRecord>): Promise<RunRecord> {
    const { data, error } = await this.client
      .from('runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Supabase updateRun error: ${error.message}`);
    return data as RunRecord;
  }

  async saveScenarios(scenarios: ScenarioRecord[]): Promise<void> {
    const { error } = await this.client.from('scenarios').insert(scenarios);
    if (error) throw new Error(`Supabase saveScenarios error: ${error.message}`);
  }

  async getScenarios(runId: string): Promise<ScenarioRecord[]> {
    const { data, error } = await this.client
      .from('scenarios')
      .select('*')
      .eq('run_id', runId);
    if (error) throw new Error(`Supabase getScenarios error: ${error.message}`);
    return (data || []) as ScenarioRecord[];
  }

  async saveFindings(findings: FindingRecord[]): Promise<void> {
    const { error } = await this.client.from('findings').insert(findings);
    if (error) throw new Error(`Supabase saveFindings error: ${error.message}`);
  }

  async getFindings(runId: string): Promise<FindingRecord[]> {
    const { data, error } = await this.client
      .from('findings')
      .select('*')
      .eq('run_id', runId);
    if (error) throw new Error(`Supabase getFindings error: ${error.message}`);
    return (data || []) as FindingRecord[];
  }

  async saveArtifact(artifact: ArtifactRecord): Promise<void> {
    const { error } = await this.client.from('artifacts').insert(artifact);
    if (error) throw new Error(`Supabase saveArtifact error: ${error.message}`);
  }

  async getArtifacts(runId: string): Promise<ArtifactRecord[]> {
    const { data, error } = await this.client
      .from('artifacts')
      .select('*')
      .eq('run_id', runId);
    if (error) throw new Error(`Supabase getArtifacts error: ${error.message}`);
    return (data || []) as ArtifactRecord[];
  }

  async createJob(job: Partial<JobRecord>): Promise<JobRecord> {
    const { data, error } = await this.client
      .from('jobs')
      .insert(job)
      .select()
      .single();
    if (error) throw new Error(`Supabase createJob error: ${error.message}`);
    return data as JobRecord;
  }

  async claimNextJob(workerId: string): Promise<JobRecord | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('status', 'queued')
      .lte('run_after', now)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const { data: updated, error: lockError } = await this.client
      .from('jobs')
      .update({
        status: 'running',
        locked_by: workerId,
        locked_at: now,
        attempts: data.attempts + 1,
      })
      .eq('id', data.id)
      .eq('status', 'queued')
      .select()
      .single();

    if (lockError || !updated) return null;
    return updated as JobRecord;
  }

  async completeJob(id: string): Promise<void> {
    await this.client.from('jobs').update({ status: 'completed' }).eq('id', id);
  }

  async failJob(id: string, error: string): Promise<void> {
    await this.client
      .from('jobs')
      .update({ status: 'failed', last_error: error })
      .eq('id', id);
  }

  async createOrder(order: Partial<OrderRecord>): Promise<OrderRecord> {
    const { data, error } = await this.client
      .from('orders')
      .insert(order)
      .select()
      .single();
    if (error) throw new Error(`Supabase createOrder error: ${error.message}`);
    return data as OrderRecord;
  }

  async getOrdersByPaymentId(paymentId: string): Promise<OrderRecord[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('dodo_payment_id', paymentId);
    if (error) return [];
    return (data || []) as OrderRecord[];
  }
}

// Global default repository instance
let repositoryInstance: IDatabaseRepository | null = null;

export function getDatabaseRepository(): IDatabaseRepository {
  if (repositoryInstance) return repositoryInstance;

  const adminClient = getSupabaseAdmin();
  if (adminClient) {
    repositoryInstance = new SupabaseDatabaseRepository(adminClient);
  } else {
    repositoryInstance = new MemoryDatabaseRepository();
  }
  return repositoryInstance;
}
