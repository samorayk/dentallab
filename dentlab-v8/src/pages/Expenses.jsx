import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { expenses as Exp } from '../lib/db';
import { Btn, Inp, Card, Modal, Lbl, Plus } from '../components/UI';
import { today, exportCSV } from '../lib/helpers';

export default function ExpensesPage() {
  const { theme: c, FS, t, labId, money } = useApp();
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const reload = async () => { const { data } = await Exp.list(); setList(data || []); };
  useEffect(() => { reload(); }, []);
  const save = async () => {
    if (!form.label) return;
    const row = { category: form.category, label: form.label, amount: Number(form.amount || 0), date: form.date };
    if (form.id) await Exp.update(form.id, row);
    else await Exp.create({ ...row, lab_id: labId });
    setForm(null); reload();
  };
  const del = async (id) => { if (confirm('Supprimer ?')) { await Exp.delete(id); reload(); } };
  const total = list.reduce((s, x) => s + Number(x.amount || 0), 0);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn primary onClick={() => setForm({ category: 'Général', label: '', amount: 0, date: today() })}>{Plus} Dépense</Btn>
        <Btn onClick={() => exportCSV('depenses.csv', list)}>{t('export')} CSV</Btn>
        <div style={{ marginLeft: 'auto', fontWeight: 700, fontSize: FS }}>Total: <span style={{ color: c.dng }}>{money(total)}</span></div>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {list.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: c.txL }}>—</div>}
        {list.map(x => (
          <div key={x.id} style={{ padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{x.label}</div>
              <div style={{ fontSize: FS - 3, color: c.txL }}>{x.category} · {x.date}</div>
            </div>
            <div style={{ fontWeight: 700, color: c.dng }}>{money(x.amount)}</div>
            <Btn sm onClick={() => setForm(x)}>✏️</Btn>
            <Btn sm onClick={() => del(x.id)} style={{ color: c.dng }}>🗑</Btn>
          </div>
        ))}
      </Card>
      {form && (
        <Modal onClose={() => setForm(null)}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>{form.id ? t('edit') : t('add')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Lbl>Catégorie</Lbl><Inp value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div><Lbl>Libellé</Lbl><Inp value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
            <div><Lbl>Montant</Lbl><Inp type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Lbl>Date</Lbl><Inp type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setForm(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={save}>{t('save')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
