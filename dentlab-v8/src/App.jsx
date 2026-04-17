import { useState } from 'react';
import { useApp } from './contexts/AppContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Delivery from './pages/Delivery';
import Stock from './pages/Stock';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import DoctorPortal from './pages/DoctorPortal';
import TechPortal from './pages/TechPortal';
import { Av } from './components/UI';
import DevFooter from './components/DevFooter';

const PAGES = {
  dashboard: Dashboard, cases: Cases, delivery: Delivery,
  stock: Stock, suppliers: Suppliers, expenses: Expenses,
  reports: Reports, users: Users, settings: Settings,
  profile: Profile, doctorPortal: DoctorPortal, techPortal: TechPortal,
};

export default function App() {
  const { session, profile, loading, isA, isD, isT, theme: c, FS, rtl, t, signOut,
          subStatus, subActive, subDaysLeft, brand } = useApp();
  const [page, setPage] = useState(isD ? 'doctorPortal' : isT ? 'techPortal' : 'dashboard');
  const [mobOpen, setMobOpen] = useState(false);

  if (loading) return <FullScreen msg={t('loading')} />;
  if (!session) return <Login />;
  if (!profile) return <FullScreen msg="Profil introuvable. Contactez l'administrateur." />;

  // Subscription blocker — only non-admin blocked from the app; admin can still access Settings to see the subscription status.
  if (!subActive) return <SubscriptionBlocked status={subStatus} brand={brand} signOut={signOut} />;

  const nav = isT ? [
    { id: 'techPortal', l: t('myWork') }, { id: 'profile', l: t('profile') },
  ] : isD ? [
    { id: 'doctorPortal', l: t('myOrders') }, { id: 'profile', l: t('profile') },
  ] : [
    { id: 'dashboard', l: t('dashboard') }, { id: 'cases', l: t('cases') },
    { id: 'doctorPortal', l: t('myOrders') }, { id: 'techPortal', l: t('myWork') },
    { id: 'delivery', l: t('delivery') }, { id: 'stock', l: t('stock') },
    { id: 'suppliers', l: t('suppliers') }, { id: 'expenses', l: t('expenses') },
    { id: 'reports', l: t('reports') }, { id: 'users', l: t('users') },
    { id: 'settings', l: t('settings') }, { id: 'profile', l: t('profile') },
  ];

  const Page = PAGES[page] || Dashboard;
  const pageTitle = (nav.find(n => n.id === page) || {}).l || t(page);

  const Sidebar = () => (
    <div style={{ background: c.acD || '#1B4332', padding: '14px 8px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px', marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🦷</span>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#E8F5E9', flex: 1 }}>DentLab Pro</div>
      </div>
      <div onClick={() => { setPage('profile'); setMobOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', marginBottom: 10, background: 'rgba(82,183,136,.15)', borderRadius: 8, cursor: 'pointer' }}>
        <Av u={profile} sz={30} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: FS - 2, fontWeight: 600, color: '#E8F5E9', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</div>
          <div style={{ fontSize: FS - 4, color: '#52B788', textTransform: 'capitalize' }}>{t(profile.role)}</div>
        </div>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(n => (
          <button key={n.id} onClick={() => { setPage(n.id); setMobOpen(false); }}
            style={{
              padding: '9px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: page === n.id ? 'rgba(82,183,136,.22)' : 'transparent',
              color: page === n.id ? '#B7E4C7' : '#95D5B2',
              fontSize: FS - 1, fontWeight: page === n.id ? 600 : 500,
              textAlign: rtl ? 'right' : 'left',
            }}>{n.l}</button>
        ))}
      </nav>
      <button onClick={signOut} style={{ padding: '8px 10px', marginTop: 10, borderRadius: 7, border: '1px solid rgba(82,183,136,.3)', background: 'transparent', color: '#95D5B2', cursor: 'pointer', fontSize: FS - 2 }}>
        ↩ {t('logout')}
      </button>
      <DevFooter dark />
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: c.bg, direction: rtl ? 'rtl' : 'ltr', fontSize: FS }}>
      <div className="app-sidebar-desktop" style={{ width: 220, position: 'sticky', top: 0, height: '100vh', flexDirection: 'column' }}>
        <Sidebar />
      </div>
      {mobOpen && (
        <>
          <div onClick={() => setMobOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 90 }} />
          <div className="app-sidebar-mobile" style={{ position: 'fixed', top: 0, [rtl ? 'right' : 'left']: 0, bottom: 0, width: 260, zIndex: 91, animation: 'fadeIn .2s' }}>
            <Sidebar />
          </div>
        </>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Trial banner - show if trial ending in <7 days */}
        {subStatus === 'trial' && subDaysLeft !== null && subDaysLeft <= 7 && (
          <div style={{ background: '#FEF3C7', color: '#92400E', padding: '8px 14px', fontSize: FS - 2, textAlign: 'center', fontWeight: 600 }}>
            ⚠ Essai gratuit — {subDaysLeft > 0 ? `${subDaysLeft} jour(s) restant(s)` : 'expire aujourd\'hui'}.
            {brand.dev_phone && <> Contactez {brand.dev_name || 'le support'}: <a href={`tel:${brand.dev_phone}`} style={{ color: '#92400E', fontWeight: 700 }}>{brand.dev_phone}</a></>}
          </div>
        )}
        <header style={{ background: c.card, borderBottom: '1px solid ' + c.bdr, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 40 }}>
          <button className="app-hamburger" onClick={() => setMobOpen(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: c.tx }}>☰</button>
          <div style={{ flex: 1, fontSize: FS + 3, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{pageTitle}</div>
          <Av u={profile} sz={32} />
        </header>
        <main style={{ flex: 1, padding: '14px 16px', overflow: 'auto' }}>
          <Page setPage={setPage} />
        </main>
      </div>
    </div>
  );
}

function FullScreen({ msg }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F4EF', color: '#5C5346' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🦷</div>
        <div>{msg}</div>
      </div>
    </div>
  );
}

function SubscriptionBlocked({ status, brand, signOut }) {
  const msg = status === 'expired' ? 'Votre abonnement a expiré.'
           : status === 'suspended' ? 'Votre compte est suspendu.'
           : 'Abonnement inactif.';
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #C53030 0%, #7C2D2D 100%)', padding: 20 }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 16, maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: 52 }}>🔒</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginTop: 8 }}>Accès suspendu</div>
        <div style={{ color: '#5C5346', marginTop: 10, fontSize: 14 }}>{msg}</div>
        <div style={{ marginTop: 20, padding: 16, background: '#F6F4EF', borderRadius: 10, fontSize: 13 }}>
          <div style={{ color: '#9B9182', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Pour renouveler, contactez:</div>
          {brand.dev_name && <div style={{ fontWeight: 700, fontSize: 15 }}>{brand.dev_name}</div>}
          {brand.dev_phone && <div style={{ marginTop: 4 }}>📞 <a href={`tel:${brand.dev_phone}`} style={{ color: '#2D6A4F', fontWeight: 600 }}>{brand.dev_phone}</a></div>}
          {brand.dev_email && <div>✉️ <a href={`mailto:${brand.dev_email}`} style={{ color: '#2D6A4F' }}>{brand.dev_email}</a></div>}
          {!brand.dev_name && !brand.dev_phone && <div>Contactez votre fournisseur.</div>}
        </div>
        <button onClick={signOut} style={{ marginTop: 16, padding: '10px 20px', background: 'none', border: '1px solid #E4DFD6', borderRadius: 8, cursor: 'pointer' }}>↩ Déconnexion</button>
      </div>
    </div>
  );
}
