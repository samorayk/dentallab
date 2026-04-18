import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, dentistPayments as DP, profiles as Profiles, stages as Stages, types as Types } from '../lib/db';
import { Btn, Card, Stat, Modal, Lbl, Inp, Plus } from '../components/UI';
import { filterByPeriod, today } from '../lib/helpers';
import CaseModal from '../components/modals/CaseModal';
import NewCaseModal from '../components/modals/NewCaseModal';

export default function DoctorPortal() {
  const { theme: c, FS, t, profile, isA, isD, labId, money } = useApp();
  const [cs, setCs]             = useState([]);
  const [payments, setPayments] = useState([]);
  const [profs, setProfs]       = useState([]);
  const [stgs, setStgs]         = useState([]);
  const [types, setTypes]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen]   = useState(false);
  const [period, setPeriod]     = useState('all');
  const [activeDoc, setActiveDoc] = useState(null);
  const [payForm, setPayForm]   = useState(null);
  const [filterPaid, setFilterPaid] = useState('all');
  const [tab, setTab]           = useState('orders');

  const reload = async () => {
    const [a, p, pf, s, ty] = await Promise.all([Cases.list(), DP.list(isD?profile.id:null), Profiles.list(), Stages.list(), Types.list()]);
    setCs(a.data||[]); setPayments(p.data||[]); setProfs(pf.data||[]); setStgs(s.data||[]); setTypes(ty.data||[]);
  };
  useEffect(() => { reload(); }, [profile.id]);

  const dentists = profs.filter(p => p.role === 'dentist');
  const myCases  = isD ? cs.filter(x=>x.dentist_id===profile.id) : activeDoc ? cs.filter(x=>x.dentist_id===activeDoc) : cs;
  const myPayments = isD ? payments : activeDoc ? payments.filter(p=>p.dentist_id===activeDoc) : payments;
  const fc = filterByPeriod(myCases, 'created_at', period);
  const fp = filterByPeriod(myPayments, 'date', period);

  const totalInvoiced   = fc.reduce((s,x)=>s+Number(x.total_price||0),0);
  const totalPaidAmt    = fc.filter(x=>x.paid).reduce((s,x)=>s+Number(x.total_price||0),0);
  const totalUnpaid     = fc.filter(x=>!x.paid).reduce((s,x)=>s+Number(x.total_price||0),0);
  const totalTransferred= fp.reduce((s,x)=>s+Number(x.amount||0),0);
  const remaining       = totalInvoiced - totalTransferred;

  const displayCases = filterPaid==='all'?fc : filterPaid==='paid'?fc.filter(x=>x.paid) : fc.filter(x=>!x.paid);

  const addPayment = async () => {
    if (!payForm?.amount||!payForm?.dentist_id) return;
    await DP.create({ lab_id:labId, dentist_id:payForm.dentist_id, date:payForm.date, amount:Number(payForm.amount), note:payForm.note });
    setPayForm(null); reload();
  };
  const deletePayment = async (id) => {
    if (!confirm('Supprimer ?')) return;
    await DP.delete(id); reload();
  };

  const TabBtn = ({ id, label }) => (
    <button onClick={()=>setTab(id)} style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:FS-1,
      background:tab===id?c.ac:c.bg, color:tab===id?'#fff':c.txL }}>{label}</button>
  );

  return (
    <div>
      {/* Admin: dentist selector */}
      {isA && (
        <div style={{ background:c.card, border:'1px solid '+c.bdr, borderRadius:10, padding:10, marginBottom:12 }}>
          <div style={{ fontSize:FS-2, fontWeight:700, color:c.txL, marginBottom:6 }}>DENTISTE</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <Btn sm primary={!activeDoc} onClick={()=>setActiveDoc(null)}>Tous</Btn>
            {dentists.map(d=>(
              <Btn key={d.id} sm primary={activeDoc===d.id} onClick={()=>setActiveDoc(d.id)}>
                {d.name}{d.clinic?<span style={{ fontSize:FS-4, opacity:0.8 }}> · {d.clinic}</span>:null}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <Btn primary onClick={()=>setNewOpen(true)}>{Plus} Nouvelle commande</Btn>
        {isA && activeDoc && <Btn onClick={()=>setPayForm({ dentist_id:activeDoc, date:today(), amount:'', note:'' })}>💳 + Versement</Btn>}
        <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
          {['all','monthly','yearly'].map(p=>(
            <Btn key={p} sm primary={period===p} onClick={()=>setPeriod(p)}>
              {p==='all'?'Tout':p==='monthly'?'Mois':'Année'}
            </Btn>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <Stat label="Total facturé"    val={money(totalInvoiced)} />
        <Stat label="✓ Payé"           val={money(totalPaidAmt)}       accent={c.ok} />
        <Stat label="✗ Impayé"         val={money(totalUnpaid)}        accent={c.dng} />
        <Stat label="Versements reçus" val={money(totalTransferred)}   accent={c.ok} />
        <Stat label="Reste dû"         val={money(remaining)}          accent={remaining>0?c.dng:c.ok} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:14, background:c.bg, borderRadius:10, padding:4, width:'fit-content' }}>
        <TabBtn id="orders"   label="🦷 Commandes" />
        <TabBtn id="progress" label="📊 Avancement" />
        <TabBtn id="invoices" label="📄 Factures" />
        <TabBtn id="payments" label="💳 Versements" />
      </div>

      {/* ORDERS TAB */}
      {tab==='orders' && (
        <Card style={{ padding:0, overflow:'hidden' }}>
          {fc.length===0 && <div style={{ padding:30, textAlign:'center', color:c.txL }}>Aucune commande</div>}
          {fc.map(x => {
            const st  = stgs.find(s=>s.id===x.stage);
            const doc = profs.find(p=>p.id===x.dentist_id);
            return (
              <div key={x.id} onClick={()=>setSelected(x)}
                style={{ cursor:'pointer', padding:'12px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, color:c.ac, fontSize:FS-1, minWidth:80 }}>#{x.id}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:FS }}>{x.patient}</div>
                  <div style={{ fontSize:FS-3, color:c.txL, marginTop:2 }}>
                    {x.type} · {x.material} · 🦷 {x.tooth||'—'} · {(x.created_at||'').slice(0,10)}
                  </div>
                  {isA && doc && <div style={{ fontSize:FS-3, color:c.txL }}>Dr. {doc.name}{doc.clinic?' · '+doc.clinic:''}</div>}
                </div>
                {st && <span style={{ background:st.bg, color:st.color, padding:'3px 10px', borderRadius:10, fontSize:FS-3, fontWeight:700 }}>{st.label}</span>}
                <span style={{ fontSize:FS-2, color:x.paid?c.ok:c.dng, fontWeight:700 }}>{x.paid?'✓ Payé':'✗ Impayé'}</span>
              </div>
            );
          })}
        </Card>
      )}

      {/* PROGRESS TAB — show stage progress for each order */}
      {tab==='progress' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {fc.length===0 && <div style={{ padding:30, textAlign:'center', color:c.txL, background:c.card, borderRadius:12 }}>Aucune commande</div>}
          {fc.map(x => {
            const doc = profs.find(p=>p.id===x.dentist_id);
            const dlv = x.delivery||{};
            return (
              <Card key={x.id} style={{ cursor:'pointer' }} onClick={()=>setSelected(x)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:FS }}>#{x.id} — {x.patient}</div>
                    <div style={{ fontSize:FS-3, color:c.txL }}>{x.type} · {x.material}</div>
                    {isA && doc && <div style={{ fontSize:FS-3, color:c.txL }}>Dr. {doc.name}{doc.clinic?' · '+doc.clinic:''}</div>}
                  </div>
                  <span style={{ fontSize:FS-3, color:x.paid?c.ok:c.dng, fontWeight:700 }}>{x.paid?'✓ Payé':'✗ Impayé'}</span>
                </div>
                {/* Stage progress bar */}
                <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
                  {stgs.map((s,i) => {
                    const currentIdx = stgs.findIndex(st=>st.id===x.stage);
                    const isCurrentOrPast = i <= currentIdx;
                    const isCurrent = s.id === x.stage;
                    return (
                      <div key={s.id} style={{ flex:1, minWidth:60 }}>
                        <div style={{ height:6, background:isCurrentOrPast?s.color:'#E5E7EB', borderRadius:3, marginBottom:4, transition:'background 0.3s',
                          boxShadow:isCurrent?'0 0 6px '+s.color:'none' }} />
                        <div style={{ fontSize:8, fontWeight:isCurrent?700:500, color:isCurrent?s.color:c.txL, textAlign:'center', lineHeight:1.2 }}>
                          {s.label}
                          {isCurrent && <span style={{ display:'block', fontSize:7 }}>◀ ici</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Delivery status */}
                {dlv.status && dlv.status !== 'pending' && (
                  <div style={{ marginTop:8, fontSize:FS-3, color:dlv.status==='delivered'?c.ok:'#2563EB', fontWeight:600 }}>
                    {dlv.status==='delivered' ? `✓ Livré le ${dlv.deliveredAt||'—'}` : `🚚 En transit${dlv.driverName?' · '+dlv.driverName:''}`}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* INVOICES TAB */}
      {tab==='invoices' && (
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:10 }}>
            {[['all','Toutes'],['paid','✓ Payées'],['unpaid','✗ Impayées']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterPaid(v)}
                style={{ padding:'5px 14px', borderRadius:999, border:'1px solid '+(filterPaid===v?c.ac:c.bdr),
                  background:filterPaid===v?c.acL:'transparent', color:filterPaid===v?c.ac:c.tx, cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>{l}
              </button>
            ))}
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {displayCases.length===0 && <div style={{ padding:30, textAlign:'center', color:c.txL }}>Aucune facture</div>}
            {displayCases.map(x => {
              const doc = profs.find(p=>p.id===x.dentist_id);
              return (
                <div key={x.id} onClick={()=>setSelected(x)}
                  style={{ cursor:'pointer', padding:'12px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontWeight:700, color:c.ac }}>#{x.id}</span>
                      <span style={{ fontWeight:600 }}>{x.patient}</span>
                    </div>
                    <div style={{ fontSize:FS-3, color:c.txL, marginTop:2 }}>
                      {x.type} · {x.elements} él. · {(x.created_at||'').slice(0,10)}
                      {isA&&doc?' · Dr. '+doc.name:''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:FS }}>{money(x.total_price)}</div>
                    <div style={{ fontSize:FS-3, color:x.paid?c.ok:c.dng, fontWeight:700 }}>{x.paid?'✓ Payée':'✗ Impayée'}</div>
                  </div>
                </div>
              );
            })}
            {displayCases.length>0 && (
              <div style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:FS, background:c.bg }}>
                <span>Total ({displayCases.length})</span>
                <span>{money(displayCases.reduce((s,x)=>s+Number(x.total_price||0),0))}</span>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {tab==='payments' && (
        <Card style={{ padding:0, overflow:'hidden' }}>
          {myPayments.length===0 && <div style={{ padding:30, textAlign:'center', color:c.txL }}>Aucun versement</div>}
          {myPayments.map(p=>(
            <div key={p.id} style={{ padding:'10px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, color:c.ok }}>💳 {money(p.amount)}</div>
                <div style={{ fontSize:FS-3, color:c.txL }}>{p.date}{p.note?' · '+p.note:''}</div>
              </div>
              {isA && <button onClick={()=>deletePayment(p.id)} style={{ background:'none', border:'none', color:c.dng, cursor:'pointer' }}>🗑</button>}
            </div>
          ))}
          {myPayments.length>0 && (
            <div style={{ padding:'10px 14px', fontWeight:700, fontSize:FS, background:c.bg, display:'flex', justifyContent:'space-between' }}>
              <span>Total versé</span>
              <span style={{ color:c.ok }}>{money(totalTransferred)}</span>
            </div>
          )}
        </Card>
      )}

      {newOpen && <NewCaseModal onClose={()=>{ setNewOpen(false); reload(); }} types={types} profs={profs} />}
      {selected && <CaseModal data={selected} onClose={()=>{ setSelected(null); reload(); }} stages={stgs} profs={profs} types={types} />}
      {payForm && (
        <Modal onClose={()=>setPayForm(null)} w={380}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>💳 Nouveau versement</div>
          <div style={{ display:'grid', gap:8 }}>
            <div><Lbl>Date</Lbl><Inp type="date" value={payForm.date} onChange={e=>setPayForm({...payForm,date:e.target.value})} /></div>
            <div><Lbl>Montant</Lbl><Inp type="number" value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} /></div>
            <div><Lbl>Note</Lbl><Inp value={payForm.note||''} onChange={e=>setPayForm({...payForm,note:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setPayForm(null)}>Annuler</Btn>
            <Btn primary onClick={addPayment}>Enregistrer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
