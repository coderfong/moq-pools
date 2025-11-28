'use client';
import { useState } from 'react';

export default function JoinForm({ productId, poolId, maxQty }:{ productId:string; poolId:string; maxQty:number }) {
  const [quantity, setQuantity] = useState(10);
  const [email,setEmail]=useState('buyer@example.com');
  const [line1,setLine1]=useState('');
  const [city,setCity]=useState('');
  const [postal,setPostal]=useState('');
  const [country,setCountry]=useState('Singapore');
  const [method,setMethod]=useState<'STRIPE'|'PAYNOW'|'BANK_TRANSFER'>('STRIPE');
  const [loading,setLoading]=useState(false);

  async function submit() {
    setLoading(true);
    const payload = { poolId, quantity, email, address: { line1, city, postal, country }, method };
    if (method === 'STRIPE') {
      const res = await fetch('/api/payments/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (res.ok && json.url) { window.location.href = json.url; }
      else alert(json.error || 'Error creating checkout session');
      setLoading(false);
      return;
    }
    const res = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) alert(json.error || 'Error');
    else alert('Submitted (manual payment flow).');
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">Email</label>
  <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} className="input" />
      <label className="block text-sm">Quantity (max {maxQty})</label>
  <input type="number" min={1} max={maxQty} placeholder="Quantity" value={quantity} onChange={e=>setQuantity(parseInt(e.target.value||'1'))} className="input" />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Address line 1" value={line1} onChange={e=>setLine1(e.target.value)} className="input col-span-2"/>
        <input placeholder="City" value={city} onChange={e=>setCity(e.target.value)} className="input"/>
        <input placeholder="Postal" value={postal} onChange={e=>setPostal(e.target.value)} className="input"/>
        <input placeholder="Country" value={country} onChange={e=>setCountry(e.target.value)} className="input col-span-2"/>
      </div>
      <div className="flex gap-3 text-sm">
        {['STRIPE','PAYNOW','BANK_TRANSFER'].map(m => (
          <button type="button" key={m} onClick={()=>setMethod(m as any)} className={`badge ${method===m?'bg-black text-white border-black':'bg-white'}`}>{m}</button>
        ))}
      </div>
      <button disabled={loading} onClick={submit} className="btn w-full">{loading?'Processing...':'Join & Pay'}</button>
    </div>
  )
}
