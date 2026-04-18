import { useApp } from '../contexts/AppContext';
import { TEETH_UPPER, TEETH_LOWER, toothKind, isUpperTooth } from '../lib/teeth';

export default function ToothChart({ value = '', onChange, readOnly = false }) {
  const { theme: c, FS, t } = useApp();
  const sel = new Set((value || '').split(',').map(s => s.trim()).filter(Boolean));
  const toggle = (n) => {
    if (readOnly) return;
    const k = String(n);
    if (sel.has(k)) sel.delete(k); else sel.add(k);
    onChange?.([...sel].join(','));
  };
  const clear = () => !readOnly && onChange?.('');

  const UR = TEETH_UPPER.slice(0, 8);
  const UL = TEETH_UPPER.slice(8, 16);
  const LR = TEETH_LOWER.slice(0, 8);
  const LL = TEETH_LOWER.slice(8, 16);

  const Arch = ({ right, left, label, lower }) => (
    <div>
      <div style={{ fontSize: FS - 4, fontWeight: 600, color: c.txL, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
        <div className="chart-half" style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2, flex: 1 }}>
          {right.map(n => <Tooth key={n} n={n} sel={sel.has(String(n))} onClick={() => toggle(n)} theme={c} lower={lower} />)}
        </div>
        <div style={{ width: 2, background: c.bdr, margin: '0 4px', borderRadius: 1 }} />
        <div className="chart-half" style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2, flex: 1 }}>
          {left.map(n => <Tooth key={n} n={n} sel={sel.has(String(n))} onClick={() => toggle(n)} theme={c} lower={lower} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'linear-gradient(180deg,#FDFBF5 0%,#F7F2E8 100%)', border: '1.5px solid ' + c.bdr, borderRadius: 12, padding: 12 }}>
      <style>{`@media(max-width:520px){.chart-half{gap:1px!important;}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: FS - 2, fontWeight: 700, color: c.tx, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🦷</span><span>{t('teethChart')}</span>
          <span style={{ fontSize: FS - 4, color: c.txL, fontWeight: 500 }}>FDI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sel.size > 0 && <span style={{ fontSize: FS - 3, fontWeight: 700, color: c.ac, background: c.acL, padding: '2px 8px', borderRadius: 10 }}>{sel.size} sél.</span>}
          {sel.size > 0 && !readOnly && <button type="button" onClick={clear} style={{ background: 'none', border: 'none', color: c.txL, fontSize: FS - 3, cursor: 'pointer', textDecoration: 'underline' }}>effacer</button>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Arch right={UR} left={UL} label="Maxillaire" lower={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 1, background: c.bdr }} />
          <span style={{ fontSize: FS - 5, color: c.txL, letterSpacing: 0.5 }}>OCCLUSION</span>
          <div style={{ flex: 1, height: 1, background: c.bdr }} />
        </div>
        <Arch right={LR} left={LL} label="Mandibule" lower={true} />
      </div>
      {!readOnly && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: FS - 3, color: c.txM, fontWeight: 600 }}>Saisie:</span>
          <input value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder="ex: 14, 24, 36"
            style={{ flex: 1, minWidth: 120, padding: '6px 10px', fontSize: FS - 2, border: '1px solid ' + c.bdr, borderRadius: 6, background: '#fff', color: c.tx, outline: 'none' }} />
        </div>
      )}
    </div>
  );
}

/* ── Realistic anatomical tooth ── */
function Tooth({ n, sel, onClick, theme: c, lower }) {
  const k = toothKind(n);
  const isUp = isUpperTooth(n);
  // For lower teeth we flip vertically so roots point down
  const flip = lower ? 'scaleY(-1)' : 'none';

  const fillCrown = sel ? c.ac : '#FFF9F0';
  const fillRoot  = sel ? (c.acD || '#1B4332') : '#E8D5B0';
  const stroke    = sel ? (c.acD || '#1B4332') : '#A89060';
  const sw = sel ? 1.6 : 1.1;
  const hilite = sel ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)';
  const lineClr = sel ? 'rgba(255,255,255,0.3)' : '#C8A870';

  // Crown shapes — anatomically inspired, viewed from buccal
  const crowns = {
    incisor:  'M5 14 Q5 7 7 5 Q12 3 17 5 Q19 7 19 14 Q17 16 12 16 Q7 16 5 14Z',
    canine:   'M6 15 Q5 8 8 4 Q12 2 16 4 Q18 8 18 15 Q16 17 12 17 Q8 17 6 15Z',
    premolar: 'M4 15 Q4 8 6 5 Q12 3 18 5 Q20 8 20 15 Q18 17 12 17 Q6 17 4 15Z',
    molar:    'M3 14 Q3 7 5 5 Q12 2 19 5 Q21 7 21 14 Q19 17 12 17 Q5 17 3 14Z',
  };
  // Highlight / shine on crown
  const shines = {
    incisor:  'M8 6 Q12 4 16 6',
    canine:   'M9 5 Q12 3 15 5',
    premolar: 'M7 6 Q12 4 17 6',
    molar:    'M6 6 Q12 3 18 6',
  };
  // Occlusal lines (cusps/ridges)
  const cusps = {
    incisor:  'M9 13 L9 10 M15 13 L15 10',
    canine:   'M12 4 L12 10',
    premolar: 'M9 6 Q9 10 9 13 M15 6 Q15 10 15 13 M9 11 L15 11',
    molar:    'M8 6 Q8 10 8 13 M12 5 Q12 10 12 14 M16 6 Q16 10 16 13 M5 10 L19 10',
  };
  // Root shapes
  const roots = {
    incisor:  'M9 16 Q9 23 9 26 M15 16 Q15 23 15 26',
    canine:   'M12 17 Q12 24 12 28',
    premolar: 'M8 17 Q7 23 7 27 M16 17 Q17 23 17 27',
    molar:    'M7 17 Q6 21 6 25 M12 17 Q12 22 12 26 M17 17 Q18 21 18 25',
  };

  // ViewBox is taller for lower teeth (roots go down = more space below crown)
  const vb = '0 0 24 30';

  return (
    <button type="button" onClick={onClick} aria-pressed={sel}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: 0, border: 'none', background: 'transparent', outline: 'none', WebkitTapHighlightColor: 'transparent' }}>
      <svg width="100%" viewBox={vb} style={{ maxWidth: 38, display: 'block', transform: flip }}>
        <defs>
          <linearGradient id={'cg' + n} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={sel ? c.acL || '#B7E4C7' : '#FFFDF8'} />
            <stop offset="100%" stopColor={fillCrown} />
          </linearGradient>
          <linearGradient id={'rg' + n} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillRoot} />
            <stop offset="100%" stopColor={sel ? c.ac : '#D4B896'} />
          </linearGradient>
        </defs>
        {/* Roots */}
        <path d={roots[k]} stroke={stroke} strokeWidth={sw * 0.9} fill="none" strokeLinecap="round" />
        {/* Root fill areas for molars/premolars */}
        {(k === 'molar' || k === 'premolar') && (
          <path d={roots[k]} stroke={'url(#rg' + n + ')'} strokeWidth={sw * 3} fill="none" strokeLinecap="round" opacity="0.4" />
        )}
        {/* Crown body */}
        <path d={crowns[k]} fill={'url(#cg' + n + ')'} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        {/* Occlusal detail lines */}
        <path d={cusps[k]} stroke={lineClr} strokeWidth="0.75" fill="none" strokeLinecap="round" />
        {/* Shine highlight */}
        <path d={shines[k]} stroke={hilite} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
      </svg>
      <span style={{ fontSize: 8, fontWeight: 700, color: sel ? (c.acD || '#1B4332') : '#9A8A6A', marginTop: 1, lineHeight: 1 }}>{n}</span>
    </button>
  );
}
