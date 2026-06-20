import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Send } from 'lucide-react';
import { useApp, money } from '../services/AppContext';

const tabLabel = tab => `Comanda #${String(tab.number).padStart(6, '0')} · ${tab.customer?.name || 'Cliente avulso'}`;

export default function OrderForm({ defaultTableId = '', defaultTabId = '', onDone }) {
  const { data, createOrder } = useApp();
  const [tableId, setTableId] = useState(defaultTableId);
  const [tabId, setTabId] = useState('new');
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const selectedTable = data.tables.find(table => table.id === tableId);
  const openTabs = selectedTable?.tabs || [];
  const existingTab = openTabs.find(tab => tab.id === tabId);

  useEffect(() => {
    const table = data.tables.find(item => item.id === tableId);
    const selectedTab = table?.tabs?.find(tab => tab.id === defaultTabId) || table?.tabs?.[0];
    setTabId(selectedTab?.id || 'new');
    setCustomerId(selectedTab?.customerId || '');
  }, [tableId, defaultTabId, data.tables]);

  const add = id => setItems(current => { const found = current.find(item => item.productId === id); return found ? current.map(item => item.productId === id ? { ...item, qty: item.qty + 1 } : item) : [...current, { productId: id, qty: 1, note: '' }]; });
  const change = (id, amount) => setItems(current => current.map(item => item.productId === id ? { ...item, qty: Math.max(0, item.qty + amount) } : item).filter(item => item.qty));
  const total = useMemo(() => items.reduce((sum, item) => sum + (data.products.find(product => product.id === item.productId)?.price || 0) * item.qty, 0), [items, data.products]);

  function chooseTab(value) {
    setTabId(value);
    const tab = openTabs.find(item => item.id === value);
    setCustomerId(tab?.customerId || '');
  }

  async function submit(event) {
    event.preventDefault();
    if (!tableId || !tabId || !items.length) return;
    await createOrder({ tableId, tabId: tabId === 'new' ? null : tabId, customerId, note, items });
    onDone?.();
  }

  return <form className="order-form" onSubmit={submit}>
    <div className="order-context-grid">
      <label>Mesa<select value={tableId} onChange={event => setTableId(event.target.value)} required><option value="">Selecione a mesa</option>{data.tables.map(table => <option key={table.id} value={table.id}>Mesa {table.number} · {table.status === 'available' ? 'livre' : `${table.tabs?.length || 1} comanda(s)`}</option>)}</select></label>
      <label>Comanda<select value={tabId} onChange={event => chooseTab(event.target.value)} disabled={!tableId} required>{openTabs.map(tab => <option key={tab.id} value={tab.id}>{tabLabel(tab)}</option>)}<option value="new">+ Abrir nova comanda</option></select></label>
      <label>Cliente<select value={customerId} onChange={event => setCustomerId(event.target.value)} disabled={!!existingTab}><option value="">Cliente avulso</option>{data.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
    </div>
    <div className="order-link-summary"><span>Mesa <b>{selectedTable?.number || '—'}</b></span><span>Comanda <b>{existingTab ? `#${String(existingTab.number).padStart(6, '0')}` : 'nova'}</b></span><span>Cliente <b>{existingTab?.customer?.name || data.customers.find(customer => customer.id === customerId)?.name || 'avulso'}</b></span></div>
    <div className="product-picker">{data.products.filter(product => product.available).map(product => { const item = items.find(current => current.productId === product.id); return <article key={product.id}><img src={product.image} alt={product.name} /><div><b>{product.name}</b><small>{product.category} · {money(product.price)}</small></div>{item ? <div className="qty"><button type="button" onClick={() => change(product.id, -1)}><Minus /></button><b>{item.qty}</b><button type="button" onClick={() => change(product.id, 1)}><Plus /></button></div> : <button type="button" className="add-mini" onClick={() => add(product.id)}><Plus /></button>}</article>; })}</div>
    <label>Observação do pedido<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Ponto da carne, retirar ingrediente..." /></label>
    <div className="form-footer"><div><span>Valor adicionado à comanda</span><b>{money(total)}</b></div><button className="primary" disabled={!tableId || !tabId || !items.length}><Send /> Incluir na comanda</button></div>
  </form>;
}
