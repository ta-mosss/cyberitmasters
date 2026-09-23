import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Empty, Badge, Toolbar } from './ManagementShared';

export default function ManagementAssetsPage() {
  const { data } = useOutletContext();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => data.assets.filter((asset) => JSON.stringify(asset).toLowerCase().includes(search.toLowerCase())), [data.assets, search]);
  return <div className="management-page"><Card title="Asset Register" eyebrow="CUSTOMER EQUIPMENT"><Toolbar><input className="management-input" placeholder="Search asset tag, serial, customer, device…" value={search} onChange={(event) => setSearch(event.target.value)} /><span className="management-chip">{rows.length} assets</span></Toolbar>{rows.length ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Asset</th><th>Customer</th><th>Type</th><th>Serial</th><th>Status</th><th>Location</th></tr></thead><tbody>{rows.map((asset) => <tr key={asset.id}><td><strong>{asset.name || asset.assetTag || asset.id}</strong><small>{asset.assetTag || 'No tag'}</small></td><td>{asset.company || asset.customerName || '—'}</td><td>{asset.deviceType || asset.type || '—'}</td><td>{asset.serialNumber || '—'}</td><td><Badge value={asset.status || 'active'} /></td><td>{asset.location || asset.address || '—'}</td></tr>)}</tbody></table></div> : <Empty>No assets found.</Empty>}</Card></div>;
}
