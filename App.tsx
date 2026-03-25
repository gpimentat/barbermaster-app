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
  MessageSquare,
  Link as LinkIcon,
  Clock,
  User,
  MapPin,
  Bell
} from 'lucide-react';
import { supabase } from './src/supabaseClient';

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
import ReviewsPage from './pages/ReviewsPage';
import SignUpPage from './pages/SignUpPage';
import AppointmentActionPage from './pages/AppointmentActionPage';
import SaasAdminPage from './pages/SaasAdminPage';
import SalesMapPage from './pages/SalesMapPage';
import SalesCommissionsPage from './pages/SalesCommissionsPage';
import SubscriptionLockedPage from './pages/SubscriptionLockedPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
// import ProfilePage from './pages/ProfilePage'; // Removed in favor of consolidated SettingsPage
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
  const { hasPermission, role: authRole, logout, currentUser } = useAuth();

  const [unreadNotifications, setUnreadNotifications] = React.useState(0);

  // Bloquear scroll quando a sidebar está aberta no mobile
  React.useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Fetch SaaS notifications
  React.useEffect(() => {
    if (!currentUser) return;

    const fetchNotifications = async () => {
      const { count, error } = await supabase
        .from('saas_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      
      if (!error) setUnreadNotifications(count || 0);
    };

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('saas_notifications_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'saas_notifications',
        filter: `user_id=eq.${currentUser.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const links = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} tracking-tight />, requiredPermission: 'public' },
    { path: '/schedule', name: 'Agenda', icon: <Calendar size={20} />, requiredPermission: 'view_own_schedule' },
    { path: '/waiting-list', name: 'Fila de Espera', icon: <Clock size={20} />, requiredPermission: 'manage_waitlist' },
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
    { path: '/reviews', name: 'Avaliações', icon: <MessageSquare size={20} />, requiredPermission: 'manage_clients' },
    { path: '/integrations', name: 'Integrações', icon: <LinkIcon size={20} />, requiredPermission: 'manage_integrations' },
    { path: '/saas-admin', name: 'Super Admin', icon: <Crown size={20} />, requiredPermission: 'super_admin' },
    { path: '/sales-map', name: 'Prospecção', icon: <MapPin size={20} />, requiredPermission: 'saas_map' },
    { path: '/sales-commissions', name: 'Minhas Comissões', icon: <DollarSign size={20} />, requiredPermission: 'saas_map' },
  ];

  let role = authRole; 
  const dbRoleStr = (currentUser?.role || '').toLowerCase();
  
  if (currentUser) {
    if (dbRoleStr === 'admin' || dbRoleStr === 'administrador') {
      role = 'admin';
    } else if (dbRoleStr === 'super_admin') {
      role = 'super_admin';
    } else if (dbRoleStr.includes('recep') || currentUser.email === '520_barbershop1@gmail.com' || currentUser.email === '520barbershop@gmail.com') {
      role = 'receptionist';
    } else if (dbRoleStr.startsWith('saas_')) {
      role = dbRoleStr; // e.g. 'saas_sales', 'saas_support'
    } else {
      role = 'barber';
    }
  }

  const visibleLinks = links.filter(link => {
    // Admin/Super Admin see everything
    if (role === 'admin' || role === 'super_admin') return true;

    // SaaS Roles see only their own tools
    if (role.startsWith('saas_')) {
      const saasAllowedLinks = ['Dashboard', 'Minhas Comissões', 'Prospecção', 'Super Admin'];
      return saasAllowedLinks.includes(link.name);
    }
    
    // Receptionist sees operational items but NOT financial or SaaS tools
    if (role === 'receptionist') {
      const blockedLinks = ['Super Admin', 'App do Cliente', 'Prospecção', 'Minhas Comissões', 'Financeiro'];
      if (blockedLinks.includes(link.name)) return false;
      return true;
    }

    // Default permission check for barbers and others
    if (link.requiredPermission === 'public') return true;
    return hasPermission(link.requiredPermission);
  });

  return (
    <>
      {/* Overlay - Premium Focal Effect */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden transition-all duration-500 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-dark-950 border-r border-gray-800/50 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:relative md:translate-x-0 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.5)] md:shadow-none flex flex-col`}
      >
        <div className="flex items-center justify-between h-24 px-8 border-b border-gray-800/30">
          <span className="text-xl font-black text-primary-500 tracking-tighter uppercase italic">BARBER<span className="text-white not-italic">MASTER</span></span>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 p-2 hover:bg-gray-800 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="px-8 py-8">
          <div className="flex items-center gap-4 group p-1">
            <div className="w-12 h-12 rounded-2xl bg-dark-900 border border-gray-800 overflow-hidden shadow-2xl group-hover:border-primary-500/50 transition-all duration-300">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-500 text-dark-950 font-black text-xl">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white leading-none truncate w-36 uppercase tracking-tight">{currentUser ? currentUser.name : 'Master'}</p>
              <p className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.2em] mt-2 opacity-80">{role === 'admin' ? 'Gerente Geral' : role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-8">
          <div className="px-4 mb-4">
            <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Menu Principal</p>
          </div>
          {visibleLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                  ? 'bg-primary-500 text-dark-950 font-black shadow-xl shadow-primary-500/20'
                  : 'text-gray-500 hover:bg-gray-800/50 hover:text-white'
                  }`}
              >
                <div className={`${isActive ? 'text-dark-950' : 'text-gray-600 group-hover:text-primary-500'} transition-colors duration-300 relative`}>
                  {link.icon}
                  {unreadNotifications > 0 && (link.path === '/saas-admin' || link.path === '/sales-commissions') && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-dark-950 rounded-full animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] uppercase font-black tracking-widest flex items-center gap-2">
                  {link.name === 'Super Admin' && role.startsWith('saas_') ? 'Painel SaaS' : link.name}
                  {unreadNotifications > 0 && (link.path === '/saas-admin' || link.path === '/sales-commissions') && (
                    <span className="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-red-500/20">
                      {unreadNotifications}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}

          <div className="pt-6 mt-6 border-t border-gray-800/50 space-y-1.5">
            <div className="px-4 mb-4">
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">Ajustes</p>
            </div>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${location.pathname === '/settings'
                ? 'bg-gray-800 text-white font-black'
                : 'text-gray-500 hover:bg-gray-800/50 hover:text-white'
                }`}
            >
              <Settings size={20} className="text-gray-600 group-hover:text-white transition-colors" />
              <span className="text-[11px] uppercase font-black tracking-widest">Configurações</span>
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all duration-300 mt-2 font-black group"
            >
              <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[11px] uppercase tracking-widest">Sair do Sistema</span>
            </button>
          </div>
        </nav>

        <div className="p-8 border-t border-gray-800/30">
          <div className="bg-dark-900/50 p-4 rounded-2xl border border-gray-800/50 flex items-center justify-between">
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em]">v1.4.2 Premium</span>
            <span className="text-[8px] font-black text-primary-500/50 uppercase tracking-[0.2em]">[v2.4 SYNC]</span>
          </div>
        </div>
      </aside>
    </>
  );
};

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();
  console.log('Current Path:', location.pathname); // DEBUG: Check path


  // Proteção de Rotas
  const hostname = window.location.hostname;
  const isMainPlatform = hostname === 'barbermaster.com.br' || hostname === 'www.barbermaster.com.br' || hostname === 'app.barbermaster.com.br' || hostname === 'localhost';

  const isPublicRoute = !isMainPlatform ||
    location.pathname === '/login' ||
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
    <div className="flex h-screen bg-dark-950 text-gray-100 overflow-hidden font-sans relative selection:bg-primary-500/30">
      {currentUser?.mustChangePassword && <ForcePasswordChangeModal />}

      {!isPublicRoute && <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!isPublicRoute && (
          <header className="md:hidden flex items-center justify-between h-20 px-6 bg-dark-950/40 backdrop-blur-xl border-b border-gray-800/30 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white p-3 -ml-3 hover:bg-gray-800/50 rounded-2xl transition-all active:scale-95"
              aria-label="Abrir menu"
            >
              <Menu size={28} strokeWidth={2.5} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-primary-500 tracking-tighter italic leading-none">BARBER<span className="text-white not-italic">MASTER</span></span>
              <span className="text-[7px] font-black text-gray-500 uppercase tracking-[0.4em] mt-1 mr-[-0.4em]">Professional POS</span>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500">
                <User size={16} />
              </div>
            </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto p-4 md:p-10 ${isPublicRoute ? '' : 'pb-28 md:pb-10'} custom-scrollbar scroll-smooth`}>
          <Routes>
            {/* Cliente App PWA - Precisa estar ANTES das outras rotas */}
            <Route path="/app/:slug/*" element={<ClientApp />} />

            {/* Suporte para Domínio Customizado na Raiz */}
            <Route path="/" element={
              (() => {
                // Se o usuário está autenticado, sempre mostrar o Dashboard
                if (isAuthenticated) {
                  return <Dashboard />;
                }

                // Se não está autenticado, verificar se é domínio customizado
                const hostname = window.location.hostname;
                const isMainPlatform = hostname === 'barbermaster.com.br' || hostname === 'www.barbermaster.com.br' || hostname === 'app.barbermaster.com.br' || hostname === 'localhost';
                if (!isMainPlatform) {
                  return <ClientApp />;
                }

                // Domínio principal sem autenticação = Login
                return <LoginPage />;
              })()
            } />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/saas-admin" element={<SaasAdminPage />} />
            <Route path="/sales-map" element={<SalesMapPage />} />
            <Route path="/sales-commissions" element={<SalesCommissionsPage />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/waiting-list" element={<WaitingListPage />} />
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
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={
              (() => {
                // Se o usuário está autenticado, mostrar erro 404 do admin
                if (isAuthenticated) {
                  return <div className="p-8 text-center text-gray-500">Página não encontrada.</div>;
                }

                // Se não está autenticado, verificar se é domínio customizado
                const hostname = window.location.hostname;
                const isMainPlatform = hostname === 'barbermaster.com.br' || hostname === 'www.barbermaster.com.br' || hostname === 'app.barbermaster.com.br' || hostname === 'localhost';
                if (!isMainPlatform) {
                  return <ClientApp />;
                }

                // Domínio principal sem autenticação = 404
                return <div className="p-8 text-center text-gray-500">Página não encontrada.</div>;
              })()
            } />
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
