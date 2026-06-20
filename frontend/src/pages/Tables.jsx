import { useState } from 'react';
import { Plus, Pencil, Trash2, ReceiptText, DoorOpen, ExternalLink, LayoutGrid, ClipboardList, UtensilsCrossed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import OrderForm from '../components/OrderForm';
import EmptyState from '../components/EmptyState';
import { useApp, money } from '../services/AppContext';

const blank = { number: '', seats: 4, status: 'available', note: '' };
const blankTab = { tableId: '', customerId: '' };
const formatTab = number => String(number).padStart(6, '0');

export default function Tables() {
  const { data, mutate, remove, tableTotal, createTab, resolveCall, orderTotal } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState('tables');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [tabModal, setTabModal] = useState(false);
  const [tabForm, setTabForm] = useState(blankTab);
  const [orderTarget, setOrderTarget] = useState(null);
  const openTabs = data.tables.flatMap(table => (table.tabs || []).map(tab => ({ ...tab, table })));
  const tabOrders = tabId => data.orders.filter(order => order.tabId === tabId && order.status !== 'cancelled');
  const tabTotal = tabId => tabOrders(tabId).reduce((sum, order) => sum + orderTotal(order), 0);

  const openTableEditor = table => { setEditing(table?.id || 'new'); setForm(table || blank); };
  const openTabEditor = tableId => { setTabForm({ tableId: tableId || '', customerId: '' }); setTabModal(true); };

  async function saveTable(event) {
    event.preventDefault();
    await mutate('tables', editing === 'new' ? null : editing, { ...form, seats: Number(form.seats) });
    setEditing(null);
  }

  async function saveTab(event) {
    event.preventDefault();
    await createTab(tabForm.tableId, tabForm.customerId);
    setTabModal(false);
    setTabForm(blankTab);
    setView('tabs');
  }

  function tableAction(table) {
    if (table.status === 'available') openTabEditor(table.id);
    else navigate('/financeiro');
  }

  return <>
    <PageHeader title="Salão & comandas" description="Controle mesas, clientes e comandas abertas em um único lugar.">
      {view === 'tables' ? <button className="primary" onClick={() => openTableEditor()}><Plus /> Cadastrar mesa</button> : <button className="primary" onClick={() => openTabEditor()}><Plus /> Nova comanda</button>}
    </PageHeader>

    <div className="resource-tabs" role="tablist" aria-label="Gestão do salão">
      <button className={view === 'tables' ? 'active' : ''} onClick={() => setView('tables')}><LayoutGrid /> Mesas <span>{data.tables.length}</span></button>
      <button className={view === 'tabs' ? 'active' : ''} onClick={() => setView('tabs')}><ClipboardList /> Comandas abertas <span>{openTabs.length}</span></button>
    </div>

    {view === 'tables' ? <>
      <div className="summary-strip"><span><b>{data.tables.length}</b> mesas</span><span><b>{data.tables.filter(table => table.status === 'available').length}</b> livres</span><span><b>{data.tables.filter(table => table.status !== 'available').length}</b> em atendimento</span><span><b>{money(data.tables.reduce((sum, table) => sum + tableTotal(table.id), 0))}</b> em comandas</span></div>
      <div className="tables-grid">{data.tables.map(table => <article className={`table-card ${table.status}`} key={table.id}>
        <div className="table-card-head"><div><small>MESA</small><h2>{table.number}</h2></div><StatusBadge status={table.status} /></div>
        <div className="table-card-body"><span>{table.seats} lugares · {table.tabs?.length || 0} comanda(s)</span><b>{money(tableTotal(table.id))}</b><small>{table.calls?.[0] ? (table.calls[0].type === 'BILL' ? 'Cliente solicitou a conta' : 'Cliente chamou o garçom') : table.tabs?.map(tab => tab.customer?.name || `Comanda #${formatTab(tab.number)}`).join(' · ') || table.note || 'Sem observações'}</small></div>
        {table.calls?.length > 0 && <button className="call-alert" onClick={() => resolveCall(table.calls[0].id)}>Atender chamado</button>}
        <div className="card-actions"><button onClick={() => tableAction(table)}>{table.status === 'available' ? <><DoorOpen /> Abrir comanda</> : <><ReceiptText /> Ir ao financeiro</>}</button><button aria-label="Editar mesa" onClick={() => openTableEditor(table)}><Pencil /></button><button aria-label="Excluir mesa" onClick={() => confirm('Excluir esta mesa?') && remove('tables', table.id)}><Trash2 /></button><a aria-label="Abrir portal da mesa" href={`/#/mesa/${table.id}`} target="_blank" rel="noreferrer"><ExternalLink /></a></div>
      </article>)}</div>
    </> : <>
      <div className="summary-strip"><span><b>{openTabs.length}</b> abertas</span><span><b>{new Set(openTabs.map(tab => tab.table.id)).size}</b> mesas atendidas</span><span><b>{openTabs.reduce((sum, tab) => sum + tabOrders(tab.id).length, 0)}</b> pedidos</span><span><b>{money(openTabs.reduce((sum, tab) => sum + tabTotal(tab.id), 0))}</b> consumo aberto</span></div>
      <section className="panel data-panel tabs-panel"><div className="table-responsive"><table><thead><tr><th>Comanda</th><th>Cliente</th><th>Mesa</th><th>Pedidos</th><th>Valor acumulado</th><th>Aberta às</th><th>Ações</th></tr></thead><tbody>{openTabs.map(tab => <tr key={tab.id}>
        <td><b>#{formatTab(tab.number)}</b></td>
        <td><b>{tab.customer?.name || 'Cliente avulso'}</b></td>
        <td>Mesa {tab.table.number}</td>
        <td>{tabOrders(tab.id).length}</td>
        <td><b>{money(tabTotal(tab.id))}</b></td>
        <td>{new Date(tab.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
        <td><div className="row-actions"><button className="action-green" onClick={() => setOrderTarget({ tableId: tab.table.id, tabId: tab.id, number: tab.number })}><UtensilsCrossed /> Lançar pedido</button><button onClick={() => navigate('/financeiro')}><ReceiptText /> Financeiro</button></div></td>
      </tr>)}</tbody></table></div>{!openTabs.length && <EmptyState icon={ClipboardList} title="Nenhuma comanda aberta" description="Abra uma comanda para vincular cliente, mesa e pedidos." />}</section>
    </>}

    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nova mesa' : `Editar mesa ${form.number}`} subtitle="SALÃO"><form onSubmit={saveTable}><div className="form-grid"><label>Número<input required value={form.number} onChange={event => setForm({ ...form, number: event.target.value })} /></label><label>Lugares<input type="number" min="1" max="50" required value={form.seats} onChange={event => setForm({ ...form, seats: event.target.value })} /></label><label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="available">Livre</option><option value="occupied">Ocupada</option><option value="reserved">Reservada</option><option value="attention">Atenção</option></select></label><label>Observação<input value={form.note || ''} onChange={event => setForm({ ...form, note: event.target.value })} /></label></div><div className="modal-footer"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="primary">Salvar mesa</button></div></form></Modal>

    <Modal open={tabModal} onClose={() => setTabModal(false)} title="Abrir nova comanda" subtitle="ATENDIMENTO"><form onSubmit={saveTab}><label>Mesa<select required value={tabForm.tableId} onChange={event => setTabForm({ ...tabForm, tableId: event.target.value })}><option value="">Selecione a mesa</option>{data.tables.map(table => <option key={table.id} value={table.id}>Mesa {table.number} · {table.tabs?.length || 0} comanda(s)</option>)}</select></label><label>Cliente<select value={tabForm.customerId} onChange={event => setTabForm({ ...tabForm, customerId: event.target.value })}><option value="">Cliente avulso</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><div className="modal-footer"><button type="button" className="secondary" onClick={() => setTabModal(false)}>Cancelar</button><button className="primary"><ClipboardList /> Abrir comanda</button></div></form></Modal>

    <Modal open={!!orderTarget} onClose={() => setOrderTarget(null)} title={`Pedido · Comanda #${formatTab(orderTarget?.number || '')}`} subtitle="LANÇAMENTO" wide><OrderForm defaultTableId={orderTarget?.tableId} defaultTabId={orderTarget?.tabId} onDone={() => setOrderTarget(null)} /></Modal>
  </>;
}
