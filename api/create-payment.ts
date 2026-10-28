import {
  buildQrUrl,
  createOrderCode,
  env,
  getOfferAmount,
  json,
  calculateLeadScore,
  normalizeEmail,
  normalizePhone,
  requireConfig,
  supabaseRequest,
} from './_lib.js';

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const missing = requireConfig([
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'BANK_CODE',
      'BANK_ACCOUNT_NUMBER',
      'BANK_ACCOUNT_NAME',
      'PAYMENT_PREFIX',
      'OFFER_AMOUNT_VND',
    ]);
    if (missing.length) {
      return json({ error: 'Payment is not configured yet.', missing }, 503);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const situation = typeof body.situation === 'string' ? body.situation.trim() : '';
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 80) : 'facebook';
    const landingPageUrl = typeof body.landingPageUrl === 'string' ? body.landingPageUrl.trim().slice(0, 500) : '';
    const utm = body.utm && typeof body.utm === 'object' ? body.utm as Record<string, unknown> : {};

    if (name.length < 2 || name.length > 120) return json({ error: 'Vui lòng nhập họ và tên.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
      return json({ error: 'Vui lòng nhập email hợp lệ.' }, 400);
    }
    if (situation.length < 10 || situation.length > 2000) {
      return json({ error: 'Vui lòng mô tả tình huống cụ thể hơn.' }, 400);
    }

    const amount = getOfferAmount();
    const orderCode = createOrderCode();
    const score = calculateLeadScore({ email, phone, situation, source, utmSource: typeof utm.source === 'string' ? utm.source : '', activityCount: 1 });

    try {
      const emailLookup = await supabaseRequest(`/rest/v1/leads?email=eq.${encodeURIComponent(email)}&select=id,phone,pipeline_stage,next_action&limit=1`, { method: 'GET' });
      const emailRows = await emailLookup.json() as Array<{ id: string; phone?: string | null; pipeline_stage?: string; next_action?: string | null }>;
      let existing = emailRows[0];
      if (!existing && phone) {
        const phoneLookup = await supabaseRequest(`/rest/v1/leads?phone=eq.${encodeURIComponent(phone)}&select=id,phone,pipeline_stage,next_action&limit=1`, { method: 'GET' });
        const phoneRows = await phoneLookup.json() as Array<{ id: string; phone?: string | null; pipeline_stage?: string; next_action?: string | null }>;
        existing = phoneRows[0];
      }

      const existingId = existing?.id || '';

      const record = {
          order_code: orderCode,
          name,
          email,
          phone: phone || existing?.phone || null,
          situation,
          source,
          landing_page_url: landingPageUrl || null,
          utm_source: typeof utm.source === 'string' ? utm.source.trim().slice(0, 120) || null : null,
          utm_medium: typeof utm.medium === 'string' ? utm.medium.trim().slice(0, 120) || null : null,
          utm_campaign: typeof utm.campaign === 'string' ? utm.campaign.trim().slice(0, 120) || null : null,
          utm_term: typeof utm.term === 'string' ? utm.term.trim().slice(0, 120) || null : null,
          utm_content: typeof utm.content === 'string' ? utm.content.trim().slice(0, 120) || null : null,
          amount,
          status: 'pending',
          pipeline_stage: existing?.pipeline_stage || 'new',
          score_fit: score.fit,
          score_intent: score.intent,
          score_engagement: score.engagement,
          score_total: score.total,
          score_reason: score.reason,
          next_action: existing?.next_action || 'Xem xét lead và liên hệ trong 24 giờ.',
          paid_amount: null,
          paid_at: null,
          sepay_transaction_id: null,
          payment_notification_sent_at: null,
          updated_at: new Date().toISOString(),
        };

      let leadId = existingId;
      if (existingId) {
        await supabaseRequest(`/rest/v1/leads?id=eq.${encodeURIComponent(existingId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(record) });
      } else {
        const created = await supabaseRequest('/rest/v1/leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(record) });
        const rows = await created.json() as Array<{ id: string }>;
        leadId = rows[0]?.id || '';
      }

      if (leadId) {
        await supabaseRequest('/rest/v1/lead_activities', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: leadId, activity_type: 'form_submitted', body: 'Lead gửi form từ landing page.', metadata: { source, landingPageUrl } }) });
      }

      return json({
        orderCode,
        amount,
        qrUrl: buildQrUrl(orderCode, amount),
        accountName: env('BANK_ACCOUNT_NAME'),
        bankCode: env('BANK_CODE'),
        accountNumber: env('BANK_ACCOUNT_NUMBER'),
      });
    } catch (error) {
      console.error('create-payment error', error);
      return json({ error: 'Không thể tạo thông tin thanh toán lúc này.' }, 500);
    }
  },
};
