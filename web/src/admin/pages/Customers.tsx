import { useEffect, useState } from 'react';
import { Card, PageTitle } from '../AdminShell';
import { adminApi, fmtDate, money } from '../adminApi';

interface C { name: string; email: string; phone: string; orders: number; spentCents: number; lastOrder: string }

export default function Customers() {
  const [rows, setRows] = useState<C[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    adminApi<{ customers: C[] }>('/customers').then((r) => setRows(r.customers)).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <PageTitle>Customers</PageTitle>
      {err && <p className="text-ionos-red">{err}</p>}
      {!rows ? <p className="text-ionos-muted">Loading…</p> : rows.length === 0 ? (
        <Card><p className="py-10 text-center text-ionos-muted">Customers appear here after their first order.</p></Card>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ionos-line text-xs uppercase tracking-wide text-ionos-muted">
              <tr>{['Name', 'Email', 'Phone', 'Orders', 'Total spent', 'Last order'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-ionos-line">
              {rows.map((c) => (
                <tr key={c.email}>
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3"><a className="text-ionos-primary hover:underline" href={`mailto:${c.email}`}>{c.email}</a></td>
                  <td className="px-4 py-3"><a className="hover:underline" href={`tel:${c.phone}`}>{c.phone}</a></td>
                  <td className="px-4 py-3">{c.orders}</td>
                  <td className="px-4 py-3">{money(c.spentCents)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(c.lastOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
