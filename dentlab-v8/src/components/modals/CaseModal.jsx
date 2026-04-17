import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { cases as Cases } from '../../lib/db';
import { Modal, Btn, Sel, Row } from '../UI';
import ToothChart from '../ToothChart';
import { now } from '../../lib/helpers';
import DeliveryModal from './DeliveryModal';
import EtiquetteModal from './EtiquetteModal';
import ShareModal from './ShareModal';
import QRModal from './QRModal';

export default function CaseModal({ data, onClose, stages, profs, types }) {
  const { t, theme: c, FS, labId, isA, isT, profile, money } = useApp();
  const [x, setX] = useState(data);
  const [sub, setSub] = useState(null); // 'delivery' | 'etiquette' | 'share' | 'qr'
  const docs  = profs.filter(p => p.role === 'dentist');
  const techs = profs.filter(p => p.role === 'technician');
  const st = stages.find(s => s.id === x.stage);

  const save = async (patch) => {
    const next = { ...x, ...patch };
    setX(next);
    await Cases.update(labId, x.id, patch);
  };

  const advanceStage = async (newStage) => {
    const log = [...(x.log || []), { at: now(), msg: `Étape → ${newStage}` }];
    await save({ stage: newStage, log });
  };
  const markPaid = async () => save({ paid: !x.paid });
  const assignTech = async (stageId, techId) => {
    const a = { ...(x.assignments || {}) };
    a[stageId] = { ...(a[stageId] || {}), techId, assignedAt: a[stageId]?.assignedAt || now() };
    await save({ assignments: a });
  };
  const markStageDone = async (stageId) => {
    const a = { ...(x.assignments || {}) };
    a[stageId] = { ...(a[stageId] || {}), done: true, doneAt: now() };
    const log = [...(x.log || []), { at: now(), msg: `${stageId} terminé` }];
    await save({ assignments: a, log });
  };

  return (
    <>
      <Modal onClose={onClose} w={640}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: FS + 2, fontWeight: 700 }}>#{x.id} — {x.patient}</div>
            {st && <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: 10, fontSize: FS - 3, fontWeight: 600 }}>{st.label}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.txL, fontSize: 20 }}>×</button>
        </div>

        <div style={{ background: c.bg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <Row l={t('type')}>{x.type}</Row>
          <Row l={t('material')}>{x.material}</Row>
          <Row l={t('tooth')}>{x.tooth || '—'}</Row>
          <Row l={t('shade')}>{x.shade}</Row>
          <Row l={t('elements')}>{x.elements}</Row>
          {isA && <Row l="Total">{money(x.total_price)}</Row>}
          <Row l={t('paid')}>{x.paid ? '✓' : '✗'}</Row>
          <Row l={t('due')}>{x.due || '—'}</Row>
        </div>

        {isA && (
          <div style={{ background: c.bg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: FS - 2, fontWeight: 700, marginBottom: 6 }}>{t('stage')}</div>
            <Sel value={x.stage} onChange={e => advanceStage(e.target.value)}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Sel>
          </div>
        )}

        {isA && (
          <div style={{ background: c.bg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: FS - 2, fontWeight: 700, marginBottom: 6 }}>Affectations</div>
            {stages.filter(s => s.id !== 'attente' && s.id !== 'termine').map(s => {
              const a = x.assignments?.[s.id] || {};
              return (
                <div key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid ' + c.bdrL }}>
                  <span style={{ minWidth: 110, fontSize: FS - 2 }}>{s.label}</span>
                  <Sel value={a.techId || ''} onChange={e => assignTech(s.id, e.target.value)} style={{ flex: 1 }}>
                    <option value="">—</option>
                    {techs.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                  </Sel>
                  {a.assignedAt && <span style={{ fontSize: FS - 4, color: c.txL }}>📅 {a.assignedAt}</span>}
                  {a.techId && !a.done && <Btn sm onClick={() => markStageDone(s.id)}>✓</Btn>}
                  {a.done && <span style={{ color: c.ok, fontSize: FS - 3 }}>✓ {a.doneAt}</span>}
                </div>
              );
            })}
          </div>
        )}

        {isT && (
          <div style={{ background: c.bg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            {stages.filter(s => x.assignments?.[s.id]?.techId === profile.id).map(s => {
              const a = x.assignments[s.id];
              return (
                <div key={s.id} style={{ padding: '4px 0' }}>
                  <div style={{ fontSize: FS - 1, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: FS - 3, color: c.txL }}>📅 Affecté: {a.assignedAt}</div>
                  {!a.done ? <Btn sm primary onClick={() => markStageDone(s.id)}>Marquer terminé</Btn> : <span style={{ color: c.ok, fontSize: FS - 2 }}>✓ Terminé {a.doneAt}</span>}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
          <Btn onClick={() => setSub('share')}>📤 {t('share')}</Btn>
          <Btn onClick={() => setSub('qr')}>📱 QR</Btn>
          {isA && <Btn onClick={() => setSub('delivery')}>🚚 {t('delivery')}</Btn>}
          {isA && <Btn onClick={() => setSub('etiquette')}>🏷️ {t('etiquette')}</Btn>}
          {isA && <Btn primary={!x.paid} onClick={markPaid}>{x.paid ? '✗ ' + t('unpaid') : '✓ ' + t('paid')}</Btn>}
        </div>
      </Modal>
      {sub === 'delivery'  && <DeliveryModal  data={x} onClose={(changed) => { setSub(null); if (changed) save({}); }} />}
      {sub === 'etiquette' && <EtiquetteModal data={x} profs={profs} onClose={() => setSub(null)} />}
      {sub === 'share'     && <ShareModal    data={x} onClose={() => setSub(null)} />}
      {sub === 'qr'        && <QRModal       data={x} onClose={() => setSub(null)} />}
    </>
  );
}
