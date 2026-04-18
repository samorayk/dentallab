import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { suppliers as Sup } from '../lib/db';
import { Btn, Inp, Card, Modal, Lbl, Stat, Plus } from '../components/UI';
import { today, exportCSV } from '../lib/helpers';

const EMPTY_LINE = () => ({ item:'', qty:1, unit:'pcs', unit_price:0, total:0 });

export default function SuppliersPage() {
  const { theme: c, FS, t, labId, money } = useApp();
  const [list, setList]       = useState([]);
  const [form, setForm]       = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [payment, setPayment] = useState(null);
  const [report, setReport]   = useState(null);

  const reload = async () => { const { data } = await Sup.list(); setList(data || []); };
  useEffect(() => { reload(); }, []);

  const totals = (s) => {
    const due   = (s.supplier_purchases||[]).reduce((a,p)=>a+Number(p.total||0),0);
    const pay   = (s.supplier_payments ||[]).reduce((a,p)=>a+Number(p.amount||0),0);
    return { due, pay, remaining: due - pay };
  };

  const saveSup = async () => {
    if (!form.name) return;
    if (form.id) await Sup.update(form.id,{ name:form.name, contact:form.contact, phone:form.phone, email:form.email });
    else await Sup.create({ lab_id:labId, name:form.name, contact:form.contact, phone:form.phone, email:form.email });
    setForm(null); reload();
  };

  const addPurchase = async () => {
    const lines = purchase.lines.filter(l=>l.item);
    if (!lines.length) return;
    for (const l of lines) {
      const total = Number(l.unit_price||0) * Number(l.qty||1);
      await Sup.addPurchase({
        lab_id: labId,
        supplier_id: purchase.sid,
        date: purchase.date,
        item: l.item,
        qty: Number(l.qty||1),
        unit: l.unit||'pcs',
        unit_price: Number(l.unit_price||0),
        total: total,
        paid: purchase.paid,
        reference: purchase.reference||null,
        num_lot: purchase.num_lot||null,
        note: purchase.note||null,
      });
    }
    setPurchase(null); reload();
  };

  const addPayment = async () => {
    await Sup.addPayment({ lab_id:labId, supplier_id:payment.sid, date:payment.date, amount:Number(payment.amount), note:payment.note });
    setPayment(null); reload();
  };

  const delPurchase = async (id) => {
    if (!confirm('Supprimer cet achat ?')) return;
    await Sup.deletePurchase(id);
    reload();
  };
  const delPayment = async (id) => {
    if (!confirm('Supprimer ce versement ?')) return;
    await Sup.deletePayment(id);
    reload();
  };

  // Update line in purchase
  const setLine = (i, field, val) => {
    const lines = [...purchase.lines];
    lines[i] = { ...lines[i], [field]: val };
    if (field==='qty'||field==='unit_price') {
      lines[i].total = Number(lines[i].unit_price||0)*Number(lines[i].qty||1);
    }
    setPurchase({...purchase, lines});
  };
  const addLine = () => setPurchase({...purchase, lines:[...purchase.lines, EMPTY_LINE()]});
  const removeLine = (i) => {
    const lines = purchase.lines.filter((_,idx)=>idx!==i);
    setPurchase({...purchase, lines: lines.length ? lines : [EMPTY_LINE()]});
  };

  const inputSt = { width:'100%', padding:'7px 9px', fontSize:FS-1, border:'1px solid '+c.bdr, borderRadius:7, background:'#fff', color:c.tx, outline:'none', fontFamily:'inherit' };

  return (
    <div>
      <div style={{ marginBottom:12 }}>
        <Btn primary onClick={()=>setForm({ name:'', contact:'', phone:'', email:'' })}>{Plus} Fournisseur</Btn>
      </div>

      <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))' }}>
        {list.map(s => {
          const t0 = totals(s);
          const purchases = s.supplier_purchases||[];
          const payments  = s.supplier_payments||[];
          return (
            <Card key={s.id}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:FS }}>{s.name}</div>
                  <div style={{ fontSize:FS-3, color:c.txL }}>{s.contact} · {s.phone}</div>
                </div>
                <button onClick={()=>setForm(s)} style={{ background:'none', border:'none', cursor:'pointer', color:c.txL }}>✏️</button>
              </div>

              {/* Stats */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                <Stat label="Achats" val={money(t0.due)} />
                <Stat label={t('transferred')} val={money(t0.pay)} accent={c.ok} />
                <Stat label={t('remaining')} val={money(t0.remaining)} accent={t0.remaining>0?c.dng:c.ok} />
              </div>

              {/* Recent purchases inline */}
              {purchases.length>0 && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:FS-3, fontWeight:700, color:c.txL, marginBottom:4 }}>ACHATS RÉCENTS</div>
                  {purchases.slice(-3).reverse().map(p=>(
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'3px 0', borderBottom:'1px solid '+c.bdrL, fontSize:FS-3 }}>
                      <div>
                        <span style={{ fontWeight:600 }}>{p.item}</span>
                        <span style={{ color:c.txL }}> · {p.qty} {p.unit||'pcs'}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontWeight:700 }}>{money(p.total)}</span>
                        <span style={{ fontSize:FS-4, color:p.paid?c.ok:c.warn }}>{p.paid?'✓':'⏳'}</span>
                        <button onClick={()=>delPurchase(p.id)} style={{ background:'none',border:'none',cursor:'pointer',color:c.dng,fontSize:FS-3 }}>🗑</button>
                      </div>
                    </div>
                  ))}
                  {purchases.length>3 && <div style={{ fontSize:FS-4, color:c.txL, textAlign:'center', marginTop:2 }}>+{purchases.length-3} autres — voir rapport</div>}
                </div>
              )}

              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:10 }}>
                <Btn sm onClick={()=>setPurchase({ sid:s.id, date:today(), lines:[EMPTY_LINE()], paid:false, reference:'', num_lot:'', note:'' })}>+ Achat</Btn>
                <Btn sm onClick={()=>setPayment({ sid:s.id, date:today(), amount:'', note:'' })}>+ Versement</Btn>
                <Btn sm onClick={()=>setReport(s)}>📄 Rapport</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Supplier Form */}
      {form && (
        <Modal onClose={()=>setForm(null)}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>{form.id?t('edit'):t('add')} fournisseur</div>
          <div style={{ display:'grid', gap:8 }}>
            <div><Lbl>Nom</Lbl><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><Lbl>Contact</Lbl><Inp value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})} /></div>
            <div><Lbl>Téléphone</Lbl><Inp value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            <div><Lbl>Email</Lbl><Inp value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setForm(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={saveSup}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Purchase Form — multi-line */}
      {purchase && (
        <Modal onClose={()=>setPurchase(null)} w={680}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>📦 Nouvel achat</div>
          
          {/* Header fields */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            <div><Lbl>Date</Lbl><Inp type="date" value={purchase.date} onChange={e=>setPurchase({...purchase,date:e.target.value})} /></div>
            <div><Lbl>Référence commande</Lbl><Inp placeholder="N° bon de commande" value={purchase.reference||''} onChange={e=>setPurchase({...purchase,reference:e.target.value})} /></div>
            <div><Lbl>N° de lot</Lbl><Inp placeholder="Lot / batch" value={purchase.num_lot||''} onChange={e=>setPurchase({...purchase,num_lot:e.target.value})} /></div>
          </div>

          {/* Lines */}
          <div style={{ fontSize:FS-2, fontWeight:700, marginBottom:6, color:c.txL }}>ARTICLES</div>
          <div style={{ background:c.bg, borderRadius:8, padding:8, marginBottom:8 }}>
            {/* Header row */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 60px 70px 90px 80px 30px', gap:4, marginBottom:4 }}>
              {['Article','Qté','Unité','Prix unit.','Total',''].map(h=>(
                <div key={h} style={{ fontSize:FS-4, fontWeight:700, color:c.txL, textAlign:'center' }}>{h}</div>
              ))}
            </div>
            {purchase.lines.map((l,i)=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 60px 70px 90px 80px 30px', gap:4, marginBottom:4, alignItems:'center' }}>
                <input placeholder="Nom de l'article" value={l.item} onChange={e=>setLine(i,'item',e.target.value)} style={{...inputSt, padding:'6px 8px'}} />
                <input type="number" min="0" placeholder="1" value={l.qty} onChange={e=>setLine(i,'qty',e.target.value)} style={{...inputSt, padding:'6px 4px', textAlign:'center'}} />
                <input placeholder="pcs" value={l.unit} onChange={e=>setLine(i,'unit',e.target.value)} style={{...inputSt, padding:'6px 4px'}} />
                <input type="number" min="0" placeholder="0" value={l.unit_price} onChange={e=>setLine(i,'unit_price',e.target.value)} style={{...inputSt, padding:'6px 4px', textAlign:'right'}} />
                <div style={{ fontWeight:700, fontSize:FS-2, textAlign:'right', padding:'0 4px' }}>{money(l.total||0)}</div>
                <button onClick={()=>removeLine(i)} style={{ background:'none', border:'none', color:c.dng, cursor:'pointer', fontSize:16 }}>×</button>
              </div>
            ))}
            <Btn sm onClick={addLine} style={{ marginTop:6 }}>+ Ligne</Btn>
            <div style={{ textAlign:'right', fontWeight:700, fontSize:FS, marginTop:8, color:c.ac }}>
              Total: {money(purchase.lines.reduce((a,l)=>a+Number(l.total||0),0))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><Lbl>Note</Lbl><Inp value={purchase.note||''} onChange={e=>setPurchase({...purchase,note:e.target.value})} /></div>
            <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:4 }}>
              <label style={{ display:'flex', gap:8, alignItems:'center', fontSize:FS-2, cursor:'pointer' }}>
                <input type="checkbox" checked={purchase.paid} onChange={e=>setPurchase({...purchase,paid:e.target.checked})} style={{ width:16, height:16 }} />
                <span style={{ fontWeight:600 }}>Marqué comme payé</span>
              </label>
            </div>
          </div>

          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setPurchase(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={addPurchase}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Payment Form */}
      {payment && (
        <Modal onClose={()=>setPayment(null)}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>💳 Nouveau versement</div>
          <div style={{ display:'grid', gap:8 }}>
            <div><Lbl>Date</Lbl><Inp type="date" value={payment.date} onChange={e=>setPayment({...payment,date:e.target.value})} /></div>
            <div><Lbl>Montant</Lbl><Inp type="number" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} /></div>
            <div><Lbl>Note</Lbl><Inp value={payment.note} onChange={e=>setPayment({...payment,note:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setPayment(null)}>{t('cancel')}</Btn>
            <Btn primary onClick={addPayment}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Report */}
      {report && (
        <Modal onClose={()=>setReport(null)} w={750}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>📄 {t('supplierReport')} — {report.name}</div>
          {(() => { const t0=totals(report); return (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              <Stat label="Total achats" val={money(t0.due)} />
              <Stat label={t('transferred')} val={money(t0.pay)} accent={c.ok} />
              <Stat label={t('remaining')} val={money(t0.remaining)} accent={c.dng} />
            </div>
          ); })()}

          <div style={{ fontWeight:700, marginBottom:4, fontSize:FS-1 }}>Achats</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:FS-2, marginBottom:10 }}>
            <thead>
              <tr style={{ background:c.ac, color:'#fff' }}>
                <th style={{ padding:'6px 8px', textAlign:'left' }}>Date</th>
                <th style={{ textAlign:'left' }}>Article</th>
                <th style={{ textAlign:'right' }}>Qté</th>
                <th style={{ textAlign:'left' }}>Unité</th>
                <th style={{ textAlign:'right' }}>Prix/u</th>
                <th style={{ textAlign:'right' }}>Total</th>
                <th style={{ textAlign:'center' }}>Payé</th>
                <th style={{ textAlign:'left' }}>Réf / Lot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(report.supplier_purchases||[]).map(p=>(
                <tr key={p.id} style={{ borderBottom:'1px solid '+c.bdrL }}>
                  <td style={{ padding:'4px 8px' }}>{p.date}</td>
                  <td style={{ fontWeight:600 }}>{p.item}</td>
                  <td style={{ textAlign:'right' }}>{p.qty}</td>
                  <td style={{ color:c.txL }}>{p.unit||'pcs'}</td>
                  <td style={{ textAlign:'right' }}>{money(p.unit_price||0)}</td>
                  <td style={{ textAlign:'right', fontWeight:700 }}>{money(p.total)}</td>
                  <td style={{ textAlign:'center' }}>
                    <span style={{ color:p.paid?c.ok:c.warn, fontWeight:700 }}>{p.paid?'✓':'⏳'}</span>
                  </td>
                  <td style={{ color:c.txL, fontSize:FS-3 }}>{[p.reference,p.num_lot].filter(Boolean).join(' / ')||'—'}</td>
                  <td><button onClick={()=>delPurchase(p.id)} style={{ background:'none',border:'none',color:c.dng,cursor:'pointer',fontSize:FS-3 }}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontWeight:700, marginBottom:4, fontSize:FS-1 }}>Versements</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:FS-2 }}>
            <thead>
              <tr style={{ background:c.ac, color:'#fff' }}>
                <th style={{ padding:'6px 8px', textAlign:'left' }}>{t('paymentDate')}</th>
                <th style={{ textAlign:'left' }}>Note</th>
                <th style={{ textAlign:'right' }}>Montant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(report.supplier_payments||[]).map(p=>(
                <tr key={p.id} style={{ borderBottom:'1px solid '+c.bdrL }}>
                  <td style={{ padding:'4px 8px' }}>{p.date}</td>
                  <td>{p.note||'—'}</td>
                  <td style={{ textAlign:'right', color:c.ok, fontWeight:700 }}>{money(p.amount)}</td>
                  <td><button onClick={()=>delPayment(p.id)} style={{ background:'none',border:'none',color:c.dng,cursor:'pointer',fontSize:FS-3 }}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:14 }}>
            <Btn primary onClick={()=>window.print()}>🖨️ {t('print')}</Btn>
            <Btn onClick={()=>exportCSV(`fournisseur_${report.name}.csv`,[
              ...(report.supplier_purchases||[]).map(p=>({type:'achat',...p})),
              ...(report.supplier_payments||[]).map(p=>({type:'versement',...p})),
            ])}>{t('export')} CSV</Btn>
            <Btn onClick={()=>setReport(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
