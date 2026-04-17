import { useApp } from '../contexts/AppContext';

export function Btn({ children, primary, danger, ghost, sm, style, ...rest }) {
  const { theme: c, FS } = useApp();
  const base = {
    padding: sm ? '6px 12px' : '9px 16px',
    fontSize: sm ? FS - 1.5 : FS - 0.5,
    fontWeight: 600,
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid ' + c.bdr,
    background: '#fff',
    color: c.tx,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all .15s',
    whiteSpace: 'nowrap',
  };
  if (primary) Object.assign(base, { background: c.ac, color: '#fff', border: 'none' });
  if (danger)  Object.assign(base, { background: c.dng, color: '#fff', border: 'none' });
  if (ghost)   Object.assign(base, { background: 'transparent', border: 'none' });
  return <button style={{ ...base, ...style }} {...rest}>{children}</button>;
}

export function Inp({ style, ...rest }) {
  const { theme: c, FS } = useApp();
  return (
    <input
      style={{
        width: '100%',
        padding: '9px 11px',
        fontSize: FS - 1,
        border: '1px solid ' + c.bdr,
        borderRadius: 7,
        background: '#fff',
        color: c.tx,
        outline: 'none',
        fontFamily: 'inherit',
        ...style,
      }}
      {...rest}
    />
  );
}

export function Sel({ children, style, ...rest }) {
  const { theme: c, FS } = useApp();
  return (
    <select
      style={{
        width: '100%',
        padding: '9px 11px',
        fontSize: FS - 1,
        border: '1px solid ' + c.bdr,
        borderRadius: 7,
        background: '#fff',
        color: c.tx,
        outline: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Txt({ style, ...rest }) {
  const { theme: c, FS } = useApp();
  return (
    <textarea
      style={{
        width: '100%',
        padding: '9px 11px',
        fontSize: FS - 1,
        border: '1px solid ' + c.bdr,
        borderRadius: 7,
        background: '#fff',
        color: c.tx,
        outline: 'none',
        fontFamily: 'inherit',
        resize: 'vertical',
        minHeight: 50,
        ...style,
      }}
      {...rest}
    />
  );
}

export function Lbl({ children, style }) {
  const { theme: c, FS } = useApp();
  return (
    <label style={{ display: 'block', fontSize: FS - 3, fontWeight: 600, color: c.txM, marginBottom: 4, ...style }}>
      {children}
    </label>
  );
}

export function Stat({ label, val, sub, accent }) {
  const { theme: c, FS } = useApp();
  return (
    <div
      style={{
        flex: '1 1 140px',
        background: c.card,
        border: '1px solid ' + c.bdr,
        borderRadius: 10,
        padding: '10px 12px',
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: FS - 3, color: c.txL, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: FS + 4, fontWeight: 700, color: accent || c.tx, marginTop: 3 }}>{val}</div>
      {sub && <div style={{ fontSize: FS - 3, color: c.txL, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Av({ u, sz = 34 }) {
  if (!u) return null;
  return (
    <div
      style={{
        width: sz,
        height: sz,
        borderRadius: '50%',
        background: u.color || '#666',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: sz * 0.4,
        flexShrink: 0,
      }}
    >
      {(u.avatar || u.name?.[0] || '?').toString().slice(0, 2).toUpperCase()}
    </div>
  );
}

export function Row({ l, children }) {
  const { theme: c, FS } = useApp();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid ' + c.bdrL, fontSize: FS - 1, gap: 8 }}>
      <span style={{ color: c.txL }}>{l}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

export function Card({ children, style }) {
  const { theme: c } = useApp();
  return (
    <div style={{ background: c.card, border: '1px solid ' + c.bdr, borderRadius: 12, padding: 14, ...style }}>
      {children}
    </div>
  );
}

export function Modal({ children, onClose, w = 540 }) {
  const { theme: c, rtl } = useApp();
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '4vh 10px',
        direction: rtl ? 'rtl' : 'ltr',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: c.card,
          borderRadius: 14,
          padding: 18,
          width: '100%',
          maxWidth: w,
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          maxHeight: '92vh',
          overflow: 'auto',
          animation: 'modalIn .18s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const X    = <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>;
export const Plus = <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>;
