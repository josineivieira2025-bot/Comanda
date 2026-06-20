import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken } from './api';
import { connectSocket } from './socket';

const Context = createContext(null);
export const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
export const orderNumber = value => String(Number(value) || 0).padStart(7, '0');
const empty = { tables: [], customers: [], products: [], categories: [], orders: [], inventory: [], transactions: [], receivables: [], settings: { restaurant: 'Seu Restaurante', city: '', serviceFee: 10, slug: '' } };
const lower = value => String(value || '').toLowerCase();
const sectors = { KITCHEN: 'cozinha', BAR: 'bar', GRILL: 'churrasqueira', DESSERT: 'sobremesa' };

function normalize({ tables = [], orders = [], products = [], categories = [], stock = [], customers = [], finance = {}, settings = {} }) {
  const dailyCounters = new Map();
  const dailyNumbers = new Map();
  [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach(order => {
    const createdAt = new Date(order.createdAt);
    const day = Number.isNaN(createdAt.getTime()) ? 'unknown' : `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;
    const next = (dailyCounters.get(day) || 0) + 1;
    dailyCounters.set(day, next);
    dailyNumbers.set(order.id, next);
  });
  return {
    tables: tables.map(table => ({ id: table.id, number: table.number, seats: table.seats, status: lower(table.status), note: table.note, calls: table.calls || [], tabs: (table.tabs || []).map(tab => ({ id: tab.id, number: tab.number, customerId: tab.customerId, customer: tab.customer, openedAt: tab.openedAt })), tabId: table.tabs?.[0]?.id || null, customerId: table.tabs?.[0]?.customerId, openedAt: table.tabs?.[0]?.openedAt })),
    customers: customers.map(customer => ({ ...customer, visits: customer.tabs?.length || 0 })),
    categories,
    products: products.map(product => ({ id: product.id, name: product.name, price: Number(product.price), category: product.category?.name || '', categoryId: product.categoryId, sector: sectors[product.category?.sector] || 'cozinha', available: product.available, image: product.imageUrl || '', description: product.description || '' })),
    orders: orders.map(order => ({ id: order.id, number: dailyNumbers.get(order.id) || order.number, tableId: order.tab?.tableId, tabId: order.tabId, customerId: order.tab?.customerId, status: lower(order.status), createdAt: order.createdAt, startedAt: order.startedAt, items: order.items.map(item => ({ id: item.id, productId: item.productId, qty: item.quantity, note: item.note || '', unitPrice: Number(item.unitPrice) })) })),
    inventory: stock.map(item => ({ id: item.id, name: item.name, category: item.category, unit: item.unit, quantity: Number(item.quantity), min: Number(item.minimumStock) })),
    transactions: (finance.payments || []).map(payment => ({ id: payment.id, type: lower(payment.type) === 'withdrawal' ? 'withdrawal' : lower(payment.type) === 'supply' ? 'supply' : 'sale', description: payment.description || payment.type, amount: (payment.type === 'WITHDRAWAL' ? -1 : 1) * Number(payment.amount), payment: lower(payment.method), createdAt: payment.createdAt })),
    receivables: (finance.receivables || []).map(tab => ({ ...tab, subtotal: Number(tab.subtotal), serviceFee: Number(tab.serviceFee), total: Number(tab.total) })),
    settings: { restaurant: settings.name || 'Seu Restaurante', city: settings.city || '', serviceFee: Number(settings.serviceFee ?? 10), slug: settings.slug || '' },
    financeSession: finance.session
  };
}

export function AppProvider({ children }) {
  const [data, setData] = useState(empty);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const refreshPromise = useRef(null);
  const notify = useCallback(message => { setToast(message); window.setTimeout(() => setToast(''), 2800); }, []);
  useEffect(() => { const onError = event => notify(event.detail); window.addEventListener('orbe:api-error', onError); return () => window.removeEventListener('orbe:api-error', onError); }, [notify]);

  const refresh = useCallback(() => {
    if (!getToken()) return Promise.resolve();
    if (refreshPromise.current) return refreshPromise.current;
    refreshPromise.current = (async () => {
      const [tables, orders, products, categories, stock, customers, finance, settings] = await Promise.all([
        api('/tables'), api('/orders'), api('/catalog/products'), api('/catalog/categories'), api('/stock'), api('/customers'), api('/finance/summary'), api('/settings')
      ]);
      setData(normalize({ tables, orders, products, categories, stock, customers, finance, settings }));
    })().finally(() => { refreshPromise.current = null; });
    return refreshPromise.current;
  }, []);

  useEffect(() => { (async () => { if (getToken()) try { setUser(await api('/auth/me')); await refresh(); } catch { setToken(null); } setReady(true); })(); }, [refresh]);
  useEffect(() => user ? connectSocket(() => refresh()) : undefined, [user, refresh]);

  async function login(email, password) { const result = await api('/auth/login', { method: 'POST', body: { email, password } }); setToken(result.token); setUser(result.user); await refresh(); }
  async function register(values) { const result = await api('/auth/register', { method: 'POST', body: values }); setToken(result.token); setUser(result.user); await refresh(); }
  function logout() { setToken(null); setUser(null); setData(empty); }

  async function mutate(collection, id, values) {
    let path;
    let body = values;
    const method = id ? 'PUT' : 'POST';
    if (collection === 'tables') { path = id ? `/tables/${id}` : '/tables'; body = { ...values, status: values.status?.toUpperCase() }; }
    else if (collection === 'inventory') { path = id ? `/stock/${id}` : '/stock'; body = { ...values, minimumStock: values.min }; }
    else if (collection === 'customers') path = id ? `/customers/${id}` : '/customers';
    else if (collection === 'products') { path = id ? `/catalog/products/${id}` : '/catalog/products'; body = { ...values, imageUrl: values.image, categoryId: values.categoryId || undefined, sector: Object.keys(sectors).find(key => sectors[key] === values.sector) || 'KITCHEN' }; }
    else if (collection === 'transactions') { path = '/finance/payments'; body = { type: values.type === 'withdrawal' ? 'WITHDRAWAL' : values.type === 'supply' ? 'SUPPLY' : 'SALE', method: (values.payment || 'cash').toUpperCase(), amount: Math.abs(values.amount), description: values.description }; }
    else return;
    await api(path, { method, body });
    await refresh();
    notify('Registro salvo com sucesso.');
  }

  async function remove(collection, id) { const base = { tables: '/tables', inventory: '/stock', customers: '/customers', products: '/catalog/products' }[collection]; if (!base) return; await api(`${base}/${id}`, { method: 'DELETE' }); await refresh(); notify('Registro excluído.'); }
  async function createOrder(values) { const tabId = values.tabId || (await api(`/tables/${values.tableId}/open`, { method: 'POST', body: { customerId: values.customerId || null, forceNew: true } })).id; const order = await api('/orders', { method: 'POST', body: { tabId, note: values.note, items: values.items.map(item => ({ productId: item.productId, quantity: item.qty, note: item.note })) } }); await refresh(); notify('Pedido incluído na comanda e enviado à cozinha.'); return order; }
  async function updateOrder(id, status) { await api(`/orders/${id}/status`, { method: 'PATCH', body: { status: status.toUpperCase() } }); await refresh(); notify('Status atualizado.'); }
  async function moveStock(id, type, quantity, reason = '') { await api(`/stock/${id}/movements`, { method: 'POST', body: { type: type.toUpperCase(), quantity: Number(quantity), reason } }); await refresh(); notify('Movimentação registrada.'); }
  async function openTable(id, customerId) { const tab = await api(`/tables/${id}/open`, { method: 'POST', body: { customerId: customerId || null } }); await refresh(); notify('Comanda aberta.'); return tab; }
  async function createTab(tableId, customerId) { const tab = await api(`/tables/${tableId}/open`, { method: 'POST', body: { customerId: customerId || null, forceNew: true } }); await refresh(); notify(`Comanda #${String(tab.number).padStart(6, '0')} aberta.`); return tab; }
  async function cashAction(action, body) { const result = await api(`/finance/${action}`, { method: 'POST', body }); await refresh(); notify('Caixa atualizado.'); return result; }
  async function payReceivable(tabId, method) { const result = await api(`/finance/receivables/${tabId}/pay`, { method: 'POST', body: { method } }); await refresh(); notify('Pagamento confirmado e mesa liberada.'); return result; }
  async function saveSettings(values) { const settings = await api('/settings', { method: 'PUT', body: { name: values.restaurant, city: values.city, serviceFee: Number(values.serviceFee) } }); setData(current => ({ ...current, settings: { restaurant: settings.name, city: settings.city || '', serviceFee: Number(settings.serviceFee), slug: settings.slug } })); notify('Configurações salvas no banco.'); }
  async function resolveCall(id) { await api(`/service-calls/${id}/resolve`, { method: 'PATCH' }); await refresh(); notify('Chamado atendido.'); }

  const orderTotal = order => (order?.items || []).reduce((sum, item) => sum + (item.unitPrice ?? data.products.find(product => product.id === item.productId)?.price ?? 0) * item.qty, 0);
  const tableTotal = id => {
    const activeTabIds = data.tables.find(table => table.id === id)?.tabs?.map(tab => tab.id) || [];
    if (!activeTabIds.length) return 0;
    return data.orders
      .filter(order => activeTabIds.includes(order.tabId) && order.status !== 'cancelled')
      .reduce((sum, order) => sum + orderTotal(order), 0);
  };
  const value = useMemo(() => ({ data, setData, user, ready, login, register, logout, refresh, reset: refresh, toast, notify, mutate, remove, createOrder, updateOrder, moveStock, openTable, createTab, cashAction, payReceivable, saveSettings, resolveCall, orderTotal, tableTotal }), [data, user, ready, toast, notify, refresh]);
  return <Context.Provider value={value}>{children}<div className="global-request-indicator">Processando sua ação</div>{toast && <div className="toast">✓ {toast}</div>}</Context.Provider>;
}

export const useApp = () => useContext(Context);
