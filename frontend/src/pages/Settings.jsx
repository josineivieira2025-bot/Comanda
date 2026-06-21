import { useEffect, useState } from 'react';
import { Save, ExternalLink, Copy, Check, UserPlus, Pencil, ShieldCheck, Power, ImagePlus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../services/AppContext';
import { permissionModules, permissionPresets } from '../services/permissions';

const blankEmployee = { name: '', email: '', password: '', role: 'WAITER', permissions: permissionPresets.WAITER, active: true };
const roleLabels = { ADMIN: 'Administrador', MANAGER: 'Gerente', WAITER: 'Garçom', KITCHEN: 'Cozinha', CASHIER: 'Caixa' };

export default function Settings() {
  const { data, user, saveSettings, saveEmployee, notify, can } = useApp();
  const [form, setForm] = useState(data.settings);
  const [copied, setCopied] = useState('');
  const [employeeModal, setEmployeeModal] = useState(false);
  const [employee, setEmployee] = useState(blankEmployee);
  useEffect(() => setForm(data.settings), [data.settings]);
  async function save(event) { event.preventDefault(); await saveSettings(form); }
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
