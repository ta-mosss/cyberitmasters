import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignaturePad from '../signoff/SignaturePad';

// This page talks to the same secure Cloudflare Worker bridge the legacy
// authorisation.html used - it never reads or writes Firestore directly.
const BRIDGE_ENDPOINT = import.meta.env.VITE_AUTHORISATION_BRIDGE_URL || 'https://cimop-portal-auth.mosesanza.workers.dev/';

export default function AuthorisationPage() {
  const [params] = useSearchParams();
  const ticketRef = params.get('ticketId') || '';
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPosition, setClientPosition] = useState('');
  const [signature, setSignature] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!ticketRef) { setError('No ticket reference provided. Please use ?ticketId=CIM-XXXX'); setLoading(false); return undefined; }
    fetch(BRIDGE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeAction: 'authorisation.get', ticketId: ticketRef }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success || !result.ticket) throw new Error(result.message || `Authorisation bridge returned ${response.status}`);
        return result.ticket;
      })
      .then((data) => {
        if (cancelled) return;
        setTicket(data);
        setClientName(data.clientName || data.name || '');
        setClientPosition(data.authorisationPosition || '');
        setLoading(false);
      })
      .catch((requestError) => { if (!cancelled) { setError(requestError.message || 'Error fetching ticket. Please try again.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [ticketRef]);

  const submit = async () => {
    setError('');
    if (!clientName.trim()) return setError("Please enter the client's full name.");
    if (!signature) return setError('Please draw a signature in the box above.');
    setSubmitting(true);
    try {
      const response = await fetch(BRIDGE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgeAction: 'authorisation.submit', ticketId: ticketRef, name: clientName.trim(), position: clientPosition.trim(), signature }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        if (result.alreadyAuthorised) setTicket((current) => current ? { ...current, authorized: true, authorisationName: result.authorisationName || current.authorisationName } : current);
        throw new Error(result.message || `Authorisation bridge returned ${response.status}`);
      }
      setSuccess(true);
    } catch (submitError) {
      setError(submitError.message || 'Authorisation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="signoff-page"><div className="signoff-card signoff-loading"><div className="portal-spinner" /><p>Loading ticket…</p></div></div>;

  if (error && !ticket) return <div className="signoff-page"><div className="signoff-card"><div className="signoff-error-icon">!</div><p className="portal-eyebrow">DEVICE AUTHORISATION</p><h1>Something went wrong</h1><p>{error}</p></div></div>;

  if (success) return <div className="signoff-page"><div className="signoff-card signoff-success">
    <div className="signoff-success-icon">✓</div>
    <p className="portal-eyebrow">AUTHORISATION COMPLETE</p>
    <h1>Client {clientName} has signed the diagnostic T&Cs</h1>
    <p>Ticket <strong>{ticketRef}</strong>. The service desk has been updated - you may close this window.</p>
  </div></div>;

  if (ticket && ticket.authorized === true) return <div className="signoff-page"><div className="signoff-card signoff-success">
    <div className="signoff-success-icon">📋</div>
    <p className="portal-eyebrow">ALREADY AUTHORISED</p>
    <h1>This ticket was already signed</h1>
    <p>Ticket <strong>{ticketRef}</strong> was signed by <strong>{ticket.authorisationName}</strong>{ticket.authorisationSignedAt ? ` on ${new Date(ticket.authorisationSignedAt).toLocaleString('en-ZA')}` : ''}.</p>
  </div></div>;

  return <div className="signoff-page"><div className="signoff-card">
    <div className="signoff-brand"><img src="/logo.png" alt="Cyber I.T Masters" /><span>DEVICE DROP-OFF AUTHORISATION</span></div>
    <div className="signoff-ticket-banner"><span>Ticket reference</span><strong>{ticketRef}</strong></div>
    <h1>Diagnostic authorisation</h1>
    <div className="signoff-summary">
      <div><span>Customer</span><strong>{ticket?.clientName || ticket?.name || 'Client'}</strong></div>
      <div><span>Phone</span><strong>{ticket?.phone || '—'}</strong></div>
      <div><span>Device</span><strong>{[ticket?.manufacturer, ticket?.modelNumber].filter(Boolean).join(' ') || '—'}</strong></div>
      <div><span>Type</span><strong>{ticket?.deviceType || '—'}</strong></div>
    </div>

    <div className="authorisation-tc-box">
      <h3>Terms &amp; conditions for diagnostic service</h3>
      <p>
        1. <strong>Diagnostic Fee</strong>: A fee of <strong>R350 (incl. VAT)</strong> is payable to commence diagnostic work. This fee is <strong>non-refundable</strong> as it covers our technical time, expertise, and bench usage.<br /><br />
        2. <strong>Fee Deductibility</strong>: If you approve the subsequent repair quote, this R350 fee will be <strong>fully deducted</strong> from your final repair invoice.<br /><br />
        3. <strong>No Unauthorised Repairs</strong>: No repair work will commence without your separate written approval of the official quote we will provide after diagnosis.<br /><br />
        4. <strong>Turnaround Time</strong>: Diagnostic results will be provided within <strong>2–3 business days</strong>. You will receive a separate quote for any recommended repairs.<br /><br />
        5. <strong>Data Loss Disclaimer</strong>: We are <strong>not responsible for any data loss</strong> that may occur during diagnostics. Please ensure you have a recent backup.<br /><br />
        6. <strong>Latent Defects</strong>: We take extreme care but are not liable for pre-existing dormant issues that may fail during diagnosis.<br /><br />
        7. <strong>Collection</strong>: If you decline the repair quote, you must collect your device within 7 business days. A storage fee of R50/day may apply thereafter. Uncollected items after 30 days may be disposed of to cover costs.<br /><br />
        <em>By signing below, you authorise Cyber I.T Masters to perform the diagnostic assessment. You understand this fee is non-refundable, deductible from the repair cost, and that no repair work will commence without your separate approval of the repair quote.</em>
      </p>
    </div>

    <div className="signoff-two-col">
      <div className="signoff-field"><label>Full name *</label><input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. John Doe" /></div>
      <div className="signoff-field"><label>Position / designation</label><input value={clientPosition} onChange={(e) => setClientPosition(e.target.value)} placeholder="e.g. IT Manager" /></div>
    </div>
    <SignaturePad onChange={setSignature} />
    {error && <div className="customer-alert error" role="alert">{error}</div>}
    <button type="button" className="signoff-submit" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit Authorisation'}</button>
    <p className="signoff-footer">Cyber I.T Masters · This authorisation is digitally recorded and stored securely.</p>
  </div></div>;
}
