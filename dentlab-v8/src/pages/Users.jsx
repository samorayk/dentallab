import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { profiles as Profiles, stages as Stages } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Btn, Inp, Sel, Card, Modal, Lbl, Av, Plus } from '../components/UI';

const ROLE_ICONS = { admin:'👑', dentist:'🦷', technician:'🔧' };
const ROLE_COLORS = { admin:'#7C3AED', dentist:'#2563EB', technician:'#059669' };

export default function UsersPage() {
  const { theme: c, FS, t, labId, pushNotif } = useApp();
  const [list, setList]       = useState([]);
  const [stgs, setStgs]       = useState([]);
  const [form, setForm]       = useState(null);
  const [pwdForm, setPwdForm] = useState(null);
  const [info, setInfo]       = useState('');
  const [pwdInfo, setPwdInfo] = useState('');
  const [pwdVisible, setPwdVisible] = useState(false);
  const [filterRole, setFilterRole] = useState('all');

  const reload = async () => {
    const [{ data: p }, { data: s }] = await Promise.all([Profiles.list(), Stages.list()]);
    setList(p||[]); setStgs(s||[]);
  };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    setInfo('');
    if (!form.name) return setInfo('Nom requis');
    if (form.id) {
      await Profiles.update(form.id, {
        name:form.name, role:form.role, phone:form.phone,
        clinic:form.clinic, stages:form.stages||[], color:form.color||'#2D6A4F',
        avatar:(form.name[0]||'U').toUpperCase(),
      });
      // Update email if changed
      if (form.newEmail && form.newEmail !== form._originalEmail) {
        const sk = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        const su = import.meta.env.VITE_SUPABASE_URL;
        if (sk && su) {
          try {
            await fetch(`${su}/auth/v1/admin/users/${form.id}`, {
              method:'PUT',
              headers:{ 'Content-Type':'application/json', 'apikey':sk, 'Authorization':`Bearer ${sk}` },
              body: JSON.stringify({ email:form.newEmail }),
            });
          } catch(_) {}
        }
      }
      setInfo('✓ Profil mis à jour');
      pushNotif?.(`Utilisateur ${form.name} mis à jour`, 'ok');
      reload();
      setTimeout(()=>{ setForm(null); setInfo(''); }, 1800);
    } else {
      if (!form.email) return setInfo('Email requis');
      const pwd = 'Lab'+Math.random().toString(36).slice(2,7).toUpperCase()+'!';
      const { data, error } = await supabase.auth.signUp({
        email:form.email, password:pwd,
        options:{ data:{ role:form.role, name:form.name } },
      });
      if (error) return setInfo(error.message);
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:data.user.id, lab_id:labId, role:form.role, name:form.name,
          phone:form.phone, clinic:form.clinic, stages:form.stages||[], color:form.color||'#2D6A4F',
          avatar:(form.name[0]||'U').toUpperCase(),
        });
      }
      setInfo(`✓ Compte créé.\n📧 Email: ${form.email}\n🔑 Mot de passe temporaire: ${pwd}`);
      pushNotif?.(`Compte créé pour ${form.name}`, 'ok');
      reload();
    }
  };

  const del = async (p) => {
    const roleLabel = p.role === 'dentist' ? 'dentiste' : p.role === 'technician' ? 'technicien' : 'admin';
    if (!confirm(`Supprimer le ${roleLabel} "${p.name}" ?\n\nSes commandes et données associées resteront dans le système.`)) return;
    const { error } = await Profiles.delete(p.id);
    if (error) { pushNotif?.('Erreur suppression: '+error.message, 'err'); return; }
    pushNotif?.(`${p.name} supprimé`, 'info');
    reload();
  };

  const changePassword = async () => {
    setPwdInfo('');
    if (!pwdForm.newPwd) return setPwdInfo('Mot de passe requis');
    if (pwdForm.newPwd.length < 6) return setPwdInfo('Minimum 6 caractères');
    if (pwdForm.newPwd !== pwdForm.confirmPwd) return setPwdInfo('Les mots de passe ne correspondent pas');
    const sk = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    const su = import.meta.env.VITE_SUPABASE_URL;
    if (!sk||!su) {
      setPwdInfo(`📋 Communiquer manuellement:\n🔑 ${pwdForm.newPwd}\n\n⚠ Ajoutez VITE_SUPABASE_SERVICE_ROLE_KEY dans Vercel`);
      return;
    }
    try {
      const res = await fetch(`${su}/auth/v1/admin/users/${pwdForm.userId}`, {
        method:'PUT',
        headers:{ 'Content-Type':'application/json', 'apikey':sk, 'Authorization':`Bearer ${sk}` },
        body: JSON.stringify({ password:pwdForm.newPwd }),
      });
      if (!res.ok) { const e=await res.json(); throw new Error(e.message||`Erreur ${res.status}`); }
      setPwdInfo(`✓ Mot de passe mis à jour pour ${pwdForm.name} !`);
      pushNotif?.('Mot de passe mis à jour', 'ok');
      setTimeout(()=>{ setPwdForm(null); setPwdInfo(''); }, 2000);
    } catch(e) { setPwdInfo(`❌ ${e.message}`); }
  };

  const generatePwd = () => {
    const pwd = 'Lab'+Math.random().toString(36).slice(2,7).toUpperCase()+Math.floor(Math.random()*90+10)+'!';
    setPwdForm(p=>({...p, newPwd:pwd, confirmPwd:pwd}));
    setPwdInfo(`💡 Mot de passe généré: ${pwd}`);
  };

  const ROLES = ['all','dentist','technician','admin'];
  const filteredList = filterRole==='all' ? list : list.filter(p=>p.role===filterRole);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <Btn primary onClick={()=>{ setInfo(''); setForm({ email:'', name:'', role:'dentist', phone:'', clinic:'', stages:[], color:'#2D6A4F' }); }}>
          {Plus} Ajouter utilisateur
        </Btn>
        {/* Role filter */}
        <div style={{ display:'flex', gap:4 }}>
          {ROLES.map(r=>(
            <button key={r} onClick={()=>setFilterRole(r)}
              style={{ padding:'5px 12px', borderRadius:999, border:'1px solid '+(filterRole===r?c.ac:c.bdr),
                background:filterRole===r?c.acL:'transparent', color:filterRole===r?c.ac:c.tx,
                cursor:'pointer', fontSize:FS-2, fontWeight:600 }}>
              {r==='all'?'Tous':r==='dentist'?'🦷 Dentistes':r==='technician'?'🔧 Techniciens':'👑 Admins'}
              <span style={{ marginLeft:4, fontSize:FS-4, opacity:0.7 }}>
                ({r==='all'?list.length:list.filter(p=>p.role===r).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {filteredList.length===0 && <div style={{ padding:20, textAlign:'center', color:c.txL }}>Aucun utilisateur</div>}
        {filteredList.map(p=>(
          <div key={p.id} style={{ padding:'12px 14px', borderBottom:'1px solid '+c.bdrL, display:'flex', gap:10, alignItems:'center' }}>
            <Av u={p} sz={40} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontWeight:700, fontSize:FS }}>{p.name}</span>
                <span style={{ fontSize:FS-4, fontWeight:700, color:ROLE_COLORS[p.role]||c.txL,
                  background:ROLE_COLORS[p.role]+'20', padding:'1px 7px', borderRadius:999 }}>
                  {ROLE_ICONS[p.role]} {t(p.role)}
                </span>
              </div>
              <div style={{ fontSize:FS-3, color:c.txL, marginTop:2 }}>
                {p.phone||'—'} {p.clinic?' · '+p.clinic:''}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
              <Btn sm onClick={()=>{ setInfo(''); setForm({...p, newEmail:'', _originalEmail:p.email||''}); }}>✏️</Btn>
              <Btn sm onClick={()=>{ setPwdInfo(''); setPwdForm({ userId:p.id, name:p.name, newPwd:'', confirmPwd:'' }); }}
                style={{ background:'#FEF3C7', color:'#92400E', border:'1px solid #FDE68A' }}>🔑</Btn>
              <button onClick={()=>del(p)}
                style={{ background:'none', border:'1px solid '+c.dng, color:c.dng, borderRadius:6,
                  padding:'4px 10px', cursor:'pointer', fontSize:FS-2, fontWeight:700 }}
                title={`Supprimer ${p.role==='dentist'?'le dentiste':p.role==='technician'?'le technicien':'l\'admin'}`}>
                🗑
              </button>
            </div>
          </div>
        ))}
      </Card>

      {/* User form */}
      {form && (
        <Modal onClose={()=>{ setForm(null); setInfo(''); }} w={520}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:12 }}>
            {form.id?'✏️ Modifier':'➕ Ajouter'} utilisateur
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><Lbl>Nom *</Lbl><Inp value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            {!form.id
              ? <div><Lbl>Email *</Lbl><Inp type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              : <div><Lbl>Nouvel email (optionnel)</Lbl><Inp type="email" placeholder="Laisser vide pour ne pas changer" value={form.newEmail||''} onChange={e=>setForm({...form,newEmail:e.target.value})} /></div>
            }
            <div>
              <Lbl>Rôle</Lbl>
              <Sel value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                <option value="dentist">🦷 Dentiste</option>
                <option value="technician">🔧 Technicien</option>
                <option value="admin">👑 Admin</option>
              </Sel>
            </div>
            <div><Lbl>Téléphone</Lbl><Inp value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            {form.role==='dentist' && (
              <div style={{ gridColumn:'1/-1' }}>
                <Lbl>Cabinet</Lbl><Inp value={form.clinic||''} onChange={e=>setForm({...form,clinic:e.target.value})} />
              </div>
            )}
            {form.role==='technician' && (
              <div style={{ gridColumn:'1/-1' }}>
                <Lbl>Étapes prises en charge</Lbl>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                  {stgs.filter(s=>s.id!=='attente'&&s.id!=='termine').map(s=>{
                    const on=(form.stages||[]).includes(s.id);
                    return <button key={s.id} type="button"
                      onClick={()=>setForm({...form, stages:on?form.stages.filter(x=>x!==s.id):[...(form.stages||[]),s.id]})}
                      style={{ padding:'5px 12px', borderRadius:999, border:'1px solid '+(on?c.ac:c.bdr),
                        background:on?c.acL:'#fff', color:on?c.ac:c.tx, cursor:'pointer', fontSize:FS-3, fontWeight:600 }}>
                      {s.label}
                    </button>;
                  })}
                </div>
              </div>
            )}
          </div>
          {info && (
            <div style={{ marginTop:10, padding:12, background:info.startsWith('✓')?c.acL:'#FEF2F2',
              color:info.startsWith('✓')?c.ac:c.dng, borderRadius:8, fontSize:FS-2, whiteSpace:'pre-line', lineHeight:1.7 }}>
              {info}
            </div>
          )}
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>{ setForm(null); setInfo(''); }}>Annuler</Btn>
            <Btn primary onClick={save}>Enregistrer</Btn>
          </div>
        </Modal>
      )}

      {/* Password modal */}
      {pwdForm && (
        <Modal onClose={()=>{ setPwdForm(null); setPwdInfo(''); }} w={420}>
          <div style={{ fontSize:FS+1, fontWeight:700, marginBottom:4 }}>🔑 Changer mot de passe</div>
          <div style={{ fontSize:FS-2, color:c.txL, marginBottom:14, padding:'6px 10px', background:c.bg, borderRadius:6 }}>
            Utilisateur : <strong>{pwdForm.name}</strong>
          </div>
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <Lbl>Nouveau mot de passe</Lbl>
              <div style={{ position:'relative' }}>
                <Inp type={pwdVisible?'text':'password'} placeholder="Minimum 6 caractères"
                  value={pwdForm.newPwd} onChange={e=>setPwdForm({...pwdForm,newPwd:e.target.value})} />
                <button type="button" onClick={()=>setPwdVisible(v=>!v)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:c.txL }}>
                  {pwdVisible?'🙈':'👁'}
                </button>
              </div>
            </div>
            <div><Lbl>Confirmer</Lbl>
              <Inp type={pwdVisible?'text':'password'} placeholder="Répéter" value={pwdForm.confirmPwd}
                onChange={e=>setPwdForm({...pwdForm,confirmPwd:e.target.value})} />
            </div>
            <Btn sm onClick={generatePwd} style={{ width:'fit-content' }}>🎲 Générer automatiquement</Btn>
          </div>
          {pwdInfo && (
            <div style={{ marginTop:12, padding:12,
              background:pwdInfo.startsWith('✓')?'#D1FAE5':pwdInfo.startsWith('💡')?'#FEF3C7':'#EFF6FF',
              color:pwdInfo.startsWith('✓')?'#065F46':pwdInfo.startsWith('💡')?'#92400E':'#1E40AF',
              borderRadius:8, fontSize:FS-2, whiteSpace:'pre-line', lineHeight:1.7 }}>
              {pwdInfo}
            </div>
          )}
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:14 }}>
            <Btn onClick={()=>{ setPwdForm(null); setPwdInfo(''); }}>Annuler</Btn>
            <Btn primary onClick={changePassword}>Mettre à jour</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
