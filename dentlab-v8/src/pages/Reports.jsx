import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { cases as Cases, expenses as Exp, profiles as Profiles, dentistPayments as DP, suppliers as Sup } from '../lib/db';
import { Btn, Card, Stat } from '../components/UI';
import { filterByPeriod, exportCSV } from '../lib/helpers';

export default function ReportsPage() {
  const { theme: c, FS, t, money } = useApp();
  const [tab, setTab] = useState('general');
  const [period, setPeriod] = useState('monthly');
  const [d, setD] = useState({ cases: [], expenses: [], profs: [], payments: [], sups: [] });

  useEffect(() => { (async () => {
    const [a, b, p, dp, s] = await Promise.all([Cases.list(), Exp.list(), Profiles.list(), DP.list(), Sup.list()]);
    setD({ cases: a.data || [], expenses: b.data || [], profs: p.data || [], payments: dp.data || [], sups: s.data || [] });
  })(); }, []);

  const fc  = filterByPeriod(d.cases, 'created_at', period);
  const fe  = filterByPeriod(d.expenses, 'date', period);
  const fp  = filterByPeriod(d.payments, 'date', period);
  const brut = fc.reduce((s, x) => s + Number(x.total_price || 0), 0);
  const paid = fc.filter(x => x.paid).reduce((s, x) => s + Number(x.total_price || 0), 0);
  const unpaid = brut - paid;
  const exp  = fe.reduce((s, x) => s + Number(x.amount || 0), 0);
  const benefice = paid - exp;

  const dentists = d.profs.filter(p => p.role === 'dentist');

  const doExport = () => {
    const base = tab === 'general' ? fc : tab === 'dentistes' ? dentists.map(dt => {
      const ics = fc.filter(c => c.dentist_id === dt.id);
      const inv = ics.reduce((s, c) => s + Number(c.total_price || 0), 0);
      const pay = fp.filter(p => p.dentist_id === dt.id).reduce((s, p) => s + Number(p.amount || 0), 0);
      return { dentiste: dt.name, commandes: ics.length, facture: inv, verse: pay, reste: inv - pay };
    }) : tab === 'fournisseurs' ? d.sups.map(s => {
      const due = (s.supplier_purchases || []).reduce((a, p) => a + Number(p.total || 0), 0);
      const pay = (s.supplier_payments || []).reduce((a, p) => a + Number(p.amount || 0), 0);
      return { fournisseur: s.name, total: due, verse: pay, reste: due - pay };
    }) : fe;
    exportCSV(`rapport_${tab}_${period}.csv`, base);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {['general', 'dentistes', 'fournisseurs', 'depenses'].map(tb => (
          <Btn key={tb} sm primary={tab === tb} onClick={() => setTab(tb)}>{tb}</Btn>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['daily', 'monthly', 'yearly', 'all'].map(p => (
          <Btn key={p} sm primary={period === p} onClick={() => setPeriod(p)}>{p === 'daily' ? 'Jour' : p === 'monthly' ? 'Mois' : p === 'yearly' ? 'Année' : 'Tout'}</Btn>
        ))}
        <Btn sm onClick={doExport}>{t('export')} CSV</Btn>
      </div>

      {tab === 'general' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Stat label="Chiffre brut" val={money(brut)} />
          <Stat label={t('paid')} val={money(paid)} accent={c.ok} />
          <Stat label={t('unpaid')} val={money(unpaid)} accent={c.dng} />
          <Stat label="Dépenses" val={money(exp)} accent={c.dng} />
          <Stat label="Bénéfice" val={money(benefice)} accent={benefice >= 0 ? c.ok : c.dng} />
        </div>
      )}

      {tab === 'dentistes' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FS - 2 }}>
            <thead><tr style={{ background: c.ac, color: '#fff' }}><th style={{ padding: 8, textAlign: 'left' }}>Dentiste</th><th>Cmd</th><th style={{ textAlign: 'right' }}>Facturé</th><th style={{ textAlign: 'right' }}>Versé</th><th style={{ textAlign: 'right' }}>Reste</th></tr></thead>
            <tbody>{dentists.map(dt => {
              const ics = fc.filter(cc => cc.dentist_id === dt.id);
              const inv = ics.reduce((s, cc) => s + Number(cc.total_price || 0), 0);
              const pay = fp.filter(pp => pp.dentist_id === dt.id).reduce((s, pp) => s + Number(pp.amount || 0), 0);
              return <tr key={dt.id} style={{ borderBottom: '1px solid ' + c.bdrL }}><td style={{ padding: 6 }}>{dt.name}</td><td style={{ textAlign: 'center' }}>{ics.length}</td><td style={{ textAlign: 'right' }}>{money(inv)}</td><td style={{ textAlign: 'right', color: c.ok }}>{money(pay)}</td><td style={{ textAlign: 'right', color: c.dng }}>{money(inv - pay)}</td></tr>;
            })}</tbody>
          </table>
        </Card>
      )}

      {tab === 'fournisseurs' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FS - 2 }}>
            <thead><tr style={{ background: c.ac, color: '#fff' }}><th style={{ padding: 8, textAlign: 'left' }}>Fournisseur</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Versé</th><th style={{ textAlign: 'right' }}>Reste</th></tr></thead>
            <tbody>{d.sups.map(s => {
              const due = (s.supplier_purchases || []).reduce((a, p) => a + Number(p.total || 0), 0);
              const pay = (s.supplier_payments || []).reduce((a, p) => a + Number(p.amount || 0), 0);
              return <tr key={s.id} style={{ borderBottom: '1px solid ' + c.bdrL }}><td style={{ padding: 6 }}>{s.name}</td><td style={{ textAlign: 'right' }}>{money(due)}</td><td style={{ textAlign: 'right', color: c.ok }}>{money(pay)}</td><td style={{ textAlign: 'right', color: c.dng }}>{money(due - pay)}</td></tr>;
            })}</tbody>
          </table>
        </Card>
      )}

      {tab === 'depenses' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FS - 2 }}>
            <thead><tr style={{ background: c.ac, color: '#fff' }}><th style={{ padding: 8, textAlign: 'left' }}>Date</th><th style={{ textAlign: 'left' }}>Catégorie</th><th style={{ textAlign: 'left' }}>Libellé</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>{fe.map(x => <tr key={x.id} style={{ borderBottom: '1px solid ' + c.bdrL }}><td style={{ padding: 6 }}>{x.date}</td><td>{x.category}</td><td>{x.label}</td><td style={{ textAlign: 'right' }}>{money(x.amount)}</td></tr>)}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
