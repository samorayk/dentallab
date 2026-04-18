import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { stock as Stock, suppliers as Sup } from '../lib/db';
import { Btn, Inp, Card, Modal, Lbl, Plus } from '../components/UI';
import { exportCSV, today } from '../lib/helpers';
import { supabase } from '../lib/supabase';

export default function StockPage() {
  const { theme: c, FS, t, labId, isA, money } = useApp();
  const [items, setItems]   = useState([]);
  const [sups, setSups]     = useState([]);
  const [form, setForm]     = useState(null);
  const [mv, setMv]         = useState(null);
  const [mvList, setMvList] = useState([]);
  const [mvItem, setMvItem] = useState(null); // item to view movement history

  const reload = async () => {
    const [{ data: d }, { data: s }] = await Promise.all([
      Stock.list(),
      supabase.from('suppliers').select('id,name').order('name'),
    ]);
    setItems(d || []);
    setSups(s || []);
  };

  const reloadMv = async (itemId) => {
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });
    setMvList(data || []);
  };

  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!form.name) return;
    const row = { ...form, qty: Number(form.qty||0), min_qty: Number(form.min_qty||0), price: Number(form.price||0) };
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
    await Stock.addMovement({
      lab_id: labId,
      item_id: mv.item_id,
      type: mv.type,
      qty: q,
      note: mv.note || null,
      fournisseur: mv.type === 'in' ? (mv.fournisseur || null) : null,
      sous_traitant: mv.type === 'out' ? (mv.sous_traitant || null) : null,
      date_mouvement: mv.date_mouvement || today(),
      reference: mv.reference || null,
      num_lot: mv.num_lot || null,
    });
    setMv(null); reload();
  };

  const del = async (id) => { if (confirm('Supprimer ?')) { await Stock.delete(id); reload(); } };

  const inputSt = { width:'100%', padding:'9px 11px', fontSize:FS-1, border:'1px solid '+c.bdr, borderRadius:7, background:'#fff', color:c.tx, outline:'none', fontFamily:'inherit' };

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
        {isA && <Btn primary onClick={()=>setForm({ name:'', category:'', qty:0, min_qty:0, unit:'pcs', price:0 })}>{Plus} Article</Btn>}
        {isA && <Btn onClick={()=>setMv({ item_id:items[0]?.id||'', type:'in', qty:'', note:'', fournisseur:'', sous_traitant:'', date_mouvement:today(), reference:'', num_lot:'' })}>↔ Mouvement</Btn>}
        <Btn onClick={()=>exportCSV('stock.csv', items.map(i=>({ nom:i.name, categorie:i.category, qte:i.qty, min:i.min_qty, unite:i.unit, prix:i.price, valeur:i.qty*i.price })))}>{t('export')} CSV</Btn>
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {items.length===0 && <div style={{ padding:20, textAlign:'center', color:c.txL }}>—</div>}
        {items.map(i => {
          const low = i.qty <= i.min_qty;
          return (
            <div key={i.id} style={{ padding:'10px 14px', borderBottom:'1px solid '+c.bdrL, background:low?'#FFFBEB':'transparent', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 180px', minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:FS-1 }}>{i.name} {low && <span style={{ color:c.warn, fontSize:FS-3 }}>⚠ stock bas</span>}</div>
                <div style={{ fontSize:FS-3, color:c.txL }}>{i.category} · {money(i.price)}/{i.unit}</div>
              </div>
              <div style={{ fontWeight:700, fontSize:FS }}>{i.qty} {i.unit}</div>
              {isA && (
                <Btn sm onClick={async()=>{ setMvItem(i); await reloadMv(i.id); }}>📋</Btn>
              )}
              {isA && <Btn sm onClick={()=>setForm(i)}>✏️</Btn>}
              {isA && <Btn sm onClick={()=>del(i.id)} style={{ color:c.dng }}>🗑</Btn>}
            </div>
          );
        })}
      </Card>

      {/* Article Form */}
      {form && (
        <Modal onClose={()=>setForm(null)} w={500}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>{form.id?t('edit'):t('add')} article</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:8 }}>
            <div><Lbl>Nom</Lbl><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><Lbl>Catégorie</Lbl><Inp value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})} /></div>
            <div><Lbl>Quantité</Lbl><Inp type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} /></div>
            <div><Lbl>Stock min.</Lbl><Inp type="number" value={form.min_qty} onChange={e=>setForm({...form,min_qty:e.target.value})} /></div>
            <div><Lbl>Unité</Lbl><Inp value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} /></div>
            <div><Lbl>Prix unit.</Lbl><Inp type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setForm(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={save}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Movement Form */}
      {mv && (
        <Modal onClose={()=>setMv(null)} w={460}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>Mouvement de stock</div>
          <div style={{ display:'grid', gap:8 }}>
            <div>
              <Lbl>Article</Lbl>
              <select value={mv.item_id} onChange={e=>setMv({...mv,item_id:e.target.value})} style={inputSt}>
                {items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.qty} {i.unit})</option>)}
              </select>
            </div>
            <div>
              <Lbl>Type</Lbl>
              <select value={mv.type} onChange={e=>setMv({...mv,type:e.target.value})} style={inputSt}>
                <option value="in">📥 Entrée (+)</option>
                <option value="out">📤 Sortie (−)</option>
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div><Lbl>Quantité</Lbl><Inp type="number" min="0" value={mv.qty} onChange={e=>setMv({...mv,qty:e.target.value})} /></div>
              <div><Lbl>Date</Lbl><Inp type="date" value={mv.date_mouvement} onChange={e=>setMv({...mv,date_mouvement:e.target.value})} /></div>
            </div>
            {mv.type==='in' && (
              <div>
                <Lbl>Fournisseur</Lbl>
                <select value={mv.fournisseur||''} onChange={e=>setMv({...mv,fournisseur:e.target.value})} style={inputSt}>
                  <option value="">— Sélectionner —</option>
                  {sups.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                  <option value="__autre">Autre (saisir ci-dessous)</option>
                </select>
                {mv.fournisseur==='__autre' && (
                  <Inp placeholder="Nom du fournisseur" style={{ marginTop:4 }} value={mv.fournisseur_custom||''} onChange={e=>setMv({...mv,fournisseur_custom:e.target.value})} />
                )}
              </div>
            )}
            {mv.type==='out' && (
              <div>
                <Lbl>Sous-traitant</Lbl>
                <Inp placeholder="Nom du sous-traitant" value={mv.sous_traitant||''} onChange={e=>setMv({...mv,sous_traitant:e.target.value})} />
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div><Lbl>Référence</Lbl><Inp placeholder="Réf. article" value={mv.reference||''} onChange={e=>setMv({...mv,reference:e.target.value})} /></div>
              <div><Lbl>N° de lot</Lbl><Inp placeholder="Lot / batch" value={mv.num_lot||''} onChange={e=>setMv({...mv,num_lot:e.target.value})} /></div>
            </div>
            <div><Lbl>Note</Lbl><Inp value={mv.note||''} onChange={e=>setMv({...mv,note:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setMv(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={doMv}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Movement History Modal */}
      {mvItem && (
        <Modal onClose={()=>{setMvItem(null);setMvList([]);}} w={620}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>📋 Mouvements — {mvItem.name}</div>
          {mvList.length===0 ? (
            <div style={{ color:c.txL, textAlign:'center', padding:20 }}>Aucun mouvement</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:FS-2 }}>
              <thead>
                <tr style={{ background:c.ac, color:'#fff' }}>
                  <th style={{ padding:'6px 8px', textAlign:'left' }}>Date</th>
                  <th style={{ textAlign:'left' }}>Type</th>
                  <th style={{ textAlign:'right' }}>Qté</th>
                  <th style={{ textAlign:'left' }}>Fournisseur/ST</th>
                  <th style={{ textAlign:'left' }}>Réf / Lot</th>
                  <th style={{ textAlign:'left' }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {mvList.map(m=>(
                  <tr key={m.id} style={{ borderBottom:'1px solid '+c.bdrL }}>
                    <td style={{ padding:'5px 8px' }}>{(m.date_mouvement||m.created_at||'').slice(0,10)}</td>
                    <td><span style={{ color:m.type==='in'?c.ok:c.dng, fontWeight:700 }}>{m.type==='in'?'📥 Entrée':'📤 Sortie'}</span></td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>{m.qty}</td>
                    <td style={{ color:c.txL }}>{m.fournisseur||m.sous_traitant||'—'}</td>
                    <td style={{ color:c.txL, fontSize:FS-3 }}>{[m.reference,m.num_lot].filter(Boolean).join(' / ')||'—'}</td>
                    <td style={{ color:c.txL }}>{m.note||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
            <Btn onClick={()=>{setMvItem(null);setMvList([]);}}>Fermer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
