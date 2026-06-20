import { useState } from 'react';
import { Plus, Pencil, Trash2, ReceiptText, DoorOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import OrderForm from '../components/OrderForm';
import { useApp, money } from '../services/AppContext';

const blank = { number: '', seats: 4, status: 'available', note: '' };

export default function Tables() {
  const { data, mutate, remove, tableTotal, resolveCall } = useApp();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [orderTable, setOrderTable] = useState(null);
  const open = table => { setEditing(table?.id || 'new'); setForm(table || blank); };
  async function save(event) { event.preventDefault(); await mutate('tables', editing === 'new' ? null : editing, { ...form, seats: Number(form.seats) }); setEditing(null); }
  function toggle(table) { if (table.status === 'available') setOrderTable(table.id); else navigate('/financeiro'); }

  return <>
    <PageHeader title="Salão & mesas" description="Comandas, reservas e ocupação sincronizadas com o banco."><button className="primary" onClick={() => open()}><Plus /> Cadastrar mesa</button></PageHeader>
    <div className="summary-strip"><span><b>{data.tables.length}</b> mesas</span><span><b>{data.tables.filter(table => table.status === 'available').length}</b> livres</span><span><b>{data.tables.filter(table => table.status === 'occupied').length}</b> ocupadas</span><span><b>{money(data.tables.reduce((sum, table) => sum + tableTotal(table.id), 0))}</b> em comandas</span></div>
    <div className="tables-grid">{data.tables.map(table => <article className={`table-card ${table.status}`} key={table.id}>
      <div className="table-card-head"><div><small>MESA</small><h2>{table.number}</h2></div><StatusBadge status={table.status} /></div>
      <div className="table-card-body"><span>{table.seats} lugares · {table.tabs?.length || 0} comanda(s)</span><b>{money(tableTotal(table.id))}</b><small>{table.calls?.[0] ? (table.calls[0].type === 'BILL' ? 'Cliente solicitou a conta' : 'Cliente chamou o garçom') : table.tabs?.map(tab => tab.customer?.name || `Comanda #${String(tab.number).padStart(6, '0')}`).join(' · ') || table.note || 'Sem observações'}</small></div>
      {table.calls?.length > 0 && <button className="call-alert" onClick={() => resolveCall(table.calls[0].id)}>Atender chamado</button>}
      <div className="card-actions"><button onClick={() => toggle(table)}>{table.status === 'available' ? <><DoorOpen /> Abrir comanda</> : <><ReceiptText /> Ir ao financeiro</>}</button><button aria-label="Editar mesa" onClick={() => open(table)}><Pencil /></button><button aria-label="Excluir mesa" onClick={() => confirm('Excluir esta mesa?') && remove('tables', table.id)}><Trash2 /></button><a aria-label="Abrir portal da mesa" href={`/#/mesa/${table.id}`} target="_blank" rel="noreferrer"><ExternalLink /></a></div>
    </article>)}</div>
    <Modal open={!!orderTable} onClose={() => setOrderTable(null)} title={`Abrir comanda · Mesa ${data.tables.find(table => table.id === orderTable)?.number}`} subtitle="ATENDIMENTO" wide><OrderForm defaultTableId={orderTable} onDone={() => setOrderTable(null)} /></Modal>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nova mesa' : `Editar mesa ${form.number}`} subtitle="SALÃO"><form onSubmit={save}><div className="form-grid"><label>Número<input required value={form.number} onChange={event => setForm({ ...form, number: event.target.value })} /></label><label>Lugares<input type="number" min="1" max="50" required value={form.seats} onChange={event => setForm({ ...form, seats: event.target.value })} /></label><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="available">Livre</option><option value="occupied">Ocupada</option><option value="reserved">Reservada</option><option value="attention">Atenção</option></select></label><label>Observação<input value={form.note || ''} onChange={event => setForm({ ...form, note: event.target.value })} /></label></div><div className="modal-footer"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="primary">Salvar mesa</button></div></form></Modal>
  </>;
}
