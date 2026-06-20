import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import { useApp } from '../services/AppContext';
import { can, firstAllowedPath } from '../services/permissions';
import Login from '../pages/Login'; import Dashboard from '../pages/Dashboard'; import Tables from '../pages/Tables'; import Orders from '../pages/Orders'; import KDS from '../pages/KDS'; import Inventory from '../pages/Inventory'; import Finance from '../pages/Finance'; import Customers from '../pages/Customers'; import MenuAdmin from '../pages/MenuAdmin'; import Reports from '../pages/Reports'; import Settings from '../pages/Settings'; import PublicMenu from '../pages/PublicMenu'; import TablePortal from '../pages/TablePortal'; import Waiter from '../pages/Waiter';

function Protected() {
  const { user, ready } = useApp();
  const location = useLocation();
  if (!ready) return <div className="app-loading">Carregando operação...</div>;
  return user ? <Layout /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}

function AllowedPage({ permission, children }) {
  const { user, ready } = useApp();
  if (!ready) return <div className="app-loading">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return can(user, permission) ? children : <Navigate to={firstAllowedPath(user)} replace />;
}

export default function AppRoutes() {
  return <Routes>
    <Route path="login" element={<Login />} />
    <Route element={<Protected />}>
      <Route index element={<AllowedPage permission="dashboard.view"><Dashboard /></AllowedPage>} />
      <Route path="mesas" element={<AllowedPage permission="tables.view"><Tables /></AllowedPage>} />
      <Route path="pedidos" element={<AllowedPage permission="orders.view"><Orders /></AllowedPage>} />
      <Route path="kds" element={<AllowedPage permission="kds.view"><KDS /></AllowedPage>} />
      <Route path="estoque" element={<AllowedPage permission="stock.view"><Inventory /></AllowedPage>} />
      <Route path="financeiro" element={<AllowedPage permission="finance.view"><Finance /></AllowedPage>} />
      <Route path="clientes" element={<AllowedPage permission="customers.view"><Customers /></AllowedPage>} />
      <Route path="cardapio-admin" element={<AllowedPage permission="menu.view"><MenuAdmin /></AllowedPage>} />
      <Route path="relatorios" element={<AllowedPage permission="reports.view"><Reports /></AllowedPage>} />
      <Route path="configuracoes" element={<AllowedPage permission="settings.view"><Settings /></AllowedPage>} />
    </Route>
    <Route path="cardapio/:slug?" element={<PublicMenu />} />
    <Route path="mesa/:id" element={<TablePortal />} />
    <Route path="garcom" element={<AllowedPage permission="orders.edit"><Waiter /></AllowedPage>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
