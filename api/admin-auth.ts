import { createCrmOtpChallenge, createCrmSession, env, escapeHtml, json, requireConfig, verifyCrmOtpChallenge } from './_lib.js';

function authConfig() {
  return requireConfig(['SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']);
}

async function sendCrmOtp(email: string, code: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('EMAIL_FROM'),
      to: [email],
      subject: `${code} là mã đăng nhập CRM của bạn`,
      text: `Mã đăng nhập CRM của bạn là ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Mã đăng nhập CRM</h2><p>Sử dụng mã dưới đây để mở Lead Hub:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#245B61">${escapeHtml(code)}</p><p>Mã có hiệu lực trong 10 phút.</p><p>Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend request failed (${response.status}): ${await response.text()}`);
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (authConfig().length || !env('ADMIN_EMAIL')) return json({ error: 'CRM auth is not configured yet.' }, 503);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    const action = body.action;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const adminEmail = (env('CRM_ADMIN_EMAIL') || env('ADMIN_EMAIL')).toLowerCase();
    if (!email || email !== adminEmail) return json({ error: 'Email này không có quyền truy cập CRM.' }, 403);

    if (action === 'request_otp') {
      const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
      const challenge = await createCrmOtpChallenge(email, code);
      try {
        await sendCrmOtp(email, code);
      } catch (error) {
        console.error('crm otp email error', error);
        return json({ error: 'Không thể gửi email mã đăng nhập. Vui lòng thử lại sau.' }, 502);
      }
      return json({ ok: true, challenge });
    }

    if (action === 'verify_otp') {
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      const challenge = typeof body.challenge === 'string' ? body.challenge.trim() : '';
      if (!/^\d{6}$/.test(token)) return json({ error: 'Mã xác nhận gồm 6 chữ số.' }, 400);
      if (!challenge || !await verifyCrmOtpChallenge(challenge, email, token)) return json({ error: 'Mã xác nhận không đúng hoặc đã hết hạn.' }, 400);
      return json({ accessToken: await createCrmSession(adminEmail), expiresIn: 3600 });
    }

    return json({ error: 'Invalid auth action.' }, 400);
  },
};
