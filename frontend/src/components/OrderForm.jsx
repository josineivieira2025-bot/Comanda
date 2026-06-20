import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Send } from 'lucide-react';
import { useApp, money } from '../services/AppContext';

const cardNumber = number => String(number).padStart(3, '0');

export default function OrderForm({ defaultTableId = '', defaultTabId = '', defaultCommandCardId = '', onDone }) {
  const { data, createOrder } = useApp();
  const [commandCardId, setCommandCardId] = useState(defaultCommandCardId);
  const [tableId, setTableId] = useState(defaultTableId);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const selectedCard = data.commandCards.find(card => card.id === commandCardId);
  const openTab = selectedCard?.openTab;
  const selectedTable = data.tables.find(table => table.id === tableId);

  useEffect(() => {
    const card = data.commandCards.find(item => item.id === defaultCommandCardId || item.openTab?.id === defaultTabId);
    if (!card) return;
    setCommandCardId(card.id);
    setCustomerId(card.openTab?.customerId || '');
    if (!defaultTableId && card.openTab?.table?.id) setTableId(card.openTab.table.id);
  }, [defaultCommandCardId, defaultTabId, defaultTableId, data.commandCards]);

  const add = id => setItems(current => { const found = current.find(item => item.productId === id); return found ? current.map(item => item.productId === id ? { ...item, qty: item.qty + 1 } : item) : [...current, { productId: id, qty: 1, note: '' }]; });
  const change = (id, amount) => setItems(current => current.map(item => item.productId === id ? { ...item, qty: Math.max(0, item.qty + amount) } : item).filter(item => item.qty));
  const total = useMemo(() => items.reduce((sum, item) => sum + (data.products.find(product => product.id === item.productId)?.price || 0) * item.qty, 0), [items, data.products]);

  function chooseCard(value) {
    setCommandCardId(value);
    const card = data.commandCards.find(item => item.id === value);
    setCustomerId(card?.openTab?.customerId || '');
  }

  async function submit(event) {
    event.preventDefault();
    if (!commandCardId || !tableId || !items.length) return;
    await createOrder({ commandCardId, tabId: openTab?.id || null, tableId, customerId, note, items });
    onDone?.();
  }

  return <form className="order-form" onSubmit={submit}>
    <div className="order-context-grid">
      <label>Número da comanda<select value={commandCardId} onChange={event => chooseCard(event.target.value)} required><option value="">Selecione a ficha</option>{data.commandCards.filter(card => card.active).map(card => <option key={card.id} value={card.id}>Comanda #{cardNumber(card.number)} · {card.openTab ? `em uso${card.openTab.customer?.name ? ` por ${card.openTab.customer.name}` : ''}` : 'livre'}</option>)}</select></label>
      <label>Mesa de entrega<select value={tableId} onChange={event => setTableId(event.target.value)} required><option value="">Selecione a mesa</option>{data.tables.map(table => <option key={table.id} value={table.id}>Mesa {table.number} · {table.status === 'available' ? 'livre' : 'em atendimento'}</option>)}</select></label>
      <label>Cliente<select value={customerId} onChange={event => setCustomerId(event.target.value)} disabled={!!openTab}><option value="">Cliente avulso</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
    </div>
    <div className="order-link-summary"><span>Ficha física <b>{selectedCard ? `#${cardNumber(selectedCard.number)}` : 'não selecionada'}</b></span><span>Entrega <b>{selectedTable ? `Mesa ${selectedTable.number}` : 'mesa não selecionada'}</b></span><span>Responsável <b>{openTab?.customer?.name || data.customers.find(customer => customer.id === customerId)?.name || 'cliente avulso'}</b></span></div>
    <div className="product-picker">{data.products.filter(product => product.available).map(product => { const item = items.find(current => current.productId === product.id); return <article key={product.id}><img src={product.image} alt={product.name} /><div><b>{product.name}</b><small>{product.category} · {money(product.price)}</small></div>{item ? <div className="qty"><button type="button" onClick={() => change(product.id, -1)}><Minus /></button><b>{item.qty}</b><button type="button" onClick={() => change(product.id, 1)}><Plus /></button></div> : <button type="button" className="add-mini" onClick={() => add(product.id)}><Plus /></button>}</article>; })}</div>
    <label>Observação do pedido<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ponto da carne, retirar ingrediente..." /></label>
    <div className="form-footer"><div><span>Valor adicionado à comanda</span><b>{money(total)}</b></div><button className="primary" disabled={!commandCardId || !tableId || !items.length}><Send /> Lançar na comanda</button></div>
  </form>;
}
