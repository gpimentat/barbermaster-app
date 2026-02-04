
/**
 * Utilitário para gerar e injetar o Manifesto PWA dinamicamente.
 * Isso permite que cada barbearia tenha seu próprio ícone e nome na tela inicial.
 */
export const updateDynamicManifest = (tenantData: any) => {
    if (!tenantData) return;

    const settings = tenantData.settings?.app_config?.general || {};
    const appName = settings.name || 'BarberMaster';

    // Adicionar timestamp para evitar cache do iOS
    const timestamp = Date.now();
    const appIcon = settings.pwaIconPreview
        ? `${settings.pwaIconPreview}${settings.pwaIconPreview.includes('?') ? '&' : '?'}v=${timestamp}`
        : `/apple-touch-icon-v10.png?v=${timestamp}`;

    const themeColor = settings.primaryColor || '#0f172a';
    const slug = tenantData.slug;

    // 1. Atualizar Manifesto
    const manifest = {
        name: appName,
        short_name: appName.split(' ')[0],
        description: settings.description || 'Sistema de Gestão para Barbearias',
        start_url: `/#/app/${slug}`,
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

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);

    // Remover qualquer manifesto antigo para garantir que o navegador leia o novo
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove());

    const manifestLink = document.createElement('link');
    manifestLink.setAttribute('rel', 'manifest');
    manifestLink.setAttribute('href', manifestURL);
    document.head.appendChild(manifestLink);

    // 2. Atualizar TODOS os Apple Touch Icons (iOS é muito rigoroso aqui)
    document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(el => el.remove());

    // Adicionar o ícone principal e os tamanhos específicos que o iOS procura
    const sizes = [null, '152x152', '180x180', '167x167'];
    sizes.forEach(size => {
        const link = document.createElement('link');
        link.setAttribute('rel', 'apple-touch-icon');
        if (size) link.setAttribute('sizes', size);
        link.setAttribute('href', appIcon);
        document.head.appendChild(link);
    });

    // 3. Atualizar Favicons padrão
    document.querySelectorAll('link[rel="icon"]').forEach(el => el.remove());
    const favicon = document.createElement('link');
    favicon.setAttribute('rel', 'icon');
    favicon.setAttribute('type', 'image/png');
    favicon.setAttribute('href', appIcon);
    document.head.appendChild(favicon);

    // 4. Atualizar Meta tags de cor e título
    document.querySelectorAll('meta[name="apple-mobile-web-app-title"]').forEach(el => el.setAttribute('content', appName));
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.setAttribute('content', themeColor));

    console.log(`PWA: Configurações dinâmicas aplicadas para ${appName}. Ícone: ${appIcon}`);
};
