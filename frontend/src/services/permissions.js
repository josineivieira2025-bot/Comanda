export const permissionModules = [
  { key: 'dashboard', label: 'Visão geral' },
  { key: 'tables', label: 'Salão, mesas e comandas' },
  { key: 'kds', label: 'Produção KDS' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'stock', label: 'Estoque' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'customers', label: 'Clientes' },
  { key: 'menu', label: 'Cardápio' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'settings', label: 'Configurações' }
];

export const permissionPresets = {
  KITCHEN: ['kds.view', 'kds.edit'],
  WAITER: ['tables.view', 'orders.view', 'orders.edit', 'customers.view', 'menu.view'],
  CASHIER: ['finance.view', 'finance.edit'],
  MANAGER: permissionModules.flatMap(module => [`${module.key}.view`, `${module.key}.edit`]).filter(permission => permission !== 'settings.edit')
};

export const can = (user, permission) => user?.role === 'ADMIN' || !!user?.permissions?.includes(permission);
export const canAny = (user, ...permissions) => user?.role === 'ADMIN' || permissions.some(permission => user?.permissions?.includes(permission));

export function firstAllowedPath(user) {
  const paths = [['dashboard.view', '/'], ['tables.view', '/mesas'], ['kds.view', '/kds'], ['orders.view', '/pedidos'], ['stock.view', '/estoque'], ['finance.view', '/financeiro'], ['customers.view', '/clientes'], ['menu.view', '/cardapio-admin'], ['reports.view', '/relatorios'], ['settings.view', '/configuracoes']];
  return paths.find(([permission]) => can(user, permission))?.[1] || '/login';
}
