import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { flushQueue, offlineQueue } from '../lib/supabase';

export default function OfflineIndicator() {
  const { FS, pushNotif } = useApp();
  const [online, setOnline] = useState(navigator.onLine);
  const [queueLen, setQueueLen] = useState(0);

  useEffect(() => {
    const update = () => {
      const isNowOnline = navigator.onLine;
      setOnline(isNowOnline);
      setQueueLen(offlineQueue.get().length);
      if (isNowOnline) {
        // Try to flush queued ops
        flushQueue().then(n => {
          if (n > 0) pushNotif?.(`✅ ${n} opération(s) synchronisée(s)`, 'ok');
          setQueueLen(offlineQueue.get().length);
        });
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  if (online && queueLen === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      background: online ? '#065F46' : '#991B1B',
      color: '#fff', padding: '8px 18px', borderRadius: 999,
      fontSize: FS - 2, fontWeight: 700, zIndex: 9998,
      boxShadow: '0 4px 20px rgba(0,0,0,.3)',
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fadeIn .3s ease-out',
    }}>
      {online ? (
        <>✅ En ligne {queueLen > 0 ? `— ${queueLen} opération(s) en attente` : ''}</>
      ) : (
        <>📵 Hors ligne — {queueLen > 0 ? `${queueLen} opération(s) en attente` : 'données locales uniquement'}</>
      )}
    </div>
  );
}
