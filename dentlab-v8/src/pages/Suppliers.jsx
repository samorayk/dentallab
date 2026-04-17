import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { suppliers as Sup } from '../lib/db';
import { Btn, Inp, Card, Modal, Lbl, Stat, Plus } from '../components/UI';
import { today, exportCSV } from '../lib/helpers';

export default function SuppliersPage() {
  const { theme: c, FS, t, labId, money } = useApp();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [payment, setPayment] = useState(null);
  const [report, setReport] = useState(null);

  const reload = async () => { const { data } = await Sup.list(); setList(data || []); };
  useEffect(() => { reload(); }, []);

  const totals = (s) => {
    const due = (s.supplier_purchases || []).reduce((a, p) => a + Number(p.total || 0), 0);
    const paidPurch = (s.supplier_purchases || []).filter(p => p.paid).reduce((a, p) => a + Number(p.total || 0), 0);
    const pay = (s.supplier_payments || []).reduce((a, p) => a + Number(p.amount || 0), 0);
    return { due, paidPurch, pay, remaining: due - paidPurch - pay };
  };

  const saveSup = async () => {
    if (!form.name) return;
    if (form.id) await Sup.update(form.id, { name: form.name, contact: form.contact, phone: form.phone, email: form.email });
    else await Sup.create({ lab_id: labId, name: form.name, contact: form.contact, phone: form.phone, email: form.email });
    setForm(null); reload();
  };
  const addPurchase = async () => {
    await Sup.addPurchase({ lab_id: labId, supplier_id: purchase.sid, date: purchase.date, item: purchase.item, qty: Number(purchase.qty), total: Number(purchase.total), paid: purchase.paid });
    setPurchase(null); reload();
  };
  const addPayment = async () => {
    await Sup.addPayment({ lab_id: labId, supplier_id: payment.sid, date: payment.date, amount: Number(payment.amount), note: payment.note });
    setPayment(null); reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Btn primary onClick={() => setForm({ name: '', contact: '', phone: '', email: '' })}>{Plus} Fournisseur</Btn>
      </div>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {list.map(s => {
          const t0 = totals(s);
          return (
            <Card key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: FS }}>{s.name}</div>
                  <div style={{ fontSize: FS - 3, color: c.txL }}>{s.contact} · {s.phone}</div>
                </div>
                <button onClick={() => setForm(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.txL }}>✏️</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <Stat label="Achats" val={money(t0.due)} />
                <Stat label={t('transferred')} val={money(t0.pay)} accent={c.ok} />
                <Stat label={t('remaining')} val={money(t0.remaining)} accent={t0.remaining > 0 ? c.dng : c.ok} />
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                <Btn sm onClick={() => setPurchase({ sid: s.id, date: today(), item: '', qty: 1, total: 0, paid: false })}>+ Achat</Btn>
                <Btn sm onClick={() => setPayment({ sid: s.id, date: today(), amount: '', note: '' })}>+ Versement</Btn>
                <Btn sm onClick={() => setReport(s)}>📄 Rapport</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {form && (
        <Modal onClose={() => setForm(null)}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>{form.id ? t('edit') : t('add')} fournisseur</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Lbl>Nom</Lbl><Inp value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Lbl>Contact</Lbl><Inp value={form.contact || ''} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
            <div><Lbl>Téléphone</Lbl><Inp value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Lbl>Email</Lbl><Inp value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setForm(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={saveSup}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {purchase && (
        <Modal onClose={() => setPurchase(null)}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>Nouvel achat</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Lbl>Date</Lbl><Inp type="date" value={purchase.date} onChange={e => setPurchase({ ...purchase, date: e.target.value })} /></div>
            <div><Lbl>Article</Lbl><Inp value={purchase.item} onChange={e => setPurchase({ ...purchase, item: e.target.value })} /></div>
            <div><Lbl>Quantité</Lbl><Inp type="number" value={purchase.qty} onChange={e => setPurchase({ ...purchase, qty: e.target.value })} /></div>
            <div><Lbl>Total</Lbl><Inp type="number" value={purchase.total} onChange={e => setPurchase({ ...purchase, total: e.target.value })} /></div>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: FS - 2 }}>
              <input type="checkbox" checked={purchase.paid} onChange={e => setPurchase({ ...purchase, paid: e.target.checked })} /> Payé
            </label>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setPurchase(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={addPurchase}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {payment && (
        <Modal onClose={() => setPayment(null)}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>Nouveau versement</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Lbl>Date</Lbl><Inp type="date" value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} /></div>
            <div><Lbl>Montant</Lbl><Inp type="number" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} /></div>
            <div><Lbl>Note</Lbl><Inp value={payment.note} onChange={e => setPayment({ ...payment, note: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setPayment(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={addPayment}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {report && (
        <Modal onClose={() => setReport(null)} w={650}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>📄 {t('supplierReport')} — {report.name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {(() => { const t0 = totals(report); return (<>
              <Stat label="Total achats" val={money(t0.due)} />
              <Stat label={t('transferred')} val={money(t0.pay)} accent={c.ok} />
              <Stat label={t('remaining')} val={money(t0.remaining)} accent={c.dng} />
            </>); })()}
          </div>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: FS - 1 }}>Achats</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FS - 2, marginBottom: 10 }}>
            <thead><tr style={{ background: c.ac, color: '#fff' }}><th style={{ padding: 6, textAlign: 'left' }}>Date</th><th style={{ textAlign: 'left' }}>Article</th><th style={{ textAlign: 'right' }}>Qté</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>{(report.supplier_purchases || []).map(p => <tr key={p.id}><td style={{ padding: 4 }}>{p.date}</td><td>{p.item}</td><td style={{ textAlign: 'right' }}>{p.qty}</td><td style={{ textAlign: 'right' }}>{money(p.total)}</td></tr>)}</tbody>
          </table>
          <div style={{ fontWeight: 700, marginBottom: 4, fontSize: FS - 1 }}>Versements</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FS - 2 }}>
            <thead><tr style={{ background: c.ac, color: '#fff' }}><th style={{ padding: 6, textAlign: 'left' }}>{t('paymentDate')}</th><th style={{ textAlign: 'left' }}>Note</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>{(report.supplier_payments || []).map(p => <tr key={p.id}><td style={{ padding: 4 }}>{p.date}</td><td>{p.note || '—'}</td><td style={{ textAlign: 'right', color: c.ok }}>{money(p.amount)}</td></tr>)}</tbody>
          </table>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 14 }}>
            <Btn primary onClick={() => window.print()}>🖨️ {t('print')}</Btn>
            <Btn onClick={() => exportCSV(`fournisseur_${report.name}.csv`, [...(report.supplier_purchases || []).map(p => ({ type: 'achat', ...p })), ...(report.supplier_payments || []).map(p => ({ type: 'versement', ...p }))])}>{t('export')} CSV</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
