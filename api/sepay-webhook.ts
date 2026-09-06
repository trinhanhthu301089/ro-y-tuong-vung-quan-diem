import {
  env,
  json,
  normalizeOrderCode,
  requireConfig,
  sendPaymentEmail,
  supabaseRequest,
  type LeadRecord,
} from './_lib';

function isAuthorized(request: Request) {
  const expected = env('SEPAY_WEBHOOK_API_KEY');
  const actual = request.headers.get('authorization') || '';
  return Boolean(expected) && actual.trim().toLowerCase() === `apikey ${expected}`.toLowerCase();
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    if (requireConfig(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SEPAY_WEBHOOK_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'ADMIN_EMAIL']).length) {
      return json({ error: 'Webhook is not configured yet.' }, 503);
    }
    if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401);

    let transaction: Record<string, unknown>;
    try {
      transaction = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400);
    }

    const transactionId = Number(transaction.id);
    const transferAmount = Number(transaction.transferAmount);
    const orderCode = normalizeOrderCode(transaction.code);
    const transferType = transaction.transferType;

    if (!Number.isSafeInteger(transactionId) || transferType !== 'in' || !orderCode || !Number.isFinite(transferAmount)) {
      return json({ success: true, ignored: true });
    }

    try {
      const lookup = await supabaseRequest(
        `/rest/v1/leads?order_code=eq.${encodeURIComponent(orderCode)}&select=*`,
        { method: 'GET' },
      );
      const rows = (await lookup.json()) as LeadRecord[];
      const lead = rows[0];
      if (!lead) return json({ success: true, ignored: true });

      if (lead.status === 'paid' && lead.sepay_transaction_id === transactionId) {
        return json({ success: true, duplicate: true });
      }

      const isFullyPaid = transferAmount >= Number(lead.amount);
      const nextStatus = isFullyPaid ? 'paid' : 'underpaid';
      const paidAt = String(transaction.transactionDate || new Date().toISOString());

      const updateResponse = await supabaseRequest(
        `/rest/v1/leads?order_code=eq.${encodeURIComponent(orderCode)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            status: nextStatus,
            sepay_transaction_id: transactionId,
            reference_code: transaction.referenceCode ? String(transaction.referenceCode) : null,
            transfer_content: transaction.content ? String(transaction.content) : null,
            paid_amount: transferAmount,
            transfer_date: paidAt,
            paid_at: isFullyPaid ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }),
        },
      );

      const updatedRows = (await updateResponse.json()) as LeadRecord[];
      const updatedLead = updatedRows[0] || { ...lead, status: nextStatus, paid_amount: transferAmount };

      if (isFullyPaid && !lead.payment_notification_sent_at) {
        await sendPaymentEmail(updatedLead, transaction);
        await supabaseRequest(
          `/rest/v1/leads?order_code=eq.${encodeURIComponent(orderCode)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ payment_notification_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
          },
        );
      }

      return json({ success: true });
    } catch (error) {
      console.error('sepay-webhook error', error);
      return json({ error: 'Webhook processing failed.' }, 500);
    }
  },
};
