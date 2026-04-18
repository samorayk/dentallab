import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { cases as Cases, storage } from '../../lib/db';
import { Modal, Btn, Sel, Inp, Lbl, Txt, Row } from '../UI';
import ToothChart from '../ToothChart';
import { now } from '../../lib/helpers';
import DeliveryModal from './DeliveryModal';
import EtiquetteModal from './EtiquetteModal';
import ShareModal from './ShareModal';
import QRModal from './QRModal';

export default function CaseModal({ data, onClose, stages, profs, types }) {
  const { t, theme: c, FS, labId, isA, isT, profile, money } = useApp();
  const [x, setX] = useState(data);
  const [sub, setSub] = useState(null);
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const docs  = profs.filter(p => p.role === 'dentist');
  const techs = profs.filter(p => p.role === 'technician');
  const st = stages.find(s => s.id === x.stage);

  const save = async (patch) => {
    const next = { ...x, ...patch };
    setX(next);
    await Cases.update(labId, x.id, patch);
  };

  const startEdit = () => {
    setEf({
      patient: x.patient || '',
      dentist_id: x.dentist_id || '',
      type: x.type || '',
      material: x.material || '',
      tooth: x.tooth || '',
      shade: x.shade || '',
      elements: x.elements || 1,
      priority: x.priority || 'medium',
      notes: x.notes || '',
      due: x.due || '',
      unit_price: x.unit_price || 0,
    });
    setEditing(true); setErr('');
  };

  const saveEdit = async () => {
    if (!ef.patient) return setErr('Nom du patient requis');
    setSaving(true);
    try {
      const el = Number(ef.elements) || 1;
      const unit = Number(ef.unit_price) || 0;
      await save({
        patient: ef.patient, dentist_id: ef.dentist_id || null,
        type: ef.type, material: ef.material, tooth: ef.tooth,
        shade: ef.shade, elements: el, priority: ef.priority,
        notes: ef.notes, due: ef.due || null,
        unit_price: unit, total_price: unit * el,
      });
      setEditing(false);
    } catch (e) { setErr(e.message || 'Erreur'); }
    finally { setSaving(false); }
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
  const markStageUndone = async (stageId) => {
    const a = { ...(x.assignments || {}) };
    a[stageId] = { ...(a[stageId] || {}), done: false, doneAt: null };
    await save({ assignments: a });
  };

  const MATERIALS = ['Zircone','E.max','PFM','Or','Résine','Composite'];

  return (
    <>
      <Modal onClose={onClose} w={660}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:FS+2, fontWeight:700 }}>#{x.id} — {x.patient}</div>
            {st && <span style={{ background:st.bg, color:st.color, padding:'2px 10px', borderRadius:10, fontSize:FS-3, fontWeight:600 }}>{st.label}</span>}
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {isA && !editing && <Btn sm onClick={startEdit}>✏️ {t('edit')}</Btn>}
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:c.txL, fontSize:20 }}>×</button>
          </div>
        </div>

        {/* EDIT FORM */}
        {editing && isA ? (
          <div style={{ background:c.bg, borderRadius:8, padding:12, marginBottom:10 }}>
            <div style={{ fontSize:FS-1, fontWeight:700, marginBottom:8 }}>✏️ Modifier la commande</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <Lbl>{t('patient')} *</Lbl>
                <Inp value={ef.patient} onChange={e => setEf(p=>({...p, patient:e.target.value}))} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <Lbl>Dentiste</Lbl>
                <Sel value={ef.dentist_id} onChange={e => setEf(p=>({...p, dentist_id:e.target.value}))}>
                  <option value="">—</option>
                  {docs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </Sel>
              </div>
              <div>
                <Lbl>{t('type')}</Lbl>
                <Sel value={ef.type} onChange={e => { const tp=types.find(x=>x.name===e.target.value); setEf(p=>({...p, type:e.target.value, elements: tp ? tp.elems : p.elements})); }}>
                  {types.map(tp=><option key={tp.id}>{tp.name}</option>)}
                  {ef.type && !types.find(tp=>tp.name===ef.type) && <option value={ef.type}>{ef.type}</option>}
                </Sel>
              </div>
              <div>
                <Lbl>{t('material')}</Lbl>
                <Sel value={ef.material} onChange={e => setEf(p=>({...p, material:e.target.value}))}>
                  {MATERIALS.map(m=><option key={m}>{m}</option>)}
                  {ef.material && !MATERIALS.includes(ef.material) && <option>{ef.material}</option>}
                </Sel>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <ToothChart value={ef.tooth} onChange={v => setEf(p=>({...p, tooth:v}))} />
              </div>
              <div><Lbl>{t('shade')}</Lbl><Inp value={ef.shade} onChange={e=>setEf(p=>({...p,shade:e.target.value}))} /></div>
              <div><Lbl>{t('elements')}</Lbl><Inp type="number" min="1" value={ef.elements} onChange={e=>setEf(p=>({...p,elements:e.target.value}))} /></div>
              <div><Lbl>Prix unitaire</Lbl><Inp type="number" min="0" value={ef.unit_price} onChange={e=>setEf(p=>({...p,unit_price:e.target.value}))} /></div>
              <div>
                <Lbl>{t('priority')}</Lbl>
                <Sel value={ef.priority} onChange={e=>setEf(p=>({...p,priority:e.target.value}))}>
                  <option value="high">🔴 Haute</option><option value="medium">🟡 Moyenne</option><option value="low">🟢 Basse</option>
                </Sel>
              </div>
              <div><Lbl>{t('due')}</Lbl><Inp type="date" value={ef.due} onChange={e=>setEf(p=>({...p,due:e.target.value}))} /></div>
              <div style={{ gridColumn:'1/-1' }}><Lbl>{t('notes')}</Lbl><Txt value={ef.notes} onChange={e=>setEf(p=>({...p,notes:e.target.value}))} /></div>
            </div>
            {err && <div style={{ color:c.dng, padding:8, background:'#FEF2F2', borderRadius:6, marginTop:8, fontSize:FS-2 }}>{err}</div>}
            <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:10 }}>
              <Btn onClick={()=>{setEditing(false);setErr('');}}>Annuler</Btn>
              <Btn primary onClick={saveEdit} disabled={saving}>{saving?'…':t('save')}</Btn>
            </div>
          </div>
        ) : (
          /* VIEW */
          <div style={{ background:c.bg, borderRadius:8, padding:10, marginBottom:10 }}>
            <Row l={t('type')}>{x.type}</Row>
            <Row l={t('material')}>{x.material}</Row>
            <Row l={t('tooth')}>{x.tooth||'—'}</Row>
            <Row l={t('shade')}>{x.shade}</Row>
            <Row l={t('elements')}>{x.elements}</Row>
            {isA && <Row l="Prix unitaire">{money(x.unit_price)}</Row>}
            {isA && <Row l="Total">{money(x.total_price)}</Row>}
            <Row l={t('paid')}><span style={{ color: x.paid?c.ok:c.dng, fontWeight:700 }}>{x.paid?'✓ Payé':'✗ Impayé'}</span></Row>
            <Row l={t('due')}>{x.due||'—'}</Row>
            <Row l="Priorité">{x.priority==='high'?'🔴 Haute':x.priority==='low'?'🟢 Basse':'🟡 Moyenne'}</Row>
            {x.notes && <Row l={t('notes')}><span style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', display:'inline-block' }}>{x.notes}</span></Row>}
          </div>
        )}

        {/* STAGE — Admin */}
        {isA && !editing && (
          <div style={{ background:c.bg, borderRadius:8, padding:10, marginBottom:10 }}>
            <div style={{ fontSize:FS-2, fontWeight:700, marginBottom:6 }}>Étape de production</div>
            <Sel value={x.stage} onChange={e=>advanceStage(e.target.value)}>
              {stages.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </Sel>
          </div>
        )}

        {/* ASSIGNMENTS — Admin */}
        {isA && !editing && (
          <div style={{ background:c.bg, borderRadius:8, padding:10, marginBottom:10 }}>
            <div style={{ fontSize:FS-2, fontWeight:700, marginBottom:6 }}>Affectations techniciens</div>
            {stages.filter(s=>s.id!=='attente'&&s.id!=='termine').map(s => {
              const a = x.assignments?.[s.id] || {};
              return (
                <div key={s.id} style={{ display:'flex', gap:6, alignItems:'center', padding:'5px 0', borderBottom:'1px solid '+c.bdrL, flexWrap:'wrap' }}>
                  <span style={{ background:s.bg, color:s.color, padding:'2px 8px', borderRadius:8, fontSize:FS-3, fontWeight:600, minWidth:80 }}>{s.label}</span>
                  <Sel value={a.techId||''} onChange={e=>assignTech(s.id,e.target.value)} style={{ flex:1, minWidth:100 }}>
                    <option value="">—</option>
                    {techs.map(tc=><option key={tc.id} value={tc.id}>{tc.name}</option>)}
                  </Sel>
                  {a.assignedAt && <span style={{ fontSize:FS-4, color:c.txL }}>📅 {a.assignedAt}</span>}
                  {a.techId && !a.done && <Btn sm primary onClick={()=>markStageDone(s.id)}>✓</Btn>}
                  {a.done && (
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ color:c.ok, fontSize:FS-3 }}>✓ {a.doneAt}</span>
                      <Btn sm onClick={()=>markStageUndone(s.id)} style={{ fontSize:FS-4, padding:'2px 5px' }}>↩</Btn>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TECH VIEW */}
        {isT && (
          <div style={{ background:c.bg, borderRadius:8, padding:10, marginBottom:10 }}>
            <div style={{ fontSize:FS-2, fontWeight:700, marginBottom:6 }}>Mes étapes</div>
            {stages.filter(s=>x.assignments?.[s.id]?.techId===profile.id).map(s => {
              const a = x.assignments[s.id];
              return (
                <div key={s.id} style={{ padding:'6px 0', borderBottom:'1px solid '+c.bdrL }}>
                  <div style={{ fontSize:FS-1, fontWeight:600 }}>{s.label}</div>
                  <div style={{ fontSize:FS-3, color:c.txL }}>📅 Affecté: {a.assignedAt}</div>
                  {!a.done
                    ? <Btn sm primary onClick={()=>markStageDone(s.id)} style={{ marginTop:4 }}>✓ Marquer terminé</Btn>
                    : <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                        <span style={{ color:c.ok, fontSize:FS-2 }}>✓ Terminé {a.doneAt}</span>
                        <Btn sm onClick={()=>markStageUndone(s.id)} style={{ fontSize:FS-4 }}>↩</Btn>
                      </div>
                  }
                </div>
              );
            })}
          </div>
        )}

        {/* LOG */}
        {isA && !editing && x.log?.length > 0 && (
          <details style={{ marginBottom:10 }}>
            <summary style={{ cursor:'pointer', fontSize:FS-2, color:c.txL, fontWeight:600 }}>📋 Historique ({x.log.length})</summary>
            <div style={{ background:c.bg, borderRadius:8, padding:8, marginTop:6 }}>
              {[...x.log].reverse().map((l,i)=>(
                <div key={i} style={{ fontSize:FS-3, color:c.txM, padding:'2px 0' }}>
                  <span style={{ color:c.txL }}>{l.at}</span> — {l.msg}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ACTIONS */}
        {!editing && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'flex-end' }}>
            <Btn onClick={()=>setSub('share')}>📤 {t('share')}</Btn>
            <Btn onClick={()=>setSub('qr')}>📱 QR</Btn>
            {isA && <Btn onClick={()=>setSub('delivery')}>🚚 {t('delivery')}</Btn>}
            {isA && <Btn onClick={()=>setSub('etiquette')}>🏷️ {t('etiquette')}</Btn>}
            {isA && <Btn primary={!x.paid} onClick={markPaid}>{x.paid?'✗ '+t('unpaid'):'✓ '+t('paid')}</Btn>}
          </div>
        )}
      </Modal>

      {sub==='delivery'  && <DeliveryModal  data={x} onClose={(changed)=>{ setSub(null); if(changed) save({}); }} />}
      {sub==='etiquette' && <EtiquetteModal data={x} profs={profs} onClose={()=>setSub(null)} />}
      {sub==='share'     && <ShareModal     data={x} onClose={()=>setSub(null)} />}
      {sub==='qr'        && <QRModal        data={x} onClose={()=>setSub(null)} />}
    </>
  );
}
