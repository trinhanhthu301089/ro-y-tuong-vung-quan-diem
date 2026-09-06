export type LeadRecord = {
  id: string;
  order_code: string;
  name: string;
  email: string;
  situation: string;
  amount: number;
  status: 'pending' | 'paid' | 'underpaid' | 'expired' | 'cancelled';
  sepay_transaction_id?: number | null;
  reference_code?: string | null;
  transfer_content?: string | null;
  paid_amount?: number | null;
  transfer_date?: string | null;
  created_at: string;
  paid_at?: string | null;
  payment_notification_sent_at?: string | null;
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function env(name: string) {
  return process.env[name]?.trim() || '';
}

export function requireConfig(names: string[]) {
  const missing = names.filter((name) => !env(name));
  return missing;
}

export async function supabaseRequest(path: string, init: RequestInit = {}) {
  const baseUrl = env('SUPABASE_URL').replace(/\/$/, '');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!baseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  const headers = new Headers(init.headers);
  headers.set('apikey', serviceRoleKey);
  headers.set('Authorization', `Bearer ${serviceRoleKey}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  return response;
}

export function normalizeOrderCode(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function createOrderCode() {
  const prefix = (env('PAYMENT_PREFIX') || 'ATH').toUpperCase();
  const random = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  return `${prefix}${random}`;
}

export function getOfferAmount() {
  const amount = Number(env('OFFER_AMOUNT_VND'));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
}

export function buildQrUrl(orderCode: string, amount: number) {
  const url = new URL('https://vietqr.app/img');
  url.searchParams.set('acc', env('BANK_ACCOUNT_NUMBER'));
  url.searchParams.set('bank', env('BANK_CODE'));
  url.searchParams.set('amount', String(amount));
  url.searchParams.set('des', orderCode);
  url.searchParams.set('template', 'compact');
  url.searchParams.set('showinfo', 'true');
  url.searchParams.set('fullacc', 'true');
  url.searchParams.set('holder', env('BANK_ACCOUNT_NAME'));
  return url.toString();
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendPaymentEmail(lead: LeadRecord, transaction: Record<string, unknown>) {
  const apiKey = env('RESEND_API_KEY');
  const from = env('EMAIL_FROM');
  const to = env('ADMIN_EMAIL');

  if (!apiKey || !from || !to) {
    throw new Error('Email environment variables are not configured.');
  }

  const amount = Number(lead.paid_amount || transaction.transferAmount || lead.amount);
  const subject = `Đã nhận thanh toán — ${lead.name} — ${amount.toLocaleString('vi-VN')} VNĐ`;
  const safe = {
    name: escapeHtml(lead.name),
    email: escapeHtml(lead.email),
    situation: escapeHtml(lead.situation),
    orderCode: escapeHtml(lead.order_code),
    amount: amount.toLocaleString('vi-VN'),
    reference: escapeHtml(String(transaction.referenceCode || lead.reference_code || 'Không có')),
    content: escapeHtml(String(transaction.content || lead.transfer_content || '')),
    paidAt: escapeHtml(String(transaction.transactionDate || new Date().toISOString())),
  };

  const text = [
    'Đã nhận thanh toán cho landing page Rõ Ý Tưởng, Vững Quan Điểm.',
    '',
    `Khách hàng: ${lead.name}`,
    `Email: ${lead.email}`,
    `Số tiền: ${safe.amount} VNĐ`,
    `Mã đơn hàng: ${lead.order_code}`,
    `Mã tham chiếu: ${safe.reference}`,
    `Thời gian: ${safe.paidAt}`,
    '',
    `Tình huống khách muốn cải thiện: ${lead.situation}`,
    `Nội dung chuyển khoản: ${safe.content}`,
  ].join('\n');

  const html = `
    <h2>Đã nhận thanh toán</h2>
    <p>Landing page <strong>Rõ Ý Tưởng, Vững Quan Điểm</strong> vừa ghi nhận một thanh toán.</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <tr><td><strong>Khách hàng</strong></td><td>${safe.name}</td></tr>
      <tr><td><strong>Email</strong></td><td>${safe.email}</td></tr>
      <tr><td><strong>Số tiền</strong></td><td>${safe.amount} VNĐ</td></tr>
      <tr><td><strong>Mã đơn hàng</strong></td><td>${safe.orderCode}</td></tr>
      <tr><td><strong>Mã tham chiếu</strong></td><td>${safe.reference}</td></tr>
      <tr><td><strong>Thời gian</strong></td><td>${safe.paidAt}</td></tr>
    </table>
    <p><strong>Tình huống khách muốn cải thiện:</strong><br />${safe.situation}</p>
    <p><strong>Nội dung chuyển khoản:</strong><br />${safe.content}</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `payment-${lead.order_code}`,
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });

  if (!response.ok) {
    throw new Error(`Resend request failed (${response.status}): ${await response.text()}`);
  }
}
