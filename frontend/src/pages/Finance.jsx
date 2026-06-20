import { useState } from 'react';
import { Plus, WalletCards, LockKeyhole, Download, DoorOpen, Banknote, QrCode, CreditCard, CircleDollarSign, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useApp, money } from '../services/AppContext';

const cardData = [
  { key: 'sales', label: 'Vendas do dia', Icon: CircleDollarSign, tone: 'green' },
  { key: 'balance', label: 'Saldo do caixa', Icon: WalletCards, tone: 'dark' },
  { key: 'pix', label: 'Recebido em PIX', Icon: QrCode, tone: 'lime' },
  { key: 'card', label: 'Recebido em cartão', Icon: CreditCard, tone: 'blue' }
];

export default function Finance() {
  const { data, mutate, cashAction } = useApp();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ amount: '', description: '', payment: 'cash' });
  const sales = data.transactions.filter(item => item.type === 'sale').reduce((sum, item) => sum + item.amount, 0);
  const balance = data.transactions.reduce((sum, item) => sum + item.amount, 0);
  const values = { sales, balance, pix: data.transactions.filter(item => item.payment === 'pix').reduce((sum, item) => sum + Math.max(item.amount, 0), 0), card: data.transactions.filter(item => item.payment === 'card').reduce((sum, item) => sum + Math.max(item.amount, 0), 0) };
  async function save(event) { event.preventDefault(); await mutate('transactions', null, { type: modal, description: form.description || ({ withdrawal: 'Sangria', supply: 'Suprimento' }[modal]), amount: (modal === 'withdrawal' ? -1 : 1) * Number(form.amount), payment: form.payment }); setModal(null); setForm({ amount: '', description: '', payment: 'cash' }); }
  async function toggleCash() { if (data.financeSession) await cashAction('cash/close', { closingAmount: balance }); else await cashAction('cash/open', { openingAmount: 0 }); }
  return <>
    <PageHeader eyebrow="GESTÃO FINANCEIRA" title="Financeiro" description="Acompanhe vendas, recebimentos e o caixa da sua operação."><button className="secondary" onClick={() => setModal('withdrawal')}><ArrowDownLeft /> Registrar sangria</button><button className="primary" onClick={() => setModal('supply')}><Plus /> Novo suprimento</button></PageHeader>
    <div className="metrics finance-metrics">{cardData.map(({ key, label, Icon, tone }) => <article className={`metric-card finance-metric finance-metric-${tone}`} key={key}><div className="metric-icon"><Icon /></div><div><span>{label}</span><strong>{money(values[key])}</strong><small>{key === 'balance' ? (data.financeSession ? 'Caixa aberto agora' : 'Caixa ainda fechado') : 'Atualizado em tempo real'}</small></div></article>)}</div>
    <section className="panel finance-panel"><div className="panel-head"><div><span className="section-kicker">FLUXO DO DIA</span><h2>Movimentações recentes</h2><p>Entradas e saídas registradas no caixa atual</p></div><button className="outline" onClick={() => window.print()}><Download /> Exportar relatório</button></div><div className="table-responsive"><table><thead><tr><th>Horário</th><th>Descrição</th><th>Forma</th><th>Tipo</th><th className="align-right">Valor</th></tr></thead><tbody>{data.transactions.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td><b>{item.description}</b></td><td>{({ cash: 'Dinheiro', pix: 'PIX', card: 'Cartão', voucher: 'Voucher' })[item.payment]}</td><td><span className={`movement-type movement-${item.type}`}>{item.type === 'sale' ? <ArrowUpRight /> : <ArrowDownLeft />}{({ sale: 'Venda', withdrawal: 'Sangria', supply: 'Suprimento' })[item.type]}</span></td><td className={`align-right ${item.amount < 0 ? 'negative' : 'positive'}`}><b>{money(item.amount)}</b></td></tr>)}</tbody></table></div>{!data.transactions.length && <EmptyState icon={Banknote} title="Nenhuma movimentação hoje" description="Abra o caixa e registre a primeira movimentação do turno." />}<div className={`cash-status ${data.financeSession ? 'cash-status-open' : ''}`}><div className="cash-status-icon"><WalletCards /></div><span><b>Caixa {data.financeSession ? 'aberto' : 'fechado'}</b><small>{data.financeSession ? 'Sessão ativa e pronta para receber lançamentos' : 'Abra o caixa para começar o turno financeiro'}</small></span><button onClick={toggleCash}>{data.financeSession ? <><LockKeyhole /> Fechar caixa</> : <><DoorOpen /> Abrir caixa</>}</button></div></section>
    <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'withdrawal' ? 'Registrar sangria' : 'Registrar suprimento'} subtitle="MOVIMENTAÇÃO DE CAIXA"><form onSubmit={save}><label>Valor<input type="number" min=".01" step=".01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="R$ 0,00" /></label><label>Descrição<input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Descreva a movimentação" /></label><label>Forma<select value={form.payment} onChange={event => setForm({ ...form, payment: event.target.value })}><option value="cash">Dinheiro</option><option value="pix">PIX</option><option value="card">Cartão</option><option value="voucher">Voucher</option></select></label><div className="modal-footer"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary">Confirmar movimentação</button></div></form></Modal>
  </>;
}
