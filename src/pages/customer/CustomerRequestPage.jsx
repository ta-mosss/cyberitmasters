import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { createCustomerTicket, SERVICE_CATALOG } from '../../services/tickets/customer';
import { useAuth } from '../../hooks/useAuth';

const DEVICE_SUBS = new Set(['endpoint-desktop','endpoint-printer','endpoint-mobile','app-support','email-m365','user-admin','firewall','edr','email-sec','iam','network','wifi','server','cabling','isp','ups','m365','azure','backup','dr','hosting','cctv','access-control','alarms','smart-building','hardware','network-hardware','software-license','accessories']);
const INITIAL = { serviceCategory: '', serviceSubCategory: '', channels: ['whatsapp','email'], issueTitle: '', issueDetail: '', priority: 'Medium', urgency: 'Standard (3–5 days)', address: '', preferredDate: '', preferredTime: '', deviceType: '', manufacturer: '', modelNumber: '', serialNumber: '', operatingSystem: '', physicalDamage: '', accessories: '' };

export default function CustomerRequestPage() {
  const auth = useAuth();
  const { profile } = useOutletContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  const category = useMemo(() => SERVICE_CATALOG.find((entry) => entry.id === form.serviceCategory), [form.serviceCategory]);
  const deviceFields = DEVICE_SUBS.has(form.serviceSubCategory);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleChannel = (channel) => setForm((current) => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter((value) => value !== channel) : [...current.channels, channel] }));

  const next = () => {
    setError('');
    if (step === 1 && !form.serviceCategory) return setError('Select a service category.');
    if (step === 2 && !form.serviceSubCategory) return setError('Select the specific service you need.');
    if (step === 3 && (!form.issueTitle.trim() || !form.channels.length)) return setError('Add a request title and at least one communication channel.');
    setStep((value) => Math.min(4, value + 1));
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const ticket = await createCustomerTicket({ user: auth.user, profile, form, files });
      setCreated(ticket);
    } catch (submitError) {
      setError(submitError.message || 'Unable to create the service request.');
    } finally {
      setBusy(false);
    }
  };

  if (created) return <div className="customer-success"><div className="customer-success-icon">✓</div><p className="portal-eyebrow">REQUEST CREATED</p><h2>Your service request is in the queue.</h2><p>Reference <strong>{created.ref}</strong>. Keep this reference available when contacting Cyber I.T Masters.</p><div className="customer-success-actions"><button className="portal-button" onClick={() => navigate(`/customer/tickets/${encodeURIComponent(created.id || created.ref)}`)}>View request</button><button className="portal-button portal-button-secondary" onClick={() => { setCreated(null); setStep(1); setForm(INITIAL); setFiles([]); }}>Create another</button></div></div>;

  return <div className="customer-page-stack"><div className="customer-section-head"><div><p className="portal-eyebrow">SERVICE REQUEST</p><h2>New technical request</h2><span>Tell us what you need and we will route the request into the service desk.</span></div></div><div className="customer-request-card"><div className="customer-request-steps">{['Category','Service','Details','Review'].map((label, index) => <div key={label} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''}><span>{step > index + 1 ? '✓' : index + 1}</span>{label}</div>)}</div>
      {step === 1 && <div className="customer-request-pane"><h3>What can we help with?</h3><p>Select the area that best matches your requirement.</p><div className="customer-catalog-grid">{SERVICE_CATALOG.map((item) => <button type="button" key={item.id} className={form.serviceCategory === item.id ? 'selected' : ''} onClick={() => { update('serviceCategory', item.id); update('serviceSubCategory', ''); }}><strong>{item.icon} {item.label}</strong><span>{item.description}</span></button>)}</div></div>}
      {step === 2 && <div className="customer-request-pane"><h3>{category?.icon} {category?.label}</h3><p>Select the specific technical requirement.</p><div className="customer-service-grid">{category?.items.map(([id,label,icon]) => <button type="button" key={id} className={form.serviceSubCategory === id ? 'selected' : ''} onClick={() => update('serviceSubCategory', id)}>{icon} {label}</button>)}</div></div>}
      {step === 3 && <div className="customer-request-pane"><h3>Request details</h3><div className="customer-form-grid"><Field label="Issue / Request Title *" value={form.issueTitle} onChange={(value) => update('issueTitle', value)} placeholder="e.g. Laptop will not connect to Wi-Fi" full /><Field label="Describe the problem" value={form.issueDetail} onChange={(value) => update('issueDetail', value)} textarea rows={6} placeholder="Include error messages, impact, what you already tried, or any useful detail." full /><Select label="Priority" value={form.priority} onChange={(value) => update('priority', value)} options={['Low','Medium','High','Urgent']} /><Select label="Urgency / expectation" value={form.urgency} onChange={(value) => update('urgency', value)} options={['Standard (3–5 days)','Soon (1–2 days)','Same day','Critical / immediate']} /><Field label="Preferred date" value={form.preferredDate} onChange={(value) => update('preferredDate', value)} type="date" /><Field label="Preferred time" value={form.preferredTime} onChange={(value) => update('preferredTime', value)} type="time" /><Field label="On-site address" value={form.address} onChange={(value) => update('address', value)} full /><div className="customer-field full"><label>Communication channels</label><div className="customer-channel-row">{[['whatsapp','WhatsApp'],['email','Email']].map(([id,label]) => <button type="button" key={id} className={form.channels.includes(id) ? 'selected' : ''} onClick={() => toggleChannel(id)}>{form.channels.includes(id) ? '✓' : '+'} {label}</button>)}</div></div>{deviceFields && <><Field label="Device / asset type" value={form.deviceType} onChange={(value) => update('deviceType', value)} /><Field label="Manufacturer" value={form.manufacturer} onChange={(value) => update('manufacturer', value)} /><Field label="Model" value={form.modelNumber} onChange={(value) => update('modelNumber', value)} /><Field label="Serial number" value={form.serialNumber} onChange={(value) => update('serialNumber', value)} /><Field label="Operating system" value={form.operatingSystem} onChange={(value) => update('operatingSystem', value)} /><Field label="Physical damage" value={form.physicalDamage} onChange={(value) => update('physicalDamage', value)} /><Field label="Accessories" value={form.accessories} onChange={(value) => update('accessories', value)} /></>}
      <div className="customer-field full"><label>Attachments</label><input type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx" onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 5))} /><small>Up to 5 files. The existing storage rules cap individual uploads at 5 MB.</small></div></div></div>}
      {step === 4 && <div className="customer-request-pane"><h3>Review and submit</h3><div className="customer-review-grid"><Review label="Service" value={`${category?.label} › ${category?.items.find(([id]) => id === form.serviceSubCategory)?.[1] || ''}`} /><Review label="Title" value={form.issueTitle} /><Review label="Priority" value={form.priority} /><Review label="Communication" value={form.channels.join(' + ') || '—'} /><Review label="Preferred visit" value={[form.preferredDate, form.preferredTime].filter(Boolean).join(' ') || 'Flexible'} /><Review label="Attachments" value={files.length ? `${files.length} file(s)` : 'None'} /><Review label="Details" value={form.issueDetail || 'No additional description provided.'} full /></div><div className="customer-security-note"><strong>Secure submission</strong><span>The request is written to the service desk against your authenticated customer account. Customer permissions prevent you from changing staff-controlled status, assignments or sign-off fields.</span></div></div>}
      {error && <div className="customer-alert error" role="alert">{error}</div>}
      <div className="customer-request-footer">{step > 1 && <button type="button" className="portal-button portal-button-secondary" onClick={() => setStep((value) => value - 1)}>← Back</button>}<span />{step < 4 ? <button type="button" className="portal-button" onClick={next}>Continue →</button> : <button type="button" className="portal-button" onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Submit Service Request'}</button>}</div>
    </div></div>;
}

function Field({ label, value, onChange, textarea, rows, full, type = 'text', placeholder = '' }) { return <div className={`customer-field ${full ? 'full' : ''}`}><label>{label}</label>{textarea ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}</div>; }
function Select({ label, value, onChange, options }) { return <div className="customer-field"><label>{label}</label><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
function Review({ label, value, full }) { return <div className={`customer-review-item ${full ? 'full' : ''}`}><small>{label}</small><strong>{value}</strong></div>; }
