import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { profiles as Profiles, stages as Stages } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Btn, Inp, Sel, Card, Modal, Lbl, Av, Plus } from '../components/UI';

export default function UsersPage() {
  const { theme: c, FS, t, labId } = useApp();
  const [list, setList]   = useState([]);
  const [stgs, setStgs]   = useState([]);
  const [form, setForm]   = useState(null);
  const [pwdForm, setPwdForm] = useState(null); // { userId, name, newPwd, confirmPwd }
  const [info, setInfo]   = useState('');
  const [pwdInfo, setPwdInfo] = useState('');

  const reload = async () => {
    const [{ data: p }, { data: s }] = await Promise.all([Profiles.list(), Stages.list()]);
    setList(p || []); setStgs(s || []);
  };
  useEffect(() => { reload(); }, []);

  const save = async () => {
    setInfo('');
    if (!form.name || !form.email) return setInfo('Nom et email requis');
    if (form.id) {
      // Edit existing user profile
      await Profiles.update(form.id, {
        name: form.name, role: form.role, phone: form.phone,
        clinic: form.clinic, stages: form.stages, color: form.color,
        avatar: (form.name[0] || 'U').toUpperCase(),
      });
      setForm(null); reload();
    } else {
      // Create new user
      const pwd = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: pwd,
        options: { data: { role: form.role, name: form.name } },
      });
      if (error) return setInfo(error.message);
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id, lab_id: labId, role: form.role, name: form.name,
          phone: form.phone, clinic: form.clinic, stages: form.stages, color: form.color,
          avatar: (form.name[0] || 'U').toUpperCase(),
        });
      }
      setInfo(`✓ Compte créé. Mot de passe temporaire: ${pwd}`);
      reload();
    }
  };

  const del = async (p) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await Profiles.delete(p.id);
    reload();
  };

  // Change password — uses Supabase Admin API via edge function if available,
  // otherwise generates a reset email or shows new temp password.
  const changePassword = async () => {
    setPwdInfo('');
    if (!pwdForm.newPwd) return setPwdInfo('Mot de passe requis');
    if (pwdForm.newPwd.length < 6) return setPwdInfo('Minimum 6 caractères');
    if (pwdForm.newPwd !== pwdForm.confirmPwd) return setPwdInfo('Les mots de passe ne correspondent pas');

    // Try admin update via edge function (requires service_role key on backend)
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-update-user', {
        body: { userId: pwdForm.userId, password: pwdForm.newPwd },
      });
      if (!fnError && fnData?.success) {
        setPwdInfo(`✓ Mot de passe mis à jour pour ${pwdForm.name}`);
        setTimeout(() => { setPwdForm(null); setPwdInfo(''); }, 2000);
        return;
      }
    } catch (_) {}

    // Fallback: send password reset email
    try {
      const user = list.find(u => u.id === pwdForm.userId);
      if (user) {
        // We can't get the email directly from profiles, show instructions
        setPwdInfo(`⚠ Fonction admin non disponible. Nouveau mot de passe suggéré: ${pwdForm.newPwd}\nCommuniquez-le manuellement à l'utilisateur, ou configurez l'Edge Function "admin-update-user".`);
      }
    } catch (_) {
      setPwdInfo('Erreur lors de la mise à jour');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Btn primary onClick={() => { setInfo(''); setForm({ email:'', name:'', role:'dentist', phone:'', clinic:'', stages:[], color:'#2D6A4F' }); }}>{Plus} Utilisateur</Btn>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {list.map(p => (
          <div key={p.id} style={{ padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Av u={p} sz={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: FS - 3, color: c.txL }}>{t(p.role)} · {p.phone || '—'} {p.clinic ? '· ' + p.clinic : ''}</div>
            </div>
            <Btn sm onClick={() => { setInfo(''); setForm({ ...p, email: p.email || '' }); }}>✏️ Modifier</Btn>
            <Btn sm onClick={() => { setPwdInfo(''); setPwdForm({ userId: p.id, name: p.name, newPwd: '', confirmPwd: '' }); }}
              style={{ color: c.warn }}>🔑 MDP</Btn>
            <Btn sm onClick={() => del(p)} style={{ color: c.dng }}>🗑</Btn>
          </div>
        ))}
      </Card>

      {/* User Form */}
      {form && (
        <Modal onClose={() => { setForm(null); setInfo(''); }} w={520}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>{form.id ? t('edit') : t('add')} utilisateur</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><Lbl>Nom</Lbl><Inp value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Lbl>Email</Lbl>
              <Inp type="email" value={form.email || ''} disabled={!!form.id} onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ opacity: form.id ? 0.6 : 1 }} />
            </div>
            <div>
              <Lbl>{t('role')}</Lbl>
              <Sel value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="dentist">{t('dentist')}</option>
                <option value="technician">{t('technician')}</option>
                <option value="admin">{t('admin')}</option>
              </Sel>
            </div>
            <div><Lbl>Téléphone</Lbl><Inp value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            {form.role === 'dentist' && (
              <div style={{ gridColumn: '1/-1' }}>
                <Lbl>Cabinet</Lbl><Inp value={form.clinic || ''} onChange={e => setForm({ ...form, clinic: e.target.value })} />
              </div>
            )}
            {form.role === 'technician' && (
              <div style={{ gridColumn: '1/-1' }}>
                <Lbl>Étapes prises en charge</Lbl>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {stgs.filter(s => s.id !== 'attente' && s.id !== 'termine').map(s => {
                    const on = (form.stages || []).includes(s.id);
                    return (
                      <button key={s.id} type="button"
                        onClick={() => setForm({ ...form, stages: on ? form.stages.filter(x => x !== s.id) : [...(form.stages || []), s.id] })}
                        style={{ padding: '5px 10px', borderRadius: 999, border: '1px solid ' + (on ? c.ac : c.bdr), background: on ? c.acL : '#fff', color: on ? c.ac : c.tx, cursor: 'pointer', fontSize: FS - 3, fontWeight: 600 }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {info && (
            <div style={{ marginTop: 10, padding: 10, background: info.startsWith('✓') ? c.acL : '#FEF2F2', color: info.startsWith('✓') ? c.ac : c.dng, borderRadius: 6, fontSize: FS - 2, whiteSpace: 'pre-line' }}>
              {info}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => { setForm(null); setInfo(''); }}>{t('cancel')}</Btn>
            <Btn primary onClick={save}>{t('save')}</Btn>
          </div>
        </Modal>
      )}

      {/* Password Change Modal */}
      {pwdForm && (
        <Modal onClose={() => { setPwdForm(null); setPwdInfo(''); }} w={420}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 4 }}>🔑 Changer le mot de passe</div>
          <div style={{ fontSize: FS - 2, color: c.txL, marginBottom: 12 }}>Utilisateur: <strong>{pwdForm.name}</strong></div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <Lbl>Nouveau mot de passe</Lbl>
              <Inp type="password" placeholder="Minimum 6 caractères" value={pwdForm.newPwd}
                onChange={e => setPwdForm({ ...pwdForm, newPwd: e.target.value })} />
            </div>
            <div>
              <Lbl>Confirmer le mot de passe</Lbl>
              <Inp type="password" placeholder="Répéter le mot de passe" value={pwdForm.confirmPwd}
                onChange={e => setPwdForm({ ...pwdForm, confirmPwd: e.target.value })} />
            </div>
            {/* Quick generate button */}
            <Btn sm onClick={() => {
              const pwd = 'Lab' + Math.random().toString(36).slice(2, 8).toUpperCase() + '!';
              setPwdForm({ ...pwdForm, newPwd: pwd, confirmPwd: pwd });
              setPwdInfo(`Mot de passe généré: ${pwd}`);
            }}>🎲 Générer automatiquement</Btn>
          </div>
          {pwdInfo && (
            <div style={{ marginTop: 10, padding: 10, background: pwdInfo.startsWith('✓') ? c.acL : pwdInfo.startsWith('⚠') ? '#FFFBEB' : '#FEF2F2',
              color: pwdInfo.startsWith('✓') ? c.ac : pwdInfo.startsWith('⚠') ? '#92400E' : c.dng,
              borderRadius: 6, fontSize: FS - 2, whiteSpace: 'pre-line' }}>
              {pwdInfo}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => { setPwdForm(null); setPwdInfo(''); }}>Annuler</Btn>
            <Btn primary onClick={changePassword}>Mettre à jour</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
