import { useEffect, useState } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import OrderForm from '../components/OrderForm';
import { useApp, money, orderNumber } from '../services/AppContext';

export default function Orders() {
  const { data, orderTotal, updateOrder, can } = useApp();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('novo') === '1');
  useEffect(() => { if (params.get('novo') === '1') setOpen(true); }, [params]);
  const closeModal = () => { setOpen(false); setParams({}); };

  return <>
    <PageHeader title="Pedidos">{can('orders.edit') && <button className="primary" onClick={() => setOpen(true)}><Plus /> Novo pedido</button>}</PageHeader>
    <section className="panel data-panel"><div className="table-responsive"><table><thead><tr><th>Pedido</th><th>Comanda / entrega</th><th>Itens</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.orders.map(order => {
      const table = data.tables.find(item => item.id === order.tableId);
      const client = data.customers.find(item => item.id === order.customerId);
      return <tr key={order.id}>
        <td><b>#{orderNumber(order.number)}</b><small>{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></td>
        <td><b>Comanda #{String(order.commandCardNumber || '').padStart(3, '0')}</b><small>Mesa {table?.number || '—'} · {client?.name || 'Não identificado'}</small></td>
        <td>{order.items.map(item => <span className="item-line" key={item.id}>{item.qty}× {data.products.find(product => product.id === item.productId)?.name}</span>)}</td>
        <td><b>{money(orderTotal(order))}</b></td><td><StatusBadge status={order.status} /></td>
        <td><div className="row-actions">{can('orders.edit') && order.status === 'ready' ? <button className="action-green" onClick={() => updateOrder(order.id, 'delivered')}><CheckCircle2 /> Marcar como entregue</button> : <span>—</span>}</div></td>
      </tr>;
    })}</tbody></table></div></section>
    <Modal open={open && can('orders.edit')} onClose={closeModal} title="Novo pedido" subtitle="LANÇAMENTO" wide><OrderForm onDone={closeModal} /></Modal>
  </>;
}
