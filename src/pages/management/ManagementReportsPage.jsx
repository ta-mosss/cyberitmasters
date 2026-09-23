import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, KpiGrid } from './ManagementShared';

export default function ManagementReportsPage() {
  const { data } = useOutletContext();
  const serviceMix = useMemo(() => { const result = {}; data.tickets.forEach((ticket) => { const key = ticket.serviceCategoryLabel || ticket.serviceType || 'General'; result[key] = (result[key] || 0) + 1; }); return Object.entries(result).sort((a, b) => b[1] - a[1]); }, [data.tickets]);
  const engineerTime = useMemo(() => { const result = {}; data.tickets.forEach((ticket) => { const key = ticket.assignedEngineer || 'Unassigned'; result[key] = (result[key] || 0) + Number(ticket.timeSpentMinutes || 0); }); return Object.entries(result).sort((a, b) => b[1] - a[1]); }, [data.tickets]);
  const closed = data.tickets.filter((ticket) => ticket.status === 'closed').length;
  const resolved = data.tickets.filter((ticket) => ticket.status === 'resolved').length;
  const completedJobs = data.jobs.filter((job) => job.status === 'completed').length;
  const trackedMinutes = data.tickets.reduce((sum, ticket) => sum + Number(ticket.timeSpentMinutes || 0), 0);
  const signoffCount = data.tickets.filter((ticket) => ticket.clientSignoff || ticket.signoffUsedAt).length;
  return <div className="management-page"><KpiGrid items={[{ label: 'Tickets Closed', value: closed }, { label: 'Resolved', value: resolved }, { label: 'Jobs Completed', value: completedJobs }, { label: 'Tracked Time', value: `${trackedMinutes} min` }]} /><div className="management-grid-3">
    <Card title="Service Volume" eyebrow="DEMAND"><div className="management-ranked-list">{serviceMix.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div></Card>
    <Card title="Engineer Time" eyebrow="WORKFORCE"><div className="management-ranked-list">{engineerTime.slice(0, 12).map(([name, value]) => <div key={name}><span>{name}</span><strong>{value} min</strong></div>)}</div></Card>
    <Card title="Customer Completion" eyebrow="QUALITY"><div className="management-stat-list"><span>Sign-offs received <b>{signoffCount}</b></span><span>Sign-off coverage <b>{data.tickets.length ? `${Math.round((signoffCount / data.tickets.length) * 100)}%` : '0%'}</b></span><span>Active engineers <b>{data.engineers.filter((person) => person.active !== false && person.role === 'engineer').length}</b></span><span>Assets registered <b>{data.assets.length}</b></span></div></Card>
  </div><Card title="Report Scope" eyebrow="CURRENT DATASET"><p className="management-card-copy">These operational summaries are calculated from the live records currently loaded into the Management Portal. They are intended for operational visibility; financial accounting and contractual KPI reporting should continue to use their authoritative systems.</p></Card></div>;
}
