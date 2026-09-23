import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function CustomerProfilePage() {
  const auth = useAuth();
  const { profile, saveProfile } = useOutletContext();
  const [form, setForm] = useState({ name: '', company: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setForm({ name: profile?.name || auth.user.displayName || '', company: profile?.company || '', phone: profile?.phone || '' }), [profile, auth.user.displayName]);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setMessage(''); try { await saveProfile(form); setMessage('Profile updated.'); } catch (error) { setMessage(error.message || 'Unable to update your profile.'); } finally { setSaving(false); } };
  return <div className="customer-page-stack"><div className="customer-section-head"><div><p className="portal-eyebrow">ACCOUNT</p><h2>My Profile</h2><span>Your identity is linked to the authenticated Firebase customer account.</span></div></div><form className="customer-profile-card" onSubmit={submit}><div className="customer-profile-header"><div className="customer-avatar large">{(form.name || auth.user.email || 'C').slice(0,1).toUpperCase()}</div><div><strong>{auth.user.email}</strong><span>Customer account</span></div></div><div className="customer-form-grid"><ProfileField label="Full name" value={form.name} onChange={(value) => setForm((f) => ({ ...f, name: value }))} required /><ProfileField label="Company" value={form.company} onChange={(value) => setForm((f) => ({ ...f, company: value }))} /><ProfileField label="Mobile number" value={form.phone} onChange={(value) => setForm((f) => ({ ...f, phone: value }))} /><div className="customer-field"><label>Email</label><input value={auth.user.email || ''} readOnly /></div></div>{message && <div className="customer-alert info">{message}</div>}<button className="portal-button" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button></form></div>;
}
function ProfileField({ label, value, onChange, required }) { return <div className="customer-field"><label>{label}{required ? ' *' : ''}</label><input value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>; }
