import {
  calculateLeadScore,
  createOrderCode,
  env,
  json,
  normalizeEmail,
  normalizePhone,
  PIPELINE_STAGES,
  supabaseRequest,
  type PipelineStage,
} from './_lib.js';

const leadSelect = 'id,order_code,name,email,phone,situation,source,landing_page_url,utm_source,utm_medium,utm_campaign,utm_term,utm_content,amount,status,pipeline_stage,score_fit,score_intent,score_engagement,score_total,score_reason,next_action,last_interaction_at,last_interaction_type,created_at,updated_at,paid_amount,paid_at';

async function requireAdmin(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const baseUrl = env('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${baseUrl}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string; email?: string };
  const adminEmail = (env('CRM_ADMIN_EMAIL') || env('ADMIN_EMAIL')).toLowerCase();
  return user.email?.toLowerCase() === adminEmail ? user : null;
}

function validStage(value: unknown): value is PipelineStage {
  return PIPELINE_STAGES.some((stage) => stage.key === value);
}

async function listLeads(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams({ select: leadSelect, order: 'created_at.desc', limit: '500' });
  const search = url.searchParams.get('search')?.trim();
  const stage = url.searchParams.get('stage');
  const source = url.searchParams.get('source');
  const minScore = Number(url.searchParams.get('minScore') || '');
  if (stage && validStage(stage)) params.set('pipeline_stage', `eq.${stage}`);
  if (source) params.set('source', `eq.${encodeURIComponent(source)}`);
  if (Number.isFinite(minScore) && minScore > 0) params.set('score_total', `gte.${Math.min(100, Math.floor(minScore))}`);
  if (search) {
    const safe = search.replace(/[(),]/g, ' ').slice(0, 80);
    params.set('or', `(name.ilike.*${encodeURIComponent(safe)}*,email.ilike.*${encodeURIComponent(safe)}*,phone.ilike.*${encodeURIComponent(safe)}*)`);
  }
  const [leadResponse, activityResponse] = await Promise.all([
    supabaseRequest(`/rest/v1/leads?${params.toString()}`, { method: 'GET' }),
    supabaseRequest('/rest/v1/lead_activities?select=lead_id,activity_type,body,created_at&order=created_at.desc&limit=2000', { method: 'GET' }),
  ]);
  const leads = await leadResponse.json() as Array<Record<string, unknown>>;
  const activities = await activityResponse.json() as Array<Record<string, unknown>>;
  const latest = new Map<string, Record<string, unknown>>();
  for (const activity of activities) {
    if (typeof activity.lead_id === 'string' && !latest.has(activity.lead_id)) latest.set(activity.lead_id, activity);
  }
  return leads.map((lead) => ({ ...lead, latest_activity: latest.get(String(lead.id)) || null }));
}

function leadPayload(body: Record<string, unknown>, existing?: Record<string, unknown>) {
  const email = normalizeEmail(body.email ?? existing?.email);
  const phone = normalizePhone(body.phone ?? existing?.phone);
  const situation = typeof (body.situation ?? existing?.situation) === 'string' ? String(body.situation ?? existing?.situation).trim().slice(0, 2000) : '';
  const source = typeof (body.source ?? existing?.source) === 'string' ? String(body.source ?? existing?.source).trim().slice(0, 80) : 'manual';
  const score = calculateLeadScore({ email, phone, situation, source, utmSource: String(body.utm_source ?? existing?.utm_source ?? ''), activityCount: Number(body.activityCount || 0) });
  return {
    name: typeof (body.name ?? existing?.name) === 'string' ? String(body.name ?? existing?.name).trim().slice(0, 120) : '',
    email,
    phone: phone || null,
    situation,
    source,
    landing_page_url: typeof (body.landing_page_url ?? existing?.landing_page_url) === 'string' ? String(body.landing_page_url ?? existing?.landing_page_url).trim().slice(0, 500) || null : null,
    pipeline_stage: validStage(body.pipeline_stage) ? body.pipeline_stage : (validStage(existing?.pipeline_stage) ? existing?.pipeline_stage : 'new'),
    score_fit: Number.isFinite(Number(body.score_fit)) ? Math.max(0, Math.min(100, Math.floor(Number(body.score_fit)))) : score.fit,
    score_intent: Number.isFinite(Number(body.score_intent)) ? Math.max(0, Math.min(100, Math.floor(Number(body.score_intent)))) : score.intent,
    score_engagement: Number.isFinite(Number(body.score_engagement)) ? Math.max(0, Math.min(100, Math.floor(Number(body.score_engagement)))) : score.engagement,
    score_total: Number.isFinite(Number(body.score_total)) ? Math.max(0, Math.min(100, Math.floor(Number(body.score_total)))) : score.total,
    score_reason: typeof body.score_reason === 'string' ? body.score_reason.trim().slice(0, 1000) : score.reason,
    next_action: typeof body.next_action === 'string' ? body.next_action.trim().slice(0, 500) || null : (existing?.next_action || 'Xem xét lead và chọn bước tiếp theo.'),
    updated_at: new Date().toISOString(),
  };
}

async function createLead(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const payload = leadPayload(body);
  if (payload.name.length < 2 || (!payload.email && !payload.phone)) return json({ error: 'Cần có tên và email hoặc số điện thoại.' }, 400);
  const created = await supabaseRequest('/rest/v1/leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, order_code: createOrderCode(), amount: Number(env('OFFER_AMOUNT_VND') || 0), status: 'pending' }) });
  const rows = await created.json() as Array<Record<string, unknown>>;
  const lead = rows[0];
  if (lead?.id) await supabaseRequest('/rest/v1/lead_activities', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: lead.id, activity_type: 'manual_created', body: 'Lead được tạo thủ công trong CRM.', metadata: {} }) });
  return json(lead, 201);
}

async function updateLead(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return json({ error: 'Thiếu lead id.' }, 400);
  const currentResponse = await supabaseRequest(`/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=${leadSelect}&limit=1`, { method: 'GET' });
  const currentRows = await currentResponse.json() as Array<Record<string, unknown>>;
  const current = currentRows[0];
  if (!current) return json({ error: 'Không tìm thấy lead.' }, 404);
  const payload = leadPayload(body, current);
  const updated = await supabaseRequest(`/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  const rows = await updated.json() as Array<Record<string, unknown>>;
  const activityBody = typeof body.activity_body === 'string' ? body.activity_body.trim().slice(0, 2000) : '';
  const stageChanged = body.pipeline_stage && body.pipeline_stage !== current.pipeline_stage;
  if (activityBody || stageChanged) {
    await supabaseRequest('/rest/v1/lead_activities', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: id, activity_type: stageChanged ? 'stage_changed' : 'note', body: activityBody || `Chuyển sang trạng thái ${body.pipeline_stage}.`, metadata: { from: current.pipeline_stage, to: body.pipeline_stage || current.pipeline_stage } }) });
  }
  return json(rows[0] || { ...current, ...payload });
}

export default {
  async fetch(request: Request) {
    if (!['GET', 'POST', 'PATCH'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
    if (!env('SUPABASE_SERVICE_ROLE_KEY') || !env('SUPABASE_URL') || !(env('CRM_ADMIN_EMAIL') || env('ADMIN_EMAIL'))) return json({ error: 'CRM is not configured yet.' }, 503);
    if (!await requireAdmin(request)) return json({ error: 'Unauthorized' }, 401);
    try {
      if (request.method === 'GET') return json({ leads: await listLeads(request) });
      if (request.method === 'POST') return createLead(request);
      return updateLead(request);
    } catch (error) {
      console.error('admin-leads error', error);
      return json({ error: 'Không thể xử lý CRM lúc này.' }, 500);
    }
  },
};
