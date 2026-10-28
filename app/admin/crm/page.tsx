'use client';

import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';

type StageKey = 'new' | 'contacted' | 'qualified' | 'booked' | 'won' | 'not_fit';
type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  situation?: string | null;
  pipeline_stage: StageKey;
  score_fit: number;
  score_intent: number;
  score_engagement: number;
  score_total: number;
  score_reason?: string | null;
  next_action?: string | null;
  last_interaction_at?: string | null;
  latest_activity?: { activity_type?: string; body?: string; created_at?: string } | null;
};

const stages: Array<{ key: StageKey; label: string }> = [
  { key: 'new', label: 'Mới' },
  { key: 'contacted', label: 'Đã liên hệ' },
  { key: 'qualified', label: 'Đủ điều kiện' },
  { key: 'booked', label: 'Đặt lịch' },
  { key: 'won', label: 'Đã mua' },
  { key: 'not_fit', label: 'Chưa phù hợp' },
];

function formatDate(value?: string | null) {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function readSession() {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem('crm_access_token') || '';
}

export default function CrmPage() {
  const [token, setToken] = useState(readSession);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draggedId, setDraggedId] = useState('');
  const [saving, setSaving] = useState(false);

  async function authRequest(action: 'request_otp' | 'verify_otp') {
    setError('');
    setMessage('');
    const response = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, email, token: otp }) });
    const data = await response.json() as { error?: string; ok?: boolean; accessToken?: string };
    if (!response.ok) throw new Error(data.error || 'Không thể đăng nhập.');
    if (action === 'request_otp') {
      setOtpSent(true);
      setMessage('Mã 6 chữ số đã được gửi tới email quản trị.');
    } else if (data.accessToken) {
      window.sessionStorage.setItem('crm_access_token', data.accessToken);
      setToken(data.accessToken);
      setMessage('Đăng nhập thành công.');
    }
  }

  async function loadLeads() {
    if (!token) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sourceFilter) params.set('source', sourceFilter);
    if (stageFilter) params.set('stage', stageFilter);
    if (minScore) params.set('minScore', minScore);
    const response = await fetch(`/api/admin-leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      window.sessionStorage.removeItem('crm_access_token');
      setToken('');
      return;
    }
    const data = await response.json() as { leads?: Lead[]; error?: string };
    if (!response.ok) throw new Error(data.error || 'Không thể tải lead.');
    setLeads(data.leads || []);
  }

  useEffect(() => {
    if (!token) return;
    loadLeads().catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tải CRM.'));
  }, [token, search, sourceFilter, stageFilter, minScore]);

  async function updateLead(id: string, payload: Record<string, unknown>) {
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin-leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, ...payload }) });
    const data = await response.json() as Lead & { error?: string };
    setSaving(false);
    if (!response.ok) throw new Error(data.error || 'Không thể cập nhật lead.');
    setLeads((items) => items.map((lead) => lead.id === id ? { ...lead, ...data } : lead));
    setSelected((current) => current?.id === id ? { ...current, ...data } : current);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, stage: StageKey) {
    event.preventDefault();
    if (!draggedId) return;
    const lead = leads.find((item) => item.id === draggedId);
    if (!lead || lead.pipeline_stage === stage) return;
    setLeads((items) => items.map((item) => item.id === draggedId ? { ...item, pipeline_stage: stage } : item));
    updateLead(draggedId, { pipeline_stage: stage }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Không thể chuyển trạng thái.');
      loadLeads().catch(() => undefined);
    });
    setDraggedId('');
  }

  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch('/api/admin-leads', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    const created = await response.json() as Lead & { error?: string };
    if (!response.ok) throw new Error(created.error || 'Không thể tạo lead.');
    setShowAdd(false);
    event.currentTarget.reset();
    await loadLeads();
    setSelected(created);
  }

  const sourceOptions = useMemo(() => Array.from(new Set(leads.map((lead) => lead.source).filter(Boolean))).sort(), [leads]);

  if (!token) {
    return (
      <main className="crm-auth-shell">
        <section className="crm-auth-card">
          <p className="crm-eyebrow">Coach Anh Thư · Lead Hub</p>
          <h1>Đăng nhập CRM</h1>
          <p>Nhập email quản trị. Mình sẽ gửi một mã xác nhận 6 chữ số để mở Pipeline.</p>
          <form onSubmit={(event) => { event.preventDefault(); authRequest(otpSent ? 'verify_otp' : 'request_otp').catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.')); }}>
            <label>Email quản trị<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="you@example.com" /></label>
            {otpSent && <label>Mã xác nhận<input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" maxLength={6} required placeholder="123456" /></label>}
            <button className="crm-primary-button" type="submit">{otpSent ? 'Xác nhận mã' : 'Gửi mã đăng nhập'}</button>
          </form>
          {message && <p className="crm-success">{message}</p>}
          {error && <p className="crm-error">{error}</p>}
          <a className="crm-back-link" href="/">← Về landing page</a>
        </section>
      </main>
    );
  }

  return (
    <main className="crm-shell">
      <header className="crm-header">
        <div><p className="crm-eyebrow">Coach Anh Thư · Lead Hub</p><h1>Pipeline</h1></div>
        <div className="crm-header-actions"><a href="/">Xem landing page</a><button type="button" onClick={() => { window.sessionStorage.removeItem('crm_access_token'); setToken(''); }}>Đăng xuất</button></div>
      </header>
      <section className="crm-toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, email, số điện thoại" aria-label="Tìm lead" />
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label="Lọc theo nguồn"><option value="">Tất cả nguồn</option>{sourceOptions.map((source) => <option key={source} value={source || ''}>{source}</option>)}</select>
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} aria-label="Lọc theo trạng thái"><option value="">Tất cả trạng thái</option>{stages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select>
        <select value={minScore} onChange={(event) => setMinScore(event.target.value)} aria-label="Lọc theo score"><option value="">Mọi score</option><option value="70">70+</option><option value="50">50+</option><option value="30">30+</option></select>
        <button className="crm-primary-button" type="button" onClick={() => setShowAdd((value) => !value)}>+ Thêm lead</button>
      </section>
      {showAdd && <form className="crm-add-form" onSubmit={(event) => { addLead(event).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể tạo lead.')); }}><input name="name" required placeholder="Tên khách hàng" /><input name="email" type="email" placeholder="Email" /><input name="phone" placeholder="Số điện thoại" /><input name="source" placeholder="Nguồn, ví dụ: Facebook" /><input name="next_action" placeholder="Việc tiếp theo" /><button className="crm-primary-button" type="submit">Lưu lead</button></form>}
      {error && <p className="crm-error crm-inline-message">{error}</p>}
      <section className="crm-board" aria-label="Lead pipeline">
        {stages.map((stage) => {
          const items = leads.filter((lead) => lead.pipeline_stage === stage.key);
          return <div className="crm-column" key={stage.key} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, stage.key)}><div className="crm-column-heading"><h2>{stage.label}</h2><span>{items.length}</span></div><div className="crm-column-cards">{items.map((lead) => <article className="crm-lead-card" draggable onDragStart={() => setDraggedId(lead.id)} key={lead.id} onClick={() => setSelected(lead)}><div className="crm-card-top"><strong>{lead.name}</strong><span className="crm-score">{lead.score_total}/100</span></div><span className="crm-source">{lead.source || 'Chưa rõ nguồn'}</span><p>{lead.next_action || 'Chưa có việc tiếp theo'}</p><small>Tương tác gần nhất: {formatDate(lead.last_interaction_at || lead.latest_activity?.created_at)}</small></article>)}</div></div>;
        })}
      </section>
      {selected && <div className="crm-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><aside className="crm-modal" role="dialog" aria-modal="true" aria-label="Chi tiết lead" onClick={(event) => event.stopPropagation()}><button className="crm-modal-close" type="button" onClick={() => setSelected(null)}>×</button><p className="crm-eyebrow">Chi tiết lead</p><h2>{selected.name}</h2><p>{selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p><div className="crm-score-breakdown"><strong>{selected.score_total}/100</strong><span>Phù hợp {selected.score_fit}</span><span>Ý định {selected.score_intent}</span><span>Tương tác {selected.score_engagement}</span></div><p className="crm-score-reason">{selected.score_reason || 'Chưa đủ dữ liệu để giải thích score.'}</p><p className="crm-detail-label">Nhu cầu</p><p>{selected.situation || 'Chưa có dữ liệu.'}</p><label>Trạng thái<select value={selected.pipeline_stage} onChange={(event) => updateLead(selected.id, { pipeline_stage: event.target.value }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể cập nhật.'))}>{stages.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select></label><label>Việc tiếp theo<input value={selected.next_action || ''} onChange={(event) => setSelected({ ...selected, next_action: event.target.value })} onBlur={() => updateLead(selected.id, { next_action: selected.next_action || '' }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể cập nhật.'))} /></label><label>Ghi chú tương tác<textarea placeholder="Thêm ghi chú sau cuộc gọi..." onBlur={(event) => { if (event.currentTarget.value.trim()) updateLead(selected.id, { activity_body: event.currentTarget.value.trim() }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không thể lưu ghi chú.')); }} /></label>{saving && <p className="crm-success">Đang lưu…</p>}</aside></div>}
    </main>
  );
}
