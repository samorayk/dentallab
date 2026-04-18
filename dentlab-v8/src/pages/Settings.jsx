import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { settingsApi, types as Types, labs as Labs } from '../lib/db';
import { Btn, Inp, Card, Lbl, Plus, Modal } from '../components/UI';
import { LANGS } from '../i18n';
import { CURRENCIES } from '../lib/helpers';

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18];

export default function SettingsPage() {
  const { theme: c, FS, t, settings, refreshSettings, labId, lab } = useApp();
  const [s, setS]           = useState(settings);
  const [types, setTypes]   = useState([]);
  const [newType, setNewType] = useState({ name:'', elems:1, price:0 });
  const [editType, setEditType] = useState(null);
  const [labName, setLabName] = useState(lab?.name || '');

  useEffect(() => { setS(settings); setLabName(lab?.name || ''); }, [settings, lab]);
  const reloadTypes = async () => { const { data } = await Types.list(); setTypes(data || []); };
  useEffect(() => { reloadTypes(); }, []);

  const saveSettings = async () => {
    await settingsApi.update(labId, { lang:s.lang, font_size:Number(s.font_size), theme_color:s.theme_color, currency:s.currency||'DZD' });
    await refreshSettings();
    alert('✓ Paramètres sauvegardés');
  };
  const saveLab = async () => {
    if (!lab) return;
    await Labs.update(lab.id, { name:labName });
    alert('✓ Nom mis à jour');
  };

  const addType = async () => {
    if (!newType.name) return;
    await Types.create({ lab_id:labId, name:newType.name, elems:Number(newType.elems), price:Number(newType.price) });
    setNewType({ name:'', elems:1, price:0 });
    reloadTypes();
  };
  const saveEditType = async () => {
    if (!editType?.name) return;
    await Types.update(editType.id, { name:editType.name, elems:Number(editType.elems), price:Number(editType.price) });
    setEditType(null); reloadTypes();
  };
  const delType = async (id) => {
    if (!confirm('Supprimer ce matériau ?')) return;
    await Types.delete(id); reloadTypes();
  };

  return (
    <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit, minmax(320px,1fr))' }}>

      {/* Personalization */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>🎨 Personnalisation</div>
        <div style={{ display:'grid', gap:12 }}>

          {/* Font size — list of sizes */}
          <div>
            <Lbl>Taille du texte</Lbl>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
              {FONT_SIZES.map(sz => (
                <button key={sz} onClick={() => setS({...s, font_size:sz})}
                  style={{ width:42, height:42, borderRadius:8, border:'1px solid '+(Number(s.font_size)===sz?c.ac:c.bdr),
                    background:Number(s.font_size)===sz?c.acL:'#fff', color:Number(s.font_size)===sz?c.ac:c.tx,
                    cursor:'pointer', fontWeight:700, fontSize:sz, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {sz}
                </button>
              ))}
            </div>
            <div style={{ fontSize:FS-3, color:c.txL, marginTop:4 }}>Taille actuelle : {s.font_size}px</div>
          </div>

          {/* Theme color */}
          <div>
            <Lbl>Couleur du thème</Lbl>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:4 }}>
              <input type="color" value={s.theme_color} onChange={e=>setS({...s,theme_color:e.target.value})}
                style={{ width:50, height:40, border:'none', cursor:'pointer', borderRadius:6 }} />
              <Inp value={s.theme_color} onChange={e=>setS({...s,theme_color:e.target.value})} style={{ flex:1 }} />
            </div>
            {/* Quick color presets */}
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              {['#2D6A4F','#1D4ED8','#7C3AED','#DC2626','#D97706','#0891B2','#374151'].map(col=>(
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

          <Btn primary onClick={saveSettings}>💾 Sauvegarder</Btn>
        </div>
      </Card>

      {/* Lab info */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>🏢 Laboratoire</div>
        <div><Lbl>Nom du laboratoire</Lbl><Inp value={labName} onChange={e=>setLabName(e.target.value)} /></div>
        <Btn primary onClick={saveLab} style={{ marginTop:10 }}>💾 Sauvegarder</Btn>
      </Card>

      {/* Matériaux / Types de prothèse — full CRUD */}
      <Card>
        <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>🦷 Matériaux / Types de prothèse</div>

        {types.length===0 && <div style={{ color:c.txL, fontSize:FS-2, marginBottom:8 }}>Aucun matériau</div>}
        {types.map(tp=>(
          <div key={tp.id} style={{ display:'flex', gap:6, alignItems:'center', padding:'7px 0', borderBottom:'1px solid '+c.bdrL }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:FS-1 }}>{tp.name}</div>
              <div style={{ fontSize:FS-3, color:c.txL }}>{tp.elems} élément{tp.elems>1?'s':''} · {tp.price} DA/u</div>
            </div>
            <Btn sm onClick={()=>setEditType({...tp})}>✏️</Btn>
            <Btn sm onClick={()=>delType(tp.id)} style={{ color:c.dng }}>🗑</Btn>
          </div>
        ))}

        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:FS-3, fontWeight:700, color:c.txL, marginBottom:6 }}>➕ AJOUTER</div>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:6 }}>
            <Inp placeholder="Nom du matériau" value={newType.name} onChange={e=>setNewType({...newType,name:e.target.value})}
              onKeyDown={e=>e.key==='Enter'&&addType()} />
            <Inp type="number" placeholder="Él." min="1" value={newType.elems} onChange={e=>setNewType({...newType,elems:e.target.value})} />
            <Inp type="number" placeholder="Prix" min="0" value={newType.price} onChange={e=>setNewType({...newType,price:e.target.value})} />
            <Btn primary onClick={addType}>{Plus}</Btn>
          </div>
          <div style={{ fontSize:FS-4, color:c.txL, marginTop:4 }}>Nom · Nbre éléments · Prix unitaire</div>
        </div>
      </Card>

      {/* Edit modal */}
      {editType && (
        <Modal onClose={()=>setEditType(null)} w={400}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>✏️ Modifier le matériau</div>
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
