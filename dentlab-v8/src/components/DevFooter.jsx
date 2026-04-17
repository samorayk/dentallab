import { useEffect, useState } from 'react';
import { branding } from '../lib/db';

/**
 * Developer credit footer. Reads from the `app_branding` table in Supabase.
 *
 * To set your info, run this ONCE in Supabase SQL editor:
 *
 *   update app_branding set
 *     dev_name  = 'Your Name',
 *     dev_phone = '+213 XXX XX XX XX',
 *     dev_email = 'you@example.com',
 *     dev_site  = 'https://your-site.com'
 *   where id = 1;
 *
 * Pass `dark` prop for dark backgrounds (sidebar), omit for light (login).
 */
export default function DevFooter({ dark = false }) {
  const [brand, setBrand] = useState(null);

  useEffect(() => {
    let mounted = true;
    branding.get()
      .then(({ data }) => { if (mounted && data) setBrand(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!brand || (!brand.dev_name && !brand.dev_phone && !brand.dev_email)) return null;

  const baseColor = dark ? '#95D5B2' : '#9B9182';
  const accentColor = dark ? '#B7E4C7' : '#2D6A4F';

  return (
    <div style={{
      marginTop: 12,
      padding: '10px 8px',
      borderTop: dark ? '1px solid rgba(82,183,136,.2)' : '1px solid #E4DFD6',
      fontSize: 10,
      color: baseColor,
      lineHeight: 1.4,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>
        Développé par
      </div>
      {brand.dev_name && <div style={{ fontWeight: 700, color: accentColor, fontSize: 11 }}>{brand.dev_name}</div>}
      {brand.dev_phone && (
        <div style={{ marginTop: 2 }}>
          <a href={`tel:${brand.dev_phone}`} style={{ color: baseColor, textDecoration: 'none' }}>📞 {brand.dev_phone}</a>
        </div>
      )}
      {brand.dev_email && (
        <div>
          <a href={`mailto:${brand.dev_email}`} style={{ color: baseColor, textDecoration: 'none' }}>✉️ {brand.dev_email}</a>
        </div>
      )}
      {brand.dev_site && (
        <div>
          <a href={brand.dev_site} target="_blank" rel="noopener noreferrer" style={{ color: baseColor, textDecoration: 'none' }}>
            🌐 {brand.dev_site.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}
    </div>
  );
}
