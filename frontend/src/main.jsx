import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './services/AppContext';
import './styles/styles.css';
import './styles/auth.css';
import './styles/responsive.css';
import './styles/alerts.css';
import './styles/premium.css';
import './styles/navigation-fixes.css';
import './styles/loading.css';
import './styles/receivables.css';
import './styles/modal-fixes.css';
import './styles/branding.css';
import './styles/order-flow.css';
import './styles/professional-layout.css';
import './styles/contrast.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><HashRouter><AppProvider><App /></AppProvider></HashRouter></React.StrictMode>
);
