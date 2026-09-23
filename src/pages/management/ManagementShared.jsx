import { useState } from 'react';
import { statusTone } from '../../services/management/operations';

export function Badge({ value }) {
  const tone = statusTone(value);
  return <span className={`management-badge management-badge-${tone}`}>{value || '—'}</span>;
}

export function Card({ title, eyebrow, actions, children, className = '' }) {
  return <section className={`management-card ${className}`}>
    {(title || eyebrow || actions) && <div className="management-card-head">
      <div>{eyebrow && <span>{eyebrow}</span>}{title && <h2>{title}</h2>}</div>
      {actions && <div className="management-card-actions">{actions}</div>}
    </div>}
    {children}
  </section>;
}

export function Empty({ children = 'Nothing to show here yet.' }) {
  return <div className="management-empty">{children}</div>;
}

export function Toolbar({ children }) {
  return <div className="management-toolbar">{children}</div>;
}

export function Modal({ title, children, close, wide = false }) {
  return <div className="management-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <div className={`management-modal ${wide ? 'management-modal-wide' : ''}`} role="dialog" aria-modal="true">
      <div className="management-modal-head"><h2>{title}</h2><button type="button" onClick={close} aria-label="Close">×</button></div>
      {children}
    </div>
  </div>;
}

export function Field({ label, children, full = false }) {
  return <label className={`management-field ${full ? 'management-field-full' : ''}`}><span>{label}</span>{children}</label>;
}

export function KpiGrid({ items }) {
  return <div className="management-kpi-grid">{items.map((item) => <div className="management-kpi" key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.meta && <small>{item.meta}</small>}</div>)}</div>;
}

export function ConfirmButton({ children, onConfirm, disabled = false, className = 'management-btn management-btn-danger' }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button type="button" className={className} disabled={disabled} onClick={() => setArmed(true)}>{children}</button>;
  return <span className="management-confirm-inline"><button type="button" className="management-btn management-btn-danger" onClick={onConfirm}>Confirm</button><button type="button" className="management-btn management-btn-ghost" onClick={() => setArmed(false)}>Cancel</button></span>;
}
