import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles, stages as Stages } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Card, Btn, Stat, Modal, Lbl, Inp } from '../components/UI';
import { today } from '../lib/helpers';
import CaseModal from '../components/modals/CaseModal';

export default function TechPortal() {
  const { theme: c, FS, t, profile, isA, labId, money } = useApp();
  const [cs, setCs]         = useState([]);
  const [profs, setProfs]   = useState([]);
  const [stgs, setStgs]     = useState([]);
  const [payments, setPayments] = useState([]); // technician payments
  const [selected, setSelected] = useState(null);
  const [filterTech, setFilterTech] = useState(isA ? 'all' : profile.id);
  const [payForm, setPayForm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'done'

  const reload = async () => {
    const [a, p, s] = await Promise.all([Cases.list(), Profiles.list(), Stages.list()]);
    setCs(a.data || []); setProfs(p.data || []); setStgs(s.data || []);
    // Load tech payments from technician_payments table (graceful fallback)
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

  // Filter by stage status
  const filteredWork = filterStatus === 'all' ? myWork : myWork.filter(x => {
    const assgn = x.assignments || {};
    const myStages = Object.values(assgn).filter(a => !viewTechId || a?.techId === viewTechId);
    if (filterStatus === 'pending') return myStages.some(a => !a?.done);
    if (filterStatus === 'done')    return myStages.every(a => a?.done) && myStages.length > 0;
    return true;
  });

  const pending = myWork.filter(x => {
    const a = x.assignments || {};
    return Object.values(a).some(v => (!viewTechId || v?.techId === viewTechId) && v?.techId && !v?.done);
  }).length;

  const done = myWork.filter(x => {
    const a = x.assignments || {};
    const mine = Object.values(a).filter(v => !viewTechId || v?.techId === viewTechId);
    return mine.length > 0 && mine.every(v => v?.done);
  }).length;

  // Payment stats for selected tech
  const myPayments = viewTechId ? payments.filter(p => p.technician_id === viewTechId) : payments;
  const totalPaid  = myPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // Compute earnings: count done stages × tech's stage price (if configured)
  const techProfile = viewTechId ? profs.find(p => p.id === viewTechId) : null;
  const stageEarnings = myWork.reduce((sum, x) => {
    const assgn = x.assignments || {};
    return sum + Object.entries(assgn)
      .filter(([_, v]) => v?.techId === viewTechId && v?.done)
      .reduce((s, [stageId]) => {
        const price = techProfile?.prices?.[stageId] || 0;
        return s + Number(price);
      }, 0);
  }, 0);
  const balanceDue = stageEarnings - totalPaid;

  const addPayment = async () => {
    if (!payForm?.amount || !payForm?.technician_id) return;
    try {
      await supabase.from('technician_payments').insert({
        lab_id: labId, technician_id: payForm.technician_id,
        date: payForm.date, amount: Number(payForm.amount), note: payForm.note || null,
      });
    } catch (_) {}
    setPayForm(null); reload();
  };
  const deletePayment = async (id) => {
    if (!confirm('Supprimer ?')) return;
    try { await supabase.from('technician_payments').delete().eq('id', id); } catch (_) {}
    reload();
  };

  return (
    <div>
      {/* Admin: tech selector */}
      {isA && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: FS - 2, fontWeight: 700, color: c.txL, marginBottom: 6 }}>SÉLECTIONNER UN TECHNICIEN</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn sm primary={filterTech === 'all'} onClick={() => setFilterTech('all')}>Tous</Btn>
            {techs.map(tc => (
              <Btn key={tc.id} sm primary={filterTech === tc.id} onClick={() => setFilterTech(tc.id)}>{tc.name}</Btn>
            ))}
          </div>
        </div>
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all','Toutes'],['pending','⏳ En cours'],['done','✓ Terminées']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            style={{ padding: '4px 14px', borderRadius: 999, border: '1px solid ' + (filterStatus === v ? c.ac : c.bdr),
              background: filterStatus === v ? c.acL : 'transparent', color: filterStatus === v ? c.ac : c.tx,
              cursor: 'pointer', fontSize: FS - 2, fontWeight: 600 }}>{l}
          </button>
        ))}
        {isA && viewTechId && (
          <Btn sm onClick={() => setPayForm({ technician_id: viewTechId, date: today(), amount: '', note: '' })} style={{ marginLeft: 'auto' }}>
            💰 + Paiement
          </Btn>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="À faire" val={pending} accent={c.warn} />
        <Stat label="Terminées" val={done} accent={c.ok} />
        <Stat label="Total affecté" val={myWork.length} />
        {viewTechId && stageEarnings > 0 && (
          <>
            <Stat label="Gains estimés" val={money(stageEarnings)} />
            <Stat label="Déjà payé" val={money(totalPaid)} accent={c.ok} />
            <Stat label="Reste à payer" val={money(balanceDue)} accent={balanceDue > 0 ? c.dng : c.ok} />
          </>
        )}
        {viewTechId && stageEarnings === 0 && totalPaid > 0 && (
          <>
            <Stat label="Total payé" val={money(totalPaid)} accent={c.ok} />
          </>
        )}
      </div>

      {/* Work list */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        {filteredWork.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: c.txL }}>Aucune commande</div>}
        {filteredWork.map(x => {
          const myStages = Object.entries(x.assignments || {})
            .filter(([_, v]) => !viewTechId || v?.techId === viewTechId);
          const doc = profs.find(p => p.id === x.dentist_id);
          const allDone = myStages.every(([_, v]) => v?.done);
          return (
            <div key={x.id} onClick={() => setSelected(x)}
              style={{ cursor: 'pointer', padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap',
                background: allDone ? '#F0FFF4' : 'transparent' }}>
              <span style={{ fontWeight: 700, color: c.ac, fontSize: FS - 1, minWidth: 70 }}>#{x.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.patient}</div>
                <div style={{ fontSize: FS - 3, color: c.txL }}>{x.type} · Dr. {doc?.name}</div>
                <div style={{ fontSize: FS - 3, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {myStages.map(([sid, v]) => {
                    const st = stgs.find(s => s.id === sid);
                    return (
                      <span key={sid} style={{ background: st?.bg || c.bg, color: st?.color || c.tx, padding: '2px 8px', borderRadius: 8, fontSize: FS - 3, fontWeight: 600 }}>
                        {st?.label || sid} {v?.done ? '✓' : '⏳'}
                        {v?.assignedAt && <span style={{ opacity: 0.7, fontSize: FS - 5 }}> 📅{v.assignedAt.slice(0, 10)}</span>}
                        {v?.done && v?.doneAt && <span style={{ opacity: 0.7, fontSize: FS - 5 }}> ✓{v.doneAt.slice(0, 10)}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
              {allDone && <span style={{ color: c.ok, fontWeight: 700, fontSize: FS - 2 }}>✓ Tout terminé</span>}
            </div>
          );
        })}
      </Card>

      {/* Payment history */}
      {(isA && viewTechId || !isA) && myPayments.length > 0 && (
        <div>
          <div style={{ fontSize: FS - 1, fontWeight: 700, marginBottom: 6 }}>💰 Paiements versés</div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {myPayments.map(p => (
              <div key={p.id} style={{ padding: '8px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: c.txL, fontSize: FS - 3 }}>{p.date}</span>
                <span style={{ flex: 1, fontSize: FS - 2 }}>{p.note || '—'}</span>
                <span style={{ fontWeight: 700, color: c.ok }}>{money(p.amount)}</span>
                {isA && <button onClick={() => deletePayment(p.id)} style={{ background: 'none', border: 'none', color: c.dng, cursor: 'pointer', fontSize: FS - 2 }}>🗑</button>}
              </div>
            ))}
          </Card>
        </div>
      )}

      {selected && (
        <CaseModal data={selected} onClose={() => { setSelected(null); reload(); }} stages={stgs} profs={profs} types={[]} />
      )}

      {/* Add payment modal */}
      {payForm && (
        <Modal onClose={() => setPayForm(null)} w={380}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>💰 Paiement technicien</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><Lbl>Date</Lbl><Inp type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} /></div>
            <div><Lbl>Montant</Lbl><Inp type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            <div><Lbl>Note</Lbl><Inp value={payForm.note || ''} onChange={e => setPayForm({ ...payForm, note: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => setPayForm(null)}>Annuler</Btn>
            <Btn primary onClick={addPayment}>Enregistrer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
