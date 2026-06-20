import { useMemo, useState } from 'react';
import { Minus, Plus, Send } from 'lucide-react';
import { useApp, money } from '../services/AppContext';

export default function OrderForm({ defaultTableId = '', onDone }) {
  const { data, createOrder } = useApp();
  const [tableId, setTableId] = useState(defaultTableId);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const add = id => setItems(current => { const found = current.find(item => item.productId === id); return found ? current.map(item => item.productId === id ? { ...item, qty: item.qty + 1 } : item) : [...current, { productId: id, qty: 1, note: '' }]; });
  const change = (id, amount) => setItems(current => current.map(item => item.productId === id ? { ...item, qty: Math.max(0, item.qty + amount) } : item).filter(item => item.qty));
  const total = useMemo(() => items.reduce((sum, item) => sum + (data.products.find(product => product.id === item.productId)?.price || 0) * item.qty, 0), [items, data.products]);
  async function submit(event) { event.preventDefault(); if (!tableId || !items.length) return; await createOrder({ tableId, customerId, note, items }); onDone?.(); }

  return <form className="order-form" onSubmit={submit}><div className="form-grid"><label>Mesa<select value={tableId} onChange={event => setTableId(event.target.value)} required><option value="">Selecione</option>{data.tables.map(table => <option key={table.id} value={table.id}>Mesa {table.number} · {table.status === 'available' ? 'livre' : 'em atendimento'}</option>)}</select></label><label>Cliente<select value={customerId} onChange={event => setCustomerId(event.target.value)}><option value="">Consumidor não identificado</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label></div><div className="product-picker">{data.products.filter(product => product.available).map(product => { const item = items.find(current => current.productId === product.id); return <article key={product.id}><img src={product.image} alt={product.name} /><div><b>{product.name}</b><small>{product.category} · {money(product.price)}</small></div>{item ? <div className="qty"><button type="button" onClick={() => change(product.id, -1)}><Minus /></button><b>{item.qty}</b><button type="button" onClick={() => change(product.id, 1)}><Plus /></button></div> : <button type="button" className="add-mini" onClick={() => add(product.id)}><Plus /></button>}</article>; })}</div><label>Observação do pedido<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ponto da carne, retirar ingrediente..." /></label><div className="form-footer"><div><span>Total do pedido</span><b>{money(total)}</b></div><button className="primary" disabled={!tableId || !items.length}><Send /> Enviar para cozinha</button></div></form>;
}
