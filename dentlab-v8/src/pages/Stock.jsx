import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { stock as Stock } from '../lib/db';
import { Btn, Inp, Card, Modal, Lbl, Plus } from '../components/UI';
import { exportCSV } from '../lib/helpers';

export default function StockPage() {
  const { theme: c, FS, t, labId, isA, money } = useApp();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const [mv, setMv] = useState(null);

  const reload = async () => { const { data } = await Stock.list(); setItems(data || []); };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!form.name) return;
    const row = { ...form, qty: Number(form.qty || 0), min_qty: Number(form.min_qty || 0), price: Number(form.price || 0) };
    if (form.id) await Stock.update(form.id, row);
    else await Stock.create({ ...row, lab_id: labId });
    setForm(null); reload();
  };
  const doMv = async () => {
    if (!mv.item_id || !mv.qty) return;
    const item = items.find(i => i.id === mv.item_id);
    const q = Number(mv.qty);
    const newQty = mv.type === 'in' ? item.qty + q : Math.max(0, item.qty - q);
    await Stock.update(mv.item_id, { qty: newQty });
    await Stock.addMovement({ lab_id: labId, item_id: mv.item_id, type: mv.type, qty: q, note: mv.note });
    setMv(null); reload();
  };
  const del = async (id) => { if (confirm('Supprimer ?')) { await Stock.delete(id); reload(); } };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {isA && <Btn primary onClick={() => setForm({ name: '', category: '', qty: 0, min_qty: 0, unit: 'pcs', price: 0 })}>{Plus} Article</Btn>}
        {isA && <Btn onClick={() => setMv({ item_id: items[0]?.id || '', type: 'in', qty: '', note: '' })}>Mouvement</Btn>}
        <Btn onClick={() => exportCSV('stock.csv', items.map(i => ({ nom: i.name, categorie: i.category, qte: i.qty, min: i.min_qty, unite: i.unit, prix: i.price, valeur: i.qty * i.price })))}>{t('export')} CSV</Btn>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: c.txL }}>—</div>}
        {items.map(i => {
          const low = i.qty <= i.min_qty;
          return (
            <div key={i.id} style={{ padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, background: low ? '#FFFBEB' : 'transparent', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: FS - 1 }}>{i.name} {low && <span style={{ color: c.warn, fontSize: FS - 3 }}>⚠ stock bas</span>}</div>
                <div style={{ fontSize: FS - 3, color: c.txL }}>{i.category} · {money(i.price)}/{i.unit}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: FS }}>{i.qty} {i.unit}</div>
              {isA && <Btn sm onClick={() => setForm(i)}>✏️</Btn>}
              {isA && <Btn sm onClick={() => del(i.id)} style={{ color: c.dng }}>🗑</Btn>}
            </div>
          );
        })}
      </Card>

      {form && (
        <Modal onClose={() => setForm(null)} w={500}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>{form.id ? t('edit') : t('add')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
            <div><Lbl>Nom</Lbl><Inp value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Lbl>Catégorie</Lbl><Inp value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div><Lbl>Quantité</Lbl><Inp type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></div>
            <div><Lbl>Stock min.</Lbl><Inp type="number" value={form.min_qty} onChange={e => setForm({ ...form, min_qty: e.target.value })} /></div>
            <div><Lbl>Unité</Lbl><Inp value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
            <div><Lbl>Prix unit.</Lbl><Inp type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setForm(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={save}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {mv && (
        <Modal onClose={() => setMv(null)} w={400}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>Mouvement de stock</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Lbl>Article</Lbl>
              <select value={mv.item_id} onChange={e => setMv({ ...mv, item_id: e.target.value })} style={{ width: '100%', padding: 9, border: '1px solid ' + c.bdr, borderRadius: 7 }}>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div><Lbl>Type</Lbl>
              <select value={mv.type} onChange={e => setMv({ ...mv, type: e.target.value })} style={{ width: '100%', padding: 9, border: '1px solid ' + c.bdr, borderRadius: 7 }}>
                <option value="in">Entrée (+)</option><option value="out">Sortie (−)</option>
              </select>
            </div>
            <div><Lbl>Quantité</Lbl><Inp type="number" value={mv.qty} onChange={e => setMv({ ...mv, qty: e.target.value })} /></div>
            <div><Lbl>Note</Lbl><Inp value={mv.note} onChange={e => setMv({ ...mv, note: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setMv(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={doMv}>{t('save')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
