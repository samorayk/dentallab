import { useApp } from '../contexts/AppContext';
import { TEETH_UPPER, TEETH_LOWER, toothKind, isUpperTooth } from '../lib/teeth';

/**
 * Professional FDI dental chart with anatomically styled teeth.
 * - Responsive: shrinks on mobile, dual-arch layout
 * - Tap to toggle, shows count, has manual entry fallback
 * - Upper arch teeth face down, lower arch flipped
 *
 * Usage:
 *   <ToothChart value="14,24" onChange={(str) => setTooth(str)} />
 */
export default function ToothChart({ value = '', onChange, readOnly = false }) {
  const { theme: c, FS, t } = useApp();
  const sel = new Set((value || '').split(',').map((s) => s.trim()).filter(Boolean));
  const toggle = (n) => {
    if (readOnly) return;
    const k = String(n);
    if (sel.has(k)) sel.delete(k);
    else sel.add(k);
    onChange?.([...sel].join(','));
  };
  const clear = () => !readOnly && onChange?.('');

  const UR = TEETH_UPPER.slice(0, 8);
  const UL = TEETH_UPPER.slice(8, 16);
  const LR = TEETH_LOWER.slice(0, 8);
  const LL = TEETH_LOWER.slice(8, 16);

  const Arch = ({ right, left, label }) => (
    <div>
      <div style={{ fontSize: FS - 4, fontWeight: 600, color: c.txL, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
        <div className="chart-half" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, flex: 1 }}>
          {right.map((n) => (
            <Tooth key={n} n={n} sel={sel.has(String(n))} onClick={() => toggle(n)} theme={c} />
          ))}
        </div>
        <div style={{ width: 2, background: c.bdr, margin: '0 4px', borderRadius: 1 }} />
        <div className="chart-half" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2, flex: 1 }}>
          {left.map((n) => (
            <Tooth key={n} n={n} sel={sel.has(String(n))} onClick={() => toggle(n)} theme={c} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(180deg, #FDFBF5 0%, #F7F2E8 100%)', border: '1.5px solid ' + c.bdr, borderRadius: 12, padding: 12 }}>
      <style>{`
        @media (max-width: 520px) { .chart-half { gap: 1px !important; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: FS - 2, fontWeight: 700, color: c.tx, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🦷</span>
          <span>{t('teethChart')}</span>
          <span style={{ fontSize: FS - 4, color: c.txL, fontWeight: 500 }}>FDI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sel.size > 0 && (
            <span style={{ fontSize: FS - 3, fontWeight: 700, color: c.ac, background: c.acL, padding: '2px 8px', borderRadius: 10 }}>
              {sel.size} sel.
            </span>
          )}
          {sel.size > 0 && !readOnly && (
            <button type="button" onClick={clear} style={{ background: 'none', border: 'none', color: c.txL, fontSize: FS - 3, cursor: 'pointer', textDecoration: 'underline' }}>
              effacer
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Arch right={UR} left={UL} label="Maxillaire" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: c.bdr }} />
          <span style={{ fontSize: FS - 5, color: c.txL, letterSpacing: 0.5 }}>OCCLUSION</span>
          <div style={{ flex: 1, height: 1, background: c.bdr }} />
        </div>
        <Arch right={LR} left={LL} label="Mandibule" />
      </div>

      {!readOnly && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: FS - 3, color: c.txM, fontWeight: 600 }}>Saisie:</span>
          <input
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="ex: 14, 24, 36"
            style={{ flex: 1, minWidth: 120, padding: '6px 10px', fontSize: FS - 2, border: '1px solid ' + c.bdr, borderRadius: 6, background: '#fff', color: c.tx, outline: 'none' }}
          />
        </div>
      )}
    </div>
  );
}

// ---------- Single tooth SVG ----------
function Tooth({ n, sel, onClick, theme: c }) {
  const k = toothKind(n);
  const up = isUpperTooth(n);
  const fill = sel ? c.ac : '#FFFFFF';
  const stroke = sel ? c.acD || '#1B4332' : '#B8A875';
  const sw = sel ? 1.8 : 1.2;
  const shapes = {
    incisor:  'M8 2 Q6 2 6 5 L6 13 Q6 15 8 15 L16 15 Q18 15 18 13 L18 5 Q18 2 16 2 Z',
    canine:   'M12 1.5 L7 5 L6 13 Q6 15 8 15 L16 15 Q18 15 18 13 L17 5 Z',
    premolar: 'M7 3 Q5 3 5 6 L5 13 Q5 15 7 15 L17 15 Q19 15 19 13 L19 6 Q19 3 17 3 Z',
    molar:    'M5 4 Q4 4 4 7 L4 13 Q4 15 6 15 L18 15 Q20 15 20 13 L20 7 Q20 4 19 4 Z',
  };
  const cusps = {
    incisor:  'M8 4 L8 7 M12 4 L12 7 M16 4 L16 7',
    canine:   'M12 3 L12 7',
    premolar: 'M9 5 L9 9 M15 5 L15 9',
    molar:    'M8 6 L8 10 M12 6 L12 10 M16 6 L16 10',
  };
  const roots =
    k === 'molar'    ? 'M8 15 L7 22 M16 15 L17 22 M12 15 L12 21' :
    k === 'premolar' ? 'M9 15 L8 21 M15 15 L16 21' :
                       'M12 15 L12 22';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={sel}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 0, border: 'none', background: 'transparent', outline: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
      <svg width="100%" height="100%" viewBox="0 0 24 24" style={{ maxWidth: 40, display: 'block', transform: up ? 'none' : 'scaleY(-1)' }}>
        <path d={shapes[k]} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d={cusps[k]} stroke={sel ? '#B7E4C7' : '#D9CBA3'} strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d={roots} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 9, fontWeight: 700, color: sel ? c.acD || '#1B4332' : '#8A7F68', marginTop: 1, lineHeight: 1 }}>{n}</span>
    </button>
  );
}
