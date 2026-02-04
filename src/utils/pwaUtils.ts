
/**
 * Utilitário para gerar e injetar o Manifesto PWA dinamicamente.
 * Isso permite que cada barbearia tenha seu próprio ícone e nome na tela inicial.
 */
export const updateDynamicManifest = (tenantData: any) => {
    if (!tenantData) return;

    const settings = tenantData.settings?.app_config?.general || {};
    const appName = settings.name || 'BarberMaster';
    const appIcon = settings.pwaIconPreview || '/icon-192-v14.png';
    const themeColor = settings.primaryColor || '#0f172a';
    const slug = tenantData.slug;

    const manifest = {
        name: appName,
        short_name: appName.split(' ')[0],
        description: settings.description || 'Sistema de Gestão para Barbearias',
        start_url: `/#/app/${slug}`, // Garante que abra na barbearia certa
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: themeColor,
        icons: [
            {
                src: appIcon,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
            },
            {
                src: appIcon,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
            }
        ]
    };

    // Converter para string e depois para Blob
    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);

    // Tentar encontrar o link do manifesto existente e atualizar ou criar um novo
    let manifestLink = document.querySelector('link[rel="manifest"]');

    if (manifestLink) {
        manifestLink.setAttribute('href', manifestURL);
    } else {
        manifestLink = document.createElement('link');
        manifestLink.setAttribute('rel', 'manifest');
        manifestLink.setAttribute('href', manifestURL);
        document.head.appendChild(manifestLink);
    }

    // Também atualizar ícones do iOS (Apple Touch Icon)
    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
        appleIcon.setAttribute('href', appIcon);
    } else {
        appleIcon = document.createElement('link');
        appleIcon.setAttribute('rel', 'apple-touch-icon');
        appleIcon.setAttribute('href', appIcon);
        document.head.appendChild(appleIcon);
    }

    console.log(`PWA: Manifesto dinâmico aplicado para ${appName}`);
};
