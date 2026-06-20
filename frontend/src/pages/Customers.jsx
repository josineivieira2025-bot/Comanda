import { useState } from 'react';
import { Plus, Pencil, Trash2, History } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp, money, orderNumber } from '../services/AppContext';

const blank = { name: '', phone: '', cpf: '', visits: 0 };

export default function Customers() {
  const { data, mutate, remove, orderTotal, notify } = useApp();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [history, setHistory] = useState(null);
  const orders = id => data.orders.filter(order => order.customerId === id && order.status !== 'cancelled');
  const open = customer => { setEditing(customer?.id || 'new'); setForm(customer || blank); };

  function save(event) {
    event.preventDefault();
    mutate('customers', editing === 'new' ? null : editing, { ...form, visits: Number(form.visits || 0) });
    setEditing(null);
    notify('Cliente salvo.');
  }

  return <>
    <PageHeader title="Clientes" description="Cadastro, frequência e histórico de consumo."><button className="primary" onClick={() => open()}><Plus /> Novo cliente</button></PageHeader>
    <section className="panel data-panel"><table><thead><tr><th>Cliente</th><th>Contato</th><th>CPF</th><th>Visitas</th><th>Ticket médio</th><th>Ações</th></tr></thead><tbody>{data.customers.map(customer => {
      const list = orders(customer.id);
      const total = list.reduce((sum, order) => sum + orderTotal(order), 0);
      return <tr key={customer.id}><td><b>{customer.name}</b></td><td>{customer.phone}</td><td>{customer.cpf || '—'}</td><td>{customer.visits + list.length}</td><td><b>{money(list.length ? total / list.length : 0)}</b></td><td><div className="row-actions"><button onClick={() => setHistory(customer)}><History /> Histórico</button><button onClick={() => open(customer)}><Pencil /></button><button onClick={() => confirm('Excluir cliente?') && remove('customers', customer.id)}><Trash2 /></button></div></td></tr>;
    })}</tbody></table></section>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo cliente' : 'Editar cliente'} subtitle="CRM"><form onSubmit={save}><label>Nome<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><div className="form-grid"><label>Telefone<input required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></label><label>CPF (opcional)<input value={form.cpf} onChange={event => setForm({ ...form, cpf: event.target.value })} /></label></div><div className="modal-footer"><button className="primary">Salvar cliente</button></div></form></Modal>
    <Modal open={!!history} onClose={() => setHistory(null)} title={history?.name} subtitle="HISTÓRICO DE CONSUMO"><div className="history-list">{history && orders(history.id).map(order => <article key={order.id}><div><b>Pedido #{orderNumber(order.number)}</b><small>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</small></div><b>{money(orderTotal(order))}</b></article>)}{history && !orders(history.id).length && <p>Nenhum consumo identificado.</p>}</div></Modal>
  </>;
}
