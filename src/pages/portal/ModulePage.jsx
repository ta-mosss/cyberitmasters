import { LegacyPortalButton, PortalFrame } from '../../components/portal/PortalFrame';

const MODULES = {
  admin: {
    title: 'Admin control plane',
    source: 'admin.html',
    description: 'The React route is established and permission-protected. The current admin application remains the reference implementation during migration.',
    button: 'Open current admin portal'
  },
  management: {
    title: 'Management operations',
    source: 'management.html',
    description: 'Management is the next major operational migration target: tickets, customers, jobs, SLA, dispatch, reporting and audit.',
    button: 'Open current management portal'
  },
  engineer: {
    title: 'Engineer workspace',
    source: 'engineer.html',
    description: 'Engineer workflows will be extracted into reusable React ticket, job, SLA and asset components.',
    button: 'Open current engineer portal'
  },
  customer: {
    title: 'Customer service portal',
    source: 'client.html',
    description: 'Customer-facing ticket and asset workflows are preserved while the new customer experience is built in the shared application shell.',
    button: 'Open current customer portal'
  }
};

export default function ModulePage({ type }) {
  const module = MODULES[type];

  return (
    <PortalFrame title={module.title}>
      <section className="portal-migration-card portal-migration-card-large">
        <div>
          <p className="portal-kicker">REACT MIGRATION TARGET</p>
          <h2>{module.title}</h2>
          <p>{module.description}</p>
        </div>
        <div className="portal-button-row">
          <LegacyPortalButton href={module.source} label={module.button} />
          <a className="portal-button" href="/portal">Back to workspace</a>
        </div>
      </section>

      <section className="portal-grid portal-grid-three">
        <article className="portal-card static">
          <span className="portal-card-label">NOW</span>
          <h3>Protected route</h3>
          <p>This module is already behind the shared React authentication and role boundary.</p>
        </article>
        <article className="portal-card static">
          <span className="portal-card-label">NEXT</span>
          <h3>Domain extraction</h3>
          <p>Existing page logic will be separated into services, hooks and reusable components.</p>
        </article>
        <article className="portal-card static">
          <span className="portal-card-label">TARGET</span>
          <h3>Legacy removal</h3>
          <p>The standalone HTML/Babel/Firebase page will be removed only after parity checks pass.</p>
        </article>
      </section>
    </PortalFrame>
  );
}
