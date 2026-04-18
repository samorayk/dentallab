import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { expenses as Exp } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Btn, Inp, Card, Modal, Lbl, Plus } from '../components/UI';
import { today, exportCSV } from '../lib/helpers';

const DEFAULT_CATS = ['Général','Loyer','Salaires','Eau / Électricité','Matériel','Transport','Maintenance','Autre'];

export default function ExpensesPage() {
  const { theme: c, FS, t, labId, money } = useApp();
  const [list, setList]       = useState([]);
  const [form, setForm]       = useState(null);
  const [cats, setCats]       = useState([]);
  const [catMgr, setCatMgr]   = useState(false);
  const [newCat, setNewCat]   = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const loadCats = async () => {
    const { data } = await supabase.from('expense_categories').select('*').eq('lab_id', labId).order('name');
    if (data && data.length) setCats(data.map(c=>c.name));
    else setCats(DEFAULT_CATS);
  };

  const reload = async () => {
    const { data } = await Exp.list();
    setList(data || []);
  };

  useEffect(() => { reload(); loadCats(); }, []);

  const save = async () => {
    if (!form.label) return;
    const row = { category:form.category, label:form.label, amount:Number(form.amount||0), date:form.date };
    if (form.id) await Exp.update(form.id, row);
    else await Exp.create({ ...row, lab_id:labId });
    setForm(null); reload();
  };

  const del = async (id) => { if (confirm('Supprimer ?')) { await Exp.delete(id); reload(); } };

  // Category management — stored in expense_categories table (graceful fallback if not present)
  const addCat = async () => {
    const n = newCat.trim();
    if (!n || cats.includes(n)) return;
    try {
      await supabase.from('expense_categories').upsert({ lab_id:labId, name:n });
    } catch (_) {}
    setCats(p=>[...p, n]);
    setNewCat('');
  };

  const delCat = async (name) => {
    if (!confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      await supabase.from('expense_categories').delete().eq('lab_id', labId).eq('name', name);
    } catch (_) {}
    setCats(p=>p.filter(x=>x!==name));
  };

  const filtered = filterCat === 'all' ? list : list.filter(x=>x.category===filterCat);
  const total    = filtered.reduce((s,x)=>s+Number(x.amount||0), 0);

  const catTotals = cats.map(cat=>({
    name: cat,
    total: list.filter(x=>x.category===cat).reduce((s,x)=>s+Number(x.amount||0),0),
  })).filter(x=>x.total>0);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <Btn primary onClick={()=>setForm({ category:cats[0]||'Général', label:'', amount:0, date:today() })}>{Plus} Dépense</Btn>
        <Btn onClick={()=>setCatMgr(true)}>🗂 Catégories</Btn>
        <Btn onClick={()=>exportCSV('depenses.csv', list)}>{t('export')} CSV</Btn>
        <div style={{ marginLeft:'auto', fontWeight:700, fontSize:FS }}>Total: <span style={{ color:c.dng }}>{money(total)}</span></div>
      </div>

      {/* Category filter tabs */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <button onClick={()=>setFilterCat('all')}
          style={{ padding:'4px 12px', borderRadius:999, border:'1px solid '+(filterCat==='all'?c.ac:c.bdr),
            background:filterCat==='all'?c.acL:'transparent', color:filterCat==='all'?c.ac:c.tx,
            cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>Tout</button>
        {cats.map(cat=>(
          <button key={cat} onClick={()=>setFilterCat(cat)}
            style={{ padding:'4px 12px', borderRadius:999, border:'1px solid '+(filterCat===cat?c.ac:c.bdr),
              background:filterCat===cat?c.acL:'transparent', color:filterCat===cat?c.ac:c.tx,
              cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>{cat}</button>
        ))}
      </div>

      {/* Category mini-stats */}
      {filterCat==='all' && catTotals.length>0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {catTotals.map(ct=>(
            <div key={ct.name} onClick={()=>setFilterCat(ct.name)}
              style={{ padding:'6px 12px', background:c.card, border:'1px solid '+c.bdr, borderRadius:8,
                cursor:'pointer', fontSize:FS-2 }}>
              <div style={{ fontWeight:600 }}>{ct.name}</div>
              <div style={{ color:c.dng, fontWeight:700 }}>{money(ct.total)}</div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        {filtered.length===0 && <div style={{ padding:20, textAlign:'center', color:c.txL }}>—</div>}
        {filtered.map(x=>(
          <div key={x.id} style={{ padding:'10px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600 }}>{x.label}</div>
              <div style={{ fontSize:FS-3, color:c.txL }}>{x.category} · {x.date}</div>
            </div>
            <div style={{ fontWeight:700, color:c.dng }}>{money(x.amount)}</div>
            <Btn sm onClick={()=>setForm(x)}>✏️</Btn>
            <Btn sm onClick={()=>del(x.id)} style={{ color:c.dng }}>🗑</Btn>
          </div>
        ))}
      </Card>

      {/* Expense Form */}
      {form && (
        <Modal onClose={()=>setForm(null)}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>{form.id?t('edit'):t('add')} dépense</div>
          <div style={{ display:'grid', gap:8 }}>
            <div>
              <Lbl>Catégorie</Lbl>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
                style={{ width:'100%', padding:'9px 11px', fontSize:FS-1, border:'1px solid '+c.bdr, borderRadius:7, background:'#fff', color:c.tx, outline:'none', fontFamily:'inherit' }}>
                {cats.map(ct=><option key={ct}>{ct}</option>)}
              </select>
            </div>
            <div><Lbl>Libellé</Lbl><Inp value={form.label} onChange={e=>setForm({...form,label:e.target.value})} /></div>
            <div><Lbl>Montant</Lbl><Inp type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></div>
            <div><Lbl>Date</Lbl><Inp type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setForm(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={save}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Category Manager */}
      {catMgr && (
        <Modal onClose={()=>setCatMgr(false)} w={380}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>🗂 Gérer les catégories</div>
          <div style={{ marginBottom:12 }}>
            {cats.map(cat=>(
              <div key={cat} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid '+c.bdrL }}>
                <span style={{ fontSize:FS-1 }}>{cat}</span>
                {!DEFAULT_CATS.includes(cat) && (
                  <button onClick={()=>delCat(cat)} style={{ background:'none', border:'none', color:c.dng, cursor:'pointer', fontSize:16 }}>🗑</button>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <Inp placeholder="Nouvelle catégorie…" value={newCat} onChange={e=>setNewCat(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&addCat()} />
            <Btn primary onClick={addCat}>+ Ajouter</Btn>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setCatMgr(false)}>Fermer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
