import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles, stages as Stages } from '../lib/db';
import { Stat, Card } from '../components/UI';
export default function Dashboard() {
  const { theme: c, FS, t, money } = useApp();
  const [data, setData] = useState({ cases: [], profs: [], stages: [] });
  useEffect(() => { (async () => {
    const [a, b, s] = await Promise.all([Cases.list(), Profiles.list(), Stages.list()]);
    setData({ cases: a.data || [], profs: b.data || [], stages: s.data || [] });
  })(); }, []);

  const cs = data.cases;
  const active = cs.filter(x => x.stage !== 'termine').length;
  const done   = cs.filter(x => x.stage === 'termine').length;
  const paid   = cs.filter(x => x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const unpaid = cs.filter(x => !x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);

  const byStage = data.stages.map(s => ({ ...s, count: cs.filter(x => x.stage === s.id).length }));
  const doctors = data.profs.filter(p => p.role === 'dentist').length;
  const techs   = data.profs.filter(p => p.role === 'technician').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="Commandes actives" val={active} accent={c.ac} />
        <Stat label="Terminées" val={done} accent={c.ok} />
        <Stat label={t('paid')} val={money(paid)} accent={c.ok} />
        <Stat label={t('unpaid')} val={money(unpaid)} accent={c.dng} />
        <Stat label="Dentistes" val={doctors} />
        <Stat label="Techniciens" val={techs} />
      </div>
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: FS, fontWeight: 700, marginBottom: 10 }}>Par étape</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {byStage.map(s => (
            <div key={s.id} style={{ background: s.bg, color: s.color, padding: '8px 14px', borderRadius: 10, fontSize: FS - 1, fontWeight: 600 }}>
              {s.label} <b style={{ marginLeft: 6 }}>{s.count}</b>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
