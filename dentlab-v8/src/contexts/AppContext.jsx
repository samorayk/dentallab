import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, profiles, labs, settingsApi, subscriptions, branding } from '../lib/db';
import { makeT, isRTL } from '../i18n';
import { makeTheme } from '../lib/theme';
import { formatMoney } from '../lib/helpers';

const AppCtx = createContext(null);

const DEFAULT_SETTINGS = { lang: 'fr', font_size: 13, theme_color: '#2D6A4F', currency: 'DZD', font_family: 'Inter' };

export function AppProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [lab, setLab]           = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [subscription, setSub]  = useState(null);
  const [brand, setBrand]       = useState({ dev_name:'', dev_phone:'', dev_email:'', dev_site:'' });
  const [loading, setLoading]   = useState(true);
  // Notification state — shared across app
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let mounted = true;
    auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const sub = auth.onChange((s) => {
      setSession(s);
      if (!s) { setProfile(null); setLab(null); setSub(null); setLoading(false); }
    });
    return () => { mounted = false; sub?.data?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: p } = await profiles.getById(session.user.id);
      if (!mounted) return;
      if (!p) { setLoading(false); return; }
      setProfile(p);
      const [{ data: l }, { data: s }, { data: sub2 }, { data: br }] = await Promise.all([
        labs.mine(), settingsApi.get(), subscriptions.mine(), branding.get(),
      ]);
      if (!mounted) return;
      setLab(l || null);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
      setSub(sub2 || null);
      if (br) setBrand(br);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [session]);

  const refreshProfile  = useCallback(async () => {
    if (!session?.user) return;
    const { data } = await profiles.getById(session.user.id);
    setProfile(data || null);
  }, [session]);

  const refreshSettings = useCallback(async () => {
    const { data } = await settingsApi.get();
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
  }, []);

  // Notification helpers
  const pushNotif = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications(n => [...n, { id, msg, type, at: new Date() }]);
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 5000);
  }, []);
  const clearNotif = useCallback((id) => setNotifications(n => n.filter(x => x.id !== id)), []);

  const t        = makeT(settings.lang);
  const rtl      = isRTL(settings.lang);
  const theme    = makeTheme(settings.theme_color);
  const FS       = Number(settings.font_size) || 13;
  const currency = settings.currency || 'DZD';
  const money    = (n) => formatMoney(n, currency);
  const fontFamily = settings.font_family || 'Inter';

  const role  = profile?.role;
  const isA   = role === 'admin';
  const isD   = role === 'dentist';
  const isT   = role === 'technician';
  const labId = profile?.lab_id;

  const subStatus   = subscription?.status || 'trial';
  const subExpires  = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const subActive   = (subStatus === 'trial' || subStatus === 'active') && (!subExpires || subExpires >= new Date(new Date().toDateString()));
  const subDaysLeft = subExpires ? Math.ceil((subExpires - new Date()) / (1000*60*60*24)) : null;

  const value = {
    session, profile, lab, labId, loading,
    settings, refreshSettings, refreshProfile,
    t, rtl, theme, FS, currency, money, fontFamily,
    role, isA, isD, isT,
    subscription, subStatus, subActive, subDaysLeft,
    brand,
    signOut: () => auth.signOut(),
    notifications, pushNotif, clearNotif,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
