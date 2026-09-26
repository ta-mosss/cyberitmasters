import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Badge, Card, Empty, Field, Modal, Toolbar } from './ManagementShared';
import { displayEngineer, formatDate, updateStaffAccount } from '../../services/management/operations';
import { ROLE_LABELS } from '../../permissions/roles';

const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter((role) => role !== 'customer');

export default function ManagementStaffPage() {
  const { data, auth } = useOutletContext();
  const isSuperAdmin = auth?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const rows = useMemo(
    () => data.engineers.filter((person) => JSON.stringify(person).toLowerCase().includes(search.toLowerCase())),
    [data.engineers, search]
  );

  return (
    <div className="management-page">
      <Card
        title="Staff Accounts"
        eyebrow="ROLES & ACCESS"
        actions={!isSuperAdmin && <span className="management-chip">View only — super admin required to change roles</span>}
      >
        <Toolbar>
          <input
            className="management-input"
            placeholder="Search staff, department, email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="management-chip">{rows.length} staff</span>
        </Toolbar>
        {rows.length ? (
          <div className="management-table-wrap">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((person) => (
                  <tr key={person.id} className="management-click-row" onClick={() => setSelected(person)}>
                    <td><strong>{displayEngineer(person)}</strong><small>{person.jobTitle || 'Staff'}</small></td>
                    <td>{person.email || '—'}</td>
                    <td>{ROLE_LABELS[person.role] || person.role || '—'}</td>
                    <td><Badge value={person.active === false ? 'inactive' : 'active'} /></td>
                    <td>{formatDate(person.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No staff accounts found.</Empty>
        )}
      </Card>
      {selected && <StaffModal person={selected} isSuperAdmin={isSuperAdmin} close={() => setSelected(null)} />}
    </div>
  );
}

function StaffModal({ person, isSuperAdmin, close }) {
  const [role, setRole] = useState(person.role || 'support_agent');
  const [active, setActive] = useState(person.active !== false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    if (!isSuperAdmin) return;
    setSaving(true);
    setMessage('');
    try {
      await updateStaffAccount(person.id, { role, active });
      setMessage('Saved. This account must sign in again for the change to take effect.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Manage ${displayEngineer(person)}`} close={close}>
      <div className="management-form-grid">
        <Field label="Role">
          <select
            className="management-input"
            value={role}
            disabled={!isSuperAdmin || saving}
            onChange={(event) => setRole(event.target.value)}
          >
            {ASSIGNABLE_ROLES.map((value) => (
              <option key={value} value={value}>{ROLE_LABELS[value]}</option>
            ))}
          </select>
        </Field>
        <Field label="Account status">
          <select
            className="management-input"
            value={active ? 'active' : 'inactive'}
            disabled={!isSuperAdmin || saving}
            onChange={(event) => setActive(event.target.value === 'active')}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
      {!isSuperAdmin && <p className="management-inline-message">Only a super admin can change roles or account status.</p>}
      {message && <div className="management-inline-message">{message}</div>}
      <div className="management-button-row">
        <button
          className="management-btn management-btn-primary"
          type="button"
          disabled={!isSuperAdmin || saving}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save & apply'}
        </button>
        <button className="management-btn management-btn-ghost" type="button" onClick={close}>Close</button>
      </div>
    </Modal>
  );
}
