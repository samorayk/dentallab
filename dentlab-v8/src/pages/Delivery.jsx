import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, profiles as Profiles } from '../lib/db';
import { Btn, Card } from '../components/UI';
import DeliveryModal from '../components/modals/DeliveryModal';
import EtiquetteModal from '../components/modals/EtiquetteModal';

function DlvBadge({ st }) {
  const { theme: c, FS, t } = useApp();
  const cfg = {
    pending:    { bg: '#FEF3C7', color: '#D97706', label: '⏳ ' + t('pending') },
    in_transit: { bg: '#DBEAFE', color: '#2563EB', label: '🚚 ' + t('inTransit') },
    delivered:  { bg: '#D1FAE5', color: '#059669', label: '✓ ' + t('delivered') },
  }[st || 'pending'];
  return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 10, fontSize: FS - 3, fontWeight: 600 }}>{cfg.label}</span>;
}

export default function Delivery() {
  const { theme: c, FS, t } = useApp();
  const [cs, setCs] = useState([]);
  const [profs, setProfs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [dlv, setDlv] = useState(null);
  const [etq, setEtq] = useState(null);
  const reload = async () => {
    const [a, b] = await Promise.all([Cases.list(), Profiles.list()]);
    setCs(a.data || []); setProfs(b.data || []);
  };
  useEffect(() => { reload(); }, []);

  const candidates = cs.filter(x => x.stage === 'termine' || (x.delivery?.status && x.delivery.status !== 'pending'));
  const filtered = candidates.filter(x => filter === 'all' || (x.delivery?.status || 'pending') === filter);
  const counts = {
    all: candidates.length,
    pending:    candidates.filter(x => (x.delivery?.status || 'pending') === 'pending').length,
    in_transit: candidates.filter(x => x.delivery?.status === 'in_transit').length,
    delivered:  candidates.filter(x => x.delivery?.status === 'delivered').length,
  };
  const label = (f) => f === 'all' ? t('all') : f === 'in_transit' ? t('inTransit') : t(f);
  const doc = id => profs.find(p => p.id === id)?.name || '—';

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['all', 'pending', 'in_transit', 'delivered'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '7px 14px', fontSize: FS - 1.5, fontWeight: 600, border: '1px solid ' + (filter === f ? c.ac : c.bdr), borderRadius: 999, background: filter === f ? c.ac : '#fff', color: filter === f ? '#fff' : c.tx, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {label(f)}
            <span style={{ background: filter === f ? 'rgba(255,255,255,.25)' : c.bg, padding: '1px 7px', borderRadius: 10, fontSize: FS - 3 }}>{counts[f]}</span>
          </button>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: c.txL, fontSize: FS - 1 }}><div style={{ fontSize: 28, marginBottom: 6 }}>🚚</div>Aucune livraison</div>}
        {filtered.map(x => {
          const d = x.delivery || { status: 'pending' };
          return (
            <div key={x.id} style={{ padding: '12px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: c.ac, fontSize: FS - 1 }}>#{x.id}</span>
                  <span style={{ fontWeight: 600, fontSize: FS - 1 }}>{x.patient}</span>
                  <DlvBadge st={d.status} />
                </div>
                <div style={{ fontSize: FS - 3, color: c.txM, marginTop: 3 }}>
                  {x.type} · 🦷 {x.tooth || '—'} · Dr. {doc(x.dentist_id)}
                  {d.driverName && <> · 🚗 {d.driverName}{d.driverPhone ? ' ' + d.driverPhone : ''}</>}
                  {d.deliveredAt && <> · ✓ {d.deliveredAt}</>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn sm onClick={() => setDlv(x)}>✏️ {t('edit')}</Btn>
                <Btn sm onClick={() => setEtq(x)}>🏷️ Étiquette</Btn>
              </div>
            </div>
          );
        })}
      </Card>
      {dlv && <DeliveryModal data={dlv} onClose={() => { setDlv(null); reload(); }} />}
      {etq && <EtiquetteModal data={etq} profs={profs} onClose={() => setEtq(null)} />}
    </div>
  );
}
