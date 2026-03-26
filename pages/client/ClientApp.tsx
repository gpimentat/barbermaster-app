import React, { useEffect, useState } from 'react';
import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '../../src/supabaseClient';
import ClientHome from './ClientHome';
import ClientLogin from './ClientLogin';
import ClientBooking from './ClientBooking';
import ClientProfile from './ClientProfile';
import ClientRewards from './ClientRewards';
import ClientPartners from './ClientPartners';
import BottomNav from '../../components/client/BottomNav';
import ClientSubscriptionPlans from './ClientSubscriptionPlans';
import ClientFeedback from './ClientFeedback';

interface TenantConfig {
    id: string;
    name: string;
    slug: string;
    settings: {
        app_config?: {
            general?: {
                name: string;
                slogan: string;
                description: string;
                primaryColor: string;
                logoPreview: string;
                coverPreview: string;
                address: string;
                phone: string;
                instagram: string;
            };
            features?: {
                loyaltyProgram: boolean;
                photoGallery: boolean;
                reviews: boolean;
                socialLinks: boolean;
                partnersClub: boolean;
            };
        };
    };
}

const ClientApp: React.FC = () => {
    const { slug: urlSlug } = useParams<{ slug: string }>();
    const [tenant, setTenant] = useState<TenantConfig | null>(null);
    const [resolvedSlug, setResolvedSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [clientData, setClientData] = useState<any>(null);

    useEffect(() => {
        loadTenantConfig();
    }, [urlSlug]);

    useEffect(() => {
        if (resolvedSlug) {
            checkAuth();
        }
    }, [resolvedSlug]);

    const loadTenantConfig = async () => {
        try {
            const hostname = window.location.hostname;
            let tenantData = null;
            let currentSlug = urlSlug;

            // 1. Tentar extrair slug de subdomínio (ex: meuslug.barbermaster.com.br)
            if (hostname.endsWith('.barbermaster.com.br') && hostname !== 'app.barbermaster.com.br' && hostname !== 'www.barbermaster.com.br') {
                const subdomain = hostname.split('.')[0];
                console.log('Tentando buscar tenant por subdomínio:', subdomain);

                const { data, error } = await supabase
                    .from('tenants')
                    .select('id, name, slug, settings')
                    .eq('slug', subdomain)
                    .maybeSingle();

                if (error) console.error('Erro ao buscar por subdomínio:', error);
                if (data) {
                    console.log('Tenant encontrado por subdomínio:', data);
                    tenantData = data;
                    currentSlug = data.slug;
                }
            }

            // 2. Tentar buscar por domínio customizado (se não encontrou por subdomain)
            if (!tenantData && hostname !== 'barbermaster.com.br' && hostname !== 'app.barbermaster.com.br' && hostname !== 'localhost' && !hostname.endsWith('.barbermaster.com.br')) {
                console.log('Tentando buscar tenant por domínio customizado:', hostname);

                // Buscar todos os tenants e filtrar manualmente (workaround para JSONB)
                const { data: allTenants, error } = await supabase
                    .from('tenants')
                    .select('id, name, slug, settings');

                if (error) console.error('Erro ao buscar tenants:', error);

                if (allTenants) {
                    tenantData = allTenants.find(t => {
                        const customDomain = t.settings?.app_config?.domain?.customDomain;
                        return customDomain === hostname || customDomain === `www.${hostname}` || `www.${customDomain}` === hostname;
                    });

                    if (tenantData) {
                        console.log('Tenant encontrado por domínio customizado:', tenantData);
                        currentSlug = tenantData.slug;
                    }
                }
            }

            // 3. Fallback para slug via URL (/app/:slug)
            if (!tenantData && urlSlug) {
                console.log('Tentando buscar tenant por slug na URL:', urlSlug);

                const { data, error } = await supabase
                    .from('tenants')
                    .select('id, name, slug, settings')
                    .eq('slug', urlSlug)
                    .maybeSingle();

                if (error) console.error('Erro ao buscar por slug:', error);
                if (data) {
                    console.log('Tenant encontrado por slug na URL:', data);
                    tenantData = data;
                    currentSlug = data.slug;
                }
            }

            if (tenantData) {
                setTenant(tenantData);
                setResolvedSlug(currentSlug || null);
                updatePWAManifest(tenantData);
                const primaryColor = tenantData.settings?.app_config?.general?.primaryColor || '#eab308';
                document.documentElement.style.setProperty('--primary-color', primaryColor);
            } else {
                console.error('Nenhum tenant encontrado para:', { hostname, urlSlug });
            }
        } catch (error) {
            console.error('Erro ao carregar barbearia:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePWAManifest = (tenantData: TenantConfig) => {
        const appConfig = tenantData.settings?.app_config;
        const general = appConfig?.general;

        // Criar manifest dinâmico
        const manifest = {
            name: general?.name || 'BarberMaster',
            short_name: general?.name?.substring(0, 12) || 'Barber',
            description: general?.slogan || 'Agende seu corte',
            start_url: `/app/${tenantData.slug}`,
            display: 'standalone',
            background_color: '#0f172a',
            theme_color: general?.primaryColor || '#eab308',
            orientation: 'portrait',
            icons: [
                {
                    src: general?.logoPreview || '/logo-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable'
                },
                {
                    src: general?.logoPreview || '/logo-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable'
                }
            ]
        };

        // Atualizar link do manifest
        const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(manifestBlob);

        let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'manifest';
            document.head.appendChild(link);
        }
        link.href = manifestURL;

        // Atualizar meta tags
        updateMetaTags(general);
    };

    const updateMetaTags = (general: any) => {
        // Theme color
        let themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
        if (!themeColor) {
            themeColor = document.createElement('meta');
            themeColor.name = 'theme-color';
            document.head.appendChild(themeColor);
        }
        themeColor.content = general?.primaryColor || '#eab308';

        // Apple specific
        let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement;
        if (!appleTitle) {
            appleTitle = document.createElement('meta');
            appleTitle.name = 'apple-mobile-web-app-title';
            document.head.appendChild(appleTitle);
        }
        appleTitle.content = general?.name || 'BarberMaster';

        // Apple capable
        let appleCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement;
        if (!appleCapable) {
            appleCapable = document.createElement('meta');
            appleCapable.name = 'apple-mobile-web-app-capable';
            document.head.appendChild(appleCapable);
        }
        appleCapable.content = 'yes';
    };

    const checkAuth = () => {
        // Verificar se cliente está logado
        const clientSession = localStorage.getItem(`client_session_${resolvedSlug}`);
        if (clientSession) {
            try {
                const data = JSON.parse(clientSession);
                // Migração: Se tiver clientId mas não id, sincroniza (sessões antigas)
                if (data.clientId && !data.id) {
                    data.id = data.clientId;
                }
                setClientData(data);
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Error parsing session:', error);
                setIsAuthenticated(false);
            }
        } else {
            setIsAuthenticated(false);
        }
    };

    const handleLogin = (data: any) => {
        setClientData(data);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem(`client_session_${resolvedSlug}`);
        setClientData(null);
        setIsAuthenticated(false);
    };

    const handleUpdateProfile = (newData: any) => {
        const updatedData = { ...clientData, ...newData };
        setClientData(updatedData);
        localStorage.setItem(`client_session_${resolvedSlug}`, JSON.stringify(updatedData));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Barbearia não encontrada</h1>
                    <p className="text-gray-400">Verifique o link e tente novamente.</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <ClientLogin tenant={tenant} onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-gray-950 pb-20" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <Routes>
                <Route path="/" element={<ClientHome tenant={tenant} clientData={clientData} />} />
                <Route path="/booking" element={<ClientBooking tenant={tenant} clientData={clientData} />} />
                <Route path="/rewards" element={<ClientRewards tenant={tenant} clientData={clientData} />} />
                <Route path="/partners" element={<ClientPartners tenant={tenant} />} />
                <Route path="/profile" element={<ClientProfile tenant={tenant} clientData={clientData} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} />} />
                <Route path="/plans" element={<ClientSubscriptionPlans tenant={tenant} clientData={clientData} />} />
                <Route path="/feedback" element={<ClientFeedback tenant={tenant} clientData={clientData} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <BottomNav tenant={tenant} />
        </div>
    );
};

export default ClientApp;
