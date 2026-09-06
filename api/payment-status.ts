import { json, normalizeOrderCode, requireConfig, supabaseRequest } from './_lib.js';

export default {
  async fetch(request: Request) {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    if (requireConfig(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']).length) {
      return json({ error: 'Payment is not configured yet.' }, 503);
    }

    const orderCode = normalizeOrderCode(new URL(request.url).searchParams.get('orderCode'));
    if (!orderCode) return json({ error: 'Missing orderCode.' }, 400);

    try {
      const response = await supabaseRequest(
        `/rest/v1/leads?order_code=eq.${encodeURIComponent(orderCode)}&select=order_code,status,amount,paid_amount,paid_at`,
        { method: 'GET' },
      );
      const rows = (await response.json()) as Array<Record<string, unknown>>;
      if (!rows.length) return json({ error: 'Payment record not found.' }, 404);
      return json(rows[0]);
    } catch (error) {
      console.error('payment-status error', error);
      return json({ error: 'Không thể kiểm tra trạng thái thanh toán.' }, 500);
    }
  },
};
