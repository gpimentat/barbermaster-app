
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export const usePWAInstall = () => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detect iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIosDevice);

        // Detect if already installed/standalone
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        setIsStandalone(!!isStandaloneMode);

        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
            console.log('PWA: beforeinstallprompt event captured');
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) return;

        // Show the install prompt
        await installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        console.log(`PWA: User response to install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setInstallPrompt(null);
    };

    return {
        isInstallAvailable: !!installPrompt,
        isIOS,
        isStandalone,
        handleInstallClick
    };
};
