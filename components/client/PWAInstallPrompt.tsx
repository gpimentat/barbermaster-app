
import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, ArrowUpCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { usePWAInstall } from '../../src/hooks/usePWAInstall';

interface PWAInstallPromptProps {
    primaryColor: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ primaryColor }) => {
    const { isInstallAvailable, isIOS, isSafari, isStandalone, handleInstallClick } = usePWAInstall();
    const [showPrompt, setShowPrompt] = useState(false);
    const [showIOSTutorial, setShowIOSTutorial] = useState(false);
    const [showSafariTransfer, setShowSafariTransfer] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Only show if not already installed (standalone)
        if (isStandalone) return;

        // In this version, we want it to be persistent until installed.
        // We'll still check if dismissed in the CURRENT session, but we want it to reappear if they come back.
        const sessionDismissed = sessionStorage.getItem('pwa_prompt_dismissed_session');

        if (!sessionDismissed) {
            const timer = setTimeout(() => {
                // If it's Android/Windows (isInstallAvailable) or iOS (isIOS)
                if (isInstallAvailable || isIOS) {
                    setShowPrompt(true);
                }
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isInstallAvailable, isIOS, isStandalone]);

    const handleDismiss = () => {
        setShowPrompt(false);
        // Dismiss only for this session if they click X
        sessionStorage.setItem('pwa_prompt_dismissed_session', 'true');
    };

    const onActionClick = () => {
        if (isIOS) {
            if (isSafari) {
                setShowIOSTutorial(true);
            } else {
                setShowSafariTransfer(true);
            }
        } else {
            handleInstallClick();
            // Don't auto-dismiss Android prompt as it might take time,
            // but the prompt() will dismiss its own UI.
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!showPrompt || isStandalone) return null;

    return (
        <>
            {/* Banner Principal Fixo */}
            <div className="fixed top-2 left-2 right-2 z-[100] animate-in slide-in-from-top-4 duration-500">
                <div className="bg-dark-900 border border-white/10 rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-4 flex items-center gap-4 relative overflow-hidden">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Download size={20} className="text-dark-950" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-white font-black text-[13px] uppercase tracking-tighter">Instalar Aplicativo</h4>
                        <p className="text-gray-500 text-[10px] truncate uppercase font-bold tracking-widest">Acesso VIP na tela inicial</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onActionClick}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg whitespace-nowrap"
                            style={{ backgroundColor: primaryColor, color: '#000' }}
                        >
                            {isIOS && !isSafari ? 'Abrir no Safari' : 'Instalar'}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Efeito de brilho discreto */}
                    <div
                        className="absolute -right-4 -bottom-4 w-16 h-16 blur-2xl rounded-full opacity-10 pointer-events-none"
                        style={{ backgroundColor: primaryColor }}
                    ></div>
                </div>
            </div>

            {/* Modal de Tutorial iOS Safari */}
            {showIOSTutorial && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className="w-full max-w-sm bg-dark-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6 text-center w-full flex-col items-center">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                <ArrowUpCircle size={32} style={{ color: primaryColor }} />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Adicionar ao iPhone</h3>
                            <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">Siga estes 3 passos simples</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary-500/50 transition-colors">
                                    <Share size={18} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-sm text-gray-400">
                                    1. Toque no ícone de <span className="text-white font-bold">Compartilhar</span> (quadrado com seta).
                                </p>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary-500/50 transition-colors">
                                    <PlusSquare size={18} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-sm text-gray-400">
                                    2. Role para baixo e escolha <span className="text-white font-bold">"Tela de Início"</span>.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 group">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary-500/50 transition-colors">
                                    <Check size={18} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-sm text-gray-400">
                                    3. Toque em <span className="text-white font-bold">"Adicionar"</span> no topo da tela.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSTutorial(false)}
                            className="w-full mt-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-xl"
                            style={{ backgroundColor: primaryColor, color: '#000' }}
                        >
                            Pronto, vou fazer!
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Transferência para Safari (Caso esteja no Chrome iOS, Facebook, Instagram) */}
            {showSafariTransfer && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="w-full max-w-sm text-center">
                        <div className="w-20 h-20 bg-primary-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-primary-500/20">
                            <ExternalLink size={32} style={{ color: primaryColor }} />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Atenção, Usuário iPhone</h3>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8">
                            Para instalar o app, a Apple exige que você use o navegador <span className="text-white font-bold italic">Safari</span>.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-dark-800 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                                <span className="text-gray-400 text-xs truncate mr-4 italic">{window.location.href}</span>
                                <button
                                    onClick={handleCopyLink}
                                    className="p-2 rounded-lg bg-white/5 text-primary-500 hover:bg-white/10 transition-colors shrink-0"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                            </div>

                            <p className="text-xs text-primary-500 font-bold uppercase tracking-widest animate-pulse">
                                {copied ? 'Link Copiado!' : 'Copie o link acima'}
                            </p>

                            <div className="pt-4 text-left space-y-3">
                                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Como fazer:</p>
                                <ol className="text-gray-500 text-xs space-y-2 list-decimal list-inside">
                                    <li>Copie o link acima</li>
                                    <li>Abra o app <span className="text-white">Safari</span></li>
                                    <li>Cole o link na barra de endereços</li>
                                    <li>Instale o app pelo menu de compartilhar!</li>
                                </ol>
                            </div>

                            <button
                                onClick={() => setShowSafariTransfer(false)}
                                className="w-full mt-6 py-4 rounded-2xl text-gray-400 border border-white/10 font-bold uppercase tracking-widest text-xs"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PWAInstallPrompt;
