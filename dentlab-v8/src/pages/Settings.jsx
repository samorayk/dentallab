import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { settingsApi, types as Types, labs as Labs } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Btn, Inp, Card, Lbl, Plus, Modal } from '../components/UI';
import { LANGS } from '../i18n';
import { CURRENCIES, today } from '../lib/helpers';
import { FONT_FAMILIES } from '../App';

const FONT_SIZES = [10,11,12,13,14,15,16,17,18];
const MATERIALS  = ['Zircone','E.max','PFM','Or','Résine','Composite','Céramique','PMMA','Titane'];

export default function SettingsPage() {
  const { theme: c, FS, t, settings, refreshSettings, labId, lab, pushNotif, fontFamily } = useApp();
  const [s, setS]           = useState(settings);
  const [types, setTypes]   = useState([]);
  const [newType, setNewType] = useState({ name:'', elems:1, price:0 });
  const [editType, setEditType] = useState(null);
  const [labName, setLabName] = useState(lab?.name || '');
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  useEffect(() => { setS({ ...settings }); setLabName(lab?.name||''); }, [settings, lab]);
  const reloadTypes = async () => { const { data } = await Types.list(); setTypes(data||[]); };
  useEffect(() => { reloadTypes(); }, []);

  // Load Google Font preview
  useEffect(() => {
    FONT_FAMILIES.forEach(f => {
      if (f.id === 'Inter') return;
      const id = 'gfont-prev-' + f.id.replace(/\s/g,'-');
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${f.id.replace(/ /g,'+')}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    });
  }, []);

  const saveSettings = async () => {
    await settingsApi.update(labId, {
      lang: s.lang, font_size: Number(s.font_size),
      theme_color: s.theme_color, currency: s.currency||'DZD',
      font_family: s.font_family||'Inter',
    });
    await refreshSettings();
    pushNotif?.('Paramètres sauvegardés', 'ok');
  };

  const saveLab = async () => {
    if (!lab) return;
    await Labs.update(lab.id, { name: labName });
    pushNotif?.('Nom du laboratoire mis à jour', 'ok');
  };

  const addType = async () => {
    if (!newType.name) return;
    await Types.create({ lab_id:labId, name:newType.name, elems:Number(newType.elems), price:Number(newType.price) });
    setNewType({ name:'', elems:1, price:0 }); reloadTypes();
    pushNotif?.(`Matériau "${newType.name}" ajouté`, 'ok');
  };
  const saveEditType = async () => {
    if (!editType?.name) return;
    await Types.update(editType.id, { name:editType.name, elems:Number(editType.elems), price:Number(editType.price) });
    setEditType(null); reloadTypes();
    pushNotif?.('Matériau mis à jour', 'ok');
  };
  const delType = async (id, name) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    await Types.delete(id); reloadTypes();
    pushNotif?.(`Matériau supprimé`, 'info');
  };

  // ── BACKUP ──
  const doBackup = async () => {
    setBackupBusy(true);
    try {
      const [cases, profs, stgs, tps, stock, suppliers, expenses, payments] = await Promise.all([
        supabase.from('cases').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('stages').select('*'),
        supabase.from('prosthesis_types').select('*'),
        supabase.from('stock').select('*'),
        supabase.from('suppliers').select('*, supplier_purchases(*), supplier_payments(*)'),
        supabase.from('expenses').select('*'),
        supabase.from('dentist_payments').select('*'),
      ]);
      const backup = {
        version: '1.4', date: new Date().toISOString(), lab_id: labId,
        cases: cases.data||[], profiles: profs.data||[], stages: stgs.data||[],
        types: tps.data||[], stock: stock.data||[], suppliers: suppliers.data||[],
        expenses: expenses.data||[], dentist_payments: payments.data||[],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `dentlab-backup-${today()}.json`; a.click();
      URL.revokeObjectURL(url);
      pushNotif?.('Sauvegarde téléchargée avec succès', 'ok');
    } catch (e) {
      pushNotif?.('Erreur de sauvegarde: ' + e.message, 'err');
    }
    setBackupBusy(false);
  };

  const doRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg('Lecture du fichier…');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.cases) throw new Error('Fichier de sauvegarde invalide');
      if (!confirm(`Restaurer ${data.cases.length} commandes depuis le ${data.date?.slice(0,10)} ?\n\n⚠️ Ceci va REMPLACER les données existantes.`)) {
        setRestoreMsg(''); return;
      }
      setRestoreMsg('Restauration en cours…');
      // Restore cases (upsert)
      if (data.cases?.length) {
        await supabase.from('cases').upsert(data.cases, { onConflict: 'lab_id,id' });
      }
      if (data.expenses?.length) {
        await supabase.from('expenses').upsert(data.expenses, { onConflict: 'id' });
      }
      if (data.stock?.length) {
        await supabase.from('stock').upsert(data.stock, { onConflict: 'id' });
      }
      setRestoreMsg(`✓ Restauration terminée — ${data.cases?.length||0} commandes restaurées`);
      pushNotif?.('Restauration terminée avec succès', 'ok');
    } catch (err) {
      setRestoreMsg('❌ Erreur: ' + err.message);
      pushNotif?.('Erreur de restauration', 'err');
    }
    e.target.value = '';
  };

  return (
    <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(320px,1fr))' }}>

      {/* Personalization */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>🎨 Personnalisation</div>
        <div style={{ display:'grid', gap:14 }}>

          {/* Font family */}
          <div>
            <Lbl>Police de caractères</Lbl>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:4 }}>
              {FONT_FAMILIES.map(f => (
                <button key={f.id} onClick={()=>setS({...s, font_family:f.id})}
                  style={{ padding:'8px 10px', borderRadius:8,
                    border:'2px solid '+((s.font_family||'Inter')===f.id?c.ac:c.bdr),
                    background:(s.font_family||'Inter')===f.id?c.acL:'#fff',
                    cursor:'pointer', textAlign:'left' }}>
                  <div style={{ fontFamily:`'${f.id}', sans-serif`, fontWeight:700, fontSize:FS, color:(s.font_family||'Inter')===f.id?c.ac:c.tx }}>{f.label}</div>
                  <div style={{ fontFamily:`'${f.id}', sans-serif`, fontSize:FS-4, color:c.txL }}>{f.sample}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div>
            <Lbl>Taille du texte — {s.font_size}px</Lbl>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
              {FONT_SIZES.map(sz=>(
                <button key={sz} onClick={()=>setS({...s,font_size:sz})}
                  style={{ width:42, height:42, borderRadius:8, border:'2px solid '+(Number(s.font_size)===sz?c.ac:c.bdr),
                    background:Number(s.font_size)===sz?c.acL:'#fff', color:Number(s.font_size)===sz?c.ac:c.tx,
                    cursor:'pointer', fontWeight:700, fontSize:sz, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Theme color */}
          <div>
            <Lbl>Couleur du thème</Lbl>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4 }}>
              <input type="color" value={s.theme_color} onChange={e=>setS({...s,theme_color:e.target.value})}
                style={{ width:50, height:40, border:'none', cursor:'pointer', borderRadius:6 }} />
              <Inp value={s.theme_color} onChange={e=>setS({...s,theme_color:e.target.value})} style={{ flex:1 }} />
            </div>
            <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
              {['#2D6A4F','#1D4ED8','#7C3AED','#DC2626','#D97706','#0891B2','#374151','#BE185D'].map(col=>(
                <button key={col} onClick={()=>setS({...s,theme_color:col})}
                  style={{ width:28, height:28, borderRadius:'50%', background:col, border:'3px solid '+(s.theme_color===col?'#000':'transparent'), cursor:'pointer' }} />
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <Lbl>Langue</Lbl>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
              {LANGS.map(L=>(
                <button key={L.code} onClick={()=>setS({...s,lang:L.code})}
                  style={{ padding:'6px 14px', borderRadius:999, border:'1px solid '+(s.lang===L.code?c.ac:c.bdr),
                    background:s.lang===L.code?c.acL:'#fff', color:c.tx, cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>
                  {L.flag} {L.label}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <Lbl>Monnaie</Lbl>
            <select value={s.currency||'DZD'} onChange={e=>setS({...s,currency:e.target.value})}
              style={{ width:'100%', padding:9, border:'1px solid '+c.bdr, borderRadius:7, background:'#fff', fontSize:FS-1, fontFamily:'inherit' }}>
              {CURRENCIES.map(cc=><option key={cc.code} value={cc.code}>{cc.label}</option>)}
            </select>
          </div>

          <Btn primary onClick={saveSettings}>💾 Sauvegarder les paramètres</Btn>
        </div>
      </Card>

      {/* Lab */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>🏢 Laboratoire</div>
        <div><Lbl>Nom du laboratoire</Lbl><Inp value={labName} onChange={e=>setLabName(e.target.value)} /></div>
        <Btn primary onClick={saveLab} style={{ marginTop:10 }}>💾 Sauvegarder</Btn>
      </Card>

      {/* Matériaux */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>🦷 Types de prothèse</div>
        {types.length===0 && <div style={{ color:c.txL, fontSize:FS-2, marginBottom:8 }}>Aucun type — ajoutez ci-dessous</div>}
        {types.map(tp=>(
          <div key={tp.id} style={{ display:'flex', gap:6, alignItems:'center', padding:'7px 0', borderBottom:'1px solid '+c.bdrL }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:FS-1 }}>{tp.name}</div>
              <div style={{ fontSize:FS-3, color:c.txL }}>{tp.elems} él. · {tp.price} DA/u</div>
            </div>
            <Btn sm onClick={()=>setEditType({...tp})}>✏️</Btn>
            <Btn sm onClick={()=>delType(tp.id,tp.name)} style={{ color:c.dng }}>🗑</Btn>
          </div>
        ))}
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:FS-3, fontWeight:700, color:c.txL, marginBottom:6 }}>➕ AJOUTER UN TYPE</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:6 }}>
            <Inp placeholder="Nom (ex: Couronne)" value={newType.name} onChange={e=>setNewType({...newType,name:e.target.value})} onKeyDown={e=>e.key==='Enter'&&addType()} />
            <Inp type="number" placeholder="Él." min="1" value={newType.elems} onChange={e=>setNewType({...newType,elems:e.target.value})} />
            <Inp type="number" placeholder="Prix" min="0" value={newType.price} onChange={e=>setNewType({...newType,price:e.target.value})} />
            <Btn primary onClick={addType}>{Plus}</Btn>
          </div>
          <div style={{ fontSize:FS-4, color:c.txL, marginTop:4 }}>Nom · Nbre éléments · Prix unitaire (DA)</div>
        </div>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>💾 Sauvegarde & Restauration</div>
        <div style={{ display:'grid', gap:12 }}>
          <div>
            <div style={{ fontSize:FS-2, fontWeight:600, marginBottom:6 }}>📥 Sauvegarder les données</div>
            <div style={{ fontSize:FS-3, color:c.txL, marginBottom:8 }}>
              Télécharge un fichier JSON avec toutes vos commandes, stock, dépenses et fournisseurs.
            </div>
            <Btn primary onClick={doBackup} disabled={backupBusy}>
              {backupBusy ? '⏳ En cours…' : '⬇️ Télécharger la sauvegarde'}
            </Btn>
          </div>
          <div style={{ borderTop:'1px solid '+c.bdrL, paddingTop:12 }}>
            <div style={{ fontSize:FS-2, fontWeight:600, marginBottom:6 }}>📤 Restaurer une sauvegarde</div>
            <div style={{ fontSize:FS-3, color:c.txL, marginBottom:8 }}>
              ⚠️ La restauration remplace les données existantes. Faites une sauvegarde d'abord.
            </div>
            <label style={{ display:'inline-block', padding:'8px 16px', background:c.bg, border:'2px dashed '+c.bdr, borderRadius:8, cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>
              📂 Choisir un fichier .json
              <input type="file" accept=".json" onChange={doRestore} style={{ display:'none' }} />
            </label>
            {restoreMsg && (
              <div style={{ marginTop:8, padding:8, background:restoreMsg.startsWith('✓')?c.acL:'#FEF2F2',
                color:restoreMsg.startsWith('✓')?c.ac:c.dng, borderRadius:6, fontSize:FS-2 }}>
                {restoreMsg}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Edit type modal */}
      {editType && (
        <Modal onClose={()=>setEditType(null)} w={400}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>✏️ Modifier le type</div>
          <div style={{ display:'grid', gap:10 }}>
            <div><Lbl>Nom</Lbl><Inp value={editType.name} onChange={e=>setEditType({...editType,name:e.target.value})} /></div>
            <div><Lbl>Éléments par défaut</Lbl><Inp type="number" min="1" value={editType.elems} onChange={e=>setEditType({...editType,elems:e.target.value})} /></div>
            <div><Lbl>Prix unitaire (DA)</Lbl><Inp type="number" min="0" value={editType.price} onChange={e=>setEditType({...editType,price:e.target.value})} /></div>
          </div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>setEditType(null)}>Annuler</Btn>
            <Btn primary onClick={saveEditType}>Enregistrer</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
