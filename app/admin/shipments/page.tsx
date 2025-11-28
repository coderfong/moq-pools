'use client';
import { useState } from 'react';
export default function Shipments() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>('');
  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/shipments/upload', { method: 'POST', body: fd });
    const j = await res.json();
    setMsg(j.ok ? 'Uploaded ✓' : j.error || 'Error');
  }
  return (
    <div className="space-y-4">
      <h1 className="h2">Upload Tracking CSV</h1>
      <input type="file" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      <button className="btn" onClick={upload}>Upload</button>
      {msg && <div className="badge">{msg}</div>}
      <p className="text-sm opacity-70">CSV: order_ref,carrier,tracking_no,ship_date,pool_item_id</p>
    </div>
  );
}
