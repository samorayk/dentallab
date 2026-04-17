import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { profiles as Profiles } from '../lib/db';
import { Btn, Inp, Card, Lbl, Av } from '../components/UI';

export default function ProfilePage() {
  const { theme: c, FS, t, profile, refreshProfile, signOut } = useApp();
  const [f, setF] = useState({ name: profile.name, phone: profile.phone || '', clinic: profile.clinic || '', color: profile.color });
  const save = async () => {
    await Profiles.update(profile.id, { ...f, avatar: (f.name[0] || 'U').toUpperCase() });
    await refreshProfile();
    alert('✓');
  };
  return (
    <Card style={{ maxWidth: 500, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'inline-block' }}><Av u={{ ...profile, ...f, name: f.name }} sz={72} /></div>
        <div style={{ fontWeight: 700, fontSize: FS + 2, marginTop: 6 }}>{f.name}</div>
        <div style={{ color: c.txL, fontSize: FS - 2, textTransform: 'capitalize' }}>{t(profile.role)}</div>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div><Lbl>{t('name')}</Lbl><Inp value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div><Lbl>Téléphone</Lbl><Inp value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
        {profile.role === 'dentist' && <div><Lbl>Cabinet</Lbl><Inp value={f.clinic} onChange={e => setF({ ...f, clinic: e.target.value })} /></div>}
        <div><Lbl>Couleur avatar</Lbl><input type="color" value={f.color} onChange={e => setF({ ...f, color: e.target.value })} style={{ width: 60, height: 36, border: 'none', cursor: 'pointer' }} /></div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', marginTop: 14 }}>
        <Btn onClick={signOut} style={{ color: c.dng }}>↩ {t('logout')}</Btn>
        <Btn primary onClick={save}>{t('save')}</Btn>
      </div>
    </Card>
  );
}
