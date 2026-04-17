import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, dentistPayments as DP, profiles as Profiles } from '../lib/db';
import { Btn, Card, Stat } from '../components/UI';
import { filterByPeriod } from '../lib/helpers';
import CaseModal from '../components/modals/CaseModal';

export default function DoctorPortal() {
  const { theme: c, FS, t, profile, isA, isD, money } = useApp();
  const [cs, setCs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [profs, setProfs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [period, setPeriod] = useState('monthly');

  const reload = async () => {
    const [a, p, pf] = await Promise.all([Cases.list(), DP.list(isD ? profile.id : null), Profiles.list()]);
    setCs(a.data || []); setPayments(p.data || []); setProfs(pf.data || []);
  };
  useEffect(() => { reload(); }, [profile.id]);

  // For dentist: show own orders. For admin: show all dentists.
  const myCases = isD ? cs.filter(x => x.dentist_id === profile.id) : cs;
  const fc = filterByPeriod(myCases, 'created_at', period);
  const fp = filterByPeriod(payments, 'date', period);

  const paid   = fc.filter(x => x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const unpaid = fc.filter(x => !x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const invoiced = fc.reduce((s, x) => s + Number(x.total_price || 0), 0);
  const transferred = fp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const remaining = invoiced - transferred;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['daily', 'monthly', 'yearly', 'all'].map(p => (
          <Btn key={p} sm primary={period === p} onClick={() => setPeriod(p)}>{p === 'daily' ? 'Jour' : p === 'monthly' ? 'Mois' : p === 'yearly' ? 'Année' : 'Tout'}</Btn>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label={t('paid')} val={money(paid)} accent={c.ok} />
        <Stat label={t('unpaid')} val={money(unpaid)} accent={c.dng} />
        <Stat label={t('transferred')} val={money(transferred)} accent={c.ok} />
        <Stat label={t('remaining')} val={money(remaining)} accent={remaining > 0 ? c.dng : c.ok} />
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {fc.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: c.txL }}>—</div>}
        {fc.map(x => {
          const doc = profs.find(p => p.id === x.dentist_id);
          return (
            <div key={x.id} onClick={() => setSelected(x)} style={{ cursor: 'pointer', padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: c.ac, fontSize: FS - 1 }}>#{x.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.patient}</div>
                <div style={{ fontSize: FS - 3, color: c.txL }}>{x.type} · {doc?.name}</div>
              </div>
              {isA && <span style={{ fontWeight: 700 }}>{money(x.total_price)}</span>}
              <span style={{ fontSize: FS - 3, color: x.paid ? c.ok : c.dng, fontWeight: 600 }}>{x.paid ? '✓' : '✗'}</span>
            </div>
          );
        })}
      </Card>
      {selected && <CaseModal data={selected} onClose={() => { setSelected(null); reload(); }} stages={[]} profs={profs} types={[]} />}
    </div>
  );
}
