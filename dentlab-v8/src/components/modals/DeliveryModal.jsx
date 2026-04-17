import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { cases as Cases } from '../../lib/db';
import { Modal, Btn, Inp, Sel, Lbl } from '../UI';
import { now } from '../../lib/helpers';

export default function DeliveryModal({ data, onClose }) {
  const { t, theme: c, FS, labId } = useApp();
  const [d, setD] = useState({
    status: data.delivery?.status || 'pending',
    driverName: data.delivery?.driverName || '',
    driverPhone: data.delivery?.driverPhone || '',
    deliveredAt: data.delivery?.deliveredAt || '',
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const dv = { ...d };
    if (dv.status === 'delivered' && !dv.deliveredAt) dv.deliveredAt = now();
    const log = [...(data.log || []), { at: now(), msg: `Livraison → ${dv.status}` }];
    await Cases.update(labId, data.id, { delivery: dv, log });
    setBusy(false);
    onClose(true);
  };

  return (
    <Modal onClose={() => onClose(false)} w={420}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: FS + 1, fontWeight: 700 }}>🚚 {t('delivery')}</div>
        <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: c.txL }}>×</button>
      </div>
      <div style={{ background: c.bg, borderRadius: 6, padding: 8, marginBottom: 10, fontSize: FS - 2 }}>
        #{data.id} — {data.patient}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div><Lbl>{t('status')}</Lbl>
          <Sel value={d.status} onChange={e => setD({ ...d, status: e.target.value })}>
            <option value="pending">⏳ {t('pending')}</option>
            <option value="in_transit">🚚 {t('inTransit')}</option>
            <option value="delivered">✓ {t('delivered')}</option>
          </Sel>
        </div>
        <div><Lbl>{t('driverName')}</Lbl><Inp value={d.driverName} onChange={e => setD({ ...d, driverName: e.target.value })} /></div>
        <div><Lbl>{t('driverPhone')}</Lbl><Inp value={d.driverPhone} onChange={e => setD({ ...d, driverPhone: e.target.value })} /></div>
        {d.status === 'delivered' && <div><Lbl>{t('deliveredAt')}</Lbl><Inp value={d.deliveredAt} onChange={e => setD({ ...d, deliveredAt: e.target.value })} placeholder="YYYY-MM-DD HH:mm" /></div>}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
        <Btn onClick={() => onClose(false)}>{t('cancel')}</Btn>
        <Btn primary onClick={save} disabled={busy}>{busy ? '…' : t('save')}</Btn>
      </div>
    </Modal>
  );
}
