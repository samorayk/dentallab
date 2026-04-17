import { useApp } from '../../contexts/AppContext';
import { Modal, Btn } from '../UI';
import QR from '../QR';

export function caseSummary(x, profs = []) {
  const doc = profs.find(p => p.id === x.dentist_id);
  return [
    `Commande #${x.id}`,
    `Patient: ${x.patient}`,
    `Type: ${x.type}`, `Matériau: ${x.material}`,
    `Dent: ${x.tooth || '—'}`, `Teinte: ${x.shade}`,
    `Éléments: ${x.elements}`,
    `Échéance: ${x.due || '—'}`,
    doc ? `Dentiste: ${doc.name}` : '',
    x.delivery?.driverName ? `Livreur: ${x.delivery.driverName} ${x.delivery.driverPhone || ''}` : '',
    x.delivery?.deliveredAt ? `Livré: ${x.delivery.deliveredAt}` : '',
  ].filter(Boolean).join('\n');
}

export default function EtiquetteModal({ data: x, profs = [], onClose }) {
  const { theme: c, FS, t } = useApp();
  const doc = profs.find(p => p.id === x.dentist_id);
  const txt = caseSummary(x, profs);
  const print = () => {
    const el = document.getElementById('etq-area'); if (!el) return;
    const w = window.open('', '_blank', 'width=400,height=400');
    w.document.write(`<!DOCTYPE html><html><head><style>
      @page{size:58mm 50mm;margin:0}
      *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
      .etq{width:58mm;height:50mm;padding:2mm;display:flex;gap:1.5mm}
      .info{flex:1;font-size:7pt;line-height:1.2}
      .info b{font-size:8pt}
      @media print{.np{display:none}}
    </style></head><body>${el.innerHTML}
      <div class="np" style="text-align:center;padding:10px"><button onclick="window.print()" style="padding:8px 16px">🖨️ Imprimer</button></div>
    </body></html>`);
    w.document.close();
  };
  return (
    <Modal onClose={onClose} w={440}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: FS + 1, fontWeight: 700 }}>🏷️ {t('etiquette')} 58×50mm</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: c.txL }}>×</button>
      </div>
      <div style={{ background: c.bg, padding: 10, borderRadius: 6, marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
        <div id="etq-area">
          <div className="etq" style={{ width: '58mm', height: '50mm', padding: '2mm', display: 'flex', gap: '1.5mm', background: '#fff', border: '1px dashed ' + c.bdr }}>
            <div className="info" style={{ flex: 1, fontSize: '7pt', lineHeight: 1.2 }}>
              <b style={{ fontSize: '8pt' }}>{x.patient}</b><br />
              #{x.id}<br />
              {x.type}<br />
              🦷 {x.tooth || '—'} · Él: {x.elements}<br />
              {doc ? 'Dr. ' + doc.name : ''}<br />
              {x.delivery?.deliveredAt ? '📅 ' + x.delivery.deliveredAt : '📅 ' + (x.due || '—')}<br />
              {x.delivery?.driverName ? '🚚 ' + x.delivery.driverName : ''}
            </div>
            <div style={{ flexShrink: 0 }}><QR text={txt} size={92} /></div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <Btn primary onClick={print}>🖨️ {t('print')}</Btn>
      </div>
    </Modal>
  );
}
