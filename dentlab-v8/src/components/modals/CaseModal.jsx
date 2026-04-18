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

const MATERIALS = ['Zircone','E.max','PFM','Or','Résine','Composite','Céramique','PMMA','Titane'];

// Stages that need file/teinte access
const FRAISAGE_STAGES  = ['fraisage','conception','impression'];
const MAQUILLAGE_STAGES = ['maquillage','four'];

export default function CaseModal({ data, onClose, stages, profs, types }) {
  const { t, theme: c, FS, labId, isA, isT, profile, money, pushNotif } = useApp();
  const [x, setX]       = useState(data);
  const [sub, setSub]   = useState(null);
  const [editing, setEditing] = useState(false);
  const [ef, setEf]     = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr]   = useState('');

  const docs  = profs.filter(p => p.role === 'dentist');
  const techs = profs.filter(p => p.role === 'technician');
  const st    = stages.find(s => s.id === x.stage);

  // What stages is this tech assigned to?
  const myAssignedStages = isT
    ? Object.entries(x.assignments || {}).filter(([_, v]) => v?.techId === profile.id).map(([sid]) => sid)
    : [];

  const canSeeFiles = isA
    || myAssignedStages.some(sid => FRAISAGE_STAGES.includes(sid))
    || myAssignedStages.some(sid => MAQUILLAGE_STAGES.includes(sid));

  const canSeeTeintePhoto = isA
    || myAssignedStages.some(sid => [...FRAISAGE_STAGES, ...MAQUILLAGE_STAGES].includes(sid));

  const save = async (patch) => {
    const next = { ...x, ...patch };
    setX(next);
    await Cases.update(labId, x.id, patch);
  };

  const startEdit = () => {
    setEf({
      patient: x.patient || '', dentist_id: x.dentist_id || '',
      type: x.type || '', material: x.material || '', tooth: x.tooth || '',
      shade: x.shade || '', elements: x.elements || 1, priority: x.priority || 'medium',
      notes: x.notes || '', due: x.due || '', unit_price: x.unit_price || 0,
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
        type: ef.type, material: ef.material, tooth: ef.tooth, shade: ef.shade,
        elements: el, priority: ef.priority, notes: ef.notes, due: ef.due || null,
        unit_price: unit, total_price: unit * el,
      });
      setEditing(false);
      pushNotif?.(`Commande #${x.id} mise à jour`, 'ok');
    } catch (e) { setErr(e.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const advanceStage = async (newStage) => {
    const log = [...(x.log || []), { at: now(), msg: `Étape → ${newStage}` }];
    await save({ stage: newStage, log });
    pushNotif?.(`Étape changée → ${stages.find(s=>s.id===newStage)?.label || newStage}`, 'ok');
  };
  const markPaid = async () => {
    await save({ paid: !x.paid });
    pushNotif?.(x.paid ? 'Commande marquée impayée' : 'Commande marquée payée', 'ok');
  };
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
    pushNotif?.(`Étape terminée : ${stages.find(s=>s.id===stageId)?.label || stageId}`, 'ok');
  };
  const markStageUndone = async (stageId) => {
    const a = { ...(x.assignments || {}) };
    a[stageId] = { ...(a[stageId] || {}), done: false, doneAt: null };
    await save({ assignments: a });
  };

  const downloadFile = (url, name) => {
    const a = document.createElement('a');
    a.href = url; a.download = name || 'fichier'; a.target = '_blank';
    a.click();
  };

  return (
    <>
      <Modal onClose={onClose} w={680}>
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
              <div style={{ gridColumn:'1/-1' }}><Lbl>{t('patient')} *</Lbl><Inp value={ef.patient} onChange={e=>setEf(p=>({...p,patient:e.target.value}))} /></div>
              <div style={{ gridColumn:'1/-1' }}>
                <Lbl>Dentiste</Lbl>
                <Sel value={ef.dentist_id} onChange={e=>setEf(p=>({...p,dentist_id:e.target.value}))}>
                  <option value="">—</option>
                  {docs.map(d=><option key={d.id} value={d.id}>{d.name}{d.clinic?' · '+d.clinic:''}</option>)}
                </Sel>
              </div>
              <div>
                <Lbl>{t('type')}</Lbl>
                <Sel value={ef.type} onChange={e=>{const tp=types.find(x=>x.name===e.target.value);setEf(p=>({...p,type:e.target.value,elements:tp?tp.elems:p.elements}));}}>
                  {types.map(tp=><option key={tp.id}>{tp.name}</option>)}
                  {ef.type&&!types.find(tp=>tp.name===ef.type)&&<option value={ef.type}>{ef.type}</option>}
                </Sel>
              </div>
              <div>
                <Lbl>{t('material')}</Lbl>
                <Sel value={ef.material} onChange={e=>setEf(p=>({...p,material:e.target.value}))}>
                  {MATERIALS.map(m=><option key={m}>{m}</option>)}
                  {ef.material&&!MATERIALS.includes(ef.material)&&<option>{ef.material}</option>}
                </Sel>
              </div>
              <div style={{ gridColumn:'1/-1' }}><ToothChart value={ef.tooth} onChange={v=>setEf(p=>({...p,tooth:v}))} /></div>
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
          <div style={{ background:c.bg, borderRadius:8, padding:10, marginBottom:10 }}>
            <Row l={t('type')}><span style={{ fontWeight:700 }}>{x.type}</span></Row>
            <Row l={t('material')}><span style={{ fontWeight:700, color:c.ac }}>{x.material}</span></Row>
            <Row l={t('tooth')}>{x.tooth||'—'}</Row>
            <Row l={t('shade')}>{x.shade}</Row>
            <Row l={t('elements')}>{x.elements}</Row>
            {isA && <Row l="Prix unitaire">{money(x.unit_price)}</Row>}
            {isA && <Row l="Total">{money(x.total_price)}</Row>}
            <Row l={t('paid')}><span style={{ color:x.paid?c.ok:c.dng, fontWeight:700 }}>{x.paid?'✓ Payé':'✗ Impayé'}</span></Row>
            <Row l={t('due')}>{x.due||'—'}</Row>
            <Row l="Priorité">{x.priority==='high'?'🔴 Haute':x.priority==='low'?'🟢 Basse':'🟡 Moyenne'}</Row>
            {x.notes && <Row l={t('notes')}><span style={{ maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', display:'inline-block' }}>{x.notes}</span></Row>}
          </div>
        )}

        {/* FILES — visible to admin and assigned technicians (fraisage/maquillage) */}
        {canSeeFiles && (x.files?.length > 0 || x.teinte_photo) && (
          <div style={{ background:c.bg, borderRadius:8, padding:10, marginBottom:10 }}>
            <div style={{ fontSize:FS-2, fontWeight:700, marginBottom:8 }}>📁 Fichiers & Photos</div>

            {/* Teinte photo */}
            {canSeeTeintePhoto && x.teinte_photo && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:FS-3, fontWeight:600, color:c.txL, marginBottom:4 }}>🎨 PHOTO DE TEINTE</div>
                <div style={{ display:'flex', gap:8, alignItems:'center', background:'#FEF3C7', padding:'8px 10px', borderRadius:8 }}>
                  <img src={x.teinte_photo} alt="Teinte" style={{ width:60, height:60, objectFit:'cover', borderRadius:6, border:'2px solid #FDE68A' }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:FS-2 }}>Photo teinte Zircone</div>
                    <div style={{ fontSize:FS-4, color:c.txL }}>Teinte: {x.shade}</div>
                  </div>
                  <Btn sm onClick={()=>downloadFile(x.teinte_photo, `teinte_${x.id}.jpg`)}>⬇️ Télécharger</Btn>
                </div>
              </div>
            )}

            {/* Other files */}
            {x.files?.length > 0 && (
              <div>
                <div style={{ fontSize:FS-3, fontWeight:600, color:c.txL, marginBottom:4 }}>📎 FICHIERS ({x.files.length})</div>
                {x.files.map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid '+c.bdrL }}>
                    <span style={{ fontSize:18 }}>
                      {f.name?.match(/\.(stl|obj|3mf)$/i) ? '🖨️' : f.name?.match(/\.(jpg|jpeg|png|webp)$/i) ? '🖼️' : '📄'}
                    </span>
                    <span style={{ flex:1, fontSize:FS-2, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name || `Fichier ${i+1}`}</span>
                    {f.size && <span style={{ fontSize:FS-4, color:c.txL }}>{(f.size/1024).toFixed(0)} KB</span>}
                    <Btn sm onClick={()=>downloadFile(f.url, f.name)}>⬇️</Btn>
                  </div>
                ))}
              </div>
            )}
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
