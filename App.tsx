
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Package,
  ClipboardList,
  Smartphone,
  Crown,
  Percent,
  MessageCircle,
  Link as LinkIcon,
  Clock // Icone para Fila
} from 'lucide-react';

// Context
import { AuthProvider, useAuth } from './AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import ServicesPage from './pages/ServicesPage';
import FinancialPage from './pages/FinancialPage';
import StaffPage from './pages/StaffPage';
import ClientsPage from './pages/ClientsPage';
import SettingsPage from './pages/SettingsPage';
import ProductsPage from './pages/ProductsPage';
import ComandasPage from './pages/ComandasPage';
import AppCustomizationPage from './pages/AppCustomizationPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import CommissionsPage from './pages/CommissionsPage';
import ChatPage from './pages/ChatPage';
import IntegrationsPage from './pages/IntegrationsPage';
import WaitingListPage from './pages/WaitingListPage'; // Nova Página
import SignUpPage from './pages/SignUpPage';
import AppointmentActionPage from './pages/AppointmentActionPage';
import SaasAdminPage from './pages/SaasAdminPage';
import SubscriptionLockedPage from './pages/SubscriptionLockedPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ClientApp from './pages/client/ClientApp'; // Cliente App PWA

// Componente para Forçar Troca de Senha
const ForcePasswordChangeModal = () => {
  const { currentUser, updateBarber } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (!currentUser || !currentUser.mustChangePassword) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    updateBarber({
      ...currentUser,
      password: newPassword,
      mustChangePassword: false
    });

    alert('Senha alterada com sucesso! Bem-vindo.');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-dark-900 rounded-xl border border-primary-500 shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
        <h2 className="text-2xl font-bold text-white text-center mb-4">Definir Nova Senha</h2>
        <p className="text-gray-400 text-center mb-6 text-sm">Por segurança, altere sua senha provisória.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-primary-500"
            placeholder="Nova senha"
            required
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-primary-500"
            placeholder="Confirme a nova senha"
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold py-3 rounded-lg">Salvar e Continuar</button>
        </form>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
  const location = useLocation();
  const { hasPermission, role, logout, currentUser } = useAuth();

  const links = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} />, requiredPermission: 'public' },
    { path: '/schedule', name: 'Agenda', icon: <Calendar size={20} />, requiredPermission: 'view_own_schedule' },
    { path: '/waiting-list', name: 'Fila de Espera', icon: <Clock size={20} />, requiredPermission: 'manage_waitlist' }, // Novo Link
    { path: '/chat', name: 'Chat & Suporte', icon: <MessageCircle size={20} />, requiredPermission: 'manage_clients' },
    { path: '/comandas', name: 'Comandas', icon: <ClipboardList size={20} />, requiredPermission: 'manage_comandas' },
    { path: '/commissions', name: 'Comissões', icon: <Percent size={20} />, requiredPermission: 'view_own_commissions' },
    { path: '/subscriptions', name: 'Assinaturas', icon: <Crown size={20} />, requiredPermission: 'manage_clients' },
    { path: '/financial', name: 'Financeiro', icon: <DollarSign size={20} />, requiredPermission: 'view_financial' },
    { path: '/staff', name: 'Profissionais', icon: <Users size={20} />, requiredPermission: 'view_financial' },
    { path: '/services', name: 'Serviços', icon: <Scissors size={20} />, requiredPermission: 'manage_products' },
    { path: '/products', name: 'Produtos', icon: <Package size={20} />, requiredPermission: 'manage_products' },
    { path: '/clients', name: 'Clientes', icon: <Users size={20} />, requiredPermission: 'manage_clients' },
    { path: '/app-customization', name: 'App do Cliente', icon: <Smartphone size={20} />, requiredPermission: 'manage_products' },
    { path: '/integrations', name: 'Integrações', icon: <LinkIcon size={20} />, requiredPermission: 'manage_integrations' },
    { path: '/saas-admin', name: 'Super Admin', icon: <Crown size={20} />, requiredPermission: 'super_admin' },
  ];

  const visibleLinks = links.filter(link => {
    if (link.requiredPermission === 'public') return true;
    if (role === 'super_admin') return true; // Super admin sees everything
    if (link.requiredPermission === 'super_admin' && role !== 'super_admin') return false;
    if (role === 'admin') return true;
    if (role === 'receptionist' && ['Financeiro', 'Profissionais', 'App do Cliente'].includes(link.name)) return false;
    // Permissão 'manage_integrations' será checada aqui
    return hasPermission(link.requiredPermission);
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
        <span className="text-xl font-bold text-primary-500 tracking-wider">BARBER<span className="text-white">MASTER</span></span>
        <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400">
          <X size={24} />
        </button>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 overflow-hidden">
            {currentUser ? (
              <img src={currentUser.avatar} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-500 text-dark-950 font-bold">A</div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">{currentUser ? currentUser.name : 'Administrador'}</p>
            <p className="text-[10px] text-gray-400 uppercase mt-1">{role === 'admin' ? 'Gerente Geral' : role}</p>
          </div>
        </div>
      </div>

      <nav className="px-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
        {visibleLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
                ? 'bg-primary-500 text-dark-950 font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-gray-800">
          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === '/settings'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <Settings size={20} />
            <span>Minha Conta</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors mt-2"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();
  console.log('Current Path:', location.pathname); // DEBUG: Check path


  // Proteção de Rotas
  const isPublicRoute = location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/app/'); // Cliente App é público

  if (!isAuthenticated && !isPublicRoute) {
    return <LoginPage />;
  }

  // Redirect to dashboard if already logged in and trying to access login page
  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup')) {
    return <Navigate to="/" replace />;
  }

  // Security: Block access if subscription is inactive (allow Super Admin bypass)
  if (
    isAuthenticated &&
    currentUser?.role !== 'super_admin' &&
    currentUser?.subscriptionStatus &&
    currentUser.subscriptionStatus !== 'active'
  ) {
    return <SubscriptionLockedPage />;
  }

  return (
    <div className="flex h-screen bg-dark-950 text-gray-100 overflow-hidden font-sans relative">
      {currentUser?.mustChangePassword && <ForcePasswordChangeModal />}

      {!isPublicRoute && <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!isPublicRoute && (
          <header className="md:hidden flex items-center justify-between h-16 px-4 bg-dark-900 border-b border-gray-800">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300">
              <Menu size={24} />
            </button>
            <span className="text-xl font-bold text-primary-500">BARBERMASTER</span>
            <div className="w-6" />
          </header>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Routes>
            {/* Cliente App PWA - Precisa estar ANTES das outras rotas */}
            <Route path="/app/:slug/*" element={<ClientApp />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/saas-admin" element={<SaasAdminPage />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/waiting-list" element={<WaitingListPage />} /> {/* Nova Rota */}
            <Route path="/appt/:id/:action" element={<AppointmentActionPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/comandas" element={<ComandasPage />} />
            <Route path="/commissions" element={<CommissionsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/financial" element={<FinancialPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/app-customization" element={<AppCustomizationPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<div className="p-8 text-center text-gray-500">Página não encontrada.</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
