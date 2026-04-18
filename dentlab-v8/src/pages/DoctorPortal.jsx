import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, dentistPayments as DP, profiles as Profiles, stages as Stages } from '../lib/db';
import { Btn, Card, Stat, Modal, Lbl, Inp } from '../components/UI';
import { filterByPeriod, today } from '../lib/helpers';
import CaseModal from '../components/modals/CaseModal';

export default function DoctorPortal() {
  const { theme: c, FS, t, profile, isA, isD, labId, money } = useApp();
  const [cs, setCs]         = useState([]);
  const [payments, setPayments] = useState([]);
  const [profs, setProfs]   = useState([]);
  const [stgs, setStgs]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [activeDoc, setActiveDoc] = useState(null); // admin: which dentist to view
  const [payForm, setPayForm] = useState(null);
  const [filterPaid, setFilterPaid] = useState('all'); // 'all' | 'paid' | 'unpaid'

  const reload = async () => {
    const [a, p, pf, s] = await Promise.all([
      Cases.list(),
      DP.list(isD ? profile.id : null),
      Profiles.list(),
      Stages.list(),
    ]);
    setCs(a.data || []);
    setPayments(p.data || []);
    setProfs(pf.data || []);
    setStgs(s.data || []);
  };
  useEffect(() => { reload(); }, [profile.id]);

  const dentists = profs.filter(p => p.role === 'dentist');

  // Which dentist are we viewing?
  const viewDoc = isD ? profile : (activeDoc ? profs.find(p => p.id === activeDoc) : null);

  const myCases = isD
    ? cs.filter(x => x.dentist_id === profile.id)
    : activeDoc
      ? cs.filter(x => x.dentist_id === activeDoc)
      : cs;

  const myPayments = isD
    ? payments
    : activeDoc
      ? payments.filter(p => p.dentist_id === activeDoc)
      : payments;

  const fc = filterByPeriod(myCases, 'created_at', period);
  const fp = filterByPeriod(myPayments, 'date', period);

  const paid        = fc.filter(x => x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const unpaid      = fc.filter(x => !x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const invoiced    = fc.reduce((s, x) => s + Number(x.total_price || 0), 0);
  const transferred = fp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const remaining   = invoiced - transferred;

  const displayCases = filterPaid === 'all' ? fc : filterPaid === 'paid' ? fc.filter(x => x.paid) : fc.filter(x => !x.paid);

  const addPayment = async () => {
    if (!payForm?.amount || !payForm?.dentist_id) return;
    const { dentistPayments: DPApi } = await import('../lib/db');
    await DPApi.create({ lab_id: labId, dentist_id: payForm.dentist_id, date: payForm.date, amount: Number(payForm.amount), note: payForm.note });
    setPayForm(null); reload();
  };

  const deletePayment = async (id) => {
    if (!confirm('Supprimer ce versement ?')) return;
    const { dentistPayments: DPApi } = await import('../lib/db');
    await DPApi.delete(id);
    reload();
  };

  return (
    <div>
      {/* Admin: dentist selector */}
      {isA && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: FS - 2, fontWeight: 700, color: c.txL, marginBottom: 6 }}>SÉLECTIONNER UN DENTISTE</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn sm primary={!activeDoc} onClick={() => setActiveDoc(null)}>Tous</Btn>
            {dentists.map(d => (
              <Btn key={d.id} sm primary={activeDoc === d.id} onClick={() => setActiveDoc(d.id)}>
                {d.name}
                {d.clinic ? <span style={{ fontSize: FS - 4, opacity: 0.8 }}> · {d.clinic}</span> : null}
              </Btn>
            ))}
          </div>
        </div>
      )}

      {/* Period filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {['daily', 'monthly', 'yearly', 'all'].map(p => (
          <Btn key={p} sm primary={period === p} onClick={() => setPeriod(p)}>
            {p === 'daily' ? 'Jour' : p === 'monthly' ? 'Mois' : p === 'yearly' ? 'Année' : 'Tout'}
          </Btn>
        ))}
        {isA && activeDoc && (
          <Btn sm onClick={() => setPayForm({ dentist_id: activeDoc, date: today(), amount: '', note: '' })} style={{ marginLeft: 'auto' }}>
            💳 + Versement
          </Btn>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Facturé" val={money(invoiced)} />
        <Stat label={t('paid')} val={money(paid)} accent={c.ok} />
        <Stat label={t('unpaid')} val={money(unpaid)} accent={c.dng} />
        <Stat label={t('transferred')} val={money(transferred)} accent={c.ok} />
        <Stat label={t('remaining')} val={money(remaining)} accent={remaining > 0 ? c.dng : c.ok} />
      </div>

      {/* Paid/Unpaid filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[['all','Toutes'],['paid','✓ Payées'],['unpaid','✗ Impayées']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterPaid(v)}
            style={{ padding: '4px 14px', borderRadius: 999, border: '1px solid ' + (filterPaid === v ? c.ac : c.bdr),
              background: filterPaid === v ? c.acL : 'transparent', color: filterPaid === v ? c.ac : c.tx,
              cursor: 'pointer', fontSize: FS - 2, fontWeight: 600 }}>{l}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        {displayCases.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: c.txL }}>Aucune commande</div>}
        {displayCases.map(x => {
          const doc  = profs.find(p => p.id === x.dentist_id);
          const st   = stgs.find(s => s.id === x.stage);
          return (
            <div key={x.id} onClick={() => setSelected(x)}
              style={{ cursor: 'pointer', padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: c.ac, fontSize: FS - 1, minWidth: 70 }}>#{x.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.patient}</div>
                <div style={{ fontSize: FS - 3, color: c.txL }}>{x.type} · {x.material} · 🦷 {x.tooth || '—'}</div>
                {isA && <div style={{ fontSize: FS - 4, color: c.txL }}>{doc?.name} {doc?.clinic ? '· ' + doc.clinic : ''}</div>}
              </div>
              {st && <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 8, fontSize: FS - 3, fontWeight: 600 }}>{st.label}</span>}
              {isA && <span style={{ fontWeight: 700, fontSize: FS - 1 }}>{money(x.total_price)}</span>}
              <span style={{ fontSize: FS - 3, color: x.paid ? c.ok : c.dng, fontWeight: 700 }}>
                {x.paid ? '✓ Payé' : '✗ Impayé'}
              </span>
              <span style={{ fontSize: FS - 4, color: c.txL }}>{(x.created_at || '').slice(0, 10)}</span>
            </div>
          );
        })}
      </Card>

      {/* Payments list (for selected dentist or dentist view) */}
      {(activeDoc || isD) && myPayments.length > 0 && (
        <div>
          <div style={{ fontSize: FS - 1, fontWeight: 700, marginBottom: 6 }}>💳 Versements reçus</div>
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
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>💳 Nouveau versement dentiste</div>
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
