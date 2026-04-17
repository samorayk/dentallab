import { useEffect, useRef } from 'react';
import qrcode from 'qrcode-generator';

/**
 * Renders a QR code as <canvas>.
 * Usage: <QR text="hello world" size={200} />
 */
export default function QR({ text, size = 160, level = 'M' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    // Try increasing type number until text fits
    let qr;
    for (let type = 4; type <= 20; type++) {
      try {
        qr = qrcode(type, level);
        qr.addData(String(text));
        qr.make();
        break;
      } catch (_) { /* try next size */ }
    }
    if (!qr) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const modules = qr.getModuleCount();
    const cell = Math.floor(size / modules);
    const px = cell * modules;
    canvas.width = px;
    canvas.height = px;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#000';
    for (let r = 0; r < modules; r++) {
      for (let col = 0; col < modules; col++) {
        if (qr.isDark(r, col)) {
          ctx.fillRect(col * cell, r * cell, cell, cell);
        }
      }
    }
  }, [text, size, level]);
  return <canvas ref={ref} style={{ width: size, height: size, imageRendering: 'pixelated' }} />;
}
