import React from 'react';
import { TicketPercent, ExternalLink, Tag } from 'lucide-react';

interface ClientPartnersProps {
    tenant: any;
}

const ClientPartners: React.FC<ClientPartnersProps> = ({ tenant }) => {
    const appConfig = tenant?.settings?.app_config;
    const coupons = appConfig?.coupons || [];
    const primaryColor = appConfig?.general?.primaryColor || '#eab308';

    return (
        <div className="min-h-screen bg-gray-950 pb-24">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                <h1 className="text-xl font-bold text-white">Parcerias</h1>
                <p className="text-sm text-gray-400 mt-1">Cupons exclusivos para você</p>
            </div>

            <div className="p-6 space-y-4">
                {coupons.length > 0 ? coupons.map((coupon: any) => (
                    <div key={coupon.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                        <div className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${primaryColor}20` }}
                                >
                                    <TicketPercent size={20} style={{ color: primaryColor }} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold">{coupon.partnerName}</h3>
                                    <p className="text-xs text-primary-500 font-bold mt-1">{coupon.offer}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Válido até: {coupon.validity}</p>
                                </div>
                            </div>

                            <div
                                className="bg-gray-800 rounded-lg p-3 border-2 border-dashed mb-3"
                                style={{ borderColor: primaryColor }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-xs">Cupom:</span>
                                    <div className="flex items-center gap-2">
                                        <code
                                            className="font-mono font-bold text-sm"
                                            style={{ color: primaryColor }}
                                        >
                                            {coupon.code}
                                        </code>
                                        <Tag size={14} style={{ color: primaryColor }} />
                                    </div>
                                </div>
                            </div>

                            <button
                                className="w-full py-2.5 rounded-lg font-bold text-dark-950 flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <ExternalLink size={16} />
                                Usar Cupom
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12">
                        <TicketPercent className="mx-auto text-gray-600 mb-3" size={48} />
                        <h3 className="text-white font-bold mb-1">Nenhum cupom disponível</h3>
                        <p className="text-gray-400 text-sm">Novas parcerias em breve!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientPartners;
