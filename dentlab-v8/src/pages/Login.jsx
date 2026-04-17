import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { auth } from '../lib/db';
import { Btn, Inp, Lbl } from '../components/UI';
import { LANGS } from '../i18n';
import { settingsApi } from '../lib/db';
import DevFooter from '../components/DevFooter';

export default function Login() {
  const { t, theme: c, settings } = useApp();
  const [mode, setMode] = useState('login');  // login | signup
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [name, setName] = useState('');
  const [labName, setLabName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await auth.signIn(email, pwd);
        if (error) throw error;
      } else {
        if (!name || !labName) throw new Error('Nom et nom du laboratoire requis');
        const { data, error } = await auth.signUpAdmin(email, pwd, name, labName);
        if (error) throw error;
        if (data.user && !data.session) {
          setInfo('Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.');
          setMode('login');
        }
      }
    } catch (e2) {
      setErr(e2.message || 'Erreur');
    } finally { setBusy(false); }
  };

  const switchLang = async (code) => {
    // Update settings locally before login by just reloading page (simplest)
    document.documentElement.lang = code;
    // Optimistic: re-render by updating URL hash; real persistence happens after login
    window.location.hash = '#lang=' + code;
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${c.ac} 0%, ${c.acD} 100%)`, padding: 16 }}>
      <div style={{ background: c.card, padding: 28, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 40 }}>🦷</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: c.tx, marginTop: 4 }}>DentLab Pro</div>
          <div style={{ fontSize: 12, color: c.txL, marginTop: 2 }}>{mode === 'login' ? t('login') : t('signup')}</div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'signup' && (
            <>
              <div><Lbl>{t('name')}</Lbl><Inp value={name} onChange={e => setName(e.target.value)} required /></div>
              <div><Lbl>Nom du laboratoire</Lbl><Inp value={labName} onChange={e => setLabName(e.target.value)} placeholder="Mon Labo Dentaire" required /></div>
            </>
          )}
          <div><Lbl>{t('email')}</Lbl><Inp type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><Lbl>{t('password')}</Lbl><Inp type="password" value={pwd} onChange={e => setPwd(e.target.value)} minLength={6} required /></div>

          {err && <div style={{ color: c.dng, fontSize: 12, padding: 8, background: '#FEF2F2', borderRadius: 6 }}>{err}</div>}
          {info && <div style={{ color: c.ac, fontSize: 12, padding: 8, background: c.acL, borderRadius: 6 }}>{info}</div>}

          <Btn primary type="submit" disabled={busy} style={{ justifyContent: 'center', padding: '11px' }}>
            {busy ? '…' : (mode === 'login' ? t('login') : t('signup'))}
          </Btn>
        </form>

        <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: c.txM }}>
          {mode === 'login' ? (
            <>Pas de compte ?{' '}<button type="button" onClick={() => { setMode('signup'); setErr(''); setInfo(''); }} style={{ background: 'none', border: 'none', color: c.ac, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Créer un laboratoire</button></>
          ) : (
            <>Déjà un compte ?{' '}<button type="button" onClick={() => { setMode('login'); setErr(''); setInfo(''); }} style={{ background: 'none', border: 'none', color: c.ac, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>{t('login')}</button></>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 6 }}>
          {LANGS.map(L => (
            <button key={L.code} type="button" onClick={() => switchLang(L.code)}
              style={{ padding: '4px 10px', fontSize: 11, borderRadius: 14, border: '1px solid ' + c.bdr, background: settings.lang === L.code ? c.acL : 'transparent', color: c.txM, cursor: 'pointer' }}>
              {L.flag} {L.label}
            </button>
          ))}
        </div>
        <DevFooter />
      </div>
    </div>
  );
}
