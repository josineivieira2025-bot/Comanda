import { useState } from 'react';
import { UtensilsCrossed, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import OrderForm from '../components/OrderForm';
import StatusBadge from '../components/StatusBadge';
import { useApp, money } from '../services/AppContext';

export default function Waiter() {
  const { data, tableTotal, user } = useApp();
  const [orderTable, setOrderTable] = useState(null);
  return <div className="waiter-app">
    <header><Link to="/"><ArrowLeft /></Link><div><small>CHEFCONTROL GARÇOM · {user?.name}</small><b>Salão principal</b></div><span>{data.tables.filter(table => table.status !== 'available').length} em atendimento</span></header>
    <main>
      <div className="waiter-heading"><div><h1>Minhas mesas</h1><p>Atualização em tempo real com cozinha e caixa.</p></div></div>
      <div className="waiter-grid">{data.tables.map(table => <article key={table.id}>
        <div><span>MESA</span><h2>{table.number}</h2><StatusBadge status={table.status} /></div>
        <b>{money(tableTotal(table.id))}</b><small>{table.seats} lugares</small>
        <div><button onClick={() => setOrderTable(table.id)}>{table.status === 'available' ? <><UtensilsCrossed /> Abrir comanda e pedir</> : <><Plus /> Fazer pedido</>}</button></div>
      </article>)}</div>
    </main>
    <Modal open={!!orderTable} onClose={() => setOrderTable(null)} title={`Pedido · Mesa ${data.tables.find(table => table.id === orderTable)?.number}`} subtitle="GARÇOM" wide><OrderForm defaultTableId={orderTable} onDone={() => setOrderTable(null)} /></Modal>
  </div>;
}
