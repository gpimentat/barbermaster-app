


import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
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
  MessageCircle // Novo ícone
} from 'lucide-react';

// Pages
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
import ChatPage from './pages/ChatPage'; // Nova Página

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
  const location = useLocation();
  const links = [
    { path: '/', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/schedule', name: 'Agenda', icon: <Calendar size={20} /> },
    { path: '/chat', name: 'Chat & Suporte', icon: <MessageCircle size={20} /> }, // Novo Link
    { path: '/comandas', name: 'Comandas', icon: <ClipboardList size={20} /> },
    { path: '/commissions', name: 'Comissões', icon: <Percent size={20} /> },
    { path: '/subscriptions', name: 'Planos e Pacotes', icon: <Crown size={20} /> },
    { path: '/financial', name: 'Financeiro', icon: <DollarSign size={20} /> },
    { path: '/staff', name: 'Profissionais', icon: <Users size={20} /> },
    { path: '/services', name: 'Serviços', icon: <Scissors size={20} /> },
    { path: '/products', name: 'Produtos', icon: <Package size={20} /> },
    { path: '/clients', name: 'Clientes', icon: <Users size={20} /> },
    { path: '/app-customization', name: 'App do Cliente', icon: <Smartphone size={20} /> },
  ];

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0`}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
        <span className="text-xl font-bold text-primary-500 tracking-wider">BARBER<span className="text-white">MASTER</span></span>
        <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400">
          <X size={24} />
        </button>
      </div>
      <nav className="p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive 
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
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === '/settings' 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Settings size={20} />
            <span>Minha Conta</span>
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors mt-2">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HashRouter>
      <div className="flex h-screen bg-dark-950 text-gray-100 overflow-hidden font-sans">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between h-16 px-4 bg-dark-900 border-b border-gray-800">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-300">
              <Menu size={24} />
            </button>
            <span className="text-xl font-bold text-primary-500">BARBERMASTER</span>
            <div className="w-6" />
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/chat" element={<ChatPage />} /> {/* Nova Rota */}
              <Route path="/comandas" element={<ComandasPage />} />
              <Route path="/commissions" element={<CommissionsPage />} /> 
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/app-customization" element={<AppCustomizationPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<div className="p-8 text-center text-gray-500">Página em construção</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;