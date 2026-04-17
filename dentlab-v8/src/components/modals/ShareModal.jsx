import { useApp } from '../../contexts/AppContext';
import { Modal, Btn } from '../UI';
import { caseSummary } from './EtiquetteModal';

export default function ShareModal({ data: x, onClose }) {
  const { t, theme: c, FS } = useApp();
  const txt = caseSummary(x);
  const enc = encodeURIComponent(txt);
  const go = (url) => window.open(url, '_blank', 'noopener');
  const copy = async () => { try { await navigator.clipboard.writeText(txt); alert('✓ ' + t('copy')); } catch (_) {} };
  return (
    <Modal onClose={onClose} w={400}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: FS + 1, fontWeight: 700 }}>📤 {t('share')}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: c.txL }}>×</button>
      </div>
      <div style={{ background: c.bg, padding: 10, borderRadius: 6, marginBottom: 10, whiteSpace: 'pre-wrap', fontSize: FS - 2 }}>{txt}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Btn style={{ background: '#25D366', color: '#fff', justifyContent: 'center' }} onClick={() => go(`https://wa.me/?text=${enc}`)}>📱 WhatsApp</Btn>
        <Btn style={{ background: '#0088cc', color: '#fff', justifyContent: 'center' }} onClick={() => go(`https://t.me/share/url?url=&text=${enc}`)}>✈️ Telegram</Btn>
        <Btn style={{ background: '#1877F2', color: '#fff', justifyContent: 'center' }} onClick={() => go(`https://www.facebook.com/sharer/sharer.php?u=${enc}`)}>📘 Facebook</Btn>
        <Btn style={{ justifyContent: 'center' }} onClick={copy}>📋 {t('copy')}</Btn>
      </div>
    </Modal>
  );
}
