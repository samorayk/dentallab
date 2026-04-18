import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles } from '../lib/db';
import { Btn, Card, Inp } from '../components/UI';
import DeliveryModal from '../components/modals/DeliveryModal';
import EtiquetteModal from '../components/modals/EtiquetteModal';

function DlvBadge({ st }) {
  const { theme: c, FS, t } = useApp();
  const cfg = {
    pending:    { bg:'#FEF3C7', color:'#D97706', label:'⏳ En attente' },
    in_transit: { bg:'#DBEAFE', color:'#2563EB', label:'🚚 En transit' },
    delivered:  { bg:'#D1FAE5', color:'#059669', label:'✓ Livré' },
  }[st || 'pending'] || { bg:'#F3F4F6', color:'#6B7280', label: st };
  return <span style={{ background:cfg.bg, color:cfg.color, padding:'3px 10px', borderRadius:10, fontSize:FS-3, fontWeight:700 }}>{cfg.label}</span>;
}

export default function Delivery() {
  const { theme: c, FS, isA, isD, profile } = useApp();
  const [cs, setCs]     = useState([]);
  const [profs, setProfs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ]       = useState('');
  const [dlv, setDlv]   = useState(null);
  const [etq, setEtq]   = useState(null);

  const reload = async () => {
    const [a, b] = await Promise.all([Cases.list(), Profiles.list()]);
    setCs(a.data || []); setProfs(b.data || []);
  };
  useEffect(() => { reload(); }, []);

  // Admin sees all orders with stage=termine OR any delivery status set
  // Dentist sees only their own orders
  const allCandidates = isD
    ? cs.filter(x => x.dentist_id === profile.id)
    : cs.filter(x => x.stage === 'termine' || (x.delivery?.status && x.delivery.status !== 'pending'));

  const filtered = allCandidates.filter(x => {
    if (filter !== 'all' && (x.delivery?.status || 'pending') !== filter) return false;
    if (q && !(x.patient?.toLowerCase().includes(q.toLowerCase()) || x.id?.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const counts = {
    all:        allCandidates.length,
    pending:    allCandidates.filter(x => (x.delivery?.status || 'pending') === 'pending').length,
    in_transit: allCandidates.filter(x => x.delivery?.status === 'in_transit').length,
    delivered:  allCandidates.filter(x => x.delivery?.status === 'delivered').length,
  };

  const doc = id => {
    const p = profs.find(p => p.id === id);
    return p ? p.name + (p.clinic ? ' · ' + p.clinic : '') : '—';
  };

  const FILTERS = [
    { id:'all', label:'Toutes' },
    { id:'pending', label:'⏳ En attente' },
    { id:'in_transit', label:'🚚 En transit' },
    { id:'delivered', label:'✓ Livré' },
  ];

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding:'7px 14px', fontSize:FS-1.5, fontWeight:600, border:'1px solid '+(filter===f.id?c.ac:c.bdr),
              borderRadius:999, background:filter===f.id?c.ac:'#fff', color:filter===f.id?'#fff':c.tx, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
            {f.label}
            <span style={{ background:filter===f.id?'rgba(255,255,255,.25)':c.bg, padding:'1px 7px', borderRadius:10, fontSize:FS-3 }}>{counts[f.id]}</span>
          </button>
        ))}
        <Inp placeholder="Rechercher patient / ID…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth:220, marginLeft:'auto' }} />
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:c.txL }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🚚</div>
            <div>{isD ? 'Aucune commande avec statut livraison' : 'Aucune livraison'}</div>
          </div>
        )}
        {filtered.map(x => {
          const d = x.delivery || { status:'pending' };
          const st = (x.stage === 'termine') ? null : x.stage;
          return (
            <div key={x.id} style={{ padding:'12px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 220px', minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontWeight:700, color:c.ac, fontSize:FS-1 }}>#{x.id}</span>
                  <span style={{ fontWeight:700, fontSize:FS }}>{x.patient}</span>
                  <DlvBadge st={d.status} />
                </div>
                <div style={{ fontSize:FS-3, color:c.txL }}>
                  {x.type} · {x.material} · 🦷 {x.tooth || '—'}
                </div>
                <div style={{ fontSize:FS-3, color:c.txL, marginTop:2 }}>
                  Dr. {doc(x.dentist_id)}
                </div>
                {d.driverName && (
                  <div style={{ fontSize:FS-3, color:c.txM, marginTop:2 }}>
                    🚗 {d.driverName} {d.driverPhone ? '· ' + d.driverPhone : ''}
                  </div>
                )}
                {d.deliveredAt && (
                  <div style={{ fontSize:FS-3, color:c.ok, fontWeight:600, marginTop:2 }}>
                    ✓ Livré le {d.deliveredAt}
                  </div>
                )}
                {d.note && <div style={{ fontSize:FS-3, color:c.txL, marginTop:2 }}>📝 {d.note}</div>}
              </div>
              {/* Admin can edit, dentist only views */}
              {isA && (
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <Btn sm onClick={() => setDlv(x)}>✏️ Modifier</Btn>
                  <Btn sm onClick={() => setEtq(x)}>🏷️ Étiquette</Btn>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {dlv && <DeliveryModal data={dlv} onClose={() => { setDlv(null); reload(); }} />}
      {etq && <EtiquetteModal data={etq} profs={profs} onClose={() => setEtq(null)} />}
    </div>
  );
}
