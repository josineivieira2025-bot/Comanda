import { useEffect, useState } from 'react';
import { Save, ExternalLink, Copy, Check, UserPlus, Pencil, ShieldCheck, Power, ImagePlus, Trash2, ReceiptText, Plug, Truck, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../services/AppContext';
import { permissionModules, permissionPresets } from '../services/permissions';

const blankEmployee = { name: '', email: '', password: '', role: 'WAITER', permissions: permissionPresets.WAITER, active: true };
const roleLabels = { ADMIN: 'Administrador', MANAGER: 'Gerente', WAITER: 'Garçom', KITCHEN: 'Cozinha', CASHIER: 'Caixa' };

const blankCourier = { name: '', phone: '', vehicle: '', plate: '', active: true };
const statusLabels = { NEEDS_CONFIGURATION: 'Configurar', PENDING: 'Pendente', AUTHORIZED: 'Autorizado', REJECTED: 'Rejeitado', CANCELLED: 'Cancelado', DISABLED: 'Desativado', CONFIGURED: 'Configurado', CONNECTED: 'Conectado', ERROR: 'Erro' };

function blankFiscal(current = {}, settings = {}) {
  return {
    enabled: !!current?.enabled,
    autoIssueCupom: current?.autoIssueCupom ?? true,
    environment: current?.environment || 'HOMOLOGATION',
    provider: current?.provider || 'manual',
    providerEndpoint: current?.providerEndpoint || '',
    providerToken: '',
    certificateName: current?.certificateName || '',
    certificateExpiresAt: current?.certificateExpiresAt ? current.certificateExpiresAt.slice(0, 10) : '',
    cnpj: current?.cnpj || '',
    legalName: current?.legalName || '',
    tradeName: current?.tradeName || settings.restaurant || '',
    stateRegistration: current?.stateRegistration || '',
    municipalRegistration: current?.municipalRegistration || '',
    taxRegime: current?.taxRegime || 'Simples Nacional',
    cep: current?.cep || '',
    street: current?.street || '',
    number: current?.number || '',
    neighborhood: current?.neighborhood || '',
    city: current?.city || settings.city || '',
    state: current?.state || '',
    nfceSeries: current?.nfceSeries || 1,
    nfceNextNumber: current?.nfceNextNumber || 1,
    nfeSeries: current?.nfeSeries || 1,
    nfeNextNumber: current?.nfeNextNumber || 1,
    pixKey: current?.pixKey || '',
    pixMerchantName: current?.pixMerchantName || settings.restaurant || '',
    pixMerchantCity: current?.pixMerchantCity || settings.city || ''
  };
}

function blankIfood(current = {}) {
  return { enabled: !!current?.enabled, storeId: current?.storeId || '', merchantId: current?.merchantId || '', accessToken: '', refreshToken: '', webhookSecret: '' };
}

export default function Settings() {
  const { data, user, saveSettings, saveEmployee, saveFiscalSettings, saveIfoodIntegration, testIfoodIntegration, saveCourier, issueFiscalDocument, notify, can } = useApp();
  const [form, setForm] = useState(data.settings);
  const [fiscal, setFiscal] = useState(blankFiscal());
  const [ifood, setIfood] = useState(blankIfood());
  const [courier, setCourier] = useState(blankCourier);
  const [copied, setCopied] = useState('');
  const [employeeModal, setEmployeeModal] = useState(false);
  const [employee, setEmployee] = useState(blankEmployee);
  useEffect(() => setForm(data.settings), [data.settings]);
  useEffect(() => setFiscal(blankFiscal(data.integrations.fiscalSettings, data.settings)), [data.integrations.fiscalSettings, data.settings]);
  useEffect(() => setIfood(blankIfood(data.integrations.ifood)), [data.integrations.ifood]);
  async function save(event) { event.preventDefault(); await saveSettings(form); }
  async function submitFiscal(event) { event.preventDefault(); await saveFiscalSettings({ ...fiscal, certificateExpiresAt: fiscal.certificateExpiresAt || null, nfceSeries: Number(fiscal.nfceSeries), nfceNextNumber: Number(fiscal.nfceNextNumber), nfeSeries: Number(fiscal.nfeSeries), nfeNextNumber: Number(fiscal.nfeNextNumber) }); }
  async function submitIfood(event) { event.preventDefault(); await saveIfoodIntegration(ifood); }
  async function submitCourier(event) { event.preventDefault(); await saveCourier(courier.id, courier); setCourier(blankCourier); }
  async function chooseLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Escolha um arquivo de imagem.');
    try {
      const logoUrl = await resizeLogo(file);
      setForm(current => ({ ...current, logoUrl }));
      notify('Foto preparada. Clique em Salvar no banco.');
    } catch {
      notify('Não foi possível processar esta imagem.');
    }
  }
  async function copy(value, label) { await navigator.clipboard.writeText(value); setCopied(label); notify('Link copiado.'); setTimeout(() => setCopied(''), 1800); }
  const publicMenu = `${window.location.origin}/#/cardapio/${data.settings.slug || ''}`.replace(/\/$/, '');
  const isAdmin = user?.role === 'ADMIN';

  function openEmployee(current) {
    setEmployee(current ? { ...current, password: '' } : { ...blankEmployee, permissions: [...blankEmployee.permissions] });
    setEmployeeModal(true);
  }

  function selectProfile(role) {
    setEmployee(current => ({ ...current, role, permissions: [...(permissionPresets[role] || [])] }));
  }

  function togglePermission(module, action, checked) {
    const view = `${module}.view`;
    const edit = `${module}.edit`;
    setEmployee(current => {
      const permissions = new Set(current.permissions);
      if (action === 'view') {
        checked ? permissions.add(view) : (permissions.delete(view), permissions.delete(edit));
      } else {
        checked ? (permissions.add(view), permissions.add(edit)) : permissions.delete(edit);
      }
      return { ...current, permissions: [...permissions] };
    });
  }

  async function submitEmployee(event) {
    event.preventDefault();
    const values = { ...employee };
    if (values.id && !values.password) delete values.password;
    await saveEmployee(values.id, values);
    setEmployeeModal(false);
  }

  return <>
    <PageHeader title="Configurações"><span className="live"><i /> Dados sincronizados</span></PageHeader>
    <div className="settings-grid">
      <form className="panel settings-form" onSubmit={save}>
        <div className="panel-head"><div><h2>Dados da unidade</h2><p>Informações exibidas em toda a plataforma</p></div></div>
        <div className="unit-logo-editor"><div className={`unit-logo-preview ${form.logoUrl ? 'has-image' : ''}`}>{form.logoUrl ? <img src={form.logoUrl} alt="Prévia da logo" /> : (form.restaurant?.[0] || 'R')}</div><div><b>Foto da empresa</b><span>Use uma imagem quadrada com boa iluminação.</span>{can('settings.edit') && <div className="unit-logo-actions"><label className="secondary"><ImagePlus /> Escolher foto<input type="file" accept="image/*" onChange={chooseLogo} /></label>{form.logoUrl && <button type="button" className="secondary danger-text" onClick={() => setForm(current => ({ ...current, logoUrl: '' }))}><Trash2 /> Remover</button>}</div>}</div></div>
        <label>Nome do restaurante<input required minLength="2" disabled={!can('settings.edit')} value={form.restaurant || ''} onChange={event => setForm({ ...form, restaurant: event.target.value })} /></label>
        <label>Cidade / unidade<input disabled={!can('settings.edit')} value={form.city || ''} onChange={event => setForm({ ...form, city: event.target.value })} /></label>
        <label>Taxa de serviço (%)<input type="number" min="0" max="30" step="0.1" disabled={!can('settings.edit')} value={form.serviceFee} onChange={event => setForm({ ...form, serviceFee: event.target.value })} /></label>
        <label>Identificador público<input value={form.slug || ''} readOnly /></label>
        {can('settings.edit') && <button className="primary"><Save /> Salvar no banco</button>}
      </form>
      <section className="panel access-links">
        <div className="panel-head"><div><h2>Acessos públicos</h2><p>Compartilhe com equipe e clientes</p></div></div>
        <LinkRow label="Cardápio público" value={publicMenu} copied={copied} onCopy={copy} />
        <LinkRow label="Aplicativo do garçom" value={`${window.location.origin}/#/garcom`} copied={copied} onCopy={copy} />
        {data.tables.slice(0, 4).map(table => <LinkRow key={table.id} label={`Portal da mesa ${table.number}`} value={`${window.location.origin}/#/mesa/${table.id}`} copied={copied} onCopy={copy} />)}
      </section>

      <form className="panel integration-panel" onSubmit={submitFiscal}>
        <div className="panel-head"><div><h2><ReceiptText /> Nota fiscal e cupom</h2><p>NFC-e/NF-e com dados fiscais da empresa</p></div><span className={`status-badge status-${data.integrations.fiscalReadiness?.ready ? 'ready' : 'attention'}`}>{data.integrations.fiscalReadiness?.ready ? 'Pronto' : 'Configurar'}</span></div>
        <div className="integration-body">
          <div className="toggle-row"><label className="check-field"><input type="checkbox" checked={fiscal.enabled} onChange={event => setFiscal({ ...fiscal, enabled: event.target.checked })} /><span /></label><b>Ativar emissão fiscal</b><label className="check-field"><input type="checkbox" checked={fiscal.autoIssueCupom} onChange={event => setFiscal({ ...fiscal, autoIssueCupom: event.target.checked })} /><span /></label><b>Gerar cupom ao receber</b></div>
          <div className="form-grid"><label>CNPJ<input value={fiscal.cnpj} onChange={event => setFiscal({ ...fiscal, cnpj: event.target.value })} /></label><label>Razão social<input value={fiscal.legalName} onChange={event => setFiscal({ ...fiscal, legalName: event.target.value })} /></label><label>Nome fantasia<input value={fiscal.tradeName} onChange={event => setFiscal({ ...fiscal, tradeName: event.target.value })} /></label><label>Regime tributário<input value={fiscal.taxRegime} onChange={event => setFiscal({ ...fiscal, taxRegime: event.target.value })} /></label><label>CEP<input value={fiscal.cep} onChange={event => setFiscal({ ...fiscal, cep: event.target.value })} /></label><label>Rua<input value={fiscal.street} onChange={event => setFiscal({ ...fiscal, street: event.target.value })} /></label><label>Número<input value={fiscal.number} onChange={event => setFiscal({ ...fiscal, number: event.target.value })} /></label><label>Bairro<input value={fiscal.neighborhood} onChange={event => setFiscal({ ...fiscal, neighborhood: event.target.value })} /></label><label>Cidade<input value={fiscal.city} onChange={event => setFiscal({ ...fiscal, city: event.target.value })} /></label><label>UF<input maxLength="2" value={fiscal.state} onChange={event => setFiscal({ ...fiscal, state: event.target.value.toUpperCase() })} /></label><label>Ambiente<select value={fiscal.environment} onChange={event => setFiscal({ ...fiscal, environment: event.target.value })}><option value="HOMOLOGATION">Homologação</option><option value="PRODUCTION">Produção</option></select></label><label>Provedor fiscal<input value={fiscal.provider} onChange={event => setFiscal({ ...fiscal, provider: event.target.value })} /></label><label>Token do provedor<input type="password" placeholder="Mantém o token salvo se vazio" value={fiscal.providerToken} onChange={event => setFiscal({ ...fiscal, providerToken: event.target.value })} /></label><label>Certificado<input value={fiscal.certificateName} onChange={event => setFiscal({ ...fiscal, certificateName: event.target.value })} /></label><label>Série NFC-e<input type="number" min="1" value={fiscal.nfceSeries} onChange={event => setFiscal({ ...fiscal, nfceSeries: event.target.value })} /></label><label>Próximo número<input type="number" min="1" value={fiscal.nfceNextNumber} onChange={event => setFiscal({ ...fiscal, nfceNextNumber: event.target.value })} /></label></div>
          <small className="integration-note">{data.integrations.fiscalReadiness?.message || 'Preencha os dados fiscais para liberar a fila de emissão.'}</small>
          {can('settings.edit') && <button className="primary"><Save /> Salvar fiscal</button>}
        </div>
      </form>

      <form className="panel integration-panel" onSubmit={submitIfood}>
        <div className="panel-head"><div><h2><Plug /> Integração iFood</h2><p>Credenciais oficiais, loja e sincronização</p></div><span className="status-badge">{statusLabels[data.integrations.ifood?.status] || 'Não configurado'}</span></div>
        <div className="integration-body">
          <div className="toggle-row"><label className="check-field"><input type="checkbox" checked={ifood.enabled} onChange={event => setIfood({ ...ifood, enabled: event.target.checked })} /><span /></label><b>Ativar iFood</b></div>
          <div className="form-grid"><label>ID da loja<input value={ifood.storeId} onChange={event => setIfood({ ...ifood, storeId: event.target.value })} /></label><label>Merchant ID<input value={ifood.merchantId} onChange={event => setIfood({ ...ifood, merchantId: event.target.value })} /></label><label>Access token<input type="password" placeholder={data.integrations.ifood?.hasAccessToken ? 'Token salvo' : 'Token oficial'} value={ifood.accessToken} onChange={event => setIfood({ ...ifood, accessToken: event.target.value })} /></label><label>Refresh token<input type="password" placeholder={data.integrations.ifood?.hasRefreshToken ? 'Token salvo' : 'Refresh token'} value={ifood.refreshToken} onChange={event => setIfood({ ...ifood, refreshToken: event.target.value })} /></label><label>Webhook secret<input type="password" placeholder={data.integrations.ifood?.hasWebhookSecret ? 'Secret salvo' : 'Secret'} value={ifood.webhookSecret} onChange={event => setIfood({ ...ifood, webhookSecret: event.target.value })} /></label></div>
          <div className="card-actions"><button className="primary"><Save /> Salvar iFood</button><button type="button" className="secondary" onClick={testIfoodIntegration}><RefreshCw /> Testar credenciais</button></div>
        </div>
      </form>

      <section className="panel integration-panel">
        <div className="panel-head"><div><h2><Truck /> Entregadores</h2><p>Equipe de entrega e documentos recentes</p></div></div>
        <div className="integration-body">
          <form className="form-grid courier-form" onSubmit={submitCourier}><label>Nome<input required value={courier.name} onChange={event => setCourier({ ...courier, name: event.target.value })} /></label><label>Telefone<input required value={courier.phone} onChange={event => setCourier({ ...courier, phone: event.target.value })} /></label><label>Veículo<input value={courier.vehicle} onChange={event => setCourier({ ...courier, vehicle: event.target.value })} /></label><label>Placa<input value={courier.plate} onChange={event => setCourier({ ...courier, plate: event.target.value })} /></label><button className="primary"><Save /> Salvar entregador</button></form>
          <div className="table-responsive"><table><thead><tr><th>Entregador</th><th>Veículo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.integrations.couriers.map(item => <tr key={item.id}><td><b>{item.name}</b><small>{item.phone}</small></td><td>{item.vehicle || '-'}<small>{item.plate || ''}</small></td><td><span className={`command-card-status ${item.active ? 'free' : 'inactive'}`}>{item.active ? 'Ativo' : 'Inativo'}</span></td><td><div className="row-actions"><button onClick={() => setCourier({ id: item.id, name: item.name, phone: item.phone, vehicle: item.vehicle || '', plate: item.plate || '', active: item.active })}><Pencil /> Editar</button><button onClick={() => saveCourier(item.id, { active: !item.active })}><Power /> {item.active ? 'Desativar' : 'Ativar'}</button></div></td></tr>)}</tbody></table></div>
          <div className="table-responsive"><table><thead><tr><th>Cupom</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.integrations.fiscalDocuments.map(doc => <tr key={doc.id}><td><b>{doc.type} {doc.series ? `${doc.series}/${doc.number || '-'}` : ''}</b><small>{doc.tab?.table ? `Mesa ${doc.tab.table.number}` : 'Pagamento'}</small></td><td>{Number(doc.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td><span className="status-badge">{statusLabels[doc.status] || doc.status}</span><small>{doc.errorMessage || ''}</small></td><td>{['NEEDS_CONFIGURATION', 'PENDING'].includes(doc.status) && <button className="secondary" onClick={() => issueFiscalDocument(doc.id)}><ReceiptText /> Emitir</button>}</td></tr>)}</tbody></table></div>
        </div>
      </section>

      {isAdmin && <section className="panel team-panel">
        <div className="panel-head"><div><h2>Usuários e colaboradores</h2><p>Controle individual de acesso a esta unidade</p></div><button className="primary" onClick={() => openEmployee()}><UserPlus /> Novo colaborador</button></div>
        <div className="table-responsive"><table><thead><tr><th>Colaborador</th><th>Perfil</th><th>Acessos</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data.employees.map(member => <tr key={member.id}><td><b>{member.name}</b><small>{member.email}</small></td><td>{roleLabels[member.role] || member.role}</td><td><span className="permission-count"><ShieldCheck /> {member.role === 'ADMIN' ? 'Acesso total' : `${member.permissions?.filter(permission => permission.endsWith('.view')).length || 0} módulo(s)`}</span></td><td><span className={`command-card-status ${member.active ? 'free' : 'inactive'}`}>{member.active ? 'Ativo' : 'Inativo'}</span></td><td>{member.role !== 'ADMIN' && <div className="row-actions"><button onClick={() => openEmployee(member)}><Pencil /> Editar acessos</button><button onClick={() => saveEmployee(member.id, { active: !member.active })}><Power /> {member.active ? 'Desativar' : 'Ativar'}</button></div>}</td></tr>)}</tbody></table></div>
      </section>}
    </div>

    <Modal open={employeeModal} onClose={() => setEmployeeModal(false)} title={employee.id ? 'Editar colaborador' : 'Novo colaborador'} subtitle="ACESSO À UNIDADE" wide>
      <form onSubmit={submitEmployee}>
        <div className="form-grid"><label>Nome<input required minLength="2" value={employee.name} onChange={event => setEmployee({ ...employee, name: event.target.value })} /></label><label>E-mail de acesso<input required type="email" value={employee.email} onChange={event => setEmployee({ ...employee, email: event.target.value })} /></label><label>Senha {employee.id && '(deixe vazia para manter)'}<input required={!employee.id} minLength="6" type="password" value={employee.password} onChange={event => setEmployee({ ...employee, password: event.target.value })} /></label><label>Perfil inicial<select value={employee.role} onChange={event => selectProfile(event.target.value)}><option value="WAITER">Garçom</option><option value="KITCHEN">Cozinha</option><option value="CASHIER">Caixa</option><option value="MANAGER">Gerente</option></select></label></div>
        <div className="permissions-editor"><div className="permissions-head"><b>Permissões por tela</b><span>Visualizar permite abrir; Gerenciar permite executar ações.</span></div><div className="permissions-row permissions-labels"><span>Tela</span><span>Visualizar</span><span>Gerenciar</span></div>{permissionModules.map(module => <div className="permissions-row" key={module.key}><b>{module.label}</b><label className="check-field"><input type="checkbox" checked={employee.permissions.includes(`${module.key}.view`)} onChange={event => togglePermission(module.key, 'view', event.target.checked)} /><span /></label><label className="check-field"><input type="checkbox" checked={employee.permissions.includes(`${module.key}.edit`)} onChange={event => togglePermission(module.key, 'edit', event.target.checked)} /><span /></label></div>)}</div>
        <div className="modal-footer"><button type="button" className="secondary" onClick={() => setEmployeeModal(false)}>Cancelar</button><button className="primary"><Save /> Salvar colaborador</button></div>
      </form>
    </Modal>
  </>;
}

function LinkRow({ label, value, copied, onCopy }) {
  return <div className="access-link"><span><b>{label}</b><small>{value}</small></span><button className="icon-btn" onClick={() => onCopy(value, label)}>{copied === label ? <Check /> : <Copy />}</button><a className="icon-btn" href={value} target="_blank" rel="noreferrer"><ExternalLink /></a></div>;
}

function resizeLogo(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const source = URL.createObjectURL(file);
    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 512, 512);
      URL.revokeObjectURL(source);
      resolve(canvas.toDataURL('image/webp', 0.84));
    };
    image.onerror = () => { URL.revokeObjectURL(source); reject(new Error('invalid image')); };
    image.src = source;
  });
}

