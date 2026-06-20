import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ChefHat, ShoppingBag, Package, WalletCards, Users, ChartNoAxesCombined, Settings, Bell, Search, ChevronDown, LogOut, BookOpen, Plus, Menu, X } from 'lucide-react';
import { useApp } from '../services/AppContext';
import Brand from './Brand';

const nav = [['/', LayoutDashboard, 'Visão geral'], ['/mesas', UtensilsCrossed, 'Salão & mesas'], ['/kds', ChefHat, 'Produção KDS'], ['/pedidos', ShoppingBag, 'Pedidos'], ['/estoque', Package, 'Estoque'], ['/financeiro', WalletCards, 'Financeiro'], ['/clientes', Users, 'Clientes'], ['/cardapio-admin', BookOpen, 'Cardápio'], ['/relatorios', ChartNoAxesCombined, 'Relatórios']];

export default function Layout() {
  const { data, user, logout } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = data.orders.filter(order => ['open', 'preparing'].includes(order.status)).length;
  const calls = data.tables.reduce((total, table) => total + (table.calls?.length || 0), 0);
  const leave = () => { logout(); navigate('/login'); };
  return <div className="app-shell">
    {menuOpen && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <Brand><button className="mobile-close" onClick={() => setMenuOpen(false)}><X /></button></Brand>
      <div className="unit-picker"><div className="unit-logo">{data.settings.restaurant?.[0] || 'O'}</div><div><small>UNIDADE ATUAL</small><b>{data.settings.restaurant}</b><span>{data.settings.city || 'Operação conectada'}</span></div><ChevronDown /></div>
      <nav><small>OPERAÇÃO</small>{nav.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}><Icon /><span>{label}</span>{label === 'Produção KDS' && active > 0 && <em>{active}</em>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to="/configuracoes" onClick={() => setMenuOpen(false)}><Settings /><span>Configurações</span></NavLink><button className="profile profile-button" onClick={leave}><div className="avatar">{user?.name?.slice(0, 2).toUpperCase()}</div><div><b>{user?.name}</b><span>{user?.role}</span></div><LogOut /></button></div>
    </aside>
    <main className="main-area"><header><button className="mobile-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu /></button><div className="search"><Search /><input placeholder="Buscar na operação..." aria-label="Buscar na operação" /></div><div className="header-actions"><NavLink className="icon-btn desktop-action" to={`/cardapio/${data.settings.slug || ''}`} title="Cardápio público"><BookOpen /></NavLink><button className={`icon-btn desktop-action notification-button ${calls ? 'has-alert' : ''}`} title={`${calls} chamado(s) pendente(s)`} onClick={() => navigate('/mesas')}><Bell />{calls > 0 && <em>{calls}</em>}</button><button className="primary" onClick={() => navigate('/pedidos?novo=1')}><Plus /> <span>Novo pedido</span></button></div></header><div className="content"><Outlet /></div></main>
  </div>;
}
