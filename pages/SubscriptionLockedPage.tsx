import React from 'react';
import { Lock, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

const SubscriptionLockedPage: React.FC = () => {
    const { logout, currentUser } = useAuth();

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-dark-900 border border-red-500/30 rounded-2xl shadow-2xl p-8 text-center animate-in zoom-in-95">

                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="text-red-500" size={40} />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Acesso Temporariamente Suspenso</h1>
                <p className="text-gray-400 mb-8">
                    A assinatura da sua barbearia <strong>{currentUser?.tenantName || 'Sua Barbearia'}</strong> está inativa ou com pagamentos pendentes.
                </p>

                <div className="bg-gray-800/50 rounded-xl p-4 mb-8 text-sm text-left border border-gray-700">
                    <p className="text-gray-300 font-medium mb-1 flex items-center gap-2">
                        <CreditCard size={16} className="text-primary-500" /> O que fazer?
                    </p>
                    <p className="text-gray-500">
                        Entre em contato com o administrador do sistema ou realize o pagamento da fatura pendente para liberar o acesso imediatamente.
                    </p>
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                    <LogOut size={18} /> Sair do Sistema
                </button>

            </div>
        </div>
    );
};

export default SubscriptionLockedPage;
