import { useOutletContext } from 'react-router-dom';
import { getRoleLabel } from '../../permissions/roles';

export default function EngineerProfilePage() {
  const { auth, engineerName } = useOutletContext();
  const profile = auth?.profile || {};
  const skills = Array.isArray(profile.skills) ? profile.skills : (profile.skills ? [profile.skills] : []);

  return (
    <>
      <section className="engineer-toolbar"><div><p className="engineer-eyebrow">MY PROFILE</p><h2>Engineer profile</h2></div></section>
      <section className="engineer-card engineer-profile-card">
        <div className="engineer-card-head"><strong>{engineerName}</strong><span>{getRoleLabel(auth?.role)}</span></div>
        <div className="engineer-card-body engineer-profile-grid">
          <Info label="Name" value={engineerName} />
          <Info label="Email" value={auth?.user?.email} />
          <Info label="Role" value={getRoleLabel(auth?.role)} />
          <Info label="Employee ID" value={profile.employeeId || profile.staffId} />
          <Info label="Phone" value={profile.phone} />
          <Info label="Region" value={profile.region || profile.location} />
          <div className="engineer-profile-full"><span>Skills / certifications</span>{skills.length ? <div className="engineer-chip-list">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div> : <strong>Maintain engineer skills and certification data through the management portal.</strong>}</div>
        </div>
      </section>
    </>
  );
}

function Info({ label, value }) {
  return <div className="engineer-info"><span>{label}</span><strong>{value || '—'}</strong></div>;
}
