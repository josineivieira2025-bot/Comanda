import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp, money } from '../services/AppContext';

const blank = { name: '', description: '', price: '', category: '', sector: 'cozinha', available: true, image: '' };

export default function MenuAdmin() {
  const { data, mutate, remove } = useApp();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const open = product => { setEditing(product?.id || 'new'); setForm(product || blank); };
  async function save(event) { event.preventDefault(); await mutate('products', editing === 'new' ? null : editing, { ...form, price: Number(form.price) }); setEditing(null); }
  const publicMenu = `/#/cardapio/${data.settings.slug || ''}`;

  return <>
    <PageHeader title="Cardápio" description="Produtos publicados automaticamente no cardápio público."><a className="secondary" href={publicMenu} target="_blank" rel="noreferrer"><ExternalLink /> Ver cardápio público</a><button className="primary" onClick={() => open()}><Plus /> Novo produto</button></PageHeader>
    <div className="menu-admin-grid">{data.products.map(product => <article className={`menu-admin-card ${!product.available ? 'unavailable' : ''}`} key={product.id}><img src={product.image || 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600'} alt={product.name} /><div><span>{product.category}</span><h3>{product.name}</h3><b>{money(product.price)}</b><small>{product.sector}</small></div><div className="card-actions"><button onClick={() => mutate('products', product.id, { available: !product.available })}>{product.available ? <Eye /> : <EyeOff />}{product.available ? 'Disponível' : 'Indisponível'}</button><button aria-label="Editar produto" onClick={() => open(product)}><Pencil /></button><button aria-label="Excluir produto" onClick={() => confirm('Excluir produto?') && remove('products', product.id)}><Trash2 /></button></div></article>)}</div>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo produto' : 'Editar produto'} subtitle="CARDÁPIO"><form onSubmit={save}><label>Nome<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Descrição<textarea value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} /></label><div className="form-grid"><label>Preço<input required type="number" min="0" step=".01" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} /></label><label>Categoria<input required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></label><label>Setor<select value={form.sector} onChange={event => setForm({ ...form, sector: event.target.value })}><option value="cozinha">Cozinha</option><option value="bar">Bar</option><option value="churrasqueira">Churrasqueira</option><option value="sobremesa">Sobremesa</option></select></label><label>Disponibilidade<select value={String(form.available)} onChange={event => setForm({ ...form, available: event.target.value === 'true' })}><option value="true">Disponível</option><option value="false">Indisponível</option></select></label></div><label>URL da foto<input value={form.image} onChange={event => setForm({ ...form, image: event.target.value })} placeholder="https://..." /></label><div className="modal-footer"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button><button className="primary">Salvar produto</button></div></form></Modal>
  </>;
}
