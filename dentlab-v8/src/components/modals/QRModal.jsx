import { useApp } from '../../contexts/AppContext';
import { Modal, Btn } from '../UI';
import QR from '../QR';
import { caseSummary } from './EtiquetteModal';

export default function QRModal({ data: x, onClose }) {
  const { t, theme: c, FS } = useApp();
  const txt = caseSummary(x);
  const print = () => {
    const el = document.getElementById('qr-area'); if (!el) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><style>body{font-family:Arial;padding:20px;text-align:center}.np{margin-top:20px}@media print{.np{display:none}}</style></head><body>${el.innerHTML}<div class="np"><button onclick="window.print()" style="padding:10px 20px">🖨️</button></div></body></html>`);
    w.document.close();
  };
  return (
    <Modal onClose={onClose} w={360}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: FS + 1, fontWeight: 700 }}>📱 QR Code</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: c.txL }}>×</button>
      </div>
      <div id="qr-area" style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: FS }}>#{x.id} — {x.patient}</div>
        <div style={{ display: 'inline-block', marginTop: 10, padding: 12, background: '#fff', border: '1px solid ' + c.bdr, borderRadius: 8 }}>
          <QR text={txt} size={200} />
        </div>
        <pre style={{ fontSize: FS - 3, color: c.txM, marginTop: 10, textAlign: 'left', background: c.bg, padding: 8, borderRadius: 6, whiteSpace: 'pre-wrap' }}>{txt}</pre>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
        <Btn primary onClick={print}>🖨️ {t('print')}</Btn>
      </div>
    </Modal>
  );
}
