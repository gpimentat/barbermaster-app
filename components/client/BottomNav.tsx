import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Gift, TicketPercent, User, Crown } from 'lucide-react';

interface BottomNavProps {
    tenant: any;
}

const BottomNav: React.FC<BottomNavProps> = ({ tenant }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const primaryColor = tenant?.settings?.app_config?.general?.primaryColor || '#eab308';
    const features = tenant?.settings?.app_config?.features;

    const tabs = [
        { id: 'home', path: `/app/${tenant.slug}`, icon: Home, label: 'Início' },
        { id: 'booking', path: `/app/${tenant.slug}/booking`, icon: Calendar, label: 'Agendar' },
        { id: 'plans', path: `/app/${tenant.slug}/plans`, icon: Crown, label: 'Assinar' },
        ...(features?.loyaltyProgram ? [{ id: 'rewards', path: `/app/${tenant.slug}/rewards`, icon: Gift, label: 'Clube' }] : []),
        ...(features?.partnersClub ? [{ id: 'partners', path: `/app/${tenant.slug}/partners`, icon: TicketPercent, label: 'Cupons' }] : []),
        { id: 'profile', path: `/app/${tenant.slug}/profile`, icon: User, label: 'Perfil' }
    ];

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-area-inset-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = isActive(tab.path);

                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className="flex flex-col items-center justify-center gap-1 p-2 flex-1 transition-colors"
                        >
                            <Icon
                                size={20}
                                style={{ color: active ? primaryColor : '#9ca3af' }}
                            />
                            <span
                                className="text-[10px] font-medium"
                                style={{ color: active ? primaryColor : '#9ca3af' }}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
