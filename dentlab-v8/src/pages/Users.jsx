import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { profiles as Profiles, stages as Stages } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Btn, Inp, Sel, Card, Modal, Lbl, Av, Plus } from '../components/UI';

export default function UsersPage() {
  const { theme: c, FS, t, labId } = useApp();
  const [list, setList] = useState([]);
  const [stgs, setStgs] = useState([]);
  const [form, setForm] = useState(null);
  const [info, setInfo] = useState('');

  const reload = async () => {
    const [{ data: p }, { data: s }] = await Promise.all([Profiles.list(), Stages.list()]);
    setList(p || []); setStgs(s || []);
  };
  useEffect(() => { reload(); }, []);

  // Invite a user: we sign them up with a temporary password, admin communicates credentials.
  // For production, use supabase.auth.admin.inviteUserByEmail() via edge function (requires service key).
  const save = async () => {
    setInfo('');
    if (!form.name || !form.email) return setInfo('Nom et email requis');
    if (form.id) {
      await Profiles.update(form.id, {
        name: form.name, role: form.role, phone: form.phone,
        clinic: form.clinic, stages: form.stages, color: form.color,
        avatar: (form.name[0] || 'U').toUpperCase(),
      });
      setForm(null); reload();
    } else {
      // Create auth user via signUp (email confirmation required)
      const pwd = 'Temp' + Math.random().toString(36).slice(2, 8) + '!';
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: pwd,
        options: { data: { role: form.role, name: form.name } },
      });
      if (error) return setInfo(error.message);
      // Insert profile directly (trigger only fires for admin role)
      if (data.user) {
        await Profiles.update(data.user.id, {}); // ensure profile exists or we insert
        // If signup didn't create profile (non-admin), insert it now:
        await supabase.from('profiles').upsert({
          id: data.user.id, lab_id: labId, role: form.role, name: form.name,
          phone: form.phone, clinic: form.clinic, stages: form.stages, color: form.color,
          avatar: (form.name[0] || 'U').toUpperCase(),
        });
      }
      setInfo(`✓ Compte créé. Mot de passe temporaire: ${pwd} (à communiquer à l'utilisateur)`);
      reload();
    }
  };

  const del = async (p) => {
    if (!confirm('Supprimer ?')) return;
    await Profiles.delete(p.id);
    reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Btn primary onClick={() => setForm({ email: '', name: '', role: 'dentist', phone: '', clinic: '', stages: [], color: '#2D6A4F' })}>{Plus} Utilisateur</Btn>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {list.map(p => (
          <div key={p.id} style={{ padding: '10px 14px', borderBottom: '1px solid ' + c.bdrL, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Av u={p} sz={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: FS - 3, color: c.txL }}>{t(p.role)} · {p.phone || '—'}</div>
            </div>
            <Btn sm onClick={() => setForm(p)}>✏️</Btn>
            <Btn sm onClick={() => del(p)} style={{ color: c.dng }}>🗑</Btn>
          </div>
        ))}
      </Card>
      {form && (
        <Modal onClose={() => { setForm(null); setInfo(''); }} w={500}>
          <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>{form.id ? t('edit') : t('add')} utilisateur</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><Lbl>Nom</Lbl><Inp value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Lbl>Email</Lbl><Inp type="email" value={form.email || ''} disabled={!!form.id} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Lbl>{t('role')}</Lbl>
              <Sel value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="dentist">{t('dentist')}</option>
                <option value="technician">{t('technician')}</option>
                <option value="admin">{t('admin')}</option>
              </Sel>
            </div>
            <div><Lbl>Téléphone</Lbl><Inp value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            {form.role === 'dentist' && <div style={{ gridColumn: '1/-1' }}><Lbl>Cabinet</Lbl><Inp value={form.clinic || ''} onChange={e => setForm({ ...form, clinic: e.target.value })} /></div>}
            {form.role === 'technician' && (
              <div style={{ gridColumn: '1/-1' }}>
                <Lbl>Étapes prises en charge</Lbl>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {stgs.filter(s => s.id !== 'attente' && s.id !== 'termine').map(s => {
                    const on = (form.stages || []).includes(s.id);
                    return <button key={s.id} type="button" onClick={() => setForm({ ...form, stages: on ? form.stages.filter(x => x !== s.id) : [...(form.stages || []), s.id] })}
                      style={{ padding: '5px 10px', borderRadius: 999, border: '1px solid ' + (on ? c.ac : c.bdr), background: on ? c.acL : '#fff', color: on ? c.ac : c.tx, cursor: 'pointer', fontSize: FS - 3, fontWeight: 600 }}>{s.label}</button>;
                  })}
                </div>
              </div>
            )}
          </div>
          {info && <div style={{ marginTop: 10, padding: 8, background: info.startsWith('✓') ? c.acL : '#FEF2F2', color: info.startsWith('✓') ? c.ac : c.dng, borderRadius: 6, fontSize: FS - 2 }}>{info}</div>}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14 }}>
            <Btn onClick={() => { setForm(null); setInfo(''); }}>{t('cancel')}</Btn>
            <Btn primary onClick={save}>{t('save')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
