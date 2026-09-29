import { useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Card, Badge, Field, Modal, Toolbar, Empty } from './ManagementShared';
import { appendManagementNote, displayCustomer, displayEngineer, formatDate, MANAGEMENT_TICKET_STATUSES, sendTicketEmail, STATUS_EMAIL_TEMPLATES, updateManagementTicket } from '../../services/management/operations';

export default function ManagementTicketsPage() {
  const { data, canWrite, auth } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(() => params.get('search') || '');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => data.tickets.filter((ticket) => {
    const haystack = JSON.stringify(ticket).toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!status || String(ticket.status || '') === status) && (!priority || String(ticket.priority || '') === priority);
  }).sort((a, b) => String(b.updatedAt?.seconds || b.updatedAt || '').localeCompare(String(a.updatedAt?.seconds || a.updatedAt || ''))), [data.tickets, search, status, priority]);

  const selectedFromUrl = params.get('ticket');
  const active = selected || (selectedFromUrl ? data.tickets.find((ticket) => ticket.id === selectedFromUrl) : null);

  return <div className="management-page">
    <Card title="Service Desk" eyebrow="TICKETS" actions={<span className="management-chip">{rows.length} results</span>}>
      <Toolbar><input className="management-input" placeholder="Search ticket, customer, service, engineer…" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="management-input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{[...new Set(MANAGEMENT_TICKET_STATUSES)].map((value) => <option key={value} value={value}>{value}</option>)}</select><select className="management-input" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All priorities</option>{['urgent','high','medium','low'].map((value) => <option key={value}>{value}</option>)}</select></Toolbar>
      {rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Reference</th><th>Customer</th><th>Service</th><th>Engineer</th><th>Priority</th><th>Status</th><th>SLA</th><th>Updated</th></tr></thead><tbody>{rows.map((ticket) => <tr key={ticket.id} className="management-click-row" onClick={() => { setSelected(ticket); setParams({ ticket: ticket.id }); }}><td><strong>{ticket.ref || ticket.ticketNumber || ticket.id}</strong><small>{ticket.issueTitle || '—'}</small></td><td>{displayCustomer(ticket)}</td><td>{ticket.serviceSubCategoryLabel || ticket.serviceCategoryLabel || ticket.serviceType || '—'}</td><td>{ticket.assignedEngineer || 'Unassigned'}</td><td><Badge value={ticket.priority || 'medium'} /></td><td><Badge value={ticket.status || 'open'} /></td><td><Badge value={ticket.slaStatus || 'tracking'} /></td><td>{formatDate(ticket.updatedAt || ticket.createdAt)}</td></tr>)}</tbody></table></div> : <Empty>No tickets match the current filters.</Empty>}
    </Card>
    {active && <TicketModal ticket={active} engineers={data.engineers} canWrite={canWrite} auth={auth} close={() => { setSelected(null); setParams({}); }} />}
  </div>;
}

function TicketModal({ ticket, engineers, canWrite, auth, close }) {
  const [form, setForm] = useState({ status: ticket.status || 'open', assignedEngineer: ticket.assignedEngineer || 'Unassigned', assignedEngineerId: ticket.assignedEngineerId || '', priority: ticket.priority || 'medium' });
  const [note, setNote] = useState('');
  const [notifyOnSave, setNotifyOnSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const actor = { uid: auth?.user?.uid, email: auth?.user?.email, role: auth?.role };
  const engineerChoices = engineers.filter((person) => person.active !== false && ['engineer', 'operations_manager', 'service_manager', 'support_agent'].includes(person.role));
  const statusChanged = form.status !== (ticket.status || 'open');

  async function save() {
    if (!canWrite) return;
    setSaving(true); setMessage('');
    try {
      await updateManagementTicket(ticket, form, actor);
      if (note.trim()) await appendManagementNote({ ...ticket, ...form }, note, actor);
      let notifyResult = '';
      if (notifyOnSave && statusChanged && ticket.email) {
        const template = STATUS_EMAIL_TEMPLATES[form.status];
        if (template) {
          try {
            await sendTicketEmail({ ticketId: ticket.id, to: ticket.email, subject: template.subject(ticket), body: template.body(ticket) });
            notifyResult = ' Client notified by email.';
          } catch (emailError) { notifyResult = ` (Client email failed: ${emailError.message})`; }
        } else {
          notifyResult = ' (No email template for this status - client was not notified.)';
        }
      }
      setMessage(`Ticket updated and audit logged.${notifyResult}`);
    } catch (error) { setMessage(error.message || 'Could not save ticket.'); }
    finally { setSaving(false); }
  }

  function selectEngineer(value) {
    const person = engineerChoices.find((item) => displayEngineer(item) === value);
    setForm((current) => ({ ...current, assignedEngineer: value, assignedEngineerId: person?.id || '' }));
  }

  return <Modal title={ticket.ref || ticket.ticketNumber || ticket.id} close={close} wide>
    <div className="management-detail-grid">
      <div>
        <div className="management-detail-header"><div><span>{displayCustomer(ticket)}</span><h3>{ticket.issueTitle || ticket.serviceType || 'Service request'}</h3></div><Badge value={ticket.status || 'open'} /></div>
        <div className="management-detail-facts"><p><b>Contact</b>{ticket.phone || '—'} · {ticket.email || '—'}</p><p><b>Service</b>{ticket.serviceCategoryLabel || ticket.serviceType || '—'} / {ticket.serviceSubCategoryLabel || ticket.serviceSubCategory || '—'}</p><p><b>Site</b>{ticket.address || '—'}</p><p><b>Created</b>{formatDate(ticket.createdAt)}</p><p><b>SLA</b>{ticket.slaStatus || 'tracking'} · due {formatDate(ticket.slaDueAt)}</p></div>
        <div className="management-description"><strong>Customer request</strong><p>{ticket.problemDescription || ticket.issueDetail || ticket.description || 'No description supplied.'}</p></div>
        <div className="management-notes">{(ticket.notes || []).slice(-8).map((item, index) => <div key={item.id || index}><strong>{item.author || 'Note'}</strong><span>{item.txt || item.text || ''}</span><small>{item.at ? formatDate(item.at) : ''}</small></div>)}</div>
        {emailOpen && <EmailPanel ticket={ticket} onClose={() => setEmailOpen(false)} />}
      </div>
      <div className="management-form-column">
        <Field label="Status"><select className="management-input" disabled={!canWrite} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{[...new Set(MANAGEMENT_TICKET_STATUSES)].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Priority"><select className="management-input" disabled={!canWrite} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{['urgent','high','medium','low'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Assigned engineer"><select className="management-input" disabled={!canWrite} value={form.assignedEngineer} onChange={(event) => selectEngineer(event.target.value)}><option>Unassigned</option>{engineerChoices.map((person) => <option key={person.id}>{displayEngineer(person)}</option>)}</select></Field>
        <Field label="Internal note"><textarea className="management-input" rows="7" disabled={!canWrite} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Dispatch instruction, diagnosis, customer communication…" /></Field>
        {ticket.email && statusChanged && <label className="management-checkbox-row"><input type="checkbox" checked={notifyOnSave} onChange={(event) => setNotifyOnSave(event.target.checked)} /> Email the client that status changed to "{form.status}"</label>}
        {message && <div className="management-inline-message">{message}</div>}
        <div className="management-button-row"><button className="management-btn management-btn-primary" type="button" disabled={!canWrite || saving} onClick={save}>{saving ? 'Saving…' : 'Save & audit'}</button>{ticket.phone && <a className="management-btn management-btn-ghost" href={`https://wa.me/${String(ticket.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}{ticket.email && <button type="button" className="management-btn management-btn-ghost" onClick={() => setEmailOpen((v) => !v)}>{emailOpen ? 'Close email' : 'Email client'}</button>}</div>
      </div>
    </div>
  </Modal>;
}

function EmailPanel({ ticket, onClose }) {
  const [to, setTo] = useState(ticket.email || '');
  const [subject, setSubject] = useState(`Re: ${ticket.ref || ''} - ${ticket.issueTitle || ''}`.trim());
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');
  const thread = Array.isArray(ticket.emailThread) ? ticket.emailThread : [];

  function applyTemplate(key) {
    setTemplate(key);
    const entry = STATUS_EMAIL_TEMPLATES[key];
    if (entry) { setSubject(entry.subject(ticket)); setBody(entry.body(ticket)); }
  }

  async function send() {
    setSending(true); setResult('');
    try {
      await sendTicketEmail({ ticketId: ticket.id, to, subject, body });
      setResult('Sent.');
      setBody('');
    } catch (error) { setResult(error.message); }
    finally { setSending(false); }
  }

  return (
    <div className="management-description" style={{ marginTop: 16 }}>
      <strong>Email this client</strong>
      {thread.length > 0 && (
        <div className="management-notes" style={{ marginBottom: 10 }}>
          {thread.slice(-5).map((item, index) => (
            <div key={item.messageId || index}>
              <strong>{item.direction === 'inbound' ? 'From client' : `Sent by ${item.sentByEmail || 'staff'}`}</strong>
              <span>{item.subject}</span>
              <small>{item.sentAt ? new Date(item.sentAt).toLocaleString('en-ZA') : ''}</small>
            </div>
          ))}
        </div>
      )}
      <div className="management-form-grid">
        <Field label="To"><input className="management-input" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Template"><select className="management-input" value={template} onChange={(e) => applyTemplate(e.target.value)}><option value="">Custom message…</option>{Object.entries(STATUS_EMAIL_TEMPLATES).map(([key, tpl]) => <option key={key} value={key}>{tpl.label}</option>)}</select></Field>
        <Field label="Subject" full><input className="management-input" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message" full><textarea className="management-input" rows="6" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" /></Field>
      </div>
      {result && <div className="management-inline-message">{result}</div>}
      <div className="management-button-row">
        <button type="button" className="management-btn management-btn-primary" disabled={sending || !to || !body.trim()} onClick={send}>{sending ? 'Sending…' : 'Send email'}</button>
        <button type="button" className="management-btn management-btn-ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
