import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function CustomerAssetsPage() {
  const { tickets } = useOutletContext();
  const assets = useMemo(() => [...new Map(tickets.filter((ticket) => ticket.serialNumber || ticket.deviceType || ticket.manufacturer || ticket.modelNumber).map((ticket) => [`${ticket.manufacturer}|${ticket.modelNumber}|${ticket.serialNumber}|${ticket.deviceType}`, ticket])).values()], [tickets]);
  return <div className="customer-page-stack"><div className="customer-section-head"><div><p className="portal-eyebrow">CUSTOMER ASSETS</p><h2>Known devices & assets</h2><span>Assets are derived from service records during this migration phase.</span></div></div><div className="customer-asset-grid">{assets.length ? assets.map((asset) => <article key={asset.id} className="customer-asset-card"><div className="customer-asset-icon">💻</div><strong>{asset.deviceType || 'Technology asset'}</strong><span>{[asset.manufacturer, asset.modelNumber].filter(Boolean).join(' ') || 'Unspecified model'}</span>{asset.serialNumber && <small>Serial: {asset.serialNumber}</small>}</article>) : <div className="customer-empty"><h3>No assets recorded yet</h3><p>Device and asset details will appear as they are included in service requests.</p></div>}</div></div>;
}
