
import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, ArrowUpCircle } from 'lucide-react';
import { usePWAInstall } from '../../src/hooks/usePWAInstall';

interface PWAInstallPromptProps {
    primaryColor: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ primaryColor }) => {
    const { isInstallAvailable, isIOS, isStandalone, handleInstallClick } = usePWAInstall();
    const [showPrompt, setShowPrompt] = useState(false);
    const [showIOSTutorial, setShowIOSTutorial] = useState(false);

    useEffect(() => {
        // Only show if not already installed
        if (isStandalone) return;

        // Check if dismissed recently
        const dismissed = localStorage.getItem('pwa_prompt_dismissed');
        const lastDismissed = dismissed ? parseInt(dismissed) : 0;
        const now = Date.now();

        // Show again after 3 days if dismissed
        if (now - lastDismissed > 3 * 24 * 60 * 60 * 1000) {
            // Delay showing to not annoy immediately
            const timer = setTimeout(() => {
                if (isInstallAvailable || isIOS) {
                    setShowPrompt(true);
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isInstallAvailable, isIOS, isStandalone]);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    };

    const onActionClick = () => {
        if (isIOS) {
            setShowIOSTutorial(true);
        } else {
            handleInstallClick();
            setShowPrompt(false);
        }
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <>
            {/* Banner Principal */}
            <div className="fixed top-4 left-4 right-4 z-[100] animate-in slide-in-from-top-4 duration-500">
                <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center gap-4 relative overflow-hidden group">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Download size={24} className="text-dark-950" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-black text-sm uppercase tracking-tight">Instalar App</h4>
                        <p className="text-gray-400 text-xs truncate">Acesse mais rápido e sem navegar!</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onActionClick}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                            style={{ backgroundColor: primaryColor, color: '#000' }}
                        >
                            {isIOS ? 'Como Instalar' : 'Instalar'}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Efeito Visual de Fundo */}
                    <div
                        className="absolute -right-4 -bottom-4 w-20 h-20 blur-2xl rounded-full opacity-20 pointer-events-none"
                        style={{ backgroundColor: primaryColor }}
                    ></div>
                </div>
            </div>

            {/* Modal de Tutorial iOS */}
            {showIOSTutorial && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div
                        className="w-full max-w-sm bg-gray-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Instalar no iPhone</h3>
                            <button onClick={() => setShowIOSTutorial(false)} className="text-gray-500 hover:text-white p-1">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-primary-500 border border-white/5">
                                    <Share size={20} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-sm text-gray-300">
                                    1. Toque no botão de <span className="text-white font-bold">Compartilhar</span> na barra do Safari.
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-primary-500 border border-white/5">
                                    <PlusSquare size={20} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-sm text-gray-300">
                                    2. Role para baixo e selecione <span className="text-white font-bold">"Adicionar à Tela de Início"</span>.
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-primary-500 border border-white/5">
                                    <ArrowUpCircle size={20} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-sm text-gray-300">
                                    3. Toque em <span className="text-white font-bold">"Adicionar"</span> no canto superior.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowIOSTutorial(false);
                                setShowPrompt(false);
                                localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
                            }}
                            className="w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-xl"
                            style={{ backgroundColor: primaryColor, color: '#000' }}
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PWAInstallPrompt;
