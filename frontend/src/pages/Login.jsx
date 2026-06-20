import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, User, Store } from 'lucide-react';
import { useApp } from '../services/AppContext';

export default function Login() {
  const { user, login, register } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', restaurantName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" />;
  async function submit(event) { event.preventDefault(); setLoading(true); setError(''); try { if (mode === 'login') await login(form.email, form.password); else await register(form); navigate(location.state?.from || '/'); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  const field = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <div className="login-page"><section className="login-brand"><div className="brand"><div className="brand-mark"><span /><span /><span /></div><b>orbe</b></div><div><small>RESTAURANT OPERATING SYSTEM</small><h1>Seu restaurante,<br />em perfeita sintonia.</h1><p>Salão, cozinha, estoque e caixa conectados em uma única operação.</p><div className="login-features"><span>✓ Dados protegidos</span><span>✓ Operação em tempo real</span><span>✓ Acesso em qualquer dispositivo</span></div></div></section><section className="login-form-wrap"><form onSubmit={submit}><small>ACESSO SEGURO</small><h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua operação'}</h2><p>{mode === 'login' ? 'Entre com suas credenciais para continuar.' : 'Configure sua unidade em menos de um minuto.'}</p>{mode === 'register' && <><label>Seu nome<div className="input-icon"><User /><input value={form.name} onChange={event => field('name', event.target.value)} required autoComplete="name" /></div></label><label>Restaurante<div className="input-icon"><Store /><input value={form.restaurantName} onChange={event => field('restaurantName', event.target.value)} required /></div></label></>}<label>E-mail<div className="input-icon"><Mail /><input type="email" value={form.email} onChange={event => field('email', event.target.value)} required autoComplete="email" placeholder="voce@restaurante.com" /></div></label><label>Senha<div className="input-icon"><LockKeyhole /><input type="password" value={form.password} onChange={event => field('password', event.target.value)} required minLength="6" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo de 6 caracteres" /></div></label>{error && <div className="form-error">{error}</div>}<button className="primary login-submit" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar na operação' : 'Criar minha conta'}<ArrowRight /></button><button type="button" className="mode-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Ainda não possui conta? Cadastre-se' : 'Já possui conta? Entrar'}</button></form></section></div>;
}
