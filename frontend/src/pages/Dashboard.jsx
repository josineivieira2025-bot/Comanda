import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Flame, Check, TrendingUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useApp, money } from '../services/AppContext';

export default function Dashboard() {
  const { data, user, tableTotal, orderTotal, updateOrder } = useApp();
  const navigate = useNavigate();
  const sales = data.transactions.filter(item => item.type === 'sale').reduce((sum, item) => sum + item.amount, 0);
  const occupied = data.tables.filter(table => table.status !== 'available').length;
  const active = data.orders.filter(order => ['open', 'preparing', 'ready'].includes(order.status));
  const critical = [...data.inventory].filter(item => item.min > 0).sort((a, b) => a.quantity / a.min - b.quantity / b.min)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return <>
    <PageHeader title={`${greeting}, ${user?.name?.split(' ')[0] || 'equipe'}.`} description={`${data.settings.restaurant} está sincronizado com a operação em tempo real.`}><span className="live"><i /> Operação ao vivo</span></PageHeader>
    <div className="metrics">
      <Metric label="Faturamento hoje" value={money(sales)} note="vendas registradas" />
      <Metric label="Clientes cadastrados" value={data.customers.length} note="base ativa" />
      <Metric label="Ocupação do salão" value={`${Math.round(occupied / data.tables.length * 100) || 0}%`} note={`${occupied} de ${data.tables.length} mesas`} />
      <Metric label="Pedidos ativos" value={active.length} note="em andamento" />
    </div>
    <div className="dashboard-grid">
      <section className="panel"><div className="panel-head"><div><h2>Salão principal</h2><p>Consumo em tempo real</p></div><button className="text-button" onClick={() => navigate('/mesas')}>Gerenciar <ArrowUpRight /></button></div><div className="table-preview">{data.tables.slice(0, 9).map(table => <button key={table.id} className={`table-tile ${table.status}`} onClick={() => navigate('/mesas')}><span>MESA {table.number}</span><StatusBadge status={table.status} /><b>{money(tableTotal(table.id))}</b><small>{table.seats} lugares</small></button>)}</div></section>
      <section className="panel"><div className="panel-head"><div><h2>Produção agora</h2><p>Pedidos ativos</p></div><button className="text-button" onClick={() => navigate('/kds')}>Abrir KDS <ArrowUpRight /></button></div><div className="compact-list">{active.slice(0, 5).map(order => <article key={order.id}><div><b>#{order.number} · Mesa {data.tables.find(table => table.id === order.tableId)?.number}</b><small>{order.items.length} item(ns) · {money(orderTotal(order))}</small></div><StatusBadge status={order.status} />{order.status === 'ready' && <button className="icon-success" onClick={() => updateOrder(order.id, 'delivered')}><Check /></button>}</article>)}</div></section>
      <section className="ai-card"><div className="ai-title"><span><Sparkles /></span><div><small>ORBE INSIGHTS</small><h3>Próxima ação recomendada</h3></div></div><p>{critical ? <>O estoque de <b>{critical.name}</b> está em {critical.quantity} {critical.unit}. Reponha antes do próximo pico.</> : <>Cadastre os níveis mínimos do estoque para receber recomendações operacionais.</>}</p><div className="ai-action"><Flame /><span><b>{critical ? 'Antecipar reposição' : 'Ativar inteligência de estoque'}</b><small>Dados reais da sua operação</small></span></div></section>
    </div>
  </>;
}

function Metric({ label, value, note }) { return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small><TrendingUp /> {note}</small></article>; }
