import { env, json, requireConfig } from './_lib.js';

function authConfig() {
  return requireConfig(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
}

async function supabaseAuth(path: string, body: Record<string, unknown>) {
  const baseUrl = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${baseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (authConfig().length) return json({ error: 'CRM auth is not configured yet.' }, 503);

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
      const response = await supabaseAuth('otp', { email, create_user: true });
      if (!response.ok) return json({ error: 'Không thể gửi mã đăng nhập. Vui lòng thử lại sau.' }, 400);
      return json({ ok: true });
    }

    if (action === 'verify_otp') {
      const token = typeof body.token === 'string' ? body.token.trim() : '';
      if (!/^\d{6}$/.test(token)) return json({ error: 'Mã xác nhận gồm 6 chữ số.' }, 400);
      const response = await supabaseAuth('verify', { email, token, type: 'email' });
      if (!response.ok) return json({ error: 'Mã xác nhận không đúng hoặc đã hết hạn.' }, 400);
      const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; user?: { email?: string } };
      if (!data.access_token || data.user?.email?.toLowerCase() !== adminEmail) return json({ error: 'Không thể xác nhận quyền quản trị.' }, 403);
      return json({ accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in });
    }

    return json({ error: 'Invalid auth action.' }, 400);
  },
};
