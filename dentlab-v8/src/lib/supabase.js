import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn('⚠️  Missing Supabase env vars. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anon || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
  // Offline: realtime disabled to save bandwidth; polling used instead
  realtime: { params: { eventsPerSecond: 2 } },
});

// ── Offline queue — stores failed mutations to retry when online ──
const QUEUE_KEY = 'dentlab_offline_queue';

export const offlineQueue = {
  get: () => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
  },
  add: (op) => {
    const q = offlineQueue.get();
    q.push({ ...op, id: Date.now(), at: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  },
  remove: (id) => {
    const q = offlineQueue.get().filter(x => x.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  },
  clear: () => localStorage.removeItem(QUEUE_KEY),
};

// ── Online/offline detector ──
export const isOnline = () => navigator.onLine;

// ── Retry queued operations when back online ──
export const flushQueue = async () => {
  const q = offlineQueue.get();
  if (!q.length) return 0;
  let done = 0;
  for (const op of q) {
    try {
      if (op.type === 'update_case') {
        await supabase.from('cases').update(op.patch).eq('lab_id', op.labId).eq('id', op.caseId);
        offlineQueue.remove(op.id); done++;
      }
      // Add more operation types as needed
    } catch (_) {}
  }
  return done;
};
