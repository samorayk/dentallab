import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles, stages as Stages } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Card, Btn, Stat, Modal, Lbl, Inp } from '../components/UI';
import { today } from '../lib/helpers';
import CaseModal from '../components/modals/CaseModal';

export default function TechPortal() {
  const { theme: c, FS, t, profile, isA, labId, money } = useApp();
  const [cs, setCs]           = useState([]);
  const [profs, setProfs]     = useState([]);
  const [stgs, setStgs]       = useState([]);
  const [payments, setPayments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterTech, setFilterTech] = useState(isA ? 'all' : profile.id);
  const [payForm, setPayForm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const reload = async () => {
    const [a, p, s] = await Promise.all([Cases.list(), Profiles.list(), Stages.list()]);
    setCs(a.data || []); setProfs(p.data || []); setStgs(s.data || []);
    try {
      const q = supabase.from('technician_payments').select('*').order('date', { ascending: false });
      if (!isA) q.eq('technician_id', profile.id);
      const { data } = await q;
      setPayments(data || []);
    } catch (_) { setPayments([]); }
  };
  useEffect(() => { reload(); }, []);

  const techs = profs.filter(p => p.role === 'technician');
  const viewTechId = isA ? (filterTech === 'all' ? null : filterTech) : profile.id;

  const myWork = cs.filter(x => {
    const assgn = x.assignments || {};
    if (!viewTechId) return Object.values(assgn).some(a => a?.techId);
    return Object.values(assgn).some(a => a?.techId === viewTechId);
  });

  // Sort by stage order (attente first, then conception, fraisage...)
  const stageOrder = stgs.reduce((acc, s, i) => { acc[s.id] = i; return acc; }, {});
  const sortedWork = [...myWork].sort((a, b) => (stageOrder[a.stage] ?? 99) - (stageOrder[b.stage] ?? 99));

  const filteredWork = filterStatus === 'all' ? sortedWork : sortedWork.filter(x => {
    const assgn = x.assignments || {};
    const myStages = Object.values(assgn).filter(a => !viewTechId || a?.techId === viewTechId);
    if (filterStatus === 'pending') return myStages.some(a => !a?.done);
    if (filterStatus === 'done')    return myStages.length > 0 && myStages.every(a => a?.done);
    return true;
  });

  const pending = myWork.filter(x => Object.values(x.assignments||{}).some(v => (!viewTechId||v?.techId===viewTechId) && v?.techId && !v?.done)).length;
  const done    = myWork.filter(x => { const mine=Object.values(x.assignments||{}).filter(v=>!viewTechId||v?.techId===viewTechId); return mine.length>0&&mine.every(v=>v?.done); }).length;

  const myPayments   = viewTechId ? payments.filter(p => p.technician_id === viewTechId) : payments;
  const totalPaid    = myPayments.reduce((s, p) => s + Number(p.amount||0), 0);
  const techProfile  = viewTechId ? profs.find(p => p.id === viewTechId) : null;
  const stageEarnings = myWork.reduce((sum, x) => sum + Object.entries(x.assignments||{})
    .filter(([_,v]) => v?.techId===viewTechId && v?.done)
    .reduce((s,[sid]) => s + Number(techProfile?.prices?.[sid]||0), 0), 0);
  const balanceDue   = stageEarnings - totalPaid;

  const addPayment = async () => {
    if (!payForm?.amount || !payForm?.technician_id) return;
    try { await supabase.from('technician_payments').insert({ lab_id:labId, technician_id:payForm.technician_id, date:payForm.date, amount:Number(payForm.amount), note:payForm.note||null }); } catch(_) {}
    setPayForm(null); reload();
  };
  const deletePayment = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try { await supabase.from('technician_payments').delete().eq('id', id); } catch(_) {}
    reload();
  };

  return (
    <div>
      {/* Admin: tech selector */}
      {isA && (
        <div style={{ background:c.card, border:'1px solid '+c.bdr, borderRadius:10, padding:10, marginBottom:12 }}>
          <div style={{ fontSize:FS-2, fontWeight:700, color:c.txL, marginBottom:6 }}>TECHNICIEN</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <Btn sm primary={filterTech==='all'} onClick={()=>setFilterTech('all')}>Tous</Btn>
            {techs.map(tc=><Btn key={tc.id} sm primary={filterTech===tc.id} onClick={()=>setFilterTech(tc.id)}>{tc.name}</Btn>)}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        {[['all','Toutes'],['pending','⏳ En cours'],['done','✓ Terminées']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilterStatus(v)}
            style={{ padding:'5px 14px', borderRadius:999, border:'1px solid '+(filterStatus===v?c.ac:c.bdr),
              background:filterStatus===v?c.acL:'transparent', color:filterStatus===v?c.ac:c.tx, cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>{l}
          </button>
        ))}
        {isA && viewTechId && (
          <Btn sm onClick={()=>setPayForm({ technician_id:viewTechId, date:today(), amount:'', note:'' })} style={{ marginLeft:'auto' }}>💰 + Paiement</Btn>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <Stat label="⏳ À faire"     val={pending}              accent={c.warn} />
        <Stat label="✓ Terminées"    val={done}                 accent={c.ok} />
        <Stat label="Total affecté"  val={myWork.length} />
        {viewTechId && totalPaid > 0 && <Stat label="Déjà payé" val={money(totalPaid)} accent={c.ok} />}
        {viewTechId && stageEarnings > 0 && <Stat label="Gains estimés" val={money(stageEarnings)} />}
        {viewTechId && stageEarnings > 0 && <Stat label="Reste à payer" val={money(balanceDue)} accent={balanceDue>0?c.dng:c.ok} />}
      </div>

      {/* Work list — sorted by stage order */}
      <Card style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
        {filteredWork.length===0 && <div style={{ padding:30, textAlign:'center', color:c.txL }}>Aucune commande</div>}
        {filteredWork.map(x => {
          const myStages = Object.entries(x.assignments||{}).filter(([_,v])=>!viewTechId||v?.techId===viewTechId);
          const doc      = profs.find(p=>p.id===x.dentist_id);
          const stageBadge = stgs.find(s=>s.id===x.stage);
          const allDone  = myStages.length>0 && myStages.every(([_,v])=>v?.done);
          return (
            <div key={x.id} onClick={()=>setSelected(x)}
              style={{ cursor:'pointer', padding:'12px 14px', borderBottom:'1px solid '+c.bdrL,
                background:allDone?'#F0FFF4':'transparent',
                display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontWeight:700, color:c.ac, fontSize:FS-1 }}>#{x.id}</span>
                  <span style={{ fontWeight:700, fontSize:FS }}>{x.patient}</span>
                  {stageBadge && <span style={{ background:stageBadge.bg, color:stageBadge.color, padding:'2px 8px', borderRadius:8, fontSize:FS-3, fontWeight:700 }}>{stageBadge.label}</span>}
                  {allDone && <span style={{ color:c.ok, fontWeight:700, fontSize:FS-2 }}>✓ Tout terminé</span>}
                </div>
                {/* Dentist name + clinic */}
                <div style={{ fontSize:FS-3, color:c.txL, marginBottom:4 }}>
                  👨‍⚕️ Dr. {doc?.name || '—'}{doc?.clinic ? ' · ' + doc.clinic : ''}
                  {' · '}{x.type}{x.material ? ' · ' + x.material : ''}
                </div>
                {/* Stage pills sorted by stage order */}
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {myStages
                    .sort(([a],[b])=>(stageOrder[a]??99)-(stageOrder[b]??99))
                    .map(([sid,v])=>{
                      const st=stgs.find(s=>s.id===sid);
                      return (
                        <span key={sid} style={{ background:v?.done?'#D1FAE5':(st?.bg||c.bg), color:v?.done?'#065F46':(st?.color||c.tx),
                          padding:'3px 10px', borderRadius:8, fontSize:FS-3, fontWeight:700,
                          border:'1px solid '+(v?.done?'#6EE7B7':'transparent') }}>
                          {st?.label||sid} {v?.done?'✓':'⏳'}
                          {v?.assignedAt && <span style={{ opacity:0.6, fontSize:FS-5 }}> 📅{v.assignedAt.slice(0,10)}</span>}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Payment history */}
      {(isA&&viewTechId||!isA) && myPayments.length>0 && (
        <div>
          <div style={{ fontSize:FS-1, fontWeight:700, marginBottom:6 }}>💰 Paiements versés</div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            {myPayments.map(p=>(
              <div key={p.id} style={{ padding:'8px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ color:c.txL, fontSize:FS-3 }}>{p.date}</span>
                <span style={{ flex:1, fontSize:FS-2 }}>{p.note||'—'}</span>
                <span style={{ fontWeight:700, color:c.ok }}>{money(p.amount)}</span>
                {isA && <button onClick={()=>deletePayment(p.id)} style={{ background:'none', border:'none', color:c.dng, cursor:'pointer' }}>🗑</button>}
              </div>
            ))}
          </Card>
        </div>
      )}

      {selected && <CaseModal data={selected} onClose={()=>{ setSelected(null); reload(); }} stages={stgs} profs={profs} types={[]} />}

      {payForm && (
        <Modal onClose={()=>setPayForm(null)} w={380}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:10 }}>💰 Paiement technicien</div>
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
