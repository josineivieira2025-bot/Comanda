import { useEffect, useState } from 'react';
import { Save, ExternalLink, Copy, Check } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../services/AppContext';

export default function Settings() {
  const { data, saveSettings, notify } = useApp();
  const [form, setForm] = useState(data.settings);
  const [copied, setCopied] = useState('');
  useEffect(() => setForm(data.settings), [data.settings]);
  async function save(event) { event.preventDefault(); await saveSettings(form); }
  async function copy(value, label) { await navigator.clipboard.writeText(value); setCopied(label); notify('Link copiado.'); setTimeout(() => setCopied(''), 1800); }
  const publicMenu = `${window.location.origin}/#/cardapio/${data.settings.slug || ''}`.replace(/\/$/, '');
  return <>
    <PageHeader title="Configurações" description="Identidade da unidade e links públicos salvos no banco."><span className="live"><i /> Dados sincronizados</span></PageHeader>
    <div className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <div className="panel-head"><div><h2>Dados da unidade</h2><p>Informações exibidas em toda a plataforma</p></div></div>
        <label>Nome do restaurante<input required minLength="2" value={form.restaurant || ''} onChange={event => setForm({ ...form, restaurant: event.target.value })} /></label>
        <label>Cidade / unidade<input value={form.city || ''} onChange={event => setForm({ ...form, city: event.target.value })} /></label>
        <label>Taxa de serviço (%)<input type="number" min="0" max="30" step="0.1" value={form.serviceFee} onChange={event => setForm({ ...form, serviceFee: event.target.value })} /></label>
        <label>Identificador público<input value={form.slug || ''} readOnly /></label>
        <button className="primary"><Save /> Salvar no banco</button>
      </form>
      <section className="panel access-links">
        <div className="panel-head"><div><h2>Acessos públicos</h2><p>Compartilhe com equipe e clientes</p></div></div>
        <LinkRow label="Cardápio público" value={publicMenu} copied={copied} onCopy={copy} />
        <LinkRow label="Aplicativo do garçom" value={`${window.location.origin}/#/garcom`} copied={copied} onCopy={copy} />
        {data.tables.slice(0, 4).map(table => <LinkRow key={table.id} label={`Portal da mesa ${table.number}`} value={`${window.location.origin}/#/mesa/${table.id}`} copied={copied} onCopy={copy} />)}
      </section>
    </div>
  </>;
}

function LinkRow({ label, value, copied, onCopy }) {
  return <div className="access-link"><span><b>{label}</b><small>{value}</small></span><button className="icon-btn" onClick={() => onCopy(value, label)}>{copied === label ? <Check /> : <Copy />}</button><a className="icon-btn" href={value} target="_blank" rel="noreferrer"><ExternalLink /></a></div>;
}
