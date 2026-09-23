import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignaturePad from './SignaturePad';
import { formatDate } from '../../services/tickets/customer';

const FUNCTION_URL = import.meta.env.VITE_SIGNOFF_FUNCTION_URL || '/.netlify/functions/authorise';

export default function CustomerSignoffPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const ticketId = params.get('ticketId') || '';
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ clientName: '', clientPosition: '', q1_resolved: '', q2_timeframe: '', q3_tasks: '', remaining_issues: '', serviceRating: '', engineerRating: '', npsScore: '', comments: '', signature: '' });

  useEffect(() => {
    let active = true;
    if (!token) { setError('This sign-off link is incomplete.'); setLoading(false); return undefined; }
    fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => { const result = await response.json().catch(() => ({})); if (!response.ok || !result.success) throw new Error(result.error || 'This sign-off link could not be verified.'); return result; })
      .then((result) => { if (active) { setTicket(result.ticket); setForm((current) => ({ ...current, clientName: result.ticket.clientName || result.ticket.name || '' })); setLoading(false); } })
      .catch((requestError) => { if (active) { setError(requestError.message); setLoading(false); } });
    return () => { active = false; };
  }, [token]);

  const service = useMemo(() => [ticket?.serviceCategoryLabel, ticket?.serviceSubCategoryLabel].filter(Boolean).join(' › '), [ticket]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault(); setError('');
    if (!form.signature) return setError('Please sign in the signature box before submitting.');
    if (!form.clientName.trim()) return setError('Please enter the name of the person signing.');
    if (!form.q1_resolved || !form.q2_timeframe || !form.q3_tasks || !form.serviceRating || !form.engineerRating || form.npsScore === '') return setError('Please complete the required service feedback fields.');
    setBusy(true);
    try {
      const response = await fetch(FUNCTION_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'customer-signoff', token, ticketId: ticketId || ticket?.id || '', ...form }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'The sign-off could not be completed.');
      setDone(true);
    } catch (submitError) {
      setError(submitError.message || 'The secure sign-off could not be completed.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="signoff-page"><div className="signoff-card signoff-loading"><div className="portal-spinner" /><p>Verifying secure sign-off link…</p></div></div>;
  if (done) return <div className="signoff-page"><div className="signoff-card signoff-success"><div className="signoff-success-icon">✓</div><p className="portal-eyebrow">SIGN-OFF COMPLETE</p><h1>Thank you. The service record is now closed.</h1><p>Your feedback and digital signature were securely recorded against <strong>{ticket?.ref || ticketId}</strong>.</p><div className="signoff-proof"><span>Ticket</span><strong>{ticket?.ref || ticketId}</strong><span>Recorded</span><strong>{new Date().toLocaleString('en-ZA')}</strong></div></div></div>;
  if (error && !ticket) return <div className="signoff-page"><div className="signoff-card"><div className="signoff-error-icon">!</div><p className="portal-eyebrow">SECURE SIGN-OFF</p><h1>Link unavailable</h1><p>{error}</p><span className="signoff-small">The link may be invalid, expired, already used, or the ticket may no longer be eligible for sign-off.</span></div></div>;

  return <div className="signoff-page"><div className="signoff-card"><div className="signoff-brand"><img src="/logo.png" alt="Cyber I.T Masters" /><span>SECURE SERVICE SIGN-OFF</span></div><div className="signoff-ticket-banner"><span>Ticket reference</span><strong>{ticket?.ref || ticketId}</strong></div><h1>Review and sign off</h1><p className="signoff-intro">Please review the completed work below. Your digital signature confirms that the service record can be closed.</p><div className="signoff-summary"><Summary label="Customer" value={ticket?.clientName || ticket?.name || 'Client'} /><Summary label="Company" value={ticket?.company || '—'} /><Summary label="Service" value={service || 'Technical Support'} /><Summary label="Issue" value={ticket?.issueTitle || ticket?.problemDescription || 'Support request'} /><Summary label="Status" value={ticket?.status === 'awaiting-signoff' ? 'Awaiting customer sign-off' : 'Resolved'} /><Summary label="Preferred date" value={ticket?.preferredDate || '—'} /></div>
      <form onSubmit={submit}><section className="signoff-section"><h2>Service confirmation</h2><Choice label="Was the requested issue resolved?" value={form.q1_resolved} onChange={(value) => update('q1_resolved', value)} options={['Yes','Partially','No']} /><Choice label="Was the work completed within the expected timeframe?" value={form.q2_timeframe} onChange={(value) => update('q2_timeframe', value)} options={['Yes','Partially','No']} /><Choice label="Were the completed tasks explained to you?" value={form.q3_tasks} onChange={(value) => update('q3_tasks', value)} options={['Yes','No','Not applicable']} /><div className="signoff-field"><label>Any remaining issue or comment</label><textarea value={form.remaining_issues} onChange={(event) => update('remaining_issues', event.target.value)} rows={4} placeholder="Tell us about anything still outstanding." /></div></section>
      <section className="signoff-section"><h2>Service feedback</h2><div className="signoff-two-col"><Rating label="Overall service rating" value={form.serviceRating} onChange={(value) => update('serviceRating', value)} max={5} /> <Rating label="Engineer rating" value={form.engineerRating} onChange={(value) => update('engineerRating', value)} max={5} /></div><div className="signoff-field"><label>How likely are you to recommend Cyber I.T Masters? (0–10)</label><div className="nps-grid">{Array.from({ length: 11 }, (_, value) => <button key={value} type="button" className={String(form.npsScore) === String(value) ? 'selected' : ''} onClick={() => update('npsScore', String(value))}>{value}</button>)}</div></div><div className="signoff-field"><label>Additional comments</label><textarea value={form.comments} onChange={(event) => update('comments', event.target.value)} rows={4} placeholder="Optional feedback" /></div></section>
      <section className="signoff-section"><h2>Authorised signatory</h2><div className="signoff-two-col"><div className="signoff-field"><label>Full name *</label><input value={form.clientName} onChange={(event) => update('clientName', event.target.value)} required /></div><div className="signoff-field"><label>Position / role</label><input value={form.clientPosition} onChange={(event) => update('clientPosition', event.target.value)} /></div></div><SignaturePad onChange={(value) => update('signature', value)} /><p className="signoff-legal">By signing, you confirm that the information above is accurate and that you accept closure of this service record based on the work described.</p></section>
      {error && <div className="customer-alert error" role="alert">{error}</div>}<button className="signoff-submit" disabled={busy}>{busy ? 'Submitting secure sign-off…' : 'Sign & Close Service Record'}</button></form><p className="signoff-footer">This link is protected by an expiring, one-time token. No direct customer Firestore write is used for sign-off.</p></div></div>;
}

function Summary({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Choice({ label, value, onChange, options }) { return <div className="signoff-field"><label>{label}</label><div className="choice-row">{options.map((option) => <button type="button" key={option} className={value === option ? 'selected' : ''} onClick={() => onChange(option)}>{option}</button>)}</div></div>; }
function Rating({ label, value, onChange, max }) { return <div className="signoff-field"><label>{label}</label><div className="rating-row">{Array.from({ length: max }, (_, index) => { const number = index + 1; return <button type="button" key={number} className={String(value) === String(number) ? 'selected' : ''} onClick={() => onChange(String(number))}>{number}</button>; })}</div></div>; }
