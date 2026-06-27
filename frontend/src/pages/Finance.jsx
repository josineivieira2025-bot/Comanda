import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, WalletCards, LockKeyhole, Download, DoorOpen, Banknote, QrCode, CreditCard, CircleDollarSign, ArrowDownLeft, ArrowUpRight, ReceiptText, CheckCircle2, ListTree } from 'lucide-react';
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
  const { data, mutate, cashAction, getReceivablePix, payReceivable, can, notify } = useApp();
  const [modal, setModal] = useState(null);
  const [receiving, setReceiving] = useState(null);
  const [details, setDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [pixCharge, setPixCharge] = useState(null);
  const [pixImage, setPixImage] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ cashReceived: '', cardBrand: 'Visa', cardAuthorization: '', installments: 1 });
  const [form, setForm] = useState({ amount: '', description: '', payment: 'cash' });
  const sales = data.transactions.filter(item => item.type === 'sale').reduce((sum, item) => sum + item.amount, 0);
  const balance = data.transactions.reduce((sum, item) => sum + item.amount, 0);
  const values = { sales, balance, pix: data.transactions.filter(item => item.payment === 'pix').reduce((sum, item) => sum + Math.max(item.amount, 0), 0), card: data.transactions.filter(item => item.payment === 'card').reduce((sum, item) => sum + Math.max(item.amount, 0), 0) };
  async function save(event) { event.preventDefault(); await mutate('transactions', null, { type: modal, description: form.description || ({ withdrawal: 'Sangria', supply: 'Suprimento' }[modal]), amount: (modal === 'withdrawal' ? -1 : 1) * Number(form.amount), payment: form.payment }); setModal(null); setForm({ amount: '', description: '', payment: 'cash' }); }
  useEffect(() => {
    if (!receiving || paymentMethod !== 'PIX') { setPixCharge(null); setPixImage(''); return; }
    let active = true;
    (async () => {
      try {
        const charge = await getReceivablePix(receiving.id);
        if (!active) return;
        setPixCharge(charge);
        setPixImage(await QRCode.toDataURL(charge.pixCode, { margin: 1, width: 210 }));
      } catch (error) {
        if (active) notify(error.message || 'Não foi possível gerar o PIX.');
      }
    })();
    return () => { active = false; };
  }, [receiving, paymentMethod]);
  function openReceive(tab) {
    setReceiving(tab);
    setPaymentMethod('PIX');
    setPaymentDetails({ cashReceived: String(Number(tab.total || 0).toFixed(2)), cardBrand: 'Visa', cardAuthorization: '', installments: 1 });
  }
  async function copyPix() { if (!pixCharge?.pixCode) return; await navigator.clipboard.writeText(pixCharge.pixCode); notify('Código PIX copiado.'); }
  async function receive() {
    await payReceivable(receiving.id, paymentMethod, {
      pixCode: paymentMethod === 'PIX' ? pixCharge?.pixCode : null,
      cashReceived: paymentMethod === 'CASH' ? Number(paymentDetails.cashReceived || receiving.total) : null,
      cardBrand: paymentMethod === 'CARD' ? paymentDetails.cardBrand : null,
      cardAuthorization: paymentMethod === 'CARD' ? paymentDetails.cardAuthorization : null,
      installments: paymentMethod === 'CARD' ? Number(paymentDetails.installments || 1) : null
    });
    setReceiving(null);
  }
  async function toggleCash() { if (!can('finance.edit')) return; if (data.financeSession) await cashAction('cash/close', { closingAmount: balance }); else await cashAction('cash/open', { openingAmount: 0 }); }

  return <>
    <PageHeader eyebrow="GESTÃO FINANCEIRA" title="Financeiro">{can('finance.edit') && <><button className="secondary" onClick={() => setModal('withdrawal')}><ArrowDownLeft /> Registrar sangria</button><button className="primary" onClick={() => setModal('supply')}><Plus /> Novo suprimento</button></>}</PageHeader>
    <div className="metrics finance-metrics">{cardData.map(({ key, label, Icon, tone }) => <article className={`metric-card finance-metric finance-metric-${tone}`} key={key}><div className="metric-icon"><Icon /></div><div><span>{label}</span><strong>{money(values[key])}</strong><small>{key === 'balance' ? (data.financeSession ? 'Caixa aberto agora' : 'Caixa ainda fechado') : 'Atualizado em tempo real'}</small></div></article>)}</div>

    <section className="panel receivables-panel"><div className="panel-head"><div><span className="section-kicker">AGUARDANDO PAGAMENTO</span><h2>Contas prontas para receber</h2></div><span className="receivable-count">{data.receivables.length} pendente(s)</span></div>
      {data.receivables.length ? <div className="receivables-grid">{data.receivables.map(tab => <article className="receivable-card" key={tab.id}><div className="receivable-table"><span>MESA</span><strong>{tab.table.number}</strong></div><div className="receivable-info"><b>Comanda #{tab.number}</b><span>{tab.customer?.name || 'Consumidor não identificado'} · {tab.orderCount} pedido(s)</span><small>Subtotal {money(tab.subtotal)} + serviço {money(tab.serviceFee)}</small></div><div className="receivable-total"><span>Total a receber</span><strong>{money(tab.total)}</strong></div><div className="receivable-actions"><button className="secondary" onClick={() => setDetails(tab)}><ListTree /> Ver detalhes</button>{can('finance.edit') && <button className="primary" onClick={() => openReceive(tab)}><ReceiptText /> Receber pagamento</button>}</div></article>)}</div> : <EmptyState icon={CheckCircle2} title="Nenhuma conta pendente" description="Pedidos entregues aparecerão aqui automaticamente." />}
    </section>

    <section className="panel finance-panel"><div className="panel-head"><div><span className="section-kicker">FLUXO DO DIA</span><h2>Movimentações recentes</h2><p>Entradas e saídas registradas no caixa atual</p></div><button className="outline" onClick={() => window.print()}><Download /> Exportar relatório</button></div><div className="table-responsive"><table><thead><tr><th>Horário</th><th>Descrição</th><th>Forma</th><th>Tipo</th><th className="align-right">Valor</th></tr></thead><tbody>{data.transactions.map(item => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td><td><b>{item.description}</b></td><td>{({ cash: 'Dinheiro', pix: 'PIX', card: 'Cartão', voucher: 'Voucher' })[item.payment]}</td><td><span className={`movement-type movement-${item.type}`}>{item.type === 'sale' ? <ArrowUpRight /> : <ArrowDownLeft />}{({ sale: 'Venda', withdrawal: 'Sangria', supply: 'Suprimento' })[item.type]}</span></td><td className={`align-right ${item.amount < 0 ? 'negative' : 'positive'}`}><b>{money(item.amount)}</b></td></tr>)}</tbody></table></div>{!data.transactions.length && <EmptyState icon={Banknote} title="Nenhuma movimentação hoje" description="Abra o caixa e registre a primeira movimentação do turno." />}<div className={`cash-status ${data.financeSession ? 'cash-status-open' : ''}`}><div className="cash-status-icon"><WalletCards /></div><span><b>Caixa {data.financeSession ? 'aberto' : 'fechado'}</b><small>{data.financeSession ? 'Sessão ativa e pronta para receber lançamentos' : 'Abra o caixa para começar o turno financeiro'}</small></span><button onClick={toggleCash}>{data.financeSession ? <><LockKeyhole /> Fechar caixa</> : <><DoorOpen /> Abrir caixa</>}</button></div></section>

    <Modal open={!!details} onClose={() => setDetails(null)} title={`Consumo · Comanda #${details?.number || ''}`} subtitle={`MESA ${details?.table?.number || ''}`}><div className="consumption-list">{details?.items?.map(item => <div key={item.id}><span><b>{item.quantity}× {item.name}</b><small>{money(item.unitPrice)} cada</small></span><strong>{money(item.total)}</strong></div>)}</div><div className="consumption-totals"><span>Subtotal <b>{money(details?.subtotal)}</b></span><span>Taxa de serviço <b>{money(details?.serviceFee)}</b></span><strong>Total <b>{money(details?.total)}</b></strong></div><div className="modal-footer"><button className="secondary" onClick={() => setDetails(null)}>Fechar</button>{can('finance.edit') && <button className="primary" onClick={() => { openReceive(details); setDetails(null); }}><ReceiptText /> Receber pagamento</button>}</div></Modal>
    <Modal open={!!receiving} onClose={() => setReceiving(null)} title={`Receber mesa ${receiving?.table?.number || ''}`} subtitle="PAGAMENTO E CUPOM FISCAL" wide>
      <div className="payment-summary"><span>Comanda #{receiving?.number}</span><strong>{money(receiving?.total)}</strong></div>
      <div className="payment-methods">
        {[['PIX', QrCode, 'PIX'], ['CASH', Banknote, 'Dinheiro'], ['CARD', CreditCard, 'Cartão'], ['VOUCHER', WalletCards, 'Voucher']].map(([key, Icon, label]) => <button key={key} className={paymentMethod === key ? 'active' : ''} onClick={() => setPaymentMethod(key)}><Icon /> {label}</button>)}
      </div>
      {paymentMethod === 'PIX' && <div className="pix-payment-box">{pixImage ? <img src={pixImage} alt="QR Code PIX" /> : <div className="pix-placeholder">Gerando PIX...</div>}<div><b>PIX copia e cola</b><textarea readOnly value={pixCharge?.pixCode || ''} /><button className="secondary" onClick={copyPix}><QrCode /> Copiar código PIX</button><small>Depois que o cliente pagar no app do banco, confirme o recebimento para liberar a mesa e emitir o cupom.</small></div></div>}
      {paymentMethod === 'CASH' && <div className="form-grid"><label>Valor recebido<input type="number" min={Number(receiving?.total || 0)} step=".01" value={paymentDetails.cashReceived} onChange={event => setPaymentDetails({ ...paymentDetails, cashReceived: event.target.value })} /></label><label>Troco<input readOnly value={money(Math.max(0, Number(paymentDetails.cashReceived || 0) - Number(receiving?.total || 0)))} /></label></div>}
      {paymentMethod === 'CARD' && <div className="form-grid"><label>Bandeira<select value={paymentDetails.cardBrand} onChange={event => setPaymentDetails({ ...paymentDetails, cardBrand: event.target.value })}><option>Visa</option><option>Mastercard</option><option>Elo</option><option>Amex</option><option>Hipercard</option><option>Outra</option></select></label><label>Autorização / NSU<input value={paymentDetails.cardAuthorization} onChange={event => setPaymentDetails({ ...paymentDetails, cardAuthorization: event.target.value })} placeholder="Código da maquininha" /></label><label>Parcelas<input type="number" min="1" max="12" value={paymentDetails.installments} onChange={event => setPaymentDetails({ ...paymentDetails, installments: event.target.value })} /></label></div>}
      {paymentMethod === 'VOUCHER' && <div className="form-warning">Confirme o voucher na operadora antes de finalizar a venda.</div>}
      {!data.financeSession && <div className="form-warning">Abra o caixa antes de confirmar o recebimento.</div>}
      <div className="modal-footer"><button className="secondary" onClick={() => setReceiving(null)}>Cancelar</button><button className="primary" disabled={!data.financeSession || (paymentMethod === 'PIX' && !pixCharge?.pixCode)} onClick={receive}><CheckCircle2 /> Confirmar, liberar mesa e emitir cupom</button></div>
    </Modal>
    <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'withdrawal' ? 'Registrar sangria' : 'Registrar suprimento'} subtitle="MOVIMENTAÇÃO DE CAIXA"><form onSubmit={save}><label>Valor<input type="number" min=".01" step=".01" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="R$ 0,00" /></label><label>Descrição<input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Descreva a movimentação" /></label><label>Forma<select value={form.payment} onChange={event => setForm({ ...form, payment: event.target.value })}><option value="cash">Dinheiro</option><option value="pix">PIX</option><option value="card">Cartão</option><option value="voucher">Voucher</option></select></label><div className="modal-footer"><button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button><button className="primary">Confirmar movimentação</button></div></form></Modal>
  </>;
}
