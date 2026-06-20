import { useEffect, useState } from 'react';
import { Play, Check, Clock3, ChefHat } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { orderNumber, useApp } from '../services/AppContext';

const sectors = ['todos', 'cozinha', 'bar', 'churrasqueira', 'sobremesa'];

function elapsedMinutes(order) {
  const reference = order.status === 'preparing' ? (order.startedAt || order.createdAt) : order.createdAt;
  const timestamp = new Date(reference).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

export default function KDS() {
  const { data, updateOrder } = useApp();
  const [sector, setSector] = useState('todos');
  const [, tick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => tick(value => value + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const active = data.orders
    .filter(order => ['open', 'preparing'].includes(order.status))
    .filter(order => sector === 'todos' || order.items.some(item => data.products.find(product => product.id === item.productId)?.sector === sector));

  return <>
    <PageHeader title="Produção KDS" description="Fila de preparo atualizada em tempo real pelos pedidos da operação."><div className="live"><i /> KDS conectado</div></PageHeader>
    <div className="sector-tabs">{sectors.map(item => <button className={sector === item ? 'active' : ''} onClick={() => setSector(item)} key={item}>{item}</button>)}</div>
    <div className="kds-board">{active.map(order => {
      const minutes = elapsedMinutes(order);
      const preparing = order.status === 'preparing';
      return <article className={`kds-card ${minutes > 15 ? 'late' : ''}`} key={order.id}>
        <div className="kds-card-head"><div><small>PEDIDO #{orderNumber(order.number)} · COMANDA #{String(order.commandCardNumber || '').padStart(3, '0')}</small><h2>Mesa {data.tables.find(table => table.id === order.tableId)?.number}</h2></div><span className="timer"><Clock3 />{preparing ? 'Em produção' : 'Aguardando'} · {minutes} min</span></div>
        <div className="kds-items">{order.items.map(item => { const product = data.products.find(candidate => candidate.id === item.productId); return <div key={item.id}><b>{item.qty}× {product?.name}</b><span>{product?.sector}</span>{item.note && <small>{item.note}</small>}</div>; })}</div>
        <div className="kds-actions">{preparing ? <button onClick={() => updateOrder(order.id, 'ready')}><Check /> Marcar como pronto</button> : <button onClick={() => updateOrder(order.id, 'preparing')}><Play /> Iniciar preparo</button>}</div>
      </article>;
    })}{!active.length && <div className="empty-state"><ChefHat /><b>Produção em dia</b><span>Nenhum pedido aguardando preparo.</span></div>}</div>
  </>;
}
