import { Download, BarChart3 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp, money } from '../services/AppContext';

export default function Reports() {
  const { data, orderTotal } = useApp();
  const sold = {};
  data.orders.filter(order => order.status !== 'cancelled').forEach(order => order.items.forEach(item => { sold[item.productId] = (sold[item.productId] || 0) + item.qty; }));
  const products = Object.entries(sold).map(([id, qty]) => ({ product: data.products.find(product => product.id === id), qty })).sort((a, b) => b.qty - a.qty);
  const revenue = data.orders.filter(order => order.status !== 'cancelled').reduce((sum, order) => sum + orderTotal(order), 0);

  return <>
    <PageHeader title="Relatórios"><button className="primary" onClick={() => window.print()}><Download /> Exportar relatório</button></PageHeader>
    <div className="metrics"><Card label="Receita em pedidos" value={money(revenue)} /><Card label="Pedidos registrados" value={data.orders.length} /><Card label="Ticket médio" value={money(data.orders.length ? revenue / data.orders.length : 0)} /><Card label="Clientes ativos" value={data.customers.length} /></div>
    <div className="report-grid"><section className="panel data-panel"><div className="panel-head"><div><h2>Produtos mais vendidos</h2><p>Quantidade acumulada</p></div><BarChart3 /></div>{products.map((item, index) => <div className="ranking" key={item.product?.id}><span>{index + 1}</span><div><b>{item.product?.name}</b><small>{item.product?.category}</small></div><strong>{item.qty} un.</strong></div>)}</section><section className="panel data-panel"><div className="panel-head"><div><h2>Desempenho por setor</h2><p>Itens enviados à produção</p></div></div>{['cozinha', 'churrasqueira', 'bar', 'sobremesa'].map(sector => { const qty = products.filter(item => item.product?.sector === sector).reduce((sum, item) => sum + item.qty, 0); const max = Math.max(...products.map(item => item.qty), 1); return <div className="bar-row" key={sector}><span>{sector}</span><div><i style={{ width: `${Math.min(qty / max * 100, 100)}%` }} /></div><b>{qty}</b></div>; })}</section></div>
  </>;
}

function Card({ label, value }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}
