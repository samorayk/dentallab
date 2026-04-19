import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles, stages as Stages, types as Types } from '../lib/db';
import { Btn, Inp, Sel, Card, Plus } from '../components/UI';
import NewCaseModal from '../components/modals/NewCaseModal';
import CaseModal from '../components/modals/CaseModal';

export default function CasesPage() {
  const { theme: c, FS, t, isA, isD, labId, money, pushNotif } = useApp();
  const [cs, setCs]         = useState([]);
  const [profs, setProfs]   = useState([]);
  const [stgs, setStgs]     = useState([]);
  const [types, setTypes]   = useState([]);
  const [stageFilter, setStageFilter] = useState('all');
  const [q, setQ]           = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [opened, setOpened] = useState(null);

  const reload = async () => {
    const [a, p, s, ty] = await Promise.all([Cases.list(), Profiles.list(), Stages.list(), Types.list()]);
    setCs(a.data||[]); setProfs(p.data||[]); setStgs(s.data||[]); setTypes(ty.data||[]);
  };
  useEffect(() => { reload(); }, []);

  const docName = id => {
    const p = profs.find(p => p.id === id);
    return p ? p.name + (p.clinic ? ' · ' + p.clinic : '') : '—';
  };

  const del = async (e, x) => {
    e.stopPropagation();
    if (!confirm(`Supprimer la commande #${x.id} — ${x.patient} ?\n\nCette action est irréversible.`)) return;
    const { error } = await Cases.delete(labId, x.id);
    if (error) { pushNotif?.('Erreur suppression: ' + error.message, 'err'); return; }
    pushNotif?.(`Commande #${x.id} supprimée`, 'info');
    reload();
  };

  const filtered = cs.filter(x => {
    if (stageFilter !== 'all' && x.stage !== stageFilter) return false;
    if (q && !(x.patient?.toLowerCase().includes(q.toLowerCase()) || x.id?.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {(isA||isD) && <Btn primary onClick={()=>setNewOpen(true)}>{Plus} {t('newOrder')}</Btn>}
        <Inp placeholder={t('search')+'…'} value={q} onChange={e=>setQ(e.target.value)} style={{ maxWidth:240 }} />
        <Sel value={stageFilter} onChange={e=>setStageFilter(e.target.value)} style={{ maxWidth:200 }}>
          <option value="all">Toutes les étapes</option>
          {stgs.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
        </Sel>
        <div style={{ marginLeft:'auto', fontSize:FS-3, color:c.txL, display:'flex', alignItems:'center' }}>
          {filtered.length} commande{filtered.length!==1?'s':''}
        </div>
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {filtered.length===0 && <div style={{ padding:24, textAlign:'center', color:c.txL }}>Aucune commande</div>}
        {filtered.map(x => {
          const st = stgs.find(s=>s.id===x.stage);
          return (
            <div key={x.id} onClick={()=>setOpened(x)}
              style={{ padding:'11px 14px', borderBottom:'1px solid '+c.bdrL, cursor:'pointer',
                display:'flex', alignItems:'center', gap:10, flexWrap:'wrap',
                transition:'background .15s' }}
              onMouseEnter={e=>e.currentTarget.style.background=c.bg}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

              <span style={{ fontWeight:700, color:c.ac, fontSize:FS-1, minWidth:70 }}>{x.id}</span>

              <div style={{ flex:'1 1 180px', minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:FS }}>{x.patient}</div>
                <div style={{ fontSize:FS-3, color:c.txL, marginTop:2 }}>
                  {/* Show BOTH type and material */}
                  <span style={{ background:c.acL, color:c.ac, padding:'1px 6px', borderRadius:6, fontWeight:600, marginRight:4 }}>{x.type}</span>
                  {x.material && <span style={{ background:'#F3F4F6', color:'#374151', padding:'1px 6px', borderRadius:6, marginRight:4 }}>{x.material}</span>}
                  🦷 {x.tooth||'—'} · {docName(x.dentist_id)}
                </div>
              </div>

              {st && <span style={{ background:st.bg, color:st.color, padding:'3px 10px', borderRadius:10, fontSize:FS-3, fontWeight:600 }}>{st.label}</span>}
              {isA && <span style={{ fontWeight:600, fontSize:FS-2 }}>{money(x.total_price)}</span>}
              <span style={{ fontSize:FS-3, color:x.paid?c.ok:c.dng, fontWeight:600 }}>{x.paid?'✓ '+t('paid'):t('unpaid')}</span>

              {/* Delete button — admin only */}
              {isA && (
                <button onClick={e=>del(e,x)}
                  style={{ background:'none', border:'1px solid '+c.dng, color:c.dng, borderRadius:6, padding:'3px 8px',
                    cursor:'pointer', fontSize:FS-3, fontWeight:600, flexShrink:0 }}
                  title="Supprimer cette commande">
                  🗑
                </button>
              )}
            </div>
          );
        })}
      </Card>

      {newOpen && <NewCaseModal onClose={()=>{ setNewOpen(false); reload(); }} types={types} profs={profs} />}
      {opened  && <CaseModal   data={opened} onClose={()=>{ setOpened(null); reload(); }} stages={stgs} profs={profs} types={types} />}
    </div>
  );
}
