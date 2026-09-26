import { useMemo, useState } from 'react';
import { SERVICE_CATALOG } from '../../services/tickets/customer';

const DEVICE_SUBS = new Set(['endpoint-desktop', 'endpoint-printer', 'endpoint-mobile', 'app-support', 'email-m365', 'user-admin', 'firewall', 'edr', 'email-sec', 'iam', 'network', 'wifi', 'server', 'cabling', 'isp', 'ups', 'm365', 'azure', 'backup', 'dr', 'hosting', 'cctv', 'access-control', 'alarms', 'smart-building', 'hardware', 'network-hardware', 'software-license', 'accessories']);
const ONSITE_CATEGORY = 'onsite';
const INITIAL = { clientName: '', company: '', phone: '', email: '', serviceCategory: '', serviceSubCategory: '', channels: ['whatsapp'], issueTitle: '', issueDetail: '', address: '', deviceType: '', manufacturer: '', modelNumber: '', serialNumber: '', website: '' };
const WA_NUMBER = '27726650565';
const SUPPORT_EMAIL = 'info@mbulahenigroup.co.za';

function waUrl(phone, text) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function PublicTicketPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [renderedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const category = useMemo(() => SERVICE_CATALOG.find((entry) => entry.id === form.serviceCategory), [form.serviceCategory]);
  const deviceFields = DEVICE_SUBS.has(form.serviceSubCategory);
  const onsiteFields = form.serviceCategory === ONSITE_CATEGORY;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleChannel = (channel) => setForm((current) => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter((value) => value !== channel) : [...current.channels, channel] }));

  const next = () => {
    setError('');
    if (step === 1 && !form.serviceCategory) return setError('Select a service category.');
    if (step === 2 && !form.serviceSubCategory) return setError('Select the specific service you need.');
    if (step === 3 && (!form.clientName.trim() || !form.phone.trim())) return setError('Add your name and a phone / WhatsApp number.');
    if (step === 4 && (!form.issueTitle.trim() || !form.channels.length)) return setError('Add a short issue title and at least one communication channel.');
    setStep((value) => Math.min(5, value + 1));
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const category = SERVICE_CATALOG.find((entry) => entry.id === form.serviceCategory);
      const sub = category?.items.find(([id]) => id === form.serviceSubCategory);
      const response = await fetch('/.netlify/functions/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          serviceCategoryLabel: category?.label || '',
          serviceSubCategoryLabel: sub?.[1] || '',
          renderedAt,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'Could not create your ticket.');
      setCreated({ ref: result.ticketRef, ...form });
    } catch (submitError) {
      setError(submitError.message || 'Could not create your ticket. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const customerMsg = `Hi, this is ${created.clientName}. My support ticket reference is ${created.ref}.`;
    const businessMsg = `New ticket logged: ${created.ref} - ${created.clientName} (${created.phone})`;
    return <div className="signoff-page"><div className="signoff-card signoff-success">
      <div className="signoff-success-icon">✓</div>
      <p className="portal-eyebrow">TICKET CREATED</p>
      <h1>Your ticket reference is {created.ref}</h1>
      <p>Keep this reference for all communication with Cyber I.T Masters about this request.</p>
      <div className="signoff-proof"><span>Reference</span><strong>{created.ref}</strong><span>Logged</span><strong>{new Date().toLocaleString('en-ZA')}</strong></div>
      <div className="public-ticket-confirm-actions">
        <a className="portal-button" href={waUrl(created.phone, customerMsg)} target="_blank" rel="noreferrer">💬 Send yourself a WhatsApp reminder</a>
        <a className="portal-button portal-button-secondary" href={waUrl(WA_NUMBER, businessMsg)} target="_blank" rel="noreferrer">📲 Notify Cyber I.T Masters</a>
        {created.email && <a className="portal-button portal-button-secondary" href={`mailto:${created.email}?subject=Support Ticket ${created.ref}&body=Hi ${created.clientName},%0D%0A%0D%0AYour ticket ${created.ref} has been received.`}>✉️ Email confirmation</a>}
      </div>
      <button type="button" className="portal-button portal-button-secondary" style={{ marginTop: 16 }} onClick={() => { setCreated(null); setForm(INITIAL); setStep(1); }}>Log another ticket</button>
    </div></div>;
  }

  return <div className="signoff-page"><div className="signoff-card">
    <div className="signoff-brand"><img src="/logo.png" alt="Cyber I.T Masters" /><span>NEW SUPPORT REQUEST</span></div>
    <h1>Log a support ticket</h1>
    <p className="signoff-intro">No account needed. Tell us what you need help with and we will route this straight into our service desk.</p>

    <div className="customer-request-steps">{['Category', 'Service', 'Your details', 'Issue', 'Review'].map((label, index) => <div key={label} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''}><span>{step > index + 1 ? '✓' : index + 1}</span>{label}</div>)}</div>

    {step === 1 && <div className="customer-request-pane"><h3>What can we help with?</h3><div className="customer-catalog-grid">{SERVICE_CATALOG.map((item) => <button type="button" key={item.id} className={form.serviceCategory === item.id ? 'selected' : ''} onClick={() => { update('serviceCategory', item.id); update('serviceSubCategory', ''); }}><strong>{item.icon} {item.label}</strong><span>{item.description}</span></button>)}</div></div>}

    {step === 2 && <div className="customer-request-pane"><h3>{category?.icon} {category?.label}</h3><div className="customer-service-grid">{category?.items.map(([id, label, icon]) => <button type="button" key={id} className={form.serviceSubCategory === id ? 'selected' : ''} onClick={() => update('serviceSubCategory', id)}>{icon} {label}</button>)}</div></div>}

    {step === 3 && <div className="customer-request-pane"><h3>Your contact details</h3><div className="signoff-two-col">
      <div className="signoff-field"><label>Full name *</label><input value={form.clientName} onChange={(e) => update('clientName', e.target.value)} placeholder="John Doe" /></div>
      <div className="signoff-field"><label>Company</label><input value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="Optional" /></div>
      <div className="signoff-field"><label>Phone / WhatsApp *</label><input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+27 72 665 0565" /></div>
      <div className="signoff-field"><label>Email address</label><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@example.com" /></div>
      {onsiteFields && <div className="signoff-field" style={{ gridColumn: '1 / -1' }}><label>Site address</label><input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main St, Sandton" /></div>}
    </div></div>}

    {step === 4 && <div className="customer-request-pane"><h3>Tell us about the issue</h3><div className="signoff-two-col">
      <div className="signoff-field" style={{ gridColumn: '1 / -1' }}><label>Issue / request title *</label><input value={form.issueTitle} onChange={(e) => update('issueTitle', e.target.value)} placeholder="e.g. Laptop will not turn on" /></div>
      <div className="signoff-field" style={{ gridColumn: '1 / -1' }}><label>Describe the problem</label><textarea rows={5} value={form.issueDetail} onChange={(e) => update('issueDetail', e.target.value)} placeholder="Include any error messages or what you already tried." /></div>
      {deviceFields && <>
        <div className="signoff-field"><label>Device type</label><input value={form.deviceType} onChange={(e) => update('deviceType', e.target.value)} placeholder="e.g. Laptop" /></div>
        <div className="signoff-field"><label>Manufacturer</label><input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} /></div>
        <div className="signoff-field"><label>Model</label><input value={form.modelNumber} onChange={(e) => update('modelNumber', e.target.value)} /></div>
        <div className="signoff-field"><label>Serial number</label><input value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} /></div>
      </>}
      <div className="signoff-field" style={{ gridColumn: '1 / -1' }}><label>How should we notify you?</label><div className="choice-row">{[['whatsapp', 'WhatsApp'], ['email', 'Email']].map(([id, label]) => <button type="button" key={id} className={form.channels.includes(id) ? 'selected' : ''} onClick={() => toggleChannel(id)}>{form.channels.includes(id) ? '✓' : '+'} {label}</button>)}</div></div>
      {/* Honeypot - hidden from real visitors, left for bots that fill every field */}
      <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)} />
      </div>
    </div></div>}

    {step === 5 && <div className="customer-request-pane"><h3>Review and submit</h3><div className="customer-review-grid">
      <div className="customer-review-item"><small>Service</small><strong>{category?.label} › {category?.items.find(([id]) => id === form.serviceSubCategory)?.[1] || ''}</strong></div>
      <div className="customer-review-item"><small>Name</small><strong>{form.clientName}</strong></div>
      <div className="customer-review-item"><small>Phone</small><strong>{form.phone}</strong></div>
      <div className="customer-review-item"><small>Notification</small><strong>{form.channels.join(' + ') || '—'}</strong></div>
      <div className="customer-review-item full"><small>Issue</small><strong>{form.issueTitle}</strong></div>
    </div></div>}

    {error && <div className="customer-alert error" role="alert">{error}</div>}
    <div className="customer-request-footer">
      {step > 1 && <button type="button" className="portal-button portal-button-secondary" onClick={() => setStep((value) => value - 1)}>← Back</button>}
      <span />
      {step < 5 ? <button type="button" className="portal-button" onClick={next}>Continue →</button> : <button type="button" className="portal-button" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit Ticket'}</button>}
    </div>
    <p className="signoff-footer">Cyber I.T Masters · This form is written securely to our service desk - no account required.</p>
  </div></div>;
}
