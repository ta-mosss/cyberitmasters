import { PortalFrame } from '../../components/portal/PortalFrame';

const MODULES = {
  admin: {
    title: 'Admin control plane',
    description: 'System administration is protected by the shared authentication and role boundary. Legacy standalone admin HTML is no longer deployed.',
  },
  management: {
    title: 'Management operations',
    description: 'Operations, service desk, dispatch, SLA, reporting and audit are now handled by the protected React management portal.',
  },
  engineer: {
    title: 'Engineer workspace',
    description: 'Engineer ticket, job, schedule, history and profile workflows are handled by the protected React engineer portal.',
  },
  customer: {
    title: 'Customer service portal',
    description: 'Customer ticket, asset, billing, profile and secure sign-off workflows are handled by the protected React customer portal.',
  }
};

export default function ModulePage({ type }) {
  const module = MODULES[type] || MODULES.admin;
  return (
    <PortalFrame title={module.title}>
      <section className="portal-migration-card portal-migration-card-large">
        <div>
          <p className="portal-kicker">PROTECTED REACT MODULE</p>
          <h2>{module.title}</h2>
          <p>{module.description}</p>
        </div>
        <div className="portal-button-row">
          <a className="portal-button" href="/portal">Back to workspace</a>
        </div>
      </section>
    </PortalFrame>
  );
}
