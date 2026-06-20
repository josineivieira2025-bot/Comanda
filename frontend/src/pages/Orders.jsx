import { useEffect, useState } from 'react';
import { Plus, XCircle, ChefHat, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import OrderForm from '../components/OrderForm';
import { useApp, money, orderNumber } from '../services/AppContext';

export default function Orders() {
  const { data, orderTotal, updateOrder } = useApp();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('novo') === '1');
  useEffect(() => { if (params.get('novo') === '1') setOpen(true); }, [params]);
  const next = { open: 'preparing', preparing: 'ready', ready: 'delivered' };
  const closeModal = () => { setOpen(false); setParams({}); };

  return <>
    <PageHeader title="Pedidos" description="Do lançamento à entrega, com rastreabilidade por mesa e cliente."><button className="primary" onClick={() => setOpen(true)}><Plus /> Novo pedido</button></PageHeader>
    <section className="panel data-panel"><div className="table-responsive"><table><thead><tr><th>Pedido</th><th>Mesa / cliente</th><th>Itens</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.orders.map(order => {
      const table = data.tables.find(item => item.id === order.tableId);
      const client = data.customers.find(item => item.id === order.customerId);
      return <tr key={order.id}>
        <td><b>#{orderNumber(order.number)}</b><small>{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></td>
        <td><b>Mesa {table?.number || '—'}</b><small>{client?.name || 'Não identificado'}</small></td>
        <td>{order.items.map(item => <span className="item-line" key={item.id}>{item.qty}× {data.products.find(product => product.id === item.productId)?.name}</span>)}</td>
        <td><b>{money(orderTotal(order))}</b></td><td><StatusBadge status={order.status} /></td>
        <td><div className="row-actions">{next[order.status] && <button className="action-green" onClick={() => updateOrder(order.id, next[order.status])}>{order.status === 'ready' ? <CheckCircle2 /> : <ChefHat />}{order.status === 'open' ? 'Enviar cozinha' : order.status === 'preparing' ? 'Marcar pronto' : 'Entregar'}</button>}{!['cancelled', 'delivered'].includes(order.status) && <button className="action-danger" onClick={() => updateOrder(order.id, 'cancelled')}><XCircle /> Cancelar</button>}</div></td>
      </tr>;
    })}</tbody></table></div></section>
    <Modal open={open} onClose={closeModal} title="Novo pedido" subtitle="LANÇAMENTO" wide><OrderForm onDone={closeModal} /></Modal>
  </>;
}
