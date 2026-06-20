import { useEffect, useState } from 'react';
import { Search, ShoppingBag, ArrowLeft, Utensils } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '../services/api';
import { money, useApp } from '../services/AppContext';

export default function PublicMenu() {
  const { slug } = useParams();
  const { data } = useApp();
  const [menu, setMenu] = useState(null);
  const [search, setSearch] = useState('');
  const restaurantSlug = slug || data.settings.slug || import.meta.env.VITE_RESTAURANT_SLUG || 'seu-restaurante';
  useEffect(() => { publicApi(`/menu/${restaurantSlug}`).then(setMenu).catch(() => setMenu({ error: true, products: [] })); }, [restaurantSlug]);
  if (!menu) return <div className="app-loading">Carregando cardápio...</div>;
  if (menu.error) return <div className="public-error"><div><Utensils /><h1>Cardápio indisponível</h1><p>Confira o link ou tente novamente em instantes.</p></div></div>;
  const products = menu.products.filter(product => `${product.name} ${product.category?.name}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="public-page"><div className="public-nav"><Link to="/"><ArrowLeft /> Gestão</Link><div className="public-brand">{menu.name}</div><span><ShoppingBag /> Cardápio</span></div><section className="menu-hero"><small>{menu.city || 'SABORES DA CASA'}</small><h1>Comida memorável,<br />feita para este momento.</h1><p>Cardápio atualizado em tempo real pela nossa cozinha.</p><div className="public-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar pratos e bebidas" /></div></section><main className="public-menu-grid">{products.map(product => <article key={product.id}><img src={product.imageUrl || 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800'} alt={product.name} /><div><span>{product.category.name}</span><h2>{product.name}</h2><p>{product.description || 'Preparado com ingredientes selecionados pela nossa cozinha.'}</p><b>{money(product.price)}</b></div></article>)}{!products.length && <div className="empty-state"><Utensils /><b>Nenhum item encontrado</b><span>Tente buscar por outro nome ou categoria.</span></div>}</main></div>;
}
