import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Badge, Card, Empty, Field, Modal, Toolbar } from './ManagementShared';
import { teamAdminRequest } from '../../services/management/operations';
import { ROLE_LABELS } from '../../permissions/roles';

// The CIMOP Worker only recognises these 5 roles (see TEAM_ROLES in the worker
// source) - service_manager/dispatcher exist in the app's own role list but
// the worker will reject them, so the dropdown here is deliberately narrower.
const WORKER_ROLES = ['super_admin', 'operations_manager', 'support_agent', 'engineer', 'finance'];
const EMPTY_FORM = { email: '', displayName: '', phone: '', jobTitle: '', department: '', role: 'engineer' };

const RECONCILE_LABEL = {
  HEALTHY: 'Healthy',
  UNLINKED_AUTH: 'No team profile',
  AUTH_WITH_PROFILE: 'Profile, no team role',
  TEAM_AUTH_MISSING_PROFILE: 'Team role, missing profile',
  PROFILE_MISSING_AUTH: 'Profile, no auth account',
};

export default function ManagementStaffPage() {
  const { auth } = useOutletContext();
  const isSuperAdmin = auth?.role === 'super_admin';
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    teamAdminRequest('list')
      .then((result) => setRows(result.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (isSuperAdmin) load(); else setLoading(false); }, [isSuperAdmin]);

  const runReconcile = async () => {
    setError(''); setNotice('');
    try {
      const result = await teamAdminRequest('reconcile');
      setNotice(`Reconciliation complete: ${result.summary.healthy} healthy, ${result.summary.teamMissingProfile} team accounts missing a profile, ${result.summary.profileMissingAuth} profiles with no auth account, ${result.summary.unlinkedAuth} auth accounts with no team role.`);
      load();
    } catch (err) { setError(err.message); }
  };

  const filtered = rows.filter((person) => JSON.stringify(person).toLowerCase().includes(search.toLowerCase()));

  if (!isSuperAdmin) {
    return <div className="management-page"><Card title="Staff Accounts" eyebrow="ROLES & ACCESS">
      <p className="management-inline-message">Only a super admin can view or change staff accounts. This calls the CIMOP Team &amp; Access Worker directly, which requires super-admin authorisation on the token itself.</p>
    </Card></div>;
  }

  return (
    <div className="management-page">
      <Card title="Staff Accounts" eyebrow="ROLES & ACCESS" actions={<div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="management-btn management-btn-ghost" onClick={runReconcile}>Run reconciliation</button>
        <button type="button" className="management-btn management-btn-primary" onClick={() => setCreating(true)}>+ Add staff</button>
      </div>}>
        <Toolbar>
          <input className="management-input" placeholder="Search staff, department, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <span className="management-chip">{filtered.length} staff</span>
        </Toolbar>
        {error && <div className="customer-alert error" role="alert">{error}</div>}
        {notice && <div className="customer-alert" role="status">{notice}</div>}
        {loading ? <Empty>Loading staff roster…</Empty> : filtered.length ? (
          <div className="management-table-wrap">
            <table className="management-table">
              <thead><tr><th>Staff</th><th>Email</th><th>Role</th><th>Status</th><th>Account health</th></tr></thead>
              <tbody>
                {filtered.map((person) => (
                  <tr key={person.uid} className="management-click-row" onClick={() => setSelected(person)}>
                    <td><strong>{person.displayName || '(no name)'}</strong><small>{person.jobTitle || 'Staff'}</small></td>
                    <td>{person.email || '—'}</td>
                    <td>{ROLE_LABELS[person.role] || person.role || '—'}</td>
                    <td><Badge value={person.disabled ? 'inactive' : 'active'} /></td>
                    <td><Badge value={person.reconciliationStatus === 'HEALTHY' ? 'healthy' : 'attention'} />{' '}{RECONCILE_LABEL[person.reconciliationStatus] || person.reconciliationStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>No staff accounts found yet - use "Add staff" to create the first one.</Empty>}
      </Card>
      {selected && <StaffModal person={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />}
      {creating && <CreateStaffModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function StaffModal({ person, onClose, onSaved }) {
  const [form, setForm] = useState({ displayName: person.displayName || '', phone: person.phone || '', jobTitle: person.jobTitle || '', department: person.department || '', role: WORKER_ROLES.includes(person.role) ? person.role : 'engineer' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    setSaving(true); setMessage('');
    try { await teamAdminRequest('update', { uid: person.uid, changes: form }); onSaved(); }
    catch (err) { setMessage(err.message); setSaving(false); }
  };
  const toggleStatus = async () => {
    setSaving(true); setMessage('');
    try { await teamAdminRequest('status', { uid: person.uid, status: person.disabled ? 'active' : 'disabled' }); onSaved(); }
    catch (err) { setMessage(err.message); setSaving(false); }
  };
  const sendReset = async () => {
    setSaving(true); setMessage('');
    try { const result = await teamAdminRequest('resetPassword', { uid: person.uid }); setMessage(`Reset link generated - copy and send it to ${result.email}: ${result.passwordResetLink}`); }
    catch (err) { setMessage(err.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Manage ${person.displayName || person.email}`} close={onClose}>
      <div className="management-form-grid">
        <Field label="Display name"><input className="management-input" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} /></Field>
        <Field label="Phone"><input className="management-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0821234567" /></Field>
        <Field label="Job title"><input className="management-input" value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} /></Field>
        <Field label="Department"><input className="management-input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
        <Field label="Role"><select className="management-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{WORKER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}</select></Field>
      </div>
      {message && <div className="customer-alert" role="status">{message}</div>}
      <div className="management-button-row">
        <button type="button" className="management-btn management-btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save & apply'}</button>
        <button type="button" className="management-btn management-btn-ghost" disabled={saving} onClick={toggleStatus}>{person.disabled ? 'Reactivate' : 'Deactivate'}</button>
        <button type="button" className="management-btn management-btn-ghost" disabled={saving} onClick={sendReset}>Send password reset link</button>
        <button type="button" className="management-btn management-btn-ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function CreateStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const create = async () => {
    setSaving(true); setError('');
    try { const created = await teamAdminRequest('create', { user: form }); setResult(created); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (result) return (
    <Modal title="Staff account created" close={() => { onCreated(); }}>
      <p>{form.displayName} ({form.email}) has been created with the role {ROLE_LABELS[form.role] || form.role}.</p>
      <p>Send this password-reset link so they can set their own password - it is only shown once:</p>
      <div className="signoff-summary"><strong style={{ wordBreak: 'break-all' }}>{result.passwordResetLink}</strong></div>
      <div className="management-button-row"><button type="button" className="management-btn management-btn-primary" onClick={onCreated}>Done</button></div>
    </Modal>
  );

  return (
    <Modal title="Add a staff account" close={onClose}>
      <div className="management-form-grid">
        <Field label="Full name *"><input className="management-input" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} /></Field>
        <Field label="Email *"><input type="email" className="management-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Phone"><input className="management-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0821234567" /></Field>
        <Field label="Job title"><input className="management-input" value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} /></Field>
        <Field label="Department"><input className="management-input" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></Field>
        <Field label="Role *"><select className="management-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>{WORKER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}</select></Field>
      </div>
      {error && <div className="customer-alert error" role="alert">{error}</div>}
      <div className="management-button-row">
        <button type="button" className="management-btn management-btn-primary" disabled={saving || !form.displayName || !form.email} onClick={create}>{saving ? 'Creating…' : 'Create account'}</button>
        <button type="button" className="management-btn management-btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
