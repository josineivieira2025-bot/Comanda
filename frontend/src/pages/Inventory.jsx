import { useState } from 'react';
import { Plus, ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../services/AppContext';

const blank = { name: '', category: '', unit: 'un', quantity: 0, min: 0 };

export default function Inventory() {
  const { data, mutate, remove, moveStock, can } = useApp();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [movement, setMovement] = useState(null);
  const open = item => { setEditing(item?.id || 'new'); setForm(item || blank); };

  async function save(event) {
    event.preventDefault();
    await mutate('inventory', editing === 'new' ? null : editing, { ...form, quantity: Number(form.quantity), min: Number(form.min) });
    setEditing(null);
  }

  async function move(event) {
    event.preventDefault();
    await moveStock(movement.id, movement.type, movement.qty);
    setMovement(null);
  }

  return <>
    <PageHeader title="Estoque">{can('stock.edit') && <button className="primary" onClick={() => open()}><Plus /> Cadastrar produto</button>}</PageHeader>
    <div className="metrics compact"><Metric label="Itens cadastrados" value={data.inventory.length} /><Metric label="Abaixo do mínimo" value={data.inventory.filter(item => item.quantity <= item.min).length} danger /><Metric label="Categorias" value={new Set(data.inventory.map(item => item.category)).size} /></div>
    <section className="panel data-panel"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Saldo atual</th><th>Estoque mínimo</th><th>Situação</th>{can('stock.edit') && <th>Ações</th>}</tr></thead><tbody>{data.inventory.map(item => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.category}</td><td><b>{item.quantity} {item.unit}</b></td><td>{item.min} {item.unit}</td><td>{item.quantity <= item.min ? <span className="stock-alert"><TriangleAlert /> Repor estoque</span> : <span className="stock-ok">Normal</span>}</td>{can('stock.edit') && <td><div className="row-actions"><button onClick={() => setMovement({ id: item.id, type: 'in', qty: 1 })}><ArrowDownToLine /> Entrada</button><button onClick={() => setMovement({ id: item.id, type: 'out', qty: 1 })}><ArrowUpFromLine /> Saída</button><button onClick={() => open(item)}><Pencil /></button><button onClick={() => confirm('Excluir item?') && remove('inventory', item.id)}><Trash2 /></button></div></td>}</tr>)}</tbody></table></section>
    <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Novo item' : 'Editar item'} subtitle="ESTOQUE"><form onSubmit={save}><div className="form-grid"><label>Produto<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label>Categoria<input required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} /></label><label>Unidade<select value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })}><option>un</option><option>kg</option><option>l</option><option>cx</option></select></label><label>Quantidade<input type="number" step=".01" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} /></label><label>Estoque mínimo<input type="number" step=".01" value={form.min} onChange={event => setForm({ ...form, min: event.target.value })} /></label></div><div className="modal-footer"><button className="primary">Salvar</button></div></form></Modal>
    <Modal open={!!movement} onClose={() => setMovement(null)} title={movement?.type === 'in' ? 'Entrada de estoque' : 'Saída de estoque'} subtitle="MOVIMENTAÇÃO"><form onSubmit={move}><label>Quantidade<input autoFocus type="number" min=".01" step=".01" required value={movement?.qty || ''} onChange={event => setMovement({ ...movement, qty: event.target.value })} /></label><div className="modal-footer"><button className="primary">Registrar movimentação</button></div></form></Modal>
  </>;
}

function Metric({ label, value, danger }) {
  return <article className={`metric-card ${danger ? 'metric-danger' : ''}`}><span>{label}</span><strong>{value}</strong></article>;
}
