import { useEffect, useMemo, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import {
  ACTIVE_ENGINEER_STATUSES,
  ENGINEER_STATUS_META,
  ENGINEER_STATUSES,
  addEngineerTimeEntry,
  appendEngineerNote,
  createCustomerSignoffLink,
  updateEngineerTicket,
  uploadEngineerFiles,
} from '../../services/tickets/engineer';

const FUNCTION_URL = import.meta.env.VITE_SIGNOFF_FUNCTION_URL || '/.netlify/functions/authorise';

export default function EngineerWorkPage() {
  const { tickets, setTickets, engineerName, engineerId } = useOutletContext();
  const location = useLocation();
  const [selectedId, setSelectedId] = useState(tickets[0]?.id || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('active');
  const [note, setNote] = useState('');
  const [working, setWorking] = useState(null);
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const requested = location.state?.selectedTicketId;
    if (requested && tickets.some((ticket) => ticket.id === requested)) setSelectedId(requested);
  }, [location.state?.selectedTicketId, tickets]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) || null;
  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter === 'active' && !ACTIVE_ENGINEER_STATUSES.includes(ticket.status)) return false;
      if (filter !== 'all' && filter !== 'active' && ticket.status !== filter) return false;
      if (!query) return true;
      const haystack = [
        ticket.ref, ticket.ticketNumber, ticket.clientName, ticket.name, ticket.company,
        ticket.issueTitle, ticket.problemDescription, ticket.serviceCategoryLabel,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [tickets, filter, search]);

  const flash = (message) => {
    setToast(message);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setToast(''), 2600);
  };

  const mergeTicket = (ticketId, changes) => {
    setTickets((current) => current.map((ticket) => (
      ticket.id === ticketId ? { ...ticket, ...changes } : ticket
    )));
  };

  async function changeStatus(nextStatus) {
    if (!selected || !nextStatus || nextStatus === selected.status) return;
    setBusy('status');
    try {
      const changes = { status: nextStatus, engineerStatus: nextStatus, engineerId, engineerName };
      await updateEngineerTicket(selected.id, changes);
      mergeTicket(selected.id, changes);
      flash(`Status changed to ${ENGINEER_STATUS_META[nextStatus]?.label || nextStatus}.`);
    } catch (error) {
      flash(error.message || 'Unable to change status.');
    } finally {
      setBusy('');
    }
  }

  async function addNote() {
    if (!selected || !note.trim()) return;
    setBusy('note');
    try {
      const nextNote = await appendEngineerNote(selected, { text: note, engineerId, engineerName });
      mergeTicket(selected.id, { notes: [...(selected.notes || []), nextNote] });
      setNote('');
      flash('Engineer note added.');
    } catch (error) {
      flash(error.message || 'Unable to add note.');
    } finally {
      setBusy('');
    }
  }

  async function upload(event) {
    if (!selected || !event.target.files?.length) return;
    setBusy('upload');
    try {
      const attachments = await uploadEngineerFiles(selected, event.target.files, { engineerId, engineerName });
      mergeTicket(selected.id, { attachments });
      flash('Files uploaded.');
    } catch (error) {
      flash(error.message || 'Unable to upload files.');
    } finally {
      setBusy('');
      event.target.value = '';
    }
  }

  async function startTimer() {
    if (!selected || working) return;
    const startedAt = new Date().toISOString();
    setBusy('timer-start');
    try {
      const changes = { workStartedAt: startedAt };
      if (selected.status !== 'in_progress') Object.assign(changes, { status: 'in_progress', engineerStatus: 'in_progress', engineerId, engineerName });
      await updateEngineerTicket(selected.id, changes);
      setWorking({ startedAt });
      mergeTicket(selected.id, changes);
      flash('Work timer started.');
    } catch (error) {
      flash(error.message || 'Unable to start the timer.');
    } finally {
      setBusy('');
    }
  }

  async function stopTimer() {
    if (!selected || !working) return;
    const minutes = Math.max(1, Math.round((Date.now() - new Date(working.startedAt).getTime()) / 60000));
    setBusy('timer');
    try {
      const total = await addEngineerTimeEntry(selected, {
        engineerId,
        engineerName,
        startedAt: working.startedAt,
        endedAt: new Date().toISOString(),
        minutes,
      });
      mergeTicket(selected.id, { timeSpentMinutes: total, workStartedAt: null });
      setWorking(null);
      flash(`Logged ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    } catch (error) {
      flash(error.message || 'Unable to stop the timer.');
    } finally {
      setBusy('');
    }
  }

  async function requestSignoff() {
    if (!selected) return;
    setBusy('signoff');
    try {
      if (!['resolved', 'awaiting-signoff'].includes(selected.status)) {
        await updateEngineerTicket(selected.id, { status: 'resolved', engineerStatus: 'resolved', engineerId, engineerName });
        mergeTicket(selected.id, { status: 'resolved', engineerStatus: 'resolved', engineerId, engineerName });
      }
      const result = await createCustomerSignoffLink(selected.ref || selected.id, FUNCTION_URL);
      mergeTicket(selected.id, { status: 'awaiting-signoff', signoffRequestedAt: new Date().toISOString() });
      try {
        await navigator.clipboard.writeText(result.link);
        flash('Secure customer sign-off link created and copied.');
      } catch {
        window.prompt('Secure customer sign-off link', result.link);
      }
    } catch (error) {
      flash(error.message || 'Unable to create the sign-off link.');
    } finally {
      setBusy('');
    }
  }

  const customerPhone = String(selected?.phone || '').replace(/\D/g, '');
  const statusTone = (status) => `engineer-badge tone-${ENGINEER_STATUS_META[status]?.tone || 'slate'}`;

  return (
    <>
      <section className="engineer-toolbar">
        <div><p className="engineer-eyebrow">ASSIGNED WORK QUEUE</p><h2>Your service tickets</h2></div>
        <div className="engineer-toolbar-actions">
          <input className="engineer-input engineer-search" placeholder="Search ticket, customer or issue…" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="engineer-input engineer-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="active">Active</option><option value="all">All</option>
            {ENGINEER_STATUSES.map((status) => <option key={status} value={status}>{ENGINEER_STATUS_META[status]?.label || status}</option>)}
          </select>
        </div>
      </section>

      <div className="engineer-work-grid">
        <section className="engineer-card engineer-queue-card">
          <div className="engineer-card-head"><strong>Work Queue</strong><span>{shown.length} shown</span></div>
          <div className="engineer-card-body engineer-queue">
            {shown.map((ticket) => (
              <button type="button" key={ticket.id} className={`engineer-ticket ${selected?.id === ticket.id ? 'selected' : ''}`} onClick={() => setSelectedId(ticket.id)}>
                <div className="engineer-row"><strong>{ticket.ref || ticket.ticketNumber || ticket.id}</strong><span className={statusTone(ticket.status)}>{ENGINEER_STATUS_META[ticket.status]?.label || ticket.status || 'Open'}</span></div>
                <span>{ticket.clientName || ticket.name || 'Customer'} · {ticket.company || '—'}</span>
                <b>{ticket.issueTitle || ticket.serviceSubCategoryLabel || ticket.serviceCategoryLabel || ticket.problemDescription || 'Service request'}</b>
                <small>{ticket.serviceCategoryLabel || ticket.serviceCategory || 'General'} · {ticket.preferredDate || 'No date'} {ticket.preferredTime || ''}</small>
              </button>
            ))}
            {!shown.length && <div className="engineer-empty">No assigned work matches this view.</div>}
          </div>
        </section>

        <section className="engineer-card engineer-detail-card">
          {!selected ? <div className="engineer-empty">Select an assigned ticket to open the job card.</div> : (
            <>
              <div className="engineer-card-head engineer-detail-head">
                <div><strong>{selected.ref || selected.ticketNumber || selected.id}</strong><span>{selected.clientName || selected.name || 'Customer'}</span></div>
                <span className={statusTone(selected.status)}>{ENGINEER_STATUS_META[selected.status]?.label || selected.status || 'Open'}</span>
              </div>
              <div className="engineer-card-body">
                <DetailSection title="Customer"><div className="engineer-detail-grid-2"><Info label="Name" value={selected.clientName || selected.name} /><Info label="Company" value={selected.company} /><Info label="Phone" value={selected.phone} /><Info label="Email" value={selected.email} /></div></DetailSection>
                <DetailSection title="Service Request"><Info label="Category" value={selected.serviceCategoryLabel || selected.serviceCategory} /><Info label="Request" value={selected.serviceSubCategoryLabel || selected.serviceSubCategory || selected.issueTitle} /><p className="engineer-description">{selected.problemDescription || selected.issueDetail || 'No description provided.'}</p></DetailSection>
                <DetailSection title="Site / Device"><Info label="Address" value={selected.address || 'Remote / address not supplied'} /><Info label="Device" value={[selected.deviceType, selected.manufacturer, selected.modelNumber || selected.model, selected.serialNumber].filter(Boolean).join(' · ')} /></DetailSection>
                <DetailSection title="Status"><div className="engineer-inline-actions"><select className="engineer-input" value={selected.status || 'assigned'} disabled={busy === 'status'} onChange={(event) => changeStatus(event.target.value)}>{ENGINEER_STATUSES.map((status) => <option key={status} value={status}>{ENGINEER_STATUS_META[status]?.label || status}</option>)}</select><span className={statusTone(selected.status)}>{ENGINEER_STATUS_META[selected.status]?.label || selected.status}</span></div></DetailSection>
                <DetailSection title="Work Timer"><div className="engineer-inline-actions">{!working ? <button className="engineer-btn engineer-btn-good" disabled={Boolean(busy)} onClick={startTimer}>▶ Start work</button> : <button className="engineer-btn engineer-btn-warn" disabled={busy === 'timer'} onClick={stopTimer}>■ Stop & log time</button>}<span className="engineer-helper">Logged: {Number(selected.timeSpentMinutes || 0)} min</span></div></DetailSection>
                <DetailSection title="Engineer Notes"><textarea className="engineer-textarea" rows="4" placeholder="Document diagnosis, actions, parts and customer communication…" value={note} onChange={(event) => setNote(event.target.value)} /><button className="engineer-btn engineer-btn-primary" disabled={busy === 'note'} onClick={addNote}>{busy === 'note' ? 'Saving…' : 'Add note'}</button><div className="engineer-timeline">{(selected.notes || []).filter((entry) => entry?.type !== 'internal-only').slice().reverse().slice(0, 8).map((entry, index) => <article key={entry.id || index}><strong>{entry.author || entry.engineer || 'Engineer'}</strong><p>{entry.txt || entry.text || ''}</p><small>{formatDate(entry.at)}</small></article>)}</div></DetailSection>
                <DetailSection title="Photos & Files"><label className="engineer-upload"><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xlsx,.csv" onChange={upload} /><span>{busy === 'upload' ? 'Uploading…' : '＋ Add photos / documents'}</span><small>Maximum 6 files, 5 MB each.</small></label><div className="engineer-file-list">{(selected.attachments || []).slice().reverse().map((file, index) => <a key={`${file.path || file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer">{file.name || 'Attachment'} ↗</a>)}</div></DetailSection>
                <DetailSection title="Customer Communication"><div className="engineer-inline-actions">{customerPhone && <a className="engineer-btn engineer-btn-secondary" href={`https://wa.me/${customerPhone}`} target="_blank" rel="noreferrer">WhatsApp</a>}{selected.email && <a className="engineer-btn engineer-btn-secondary" href={`mailto:${selected.email}`}>Email</a>}</div></DetailSection>
                <DetailSection title="Completion"><div className="engineer-completion-box"><p>Resolve the work first, then generate a secure, expiring customer sign-off link. The customer closes the service record through the server-authorised sign-off flow.</p><div className="engineer-inline-actions"><button className="engineer-btn engineer-btn-good" disabled={busy === 'status'} onClick={() => changeStatus('resolved')}>✓ Mark resolved</button><button className="engineer-btn engineer-btn-primary" disabled={busy === 'signoff'} onClick={requestSignoff}>{busy === 'signoff' ? 'Creating…' : 'Request secure sign-off'}</button></div></div></DetailSection>
              </div>
            </>
          )}
        </section>
      </div>

      {toast && <div className="engineer-toast" role="status">{toast}</div>}
    </>
  );
}

function DetailSection({ title, children }) { return <section className="engineer-section"><div className="engineer-section-title">{title}</div>{children}</section>; }
function Info({ label, value }) { return <div className="engineer-info"><span>{label}</span><strong>{value || '—'}</strong></div>; }
function formatDate(value) {
  if (!value) return '—';
  try { const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value); return date.toLocaleString(); }
  catch { return String(value); }
}
