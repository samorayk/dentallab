import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles, stages as Stages } from '../lib/db';
import { Card, Btn, Stat } from '../components/UI';
import CaseModal from '../components/modals/CaseModal';

export default function TechPortal() {
  const { theme: c, FS, t, profile, isA } = useApp();
  const [cs, setCs] = useState([]);
  const [profs, setProfs] = useState([]);
  const [stgs, setStgs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterTech, setFilterTech] = useState(isA ? 'all' : profile.id);

  const reload = async () => {
    const [a, p, s] = await Promise.all([Cases.list(), Profiles.list(), Stages.list()]);
    setCs(a.data || []); setProfs(p.data || []); setStgs(s.data || []);
  };
  useEffect(() => { reload(); }, []);

  const techs = profs.filter(p => p.role === 'technician');

  const myWork = cs.filter(x => {
    const assgn = x.assignments || {};
    if (filterTech === 'all') return Object.values(assgn).some(a => a?.techId);
    return Object.values(assgn).some(a => a?.techId === filterTech);
  });

  const pending = myWork.filter(x => {
    const a = x.assignments || {};
    return Object.values(a).some(v => v?.techId === (filterTech === 'all' ? v?.techId : filterTech) && !v?.done);
  }).length;

  return (
    <div>
      {isA && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <Btn sm primary={filterTech === 'all'} onClick={() => setFilterTech('all')}>Tous</Btn>
          {techs.map(t => <Btn key={t.id} sm primary={filterTech === t.id} onClick={() => setFilterTech(t.id)}>{t.name}</Btn>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Stat label="À faire" val={pending} accent={c.warn} />
        <Stat label="Total affecté" val={myWork.length} />
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {myWork.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: c.txL }}>—</div>}
        {myWork.map(x => {
          const myStages = Object.entries(x.assignments || {}).filter(([_, v]) => filterTech === 'all' || v?.techId === filterTech);
          const doc = profs.find(p => p.id === x.dentist_id);
          return (
            <div key={x.id} onClick={() => setSelected(x)} style={{ cursor: 'pointer', padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: c.ac, fontSize: FS - 1 }}>#{x.id}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.patient}</div>
                <div style={{ fontSize: FS - 3, color: c.txL }}>{x.type} · Dr. {doc?.name}</div>
                <div style={{ fontSize: FS - 3, color: c.txM, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {myStages.map(([sid, v]) => {
                    const st = stgs.find(s => s.id === sid);
                    return <span key={sid} style={{ background: st?.bg || c.bg, color: st?.color || c.tx, padding: '1px 8px', borderRadius: 8, fontSize: FS - 3 }}>{st?.label || sid} {v?.done ? '✓' : '⏳'} <span style={{ fontSize: FS - 4 }}>📅 {v?.assignedAt}</span></span>;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
      {selected && <CaseModal data={selected} onClose={() => { setSelected(null); reload(); }} stages={stgs} profs={profs} types={[]} />}
    </div>
  );
}
