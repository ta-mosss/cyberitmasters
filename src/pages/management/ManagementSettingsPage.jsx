import { useOutletContext } from 'react-router-dom';
import { Card, KpiGrid } from './ManagementShared';
import { getRoleLabel } from '../../permissions/roles';

export default function ManagementSettingsPage() {
  const { auth, data, canWrite } = useOutletContext();
  return <div className="management-page"><KpiGrid items={[{ label: 'Session Role', value: getRoleLabel(auth?.role) }, { label: 'Write Access', value: canWrite ? 'Manager' : 'Read-only' }, { label: 'Live Collections', value: Object.keys(data).length }, { label: 'Staff Loaded', value: data.engineers.length }]} /><div className="management-grid-2">
    <Card title="Operations Guardrails" eyebrow="SECURITY"><div className="management-settings-list"><div><strong>Authentication</strong><span>Firebase Auth session + backend token verification.</span></div><div><strong>Authorisation</strong><span>Firestore rules remain the final enforcement boundary.</span></div><div><strong>Audit</strong><span>Manager ticket/job writes create audit records in the same batch.</span></div><div><strong>Sign-off</strong><span>Customer sign-off continues through the one-time server-authorised function.</span></div></div></Card>
    <Card title="Migration State" eyebrow="PHASE 3"><div className="management-settings-list"><div><strong>Customer Portal</strong><span className="good-text">React migrated</span></div><div><strong>Engineer Portal</strong><span className="good-text">React migrated</span></div><div><strong>Management Portal</strong><span className="good-text">React migrated in this build</span></div><div><strong>Legacy HTML</strong><span>Retained until production cutover and verification.</span></div></div></Card>
  </div></div>;
}
