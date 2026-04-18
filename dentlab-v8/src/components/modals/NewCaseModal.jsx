import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { cases as Cases, storage } from '../../lib/db';
import { Modal, Btn, Inp, Sel, Lbl, Txt, X } from '../UI';
import ToothChart from '../ToothChart';
import { newCaseId, today, now } from '../../lib/helpers';

export default function NewCaseModal({ onClose, types, profs }) {
  const { t, theme: c, FS, labId, profile, isD } = useApp();
  const docs = profs.filter(p => p.role === 'dentist');
  const defaultType = types[0];
  const [f, setF] = useState({
    patient: '',
    dentist_id: isD ? profile.id : docs[0]?.id || '',
    type: defaultType?.name || '',
    material: 'Zircone', tooth: '', shade: 'A2',
    priority: 'medium', notes: '', due: '',
    elements: defaultType?.elems || 1,
    files: [], teinte_photo: null,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!f.patient) return setErr('Nom du patient requis');
    setErr(''); setSaving(true);
    try {
      const id = newCaseId();
      // Silent price calc from type default (never shown in form)
      const tp = types.find(x => x.name === f.type);
      const unit = tp?.price || 0;
      const el = Number(f.elements) || 1;
      // Upload files first
      const uploaded = [];
      for (const file of f.files) {
        try { uploaded.push(await storage.upload(id, file)); } catch (_) { /* skip */ }
      }
      let teinteUrl = null;
      if (f.teinte_photo) {
        try { const tm = await storage.upload(id, f.teinte_photo); teinteUrl = tm?.url || null; } catch (_) {}
      }
      const { error } = await Cases.create({
        id, lab_id: labId, patient: f.patient, dentist_id: f.dentist_id || null,
        type: f.type, material: f.material, tooth: f.tooth, shade: f.shade,
        priority: f.priority, notes: f.notes, elements: el,
        unit_price: unit, total_price: unit * el, paid: false,
        stage: 'attente', due: f.due || null,
        files: uploaded, teinte_photo: teinteUrl,
        delivery: { status: 'pending', driverName: '', driverPhone: '', deliveredAt: '' },
        assignments: {}, log: [{ at: now(), msg: 'Commande créée' }],
      });
      if (error) throw error;
      onClose();
    } catch (e) { setErr(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} w={560}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: FS + 2, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{t('newOrder')}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.txL, fontSize: 20 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: '1/-1' }}><Lbl>{t('patient')} *</Lbl><Inp value={f.patient} onChange={e => set('patient', e.target.value)} /></div>
        {!isD && (
          <div style={{ gridColumn: '1/-1' }}>
            <Lbl>Dentiste</Lbl>
            <Sel value={f.dentist_id} onChange={e => set('dentist_id', e.target.value)}>
              {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Sel>
          </div>
        )}
        <div>
          <Lbl>{t('type')}</Lbl>
          <Sel value={f.type} onChange={e => { const tp = types.find(x => x.name === e.target.value); set('type', e.target.value); if (tp) set('elements', tp.elems); }}>
            {types.map(tp => <option key={tp.id}>{tp.name}</option>)}
          </Sel>
        </div>
        <div><Lbl>{t('material')}</Lbl>
          <Sel value={f.material} onChange={e => set('material', e.target.value)}>
            {['Zircone', 'E.max', 'PFM', 'Or', 'Résine', 'Composite'].map(m => <option key={m}>{m}</option>)}
          </Sel>
        </div>
        <div style={{ gridColumn: '1/-1' }}><ToothChart value={f.tooth} onChange={v => set('tooth', v)} /></div>
        <div><Lbl>{t('shade')}</Lbl><Inp value={f.shade} onChange={e => set('shade', e.target.value)} /></div>
        <div><Lbl>{t('elements')}</Lbl><Inp type="number" min="1" value={f.elements} onChange={e => set('elements', Number(e.target.value))} /></div>
        <div><Lbl>{t('priority')}</Lbl>
          <Sel value={f.priority} onChange={e => set('priority', e.target.value)}>
            <option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option>
          </Sel>
        </div>
        <div><Lbl>{t('due')}</Lbl><Inp type="date" value={f.due} onChange={e => set('due', e.target.value)} /></div>
        <div style={{ gridColumn: '1/-1' }}><Lbl>{t('notes')}</Lbl><Txt value={f.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div style={{ gridColumn: '1/-1' }}>
          <Lbl>Fichiers (scans, STL, photos…)</Lbl>
          <input type="file" multiple onChange={e => set('files', Array.from(e.target.files || []))}
            style={{ fontSize: FS - 2, padding: 6, width: '100%' }} />
          {f.files.length > 0 && <div style={{ fontSize: FS - 3, color: c.ac, marginTop: 4 }}>{f.files.length} fichier(s)</div>}
        </div>
        {f.material === 'Zircone' && (
          <div style={{ gridColumn: '1/-1', background: '#FEF3C7', borderRadius: 8, padding: 10 }}>
            <Lbl>🎨 Photo de teinte (requis Zircone)</Lbl>
            <input type="file" accept="image/*" onChange={e => set('teinte_photo', e.target.files?.[0] || null)}
              style={{ fontSize: FS - 2, padding: 4, width: '100%' }} />
          </div>
        )}
      </div>
      {err && <div style={{ color: c.dng, fontSize: 12, padding: 8, background: '#FEF2F2', borderRadius: 6, marginTop: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <Btn onClick={onClose}>{t('cancel')}</Btn>
        <Btn primary onClick={save} disabled={saving}>{saving ? '…' : t('create')}</Btn>
      </div>
    </Modal>
  );
}
