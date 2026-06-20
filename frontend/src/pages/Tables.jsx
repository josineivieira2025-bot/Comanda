import { useState } from 'react';
import { Plus, Pencil, Trash2, ReceiptText, ExternalLink, LayoutGrid, ClipboardList, UtensilsCrossed, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import OrderForm from '../components/OrderForm';
import EmptyState from '../components/EmptyState';
import { useApp, money } from '../services/AppContext';

const blank = { number: '', seats: 4, status: 'available', note: '' };
const blankRange = { start: 1, end: 300 };
const cardNumber = number => String(number).padStart(3, '0');

export default function Tables() {
  const { data, mutate, remove, tableTotal, createCommandCards, toggleCommandCard, resolveCall, orderTotal } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState('tables');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [rangeModal, setRangeModal] = useState(false);
  const [range, setRange] = useState(blankRange);
  const [orderTarget, setOrderTarget] = useState(null);
  const activeCards = data.commandCards.filter(card => card.active);
  const cardsInUse = activeCards.filter(card => card.openTab);
  const tabOrders = tabId => data.orders.filter(order => order.tabId === tabId && order.status !== 'cancelled');
  const tabTotal = tabId => tabOrders(tabId).reduce((sum, order) => sum + orderTotal(order), 0);

  const openTableEditor = table => { setEditing(table?.id || 'new'); setForm(table || blank); };

  async function saveTable(event) {
    event.preventDefault();
    await mutate('tables', editing === 'new' ? null : editing, { ...form, seats: Number(form.seats) });
    setEditing(null);
  }

  async function saveRange(event) {
    event.preventDefault();
    await createCommandCards(range.start, range.end);
    setRangeModal(false);
    setView('cards');
  }

  return <>
    <PageHeader title="Salão & comandas">
      {view === 'tables' ? <button className="primary" onClick={() => openTableEditor()}><Plus /> Cadastrar mesa</button> : <button className="primary" onClick={() => setRangeModal(true)}><Plus /> Cadastrar comandas</button>}
    </PageHeader>

    <div className="resource-tabs" role="tablist" aria-label="Gestão do salão">
      <button className={view === 'tables' ? 'active' : ''} onClick={() => setView('tables')}><LayoutGrid /> Mesas <span>{data.tables.length}</span></button>
      <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}><ClipboardList /> Comandas físicas <span>{activeCards.length}</span></button>
    </div>

    {view === 'tables' ? <>
      <div className="summary-strip"><span><b>{data.tables.length}</b> mesas</span><span><b>{data.tables.filter(table => table.status === 'available').length}</b> livres</span><span><b>{data.tables.filter(table => table.status !== 'available').length}</b> em atendimento</span><span><b>{money(data.tables.reduce((sum, table) => sum + tableTotal(table.id), 0))}</b> em atendimento</span></div>
      <div className="tables-grid">{data.tables.map(table => <article className={`table-card ${table.status}`} key={table.id}>
        <div className="table-card-head"><div><small>MESA DE ENTREGA</small><h2>{table.number}</h2></div><StatusBadge status={table.status} /></div>
        <div className="table-card-body"><span>{table.seats} lugares</span><b>{money(tableTotal(table.id))}</b><small>{table.calls?.[0] ? (table.calls[0].type === 'BILL' ? 'Cliente solicitou a conta' : 'Cliente chamou o garçom') : table.note || 'Selecione esta mesa ao lançar um pedido'}</small></div>
        {table.calls?.length > 0 && <button className="call-alert" onClick={() => resolveCall(table.calls[0].id)}>Atender chamado</button>}
        <div className="card-actions"><button onClick={() => setOrderTarget({ tableId: table.id })}><UtensilsCrossed /> Lançar pedido</button><button aria-label="Editar mesa" onClick={() => openTableEditor(table)}><Pencil /></button><button aria-label="Excluir mesa" onClick={() => confirm('Excluir esta mesa?') && remove('tables', table.id)}><Trash2 /></button><a aria-label="Abrir portal da mesa" href={`/#/mesa/${table.id}`} target="_blank" rel="noreferrer"><ExternalLink /></a></div>
      </article>)}</div>
    </> : <>
      <div className="summary-strip"><span><b>{activeCards.length}</b> cadastradas</span><span><b>{activeCards.length - cardsInUse.length}</b> livres</span><span><b>{cardsInUse.length}</b> em uso</span><span><b>{money(cardsInUse.reduce((sum, card) => sum + tabTotal(card.openTab.id), 0))}</b> consumo aberto</span></div>
      <section className="panel data-panel tabs-panel"><div className="table-responsive"><table><thead><tr><th>Ficha física</th><th>Status</th><th>Cliente</th><th>Mesa atual</th><th>Pedidos</th><th>Valor acumulado</th><th>Ações</th></tr></thead><tbody>{data.commandCards.map(card => {
        const tab = card.openTab;
        const orders = tab ? tabOrders(tab.id) : [];
        return <tr key={card.id} className={!card.active ? 'row-disabled' : ''}>
          <td><b>Comanda #{cardNumber(card.number)}</b><small>Ficha reutilizável</small></td>
          <td><span className={`command-card-status ${tab ? 'in-use' : card.active ? 'free' : 'inactive'}`}>{tab ? 'Em uso' : card.active ? 'Livre' : 'Inativa'}</span></td>
          <td><b>{tab?.customer?.name || (tab ? 'Cliente não identificado' : '—')}</b></td>
          <td>{tab?.table ? `Mesa ${tab.table.number}` : '—'}</td>
          <td>{orders.length}</td>
          <td><b>{money(tab ? tabTotal(tab.id) : 0)}</b></td>
          <td><div className="row-actions">{card.active && <button className="action-green" onClick={() => setOrderTarget({ commandCardId: card.id, tabId: tab?.id, tableId: tab?.table?.id, number: card.number })}><UtensilsCrossed /> Lançar pedido</button>}{tab && <button onClick={() => navigate('/financeiro')}><ReceiptText /> Receber</button>}<button title={card.active ? 'Desativar ficha' : 'Ativar ficha'} onClick={() => toggleCommandCard(card.id, !card.active)}><Power /> {card.active ? 'Desativar' : 'Ativar'}</button></div></td>
        </tr>;
      })}</tbody></table></div>{!data.commandCards.length && <EmptyState icon={ClipboardList} title="Nenhuma ficha cadastrada" description="Cadastre uma faixa, por exemplo de 001 até 300. Cada pessoa recebe uma ficha na entrada." />}</section>
    </>}

    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nova mesa' : `Editar mesa ${form.number}`} subtitle="SALÃO"><form onSubmit={saveTable}><div className="form-grid"><label>Número<input required value={form.number} onChange={event => setForm({ ...form, number: event.target.value })} /></label><label>Lugares<input type="number" min="1" max="50" required value={form.seats} onChange={event => setForm({ ...form, seats: event.target.value })} /></label><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="available">Livre</option><option value="occupied">Ocupada</option><option value="reserved">Reservada</option><option value="attention">Atenção</option></select></label><label>Observação<input value={form.note || ''} onChange={event => setForm({ ...form, note: event.target.value })} /></label></div><div className="modal-footer"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="primary">Salvar mesa</button></div></form></Modal>

    <Modal open={rangeModal} onClose={() => setRangeModal(false)} title="Cadastrar fichas físicas" subtitle="COMANDAS"><form onSubmit={saveRange}><p className="modal-help">Crie a numeração das fichas entregues aos clientes na entrada. Exemplo: de 1 até 300.</p><div className="form-grid"><label>Número inicial<input type="number" min="1" required value={range.start} onChange={event => setRange({ ...range, start: event.target.value })} /></label><label>Número final<input type="number" min="1" required value={range.end} onChange={event => setRange({ ...range, end: event.target.value })} /></label></div><div className="modal-footer"><button type="button" className="secondary" onClick={() => setRangeModal(false)}>Cancelar</button><button className="primary"><ClipboardList /> Cadastrar faixa</button></div></form></Modal>

    <Modal open={!!orderTarget} onClose={() => setOrderTarget(null)} title={orderTarget?.number ? `Pedido · Comanda #${cardNumber(orderTarget.number)}` : 'Novo pedido'} subtitle="LANÇAMENTO" wide><OrderForm defaultTableId={orderTarget?.tableId} defaultTabId={orderTarget?.tabId} defaultCommandCardId={orderTarget?.commandCardId} onDone={() => setOrderTarget(null)} /></Modal>
  </>;
}
