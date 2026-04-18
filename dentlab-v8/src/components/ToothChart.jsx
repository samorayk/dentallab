import { useApp } from '../contexts/AppContext';
import { TEETH_UPPER, TEETH_LOWER, toothKind, isUpperTooth } from '../lib/teeth';

export default function ToothChart({ value = '', onChange, readOnly = false }) {
  const { theme: c, FS, t } = useApp();
  const sel = new Set((value || '').split(',').map(s => s.trim()).filter(Boolean));

  const toggle = (n) => {
    if (readOnly) return;
    const k = String(n);
    const next = new Set(sel);
    if (next.has(k)) next.delete(k); else next.add(k);
    onChange?.([...next].join(','));
  };
  const clear = () => !readOnly && onChange?.('');

  const UR = TEETH_UPPER.slice(0, 8);
  const UL = TEETH_UPPER.slice(8, 16);
  const LR = TEETH_LOWER.slice(0, 8);
  const LL = TEETH_LOWER.slice(8, 16);

  return (
    <div style={{ background: '#FAFAF8', border: '1.5px solid ' + c.bdr, borderRadius: 14, padding: 14, userSelect: 'none' }}>
      <style>{`
        .tooth-btn { cursor:pointer; display:flex; flex-direction:column; align-items:center; padding:0; border:none; background:transparent; outline:none; -webkit-tap-highlight-color:transparent; }
        .tooth-btn:hover svg { filter: brightness(0.92); }
        @media(max-width:520px){ .chart-half{ gap:1px!important; } }
      `}</style>

      {/* Title */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:16 }}>🦷</span>
          <span style={{ fontWeight:700, fontSize:FS-1, color:c.tx }}>Schéma dentaire</span>
          <span style={{ fontSize:FS-4, color:c.txL, background:c.bg, padding:'1px 7px', borderRadius:999, fontWeight:600 }}>FDI</span>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {sel.size > 0 && (
            <span style={{ fontWeight:700, fontSize:FS-3, color:'#fff', background:c.ac, padding:'2px 9px', borderRadius:999 }}>
              {sel.size} dent{sel.size > 1 ? 's' : ''}
            </span>
          )}
          {sel.size > 0 && !readOnly && (
            <button onClick={clear} style={{ background:'none', border:'none', color:c.txL, fontSize:FS-3, cursor:'pointer', textDecoration:'underline' }}>Effacer</button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:FS-4, color:c.txL, marginBottom:6, fontWeight:600 }}>
        <span>Droite du patient →</span>
        <span>← Gauche du patient</span>
      </div>

      {/* Upper arch label */}
      <div style={{ textAlign:'center', fontSize:FS-3, fontWeight:700, color:c.txL, letterSpacing:1, marginBottom:4 }}>MAXILLAIRE SUPÉRIEUR</div>

      {/* Upper arch */}
      <Arch right={UR} left={UL} lower={false} sel={sel} toggle={toggle} c={c} FS={FS} />

      {/* Occlusion line */}
      <div style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 0' }}>
        <div style={{ flex:1, height:1.5, background:'linear-gradient(to right, transparent, '+c.bdr+')' }} />
        <span style={{ fontSize:FS-5, color:c.txL, letterSpacing:1.5, fontWeight:700 }}>LIGNE D'OCCLUSION</span>
        <div style={{ flex:1, height:1.5, background:'linear-gradient(to left, transparent, '+c.bdr+')' }} />
      </div>

      {/* Lower arch */}
      <Arch right={LR} left={LL} lower={true} sel={sel} toggle={toggle} c={c} FS={FS} />

      {/* Lower arch label */}
      <div style={{ textAlign:'center', fontSize:FS-3, fontWeight:700, color:c.txL, letterSpacing:1, marginTop:4 }}>MAXILLAIRE INFÉRIEUR</div>

      {/* Manual input */}
      {!readOnly && (
        <div style={{ marginTop:12, display:'flex', gap:6, alignItems:'center', background:c.bg, padding:'6px 10px', borderRadius:8 }}>
          <span style={{ fontSize:FS-3, color:c.txL, fontWeight:600, whiteSpace:'nowrap' }}>Saisie manuelle:</span>
          <input value={value || ''} onChange={e => onChange?.(e.target.value)}
            placeholder="ex: 14, 24, 36, 46"
            style={{ flex:1, padding:'5px 10px', fontSize:FS-2, border:'1px solid '+c.bdr, borderRadius:6, outline:'none', background:'#fff', color:c.tx, fontFamily:'inherit' }} />
        </div>
      )}

      {/* Selected list */}
      {sel.size > 0 && (
        <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
          {[...sel].sort((a,b)=>Number(a)-Number(b)).map(n => (
            <span key={n} style={{ background:c.acL, color:c.ac, fontWeight:700, fontSize:FS-3, padding:'2px 8px', borderRadius:999 }}>
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Arch({ right, left, lower, sel, toggle, c, FS }) {
  return (
    <div style={{ display:'flex', alignItems:'stretch', justifyContent:'center', gap:0 }}>
      <div className="chart-half" style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:3, flex:1 }}>
        {right.map(n => <ToothSVG key={n} n={n} sel={sel.has(String(n))} onClick={()=>toggle(n)} lower={lower} c={c} FS={FS} />)}
      </div>
      {/* Center divider */}
      <div style={{ width:3, background:'linear-gradient(to bottom, '+c.bdr+', '+c.bdr+')', margin:'0 6px', borderRadius:2, position:'relative' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:8, height:8, background:c.bdr, borderRadius:'50%' }} />
      </div>
      <div className="chart-half" style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:3, flex:1 }}>
        {left.map(n => <ToothSVG key={n} n={n} sel={sel.has(String(n))} onClick={()=>toggle(n)} lower={lower} c={c} FS={FS} />)}
      </div>
    </div>
  );
}

function ToothSVG({ n, sel, onClick, lower, c, FS }) {
  const kind  = toothKind(n);
  const flip  = lower ? 'scaleY(-1)' : 'none';

  // Colors
  const crownFill   = sel ? c.ac        : '#FFFEF8';
  const crownStroke = sel ? (c.acD||'#1B4332') : '#B8A070';
  const rootFill    = sel ? (c.acD||'#1B4332') : '#E2C99A';
  const rootStroke  = sel ? (c.acD||'#1B4332') : '#B8A070';
  const lineColor   = sel ? 'rgba(255,255,255,0.5)' : '#D4B888';
  const shineColor  = sel ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)';
  const sw = sel ? 1.8 : 1.3;

  // Each tooth type has a unique anatomical profile
  const profiles = {
    incisor: {
      crown: 'M7,18 L7,8 Q7,4 10,3 Q14,2 18,3 Q21,4 21,8 L21,18 Q17,20 14,20 Q11,20 7,18 Z',
      roots: [{ d:'M10,20 Q10,27 10,32', w:3.5 }, { d:'M18,20 Q18,27 18,32', w:3.5 }],
      shine: 'M10,5 Q14,3.5 18,5',
      grooves: 'M10,14 L10,10 M14,13 L14,9 M18,14 L18,10',
      viewBox: '0 0 28 34',
    },
    canine: {
      crown: 'M7,19 L7,9 Q7,4 10,3 Q14,1.5 18,3 Q21,5 21,9 L21,19 Q17,21 14,21 Q11,21 7,19 Z',
      roots: [{ d:'M14,21 Q14,29 13,34', w:4 }],
      shine: 'M10,5 Q14,3 18,5',
      grooves: 'M14,4 L14,14',
      viewBox: '0 0 28 36',
    },
    premolar: {
      crown: 'M5,19 L5,9 Q5,4 8,3 Q14,1.5 20,3 Q23,4 23,9 L23,19 Q19,21 14,21 Q9,21 5,19 Z',
      roots: [{ d:'M9,21 Q8,28 8,33', w:3.5 }, { d:'M19,21 Q20,28 20,33', w:3.5 }],
      shine: 'M8,5 Q14,3 20,5',
      grooves: 'M9,7 L9,15 M14,6 L14,16 M19,7 L19,15 M9,12 L19,12',
      viewBox: '0 0 28 35',
    },
    molar: {
      crown: 'M4,18 L4,8 Q4,3 8,2.5 Q14,1 20,2.5 Q24,3 24,8 L24,18 Q20,21 14,21 Q8,21 4,18 Z',
      roots: [{ d:'M8,21 Q7,27 7,32', w:4 }, { d:'M14,21 Q14,28 14,32', w:3.5 }, { d:'M20,21 Q21,27 21,32', w:4 }],
      shine: 'M7,5 Q14,2.5 21,5',
      grooves: 'M9,7 L9,16 M14,6 L14,17 M19,7 L19,16 M5,12 L23,12',
      viewBox: '0 0 28 34',
    },
  };

  const p = profiles[kind];

  return (
    <button className="tooth-btn" type="button" onClick={onClick} aria-pressed={sel}
      title={`Dent ${n} — ${kind === 'incisor' ? 'Incisive' : kind === 'canine' ? 'Canine' : kind === 'premolar' ? 'Prémolaire' : 'Molaire'}`}>
      <svg width="100%" viewBox={p.viewBox} style={{ maxWidth:44, display:'block', transform:flip, transition:'transform 0.1s' }}>
        <defs>
          <linearGradient id={`cg${n}`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stopColor={sel ? (c.acL||'#B7E4C7') : '#FFFFFF'} />
            <stop offset="100%" stopColor={crownFill} />
          </linearGradient>
          <linearGradient id={`rg${n}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={rootFill} />
            <stop offset="100%" stopColor={sel ? c.ac : '#C8A870'} stopOpacity="0.6" />
          </linearGradient>
          <filter id={`sh${n}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor={sel ? c.ac : '#B8A070'} floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Roots */}
        {p.roots.map((r, i) => (
          <path key={i} d={r.d} stroke={'url(#rg'+n+')'} strokeWidth={r.w} fill="none" strokeLinecap="round" />
        ))}
        {p.roots.map((r, i) => (
          <path key={'s'+i} d={r.d} stroke={rootStroke} strokeWidth={0.7} fill="none" strokeLinecap="round" />
        ))}

        {/* Crown body */}
        <path d={p.crown} fill={`url(#cg${n})`} stroke={crownStroke} strokeWidth={sw}
          strokeLinejoin="round" filter={`url(#sh${n})`} />

        {/* Occlusal grooves */}
        <path d={p.grooves} stroke={lineColor} strokeWidth="0.8" fill="none" strokeLinecap="round" />

        {/* Shine / highlight */}
        <path d={p.shine} stroke={shineColor} strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Selected: inner ring highlight */}
        {sel && <path d={p.crown} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinejoin="round" />}
      </svg>
      <span style={{ fontSize:8.5, fontWeight:700, color: sel ? (c.acD||'#1B4332') : '#9A8060', marginTop:2, lineHeight:1 }}>{n}</span>
    </button>
  );
}
