import {
  buildQrUrl,
  createOrderCode,
  env,
  getOfferAmount,
  json,
  requireConfig,
  supabaseRequest,
} from './_lib';

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
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const situation = typeof body.situation === 'string' ? body.situation.trim() : '';

    if (name.length < 2 || name.length > 120) return json({ error: 'Vui lòng nhập họ và tên.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
      return json({ error: 'Vui lòng nhập email hợp lệ.' }, 400);
    }
    if (situation.length < 10 || situation.length > 2000) {
      return json({ error: 'Vui lòng mô tả tình huống cụ thể hơn.' }, 400);
    }

    const amount = getOfferAmount();
    const orderCode = createOrderCode();

    try {
      await supabaseRequest('/rest/v1/leads', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          order_code: orderCode,
          name,
          email,
          situation,
          amount,
          status: 'pending',
        }),
      });

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
