import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { settingsApi, types as Types, labs as Labs } from '../lib/db';
import { Btn, Inp, Card, Lbl, Plus } from '../components/UI';
import { LANGS } from '../i18n';
import { CURRENCIES } from '../lib/helpers';

export default function SettingsPage() {
  const { theme: c, FS, t, settings, refreshSettings, labId, lab } = useApp();
  const [s, setS] = useState(settings);
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState({ name: '', elems: 1, price: 0 });
  const [labName, setLabName] = useState(lab?.name || '');

  useEffect(() => { setS(settings); setLabName(lab?.name || ''); }, [settings, lab]);
  useEffect(() => { (async () => { const { data } = await Types.list(); setTypes(data || []); })(); }, []);

  const saveSettings = async () => {
    await settingsApi.update(labId, { lang: s.lang, font_size: Number(s.font_size), theme_color: s.theme_color, currency: s.currency || 'DZD' });
    await refreshSettings();
    alert('✓ ' + t('save'));
  };
  const saveLab = async () => { if (!lab) return; await Labs.update(lab.id, { name: labName }); alert('✓'); };

  const addType = async () => {
    if (!newType.name) return;
    await Types.create({ lab_id: labId, name: newType.name, elems: Number(newType.elems), price: Number(newType.price) });
    setNewType({ name: '', elems: 1, price: 0 });
    const { data } = await Types.list(); setTypes(data || []);
  };
  const delType = async (id) => { await Types.delete(id); const { data } = await Types.list(); setTypes(data || []); };

  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <Card>
        <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>🎨 {t('personalization')}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <Lbl>{t('fontSize')}: {s.font_size}px</Lbl>
            <input type="range" min="10" max="18" step="0.5" value={s.font_size} onChange={e => setS({ ...s, font_size: e.target.value })} style={{ width: '100%' }} />
          </div>
          <div>
            <Lbl>{t('themeColor')}</Lbl>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="color" value={s.theme_color} onChange={e => setS({ ...s, theme_color: e.target.value })} style={{ width: 50, height: 36, border: 'none', cursor: 'pointer' }} />
              <Inp value={s.theme_color} onChange={e => setS({ ...s, theme_color: e.target.value })} style={{ flex: 1 }} />
            </div>
          </div>
          <div>
            <Lbl>{t('language')}</Lbl>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {LANGS.map(L => (
                <button key={L.code} onClick={() => setS({ ...s, lang: L.code })}
                  style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid ' + (s.lang === L.code ? c.ac : c.bdr), background: s.lang === L.code ? c.acL : '#fff', color: c.tx, cursor: 'pointer', fontSize: FS - 2, fontWeight: 600 }}>
                  {L.flag} {L.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>Monnaie</Lbl>
            <select value={s.currency || 'DZD'} onChange={e => setS({ ...s, currency: e.target.value })}
              style={{ width: '100%', padding: 9, border: '1px solid ' + c.bdr, borderRadius: 7, background: '#fff', fontSize: FS - 1 }}>
              {CURRENCIES.map(cc => <option key={cc.code} value={cc.code}>{cc.label}</option>)}
            </select>
          </div>
          <Btn primary onClick={saveSettings}>{t('save')}</Btn>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>🏢 Laboratoire</div>
        <div><Lbl>Nom du laboratoire</Lbl><Inp value={labName} onChange={e => setLabName(e.target.value)} /></div>
        <Btn primary onClick={saveLab} style={{ marginTop: 8 }}>{t('save')}</Btn>
      </Card>

      <Card>
        <div style={{ fontSize: FS + 1, fontWeight: 700, marginBottom: 10 }}>🦷 Types de prothèse</div>
        <div style={{ marginBottom: 10 }}>
          {types.map(tp => (
            <div key={tp.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid ' + c.bdrL, fontSize: FS - 2 }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{tp.name}</span>
              <span style={{ color: c.txL }}>{tp.elems} él · {tp.price} DA</span>
              <button onClick={() => delType(tp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.dng }}>🗑</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 6 }}>
          <Inp placeholder="Nom" value={newType.name} onChange={e => setNewType({ ...newType, name: e.target.value })} />
          <Inp type="number" placeholder="Él." value={newType.elems} onChange={e => setNewType({ ...newType, elems: e.target.value })} />
          <Inp type="number" placeholder="Prix" value={newType.price} onChange={e => setNewType({ ...newType, price: e.target.value })} />
          <Btn primary onClick={addType}>{Plus}</Btn>
        </div>
      </Card>
    </div>
  );
}
