
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Store,
    Palette,
    Clock,
    Save,
    Smartphone,
    CheckCircle2,
    Layout,
    Star,
    Gift,
    Package,
    Image as ImageIcon,
    Calendar,
    Grid,
    List,
    LayoutTemplate,
    Globe,
    Lock,
    Unlock,
    Plus,
    Trash2,
    User,
    Scissors,
    LogOut,
    ChevronRight,
    MapPin,
    Phone,
    Instagram,
    ArrowRight,
    ArrowLeft,
    UserPlus,
    Upload,
    Send,
    ImagePlus,
    Check,
    X as XIcon,
    MessageSquare,
    Camera,
    KeyRound,
    Mail,
    UserCheck,
    ToggleLeft,
    ToggleRight,
    Pipette,
    Info,
    CalendarCheck,
    Map,
    MessageCircle,
    AlertTriangle,
    TicketPercent,
    Copy,
    ExternalLink,
    Home,
    CreditCard,
    Bell
} from 'lucide-react';
import { MOCK_REWARDS, MOCK_SERVICES } from '../constants';
import { Reward } from '../types';

interface OperatingHours {
    day: string;
    isOpen: boolean;
    open: string;
    close: string;
}

interface GalleryPhoto {
    id: string;
    url: string;
    status: 'approved' | 'pending';
    uploader: string; // 'Admin' ou 'Cliente'
    date: string;
}

interface ClientFeedback {
    id: number;
    clientId?: string;
    name: string;
    rating: number;
    text: string;
    date: string;
    status: 'approved' | 'pending';
}

interface PartnerCoupon {
    id: string;
    partnerName: string;
    offer: string; // ex: 20% OFF
    code: string;
    validity: string;
    vipOnly: boolean;
    active: boolean;
}

const THEME_PRESETS = [
    { name: 'Gold Luxury', color: '#eab308' },
    { name: 'Royal Blue', color: '#3b82f6' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Ruby', color: '#ef4444' },
    { name: 'Violet', color: '#8b5cf6' },
    { name: 'Midnight', color: '#64748b' },
];

import { useAuth } from '../AuthContext';
import { supabase } from '../src/supabaseClient';

const AppCustomizationPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'visual' | 'content' | 'hours' | 'features' | 'domain' | 'rewards' | 'gallery' | 'feedbacks' | 'partners'>('visual');
    const [loading, setLoading] = useState(true);

    // ESTADO DO PREVIEW
    const [previewScreen, setPreviewScreen] = useState<'login' | 'app'>('login');
    const [appTab, setAppTab] = useState<'home' | 'schedule' | 'rewards' | 'profile'>('home');

    // Estados para Login com OTP
    const [previewPhone, setPreviewPhone] = useState('');
    const [previewOTP, setPreviewOTP] = useState('');
    const [previewLoginStep, setPreviewLoginStep] = useState<'phone' | 'otp'>('phone');
    const [previewOTPSent, setPreviewOTPSent] = useState(false);

    // Estados para Agendamento
    const [previewBookingStep, setPreviewBookingStep] = useState<'service' | 'professional' | 'datetime' | 'confirm'>('service');
    const [previewSelectedService, setPreviewSelectedService] = useState<any>(null);
    const [previewSelectedProfessional, setPreviewSelectedProfessional] = useState<any>(null);
    const [previewSelectedDate, setPreviewSelectedDate] = useState<Date | null>(null);
    const [previewSelectedTime, setPreviewSelectedTime] = useState<string>('');

    // Estado para Navegação do Perfil
    const [previewProfileSubscreen, setPreviewProfileSubscreen] = useState<'main' | 'history' | 'purchases' | 'rewards' | 'notifications'>('main');

    const [showSuccess, setShowSuccess] = useState(false);

    // Estados locais para inputs do preview (Simulação)
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [loginPass, setLoginPass] = useState('');

    // Estado do Usuário Simulado (Para mostrar no Perfil)
    const [simulationUser, setSimulationUser] = useState({
        name: 'João da Silva',
        phone: '(11) 99999-9999',
        email: 'joao@email.com',
        avatar: 'https://ui-avatars.com/api/?name=João+Silva&background=random&color=fff'
    });

    // Dados de Cadastro Completo (Cliente Novo)
    const [registerData, setRegisterData] = useState({
        name: '',
        phone: '',
        email: '',
        birthDate: '',
        password: '',
        confirmPassword: ''
    });

    // Dados para Primeiro Acesso
    const [firstAccessPhone, setFirstAccessPhone] = useState('');
    const [firstAccessData, setFirstAccessData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Load Settings from Supabase
    React.useEffect(() => {
        if (currentUser?.tenantId) {
            setLoading(true);
            fetchSettings();
        }
    }, [currentUser]);

    const fetchSettings = async () => {
        try {
            console.log('Fetching app settings for tenant:', currentUser?.tenantId);
            const { data, error } = await supabase
                .from('tenants')
                .select('settings')
                .eq('id', currentUser?.tenantId || '')
                .maybeSingle();

            if (error) {
                console.error('Supabase error fetching settings:', error);
                // Don't throw, just let it be empty default
            }

            if (!data) {
                console.warn('No tenant settings found for ID:', currentUser?.tenantId);
                // Keep default state
            } else if (data.settings?.app_config) {
                const config = data.settings.app_config;
                console.log('Settings loaded:', config);

                if (config.general) setSettings(prev => ({ ...prev, ...config.general }));
                if (config.layout) setLayoutConfig(prev => ({ ...prev, ...config.layout }));
                if (config.domain) setDomainConfig(prev => ({ ...prev, ...config.domain }));
                if (config.features) setFeatures(prev => ({ ...prev, ...config.features }));
                if (config.hours) setHours(config.hours);
                if (config.rewards) setRewards(config.rewards);
                if (config.gallery) setGalleryPhotos(config.gallery);
                if (config.coupons) setCoupons(config.coupons);
                if (config.feedbacks) setClientFeedbacks(config.feedbacks);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Estado para Feedbacks (Simulação)
    const [clientFeedbacks, setClientFeedbacks] = useState<ClientFeedback[]>([
        { id: 1, clientId: 'c1', name: 'Carlos M.', rating: 5, text: "Melhor corte da região, atendimento top!", date: 'Há 2 dias', status: 'approved' },
        { id: 2, clientId: 'c2', name: 'Rafael S.', rating: 5, text: "Profissionais excelentes e ambiente limpo.", date: 'Há 1 semana', status: 'approved' },
        { id: 3, clientId: 'c3', name: 'Mateus Souza', rating: 2, text: "O corte ficou bom, mas a espera foi muito longa mesmo com horário marcado.", date: 'Hoje', status: 'pending' }
    ]);

    // Estado da Galeria
    const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([
        { id: '1', url: 'https://picsum.photos/200/200?random=21', status: 'approved', uploader: 'Admin', date: '2023-10-01' },
        { id: '2', url: 'https://picsum.photos/200/200?random=22', status: 'approved', uploader: 'Admin', date: '2023-10-02' },
        { id: '3', url: 'https://picsum.photos/200/200?random=23', status: 'approved', uploader: 'Admin', date: '2023-10-03' },
        { id: '4', url: 'https://picsum.photos/200/200?random=24', status: 'pending', uploader: 'Você (Cliente)', date: 'Hoje' },
    ]);

    // Estado de Cupons/Parcerias
    const [coupons, setCoupons] = useState<PartnerCoupon[]>([
        { id: '1', partnerName: 'Academia Power', offer: '15% OFF Mensalidade', code: 'BARBER15', validity: '31/12', vipOnly: true, active: true },
        { id: '2', partnerName: 'Burger King Local', offer: 'Batata Grátis no Combo', code: 'KINGBARBER', validity: 'Indeterminado', vipOnly: false, active: true },
    ]);
    const [newCoupon, setNewCoupon] = useState<Partial<PartnerCoupon>>({
        partnerName: '', offer: '', code: '', validity: '', vipOnly: false
    });

    // Rewards State
    const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
    const [newReward, setNewReward] = useState({ title: '', pointsCost: '' });

    // Refs para Upload
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const pwaIconInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Configurações de Layout
    const [layoutConfig, setLayoutConfig] = useState({
        homeStyle: 'classic' as 'classic' | 'modern' | 'minimal',
        serviceStyle: 'list' as 'list' | 'grid',
        showBanner: true,
        roundedCorners: true,
    });

    // Estado das Configurações Gerais
    const [settings, setSettings] = useState({
        name: 'BarberMaster Estilo',
        slogan: 'O melhor corte da cidade',
        description: 'Especialistas em cortes clássicos e modernos. Ambiente climatizado e cerveja gelada.',
        primaryColor: '#eab308',
        logoPreview: 'https://picsum.photos/200/200?random=logo',
        coverPreview: 'https://picsum.photos/800/400?random=cover',
        pwaIconPreview: 'https://picsum.photos/192/192?random=pwa',
        address: 'Rua das Flores, 123 - Centro',
        phone: '(11) 99999-9999',
        instagram: '@barbermaster',
        website: 'barbermaster.com.br'
    });

    // Configuração de Domínio
    const [domainConfig, setDomainConfig] = useState({
        type: 'platform' as 'platform' | 'custom',
        slug: 'barber-master-estilo',
        customDomain: '',
        isVerified: false
    });

    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

    const checkSlugAvailability = async (slug: string) => {
        if (!slug) return;
        if (slug === domainConfig.slug) {
            setSlugStatus('available');
            return;
        }

        setSlugStatus('checking');
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select('id')
                .eq('slug', slug)
                .maybeSingle();

            if (data && data.id !== currentUser?.tenantId) {
                setSlugStatus('taken');
            } else {
                setSlugStatus('available');
            }
        } catch (error) {
            console.error('Error checking slug:', error);
            setSlugStatus('idle');
        }
    };

    const [features, setFeatures] = useState({
        loyaltyProgram: true,
        photoGallery: true,
        reviews: true,
        socialLinks: true,
        partnersClub: true
    });

    const [hours, setHours] = useState<OperatingHours[]>([
        { day: 'Segunda', isOpen: true, open: '09:00', close: '19:00' },
        { day: 'Terça', isOpen: true, open: '09:00', close: '19:00' },
        { day: 'Quarta', isOpen: true, open: '09:00', close: '19:00' },
        { day: 'Quinta', isOpen: true, open: '09:00', close: '20:00' },
        { day: 'Sexta', isOpen: true, open: '09:00', close: '20:00' },
        { day: 'Sábado', isOpen: true, open: '08:00', close: '18:00' },
        { day: 'Domingo', isOpen: false, open: '00:00', close: '00:00' },
    ]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const uploadImage = async (file: File, path: string): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser?.tenantId}/${path}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('app-assets')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                alert('Erro ao fazer upload da imagem. Tente novamente.');
                return null;
            }

            const { data } = supabase.storage
                .from('app-assets')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error in upload helper:', error);
            return null;
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setLoading(true);
        console.log('Iniciando upload do logo...');

        try {
            const file = e.target.files[0];
            const publicUrl = await uploadImage(file, 'logo');

            if (publicUrl) {
                console.log('Logo enviado com sucesso:', publicUrl);
                setSettings(prev => ({ ...prev, logoPreview: publicUrl }));
                alert('Logo enviado com sucesso! Não esqueça de clicar em SALVAR no topo da página.');
            } else {
                throw new Error('Url pública não gerada');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Falha no upload. Verifique o console para detalhes.');
        } finally {
            setLoading(false);
        }
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setLoading(true);

        try {
            const file = e.target.files[0];
            const publicUrl = await uploadImage(file, 'cover');

            if (publicUrl) {
                setSettings(prev => ({ ...prev, coverPreview: publicUrl }));
                alert('Capa enviada com sucesso! Não esqueça de clicar em SALVAR no topo da página.');
            } else {
                throw new Error('Url pública não gerada');
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Falha no upload. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const handlePwaIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setLoading(true);

        try {
            const file = e.target.files[0];
            const publicUrl = await uploadImage(file, 'pwa-icon');

            if (publicUrl) {
                setSettings(prev => ({ ...prev, pwaIconPreview: publicUrl }));
                alert('Ícone do App enviado com sucesso! Não esqueça de salvar.');
            }
        } catch (error) {
            console.error('Erro no upload do ícone PWA:', error);
            alert('Falha no upload do ícone.');
        } finally {
            setLoading(false);
        }
    };

    const handleContactClient = (feedback: ClientFeedback) => {
        navigate('/chat', {
            state: {
                clientId: feedback.clientId || `temp-${Date.now()}`,
                clientName: feedback.name,
                initialMessage: `Olá ${feedback.name}, vi sua avaliação sobre "${feedback.text}". Gostaria de conversar para resolvermos isso da melhor forma.`
            }
        });
    };

    // ... (Login logic maintained)
    const handleLoginSubmit = () => { if (loginIdentifier && loginPass) setPreviewScreen('app'); };
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => { setRegisterData({ ...registerData, [e.target.name]: e.target.value }); };
    const handleRegisterSubmit = () => {
        if (!registerData.name) return;
        setSimulationUser({ name: registerData.name, phone: registerData.phone, email: registerData.email, avatar: `https://ui-avatars.com/api/?name=${registerData.name}&background=random` });
        setPreviewScreen('app');
    };
    const handleFirstAccessCheck = () => { if (!firstAccessPhone) return; setPreviewScreen('app'); }; // Simplified for preview
    const handleFirstAccessComplete = () => {
        if (!firstAccessData.email) return;
        setSimulationUser(prev => ({ ...prev, email: firstAccessData.email, phone: firstAccessPhone }));
        setPreviewScreen('app');
    };

    const handleAddReward = () => {
        if (!newReward.title || !newReward.pointsCost) return;
        setRewards([...rewards, { id: Date.now().toString(), title: newReward.title, pointsCost: parseInt(newReward.pointsCost), description: 'Resgate este prêmio com seus pontos.' }]);
        setNewReward({ title: '', pointsCost: '' });
    };

    const handleDeleteReward = (id: string) => { setRewards(rewards.filter(r => r.id !== id)); };

    const handleAddCoupon = () => {
        if (!newCoupon.partnerName || !newCoupon.offer || !newCoupon.code) return;
        setCoupons([...coupons, {
            id: Date.now().toString(),
            partnerName: newCoupon.partnerName,
            offer: newCoupon.offer,
            code: newCoupon.code,
            validity: newCoupon.validity || 'Indeterminado',
            vipOnly: newCoupon.vipOnly || false,
            active: true
        } as PartnerCoupon]);
        setNewCoupon({ partnerName: '', offer: '', code: '', validity: '', vipOnly: false });
    };

    const handleDeleteCoupon = (id: string) => {
        setCoupons(coupons.filter(c => c.id !== id));
    };

    const handleSave = async () => {
        if (!currentUser?.tenantId) return;

        if (slugStatus === 'taken') {
            alert('⚠️ O endereço (slug) escolhido já está em uso. Por favor, escolha outro.');
            return;
        }

        try {
            setShowSuccess(true);

            // 1. Get current settings to preserve other keys (like wa_templates)
            const { data: currentData } = await supabase
                .from('tenants')
                .select('settings')
                .eq('id', currentUser.tenantId)
                .single();

            const existingSettings = currentData?.settings || {};

            // 2. Prepare new config object
            const newAppConfig = {
                general: settings,
                layout: layoutConfig,
                domain: domainConfig,
                features: features,
                hours: hours,
                rewards: rewards,
                gallery: galleryPhotos,
                coupons: coupons,
                feedbacks: clientFeedbacks
            };

            // 3. Merge and Update (including slug!)
            const { error } = await supabase
                .from('tenants')
                .update({
                    slug: domainConfig.slug, // ✅ ADICIONADO: Salvar o slug!
                    settings: {
                        ...existingSettings,
                        app_config: newAppConfig
                    }
                })
                .eq('id', currentUser.tenantId);

            if (error) throw error;

            setTimeout(() => setShowSuccess(false), 3000);
            console.log('✅ Settings saved successfully! Slug:', domainConfig.slug);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações. Tente novamente.');
            setShowSuccess(false);
        }
    };





    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setLoading(true);

        try {
            const file = e.target.files[0];
            const publicUrl = await uploadImage(file, 'gallery');

            if (publicUrl) {
                const newPhoto: GalleryPhoto = {
                    id: Date.now().toString(),
                    url: publicUrl,
                    status: 'approved',
                    uploader: 'Admin',
                    date: new Date().toLocaleDateString()
                };
                setGalleryPhotos(prev => [newPhoto, ...prev]);
                alert('Foto adicionada com sucesso! Não esqueça de salvar as alterações.');
            }
        } catch (error) {
            console.error('Error in gallery upload:', error);
            alert('Falha ao subir imagem para galeria.');
        } finally {
            setLoading(false);
        }
    };

    const verifyDomain = () => {
        if (domainConfig.customDomain.includes('.')) {
            alert('Verificando registros DNS...');
            setTimeout(() => {
                setDomainConfig(prev => ({ ...prev, isVerified: true }));
            }, 1500);
        } else {
            alert('Insira um domínio válido.');
        }
    };

    const toggleFeature = (key: keyof typeof features) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleDayToggle = (index: number) => {
        const newHours = [...hours];
        newHours[index].isOpen = !newHours[index].isOpen;
        setHours(newHours);
    };

    const handleTimeChange = (index: number, field: 'open' | 'close', value: string) => {
        const newHours = [...hours];
        newHours[index][field] = value;
        setHours(newHours);
    };

    const approveFeedback = (id: number) => { setClientFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: 'approved' } : f)); };
    const rejectFeedback = (id: number) => { setClientFeedbacks(prev => prev.filter(f => f.id !== id)); };
    const rejectPhoto = (id: string) => { setGalleryPhotos(prev => prev.filter(p => p.id !== id)); };
    const approvePhoto = (id: string) => { setGalleryPhotos(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p)); };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">App do Cliente</h1>
                    <p className="text-gray-400">Personalize a identidade, layout e funcionalidades.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg shadow-primary-500/10"
                    >
                        {showSuccess ? <CheckCircle2 size={20} /> : <Save size={20} />}
                        {showSuccess ? 'Publicado!' : 'Publicar App'}
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden min-h-0">

                {/* Lado Esquerdo - Controles (CMS) */}
                <div className="lg:col-span-7 flex flex-col bg-dark-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
                    {/* Navegação de Abas */}
                    <div className="flex border-b border-gray-800 overflow-x-auto scrollbar-hide shrink-0">
                        {[
                            { id: 'visual', icon: Palette, label: 'Aparência' },
                            { id: 'content', icon: Layout, label: 'Conteúdo' },
                            { id: 'partners', icon: TicketPercent, label: 'Parcerias' },
                            { id: 'gallery', icon: ImagePlus, label: 'Galeria' },
                            { id: 'feedbacks', icon: MessageSquare, label: 'Avaliações' },
                            { id: 'rewards', icon: Gift, label: 'Fidelidade' },
                            { id: 'domain', icon: Globe, label: 'Domínio' },
                            { id: 'features', icon: Star, label: 'Funcionalidades' },
                            { id: 'hours', icon: Clock, label: 'Horários' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 font-medium transition-colors border-b-2 min-w-[120px] ${activeTab === tab.id
                                    ? 'border-primary-500 text-primary-500 bg-gray-800/30'
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-900/50">

                        {/* === ABA: APARÊNCIA === */}
                        {activeTab === 'visual' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div>
                                    <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Palette size={18} className="text-primary-500" /> Paleta de Cores</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-400 mb-2">Presets</p>
                                            <div className="flex flex-wrap gap-3">
                                                {THEME_PRESETS.map(theme => (
                                                    <button
                                                        key={theme.name}
                                                        onClick={() => setSettings({ ...settings, primaryColor: theme.color })}
                                                        className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 ${settings.primaryColor === theme.color ? 'border-white ring-2 ring-primary-500/50' : 'border-transparent'}`}
                                                        style={{ backgroundColor: theme.color }}
                                                        title={theme.name}
                                                    ></button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 mb-2">Cor Personalizada</p>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="color"
                                                        value={settings.primaryColor}
                                                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                    <div className="w-12 h-12 rounded-lg border-2 border-gray-700 hover:border-primary-500 transition-colors cursor-pointer flex items-center justify-center" style={{ backgroundColor: settings.primaryColor }}>
                                                        <Pipette size={20} className="text-white drop-shadow-lg" />
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={settings.primaryColor}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                                                setSettings({ ...settings, primaryColor: value });
                                                            }
                                                        }}
                                                        placeholder="#eab308"
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Digite um código hexadecimal (ex: #eab308)</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-3 flex items-center gap-2"><LayoutTemplate size={18} className="text-primary-500" /> Estilo da Home</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {['classic', 'modern', 'minimal'].map((style) => (
                                            <div
                                                key={style}
                                                onClick={() => setLayoutConfig({ ...layoutConfig, homeStyle: style as any })}
                                                className={`cursor-pointer rounded-xl border-2 p-2 text-center transition-all ${layoutConfig.homeStyle === style ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                                            >
                                                <div className="h-16 bg-gray-700 rounded-lg mb-2 overflow-hidden relative">
                                                    {style === 'classic' && <div className="absolute inset-x-0 top-0 h-8 bg-gray-600"></div>}
                                                    {style === 'modern' && <div className="absolute inset-x-2 top-2 h-12 bg-gray-600 rounded-lg"></div>}
                                                    {style === 'minimal' && <div className="absolute inset-x-4 top-4 h-8 bg-gray-600 rounded"></div>}
                                                </div>
                                                <span className="text-xs font-medium text-gray-300 capitalize">{style}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Upload size={18} className="text-primary-500" /> Assets Visuais</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Logotipo (PNG Transparente)</label>
                                            <div onClick={() => logoInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-800 transition-colors relative overflow-hidden group">
                                                {settings.logoPreview ? <img src={settings.logoPreview} className="h-20 w-20 object-contain" /> : <div className="text-center text-gray-500"><ImageIcon className="mx-auto mb-1" /><span>Upload Logo</span></div>}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs text-white font-bold">Alterar</span></div>
                                            </div>
                                            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Capa / Banner</label>
                                            <div onClick={() => coverInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-800 transition-colors relative overflow-hidden group">
                                                {settings.coverPreview ? <img src={settings.coverPreview} className="h-full w-full object-cover" /> : <div className="text-center text-gray-500"><ImageIcon className="mx-auto mb-1" /><span>Upload Capa</span></div>}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs text-white font-bold">Alterar</span></div>
                                            </div>
                                            <input type="file" ref={coverInputRef} onChange={handleCoverUpload} className="hidden" accept="image/*" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-2">Ícone do App (PWA)</label>
                                            <div onClick={() => pwaIconInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-800 transition-colors relative overflow-hidden group">
                                                {settings.pwaIconPreview ? <img src={settings.pwaIconPreview} className="h-20 w-20 object-contain rounded-xl" /> : <div className="text-center text-gray-500"><Smartphone className="mx-auto mb-1" /><span>Upload Ícone</span></div>}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs text-white font-bold">Alterar</span></div>
                                            </div>
                                            <input type="file" ref={pwaIconInputRef} onChange={handlePwaIconUpload} className="hidden" accept="image/*" />
                                            <p className="text-[10px] text-gray-500 mt-1">Recomendado: 512x512px, PNG ou JPG sem transparência.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: CONTEÚDO === */}
                        {activeTab === 'content' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Info size={18} className="text-primary-500" /> Informações Básicas</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nome da Barbearia</label>
                                        <input type="text" name="name" value={settings.name} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Slogan</label>
                                        <input type="text" name="slogan" value={settings.slogan} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Sobre Nós</label>
                                        <textarea name="description" value={settings.description} onChange={handleInputChange} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 resize-none" />
                                    </div>
                                </div>

                                <h3 className="text-white font-medium mb-3 flex items-center gap-2 mt-8"><MapPin size={18} className="text-primary-500" /> Contato e Localização</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Telefone / WhatsApp</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                                <input type="text" name="phone" value={settings.phone} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Instagram</label>
                                            <div className="relative">
                                                <Instagram className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                                <input type="text" name="instagram" value={settings.instagram} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Endereço Completo</label>
                                        <input type="text" name="address" value={settings.address} onChange={handleInputChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: PARCERIAS / CUPONS === */}
                        {activeTab === 'partners' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                        <TicketPercent size={20} className="text-primary-500" /> Novo Cupom
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Nome do Parceiro</label>
                                            <input
                                                type="text"
                                                value={newCoupon.partnerName}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, partnerName: e.target.value })}
                                                placeholder="Ex: Hamburgueria Top"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Oferta / Desconto</label>
                                            <input
                                                type="text"
                                                value={newCoupon.offer}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, offer: e.target.value })}
                                                placeholder="Ex: 20% OFF no Combo"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Código do Cupom</label>
                                            <input
                                                type="text"
                                                value={newCoupon.code}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                                placeholder="Ex: BARBER20"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500 font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1">Validade (Opcional)</label>
                                            <input
                                                type="text"
                                                value={newCoupon.validity}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, validity: e.target.value })}
                                                placeholder="Ex: 31/12"
                                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="vipCheck"
                                                checked={newCoupon.vipOnly}
                                                onChange={(e) => setNewCoupon({ ...newCoupon, vipOnly: e.target.checked })}
                                                className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-primary-500 focus:ring-primary-500"
                                            />
                                            <label htmlFor="vipCheck" className="text-sm text-gray-300 flex items-center gap-1 cursor-pointer select-none">
                                                Exclusivo Assinantes (VIP) <Star size={12} className="text-yellow-500" fill="currentColor" />
                                            </label>
                                        </div>
                                        <button
                                            onClick={handleAddCoupon}
                                            disabled={!newCoupon.partnerName || !newCoupon.code}
                                            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-dark-950 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <Plus size={16} /> Adicionar
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        Cupons Ativos ({coupons.length})
                                    </h3>
                                    {coupons.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {coupons.map(coupon => (
                                                <div key={coupon.id} className={`p-4 rounded-xl border flex flex-col justify-between relative group ${coupon.vipOnly ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30' : 'bg-gray-900 border-gray-800'}`}>
                                                    {coupon.vipOnly && (
                                                        <div className="absolute top-2 right-2 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-yellow-500/20 flex items-center gap-1">
                                                            <Star size={10} fill="currentColor" /> VIP
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="text-white font-bold">{coupon.partnerName}</h4>
                                                        <p className="text-primary-500 font-bold text-lg">{coupon.offer}</p>
                                                        <div className="mt-2 bg-black/30 rounded border border-dashed border-gray-600 p-1.5 text-center font-mono text-gray-300 text-sm">
                                                            {coupon.code}
                                                        </div>
                                                        <p className="text-gray-500 text-xs mt-2">Válido até: {coupon.validity}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border border-dashed border-gray-800 rounded-xl text-gray-500">
                                            Nenhum parceiro cadastrado. Adicione benefícios para seus clientes.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* === ABA: AVALIAÇÕES === */}
                        {activeTab === 'feedbacks' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <Clock size={18} className="text-yellow-500" /> Aguardando Aprovação
                                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{clientFeedbacks.filter(f => f.status === 'pending').length}</span>
                                    </h3>
                                    {clientFeedbacks.filter(f => f.status === 'pending').length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {clientFeedbacks.filter(f => f.status === 'pending').map(feedback => (
                                                <div key={feedback.id} className={`bg-gray-900 border p-4 rounded-xl shadow-lg flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${feedback.rating <= 3 ? 'border-red-500/30 shadow-red-500/5' : 'border-yellow-500/30 shadow-yellow-500/5'}`}>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-white font-bold text-sm">{feedback.name}</span>
                                                            <span className="text-gray-500 text-xs">• {feedback.date}</span>
                                                            <div className="flex text-yellow-500">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} size={10} fill={i < feedback.rating ? "currentColor" : "none"} className={i < feedback.rating ? "text-yellow-500" : "text-gray-700"} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-gray-300 text-sm italic">"{feedback.text}"</p>
                                                        {feedback.rating <= 3 && (
                                                            <div className="mt-2 inline-flex items-center gap-1 text-red-400 text-xs font-bold bg-red-500/10 px-2 py-1 rounded">
                                                                <AlertTriangle size={12} /> Avaliação Negativa
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => approveFeedback(feedback.id)} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors"><Check size={14} /> Aprovar</button>
                                                            <button onClick={() => rejectFeedback(feedback.id)} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors"><XIcon size={14} /> Rejeitar</button>
                                                        </div>
                                                        {feedback.rating <= 3 && (
                                                            <button onClick={() => handleContactClient(feedback)} className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors"><MessageCircle size={14} /> Resolver no Chat</button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-800/30 rounded-xl p-6 text-center border border-dashed border-gray-800"><p className="text-gray-500 text-sm">Nenhum feedback pendente.</p></div>
                                    )}
                                </div>

                                <div className="w-full h-px bg-gray-800"></div>
                                <div className="space-y-4">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        <MessageSquare size={18} className="text-primary-500" /> Avaliações Publicadas
                                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{clientFeedbacks.filter(f => f.status === 'approved').length}</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {clientFeedbacks.filter(f => f.status === 'approved').map(feedback => (
                                            <div key={feedback.id} className="flex justify-between items-start p-4 bg-gray-800/40 rounded-xl border border-gray-800 group hover:border-gray-700 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-white font-bold text-sm">{feedback.name}</span>
                                                        <div className="flex text-yellow-500">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={10} fill={i < feedback.rating ? "currentColor" : "none"} className={i < feedback.rating ? "text-yellow-500" : "text-gray-700"} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-400 text-xs">"{feedback.text}"</p>
                                                </div>
                                                <button onClick={() => rejectFeedback(feedback.id)} className="text-gray-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: GALERIA === */}
                        {activeTab === 'gallery' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                                    <div>
                                        <h3 className="text-white font-bold text-sm">Adicionar Nova Foto</h3>
                                        <p className="text-xs text-gray-400">Formatos aceitos: JPG, PNG</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            ref={galleryInputRef}
                                            onChange={handleGalleryUpload}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                        <button
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                                        >
                                            <Upload size={16} /> Upload
                                        </button>
                                    </div>
                                </div>

                                {/* Pending Photos */}
                                {galleryPhotos.filter(p => p.status === 'pending').length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-white font-bold flex items-center gap-2 text-sm">
                                            <Clock size={16} className="text-yellow-500" /> Aguardando Aprovação
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {galleryPhotos.filter(p => p.status === 'pending').map(photo => (
                                                <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-yellow-500/30 bg-gray-900">
                                                    <img src={photo.url} className="w-full h-32 object-cover opacity-70" />
                                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => approvePhoto(photo.id)} className="p-1.5 bg-green-500 text-white rounded-full"><Check size={14} /></button>
                                                        <button onClick={() => rejectPhoto(photo.id)} className="p-1.5 bg-red-500 text-white rounded-full"><XIcon size={14} /></button>
                                                    </div>
                                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white p-1 text-center truncate">
                                                        {photo.uploader}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h3 className="text-white font-bold flex items-center gap-2"><ImageIcon size={18} className="text-primary-500" /> Galeria Ativa</h3>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                        {galleryPhotos.filter(p => p.status === 'approved').map(photo => (
                                            <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                                                <img src={photo.url} className="w-full h-32 object-cover transition-transform group-hover:scale-105" />
                                                <button onClick={() => rejectPhoto(photo.id)} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: FIDELIDADE === */}
                        {activeTab === 'rewards' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Gift size={18} className="text-primary-500" /> Prêmios do Clube</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    {rewards.map(reward => (
                                        <div key={reward.id} className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-500 flex items-center justify-center font-bold">
                                                    <Gift size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{reward.title}</p>
                                                    <p className="text-xs text-gray-400">{reward.pointsCost} pontos necessários</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDeleteReward(reward.id)} className="text-gray-500 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mt-4">
                                    <h4 className="text-sm font-bold text-white mb-3">Novo Prêmio</h4>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="Título do Prêmio"
                                            value={newReward.title}
                                            onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                                            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Pontos"
                                            value={newReward.pointsCost}
                                            onChange={(e) => setNewReward({ ...newReward, pointsCost: e.target.value })}
                                            className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                        />
                                        <button onClick={handleAddReward} className="bg-primary-500 text-dark-950 px-4 py-2 rounded-lg font-bold hover:bg-primary-600 transition-colors">
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: DOMÍNIO === */}
                        {activeTab === 'domain' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Globe size={18} className="text-primary-500" /> Configuração de Domínio</h3>

                                <div className="space-y-4">
                                    {/* Opção 1: Domínio Grátis (Subdomínio) */}
                                    <div
                                        onClick={() => setDomainConfig({ ...domainConfig, type: 'platform' })}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${domainConfig.type === 'platform' ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 bg-gray-800'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${domainConfig.type === 'platform' ? 'border-primary-500 bg-primary-500' : 'border-gray-500'}`}>
                                                {domainConfig.type === 'platform' && <div className="w-2 h-2 bg-black rounded-full"></div>}
                                            </div>
                                            <span className="font-bold text-white">Subdomínio Grátis</span>
                                            <span className="text-[10px] bg-green-500 text-dark-950 px-2 py-0.5 rounded font-bold uppercase">GRÁTIS</span>
                                        </div>
                                        <div className="mt-3 flex items-center bg-gray-900 rounded-lg px-3 py-2 border border-gray-700 text-gray-400">
                                            <input
                                                type="text"
                                                value={domainConfig.slug}
                                                onChange={(e) => {
                                                    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                    setDomainConfig({ ...domainConfig, slug: newSlug });
                                                    setSlugStatus('idle');
                                                }}
                                                onBlur={(e) => checkSlugAvailability(e.target.value)}
                                                className={`bg-transparent text-white focus:outline-none flex-1 font-bold ${slugStatus === 'taken' ? 'text-red-500' : slugStatus === 'available' ? 'text-green-500' : ''}`}
                                            />
                                            <span className="text-gray-500">.barbermaster.com.br</span>
                                            {slugStatus === 'checking' && <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent ml-2"></div>}
                                            {slugStatus === 'available' && <CheckCircle2 size={16} className="text-green-500 ml-2" />}
                                            {slugStatus === 'taken' && <AlertTriangle size={16} className="text-red-500 ml-2" />}
                                        </div>
                                        {slugStatus === 'taken' && (
                                            <p className="text-[10px] text-red-500 mt-2 font-bold animate-in fade-in slide-in-from-top-1">Este endereço já está sendo usado por outra barbearia.</p>
                                        )}
                                        {slugStatus === 'available' && (
                                            <p className="text-[10px] text-green-500 mt-2 font-bold animate-in fade-in slide-in-from-top-1">✓ Endereço disponível!</p>
                                        )}

                                        {/* Preview do Link */}
                                        {domainConfig.slug && (
                                            <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                                                <p className="text-[10px] text-gray-500 mb-1">Seu app estará disponível em:</p>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`https://${domainConfig.slug}.barbermaster.com.br`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-primary-500 hover:underline font-mono flex items-center gap-1"
                                                    >
                                                        {domainConfig.slug}.barbermaster.com.br
                                                        <ExternalLink size={12} />
                                                    </a>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(`https://${domainConfig.slug}.barbermaster.com.br`);
                                                            alert('Link copiado!');
                                                        }}
                                                        className="p-1 hover:bg-gray-800 rounded"
                                                    >
                                                        <Copy size={14} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Opção 2: Domínio Personalizado */}
                                    <div
                                        onClick={() => setDomainConfig({ ...domainConfig, type: 'custom' })}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${domainConfig.type === 'custom' ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 bg-gray-800'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${domainConfig.type === 'custom' ? 'border-primary-500 bg-primary-500' : 'border-gray-500'}`}>
                                                    {domainConfig.type === 'custom' && <div className="w-2 h-2 bg-black rounded-full"></div>}
                                                </div>
                                                <span className="font-bold text-white">Domínio Personalizado</span>
                                                <span className="text-[10px] bg-yellow-500 text-dark-950 px-2 py-0.5 rounded font-bold uppercase">PRO</span>
                                            </div>
                                        </div>

                                        {domainConfig.type === 'custom' && (
                                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
                                                {/* Input do Domínio */}
                                                <div>
                                                    <label className="text-xs text-gray-400 mb-1 block">Seu domínio:</label>
                                                    <input
                                                        type="text"
                                                        placeholder="www.minhabarbearia.com.br"
                                                        value={domainConfig.customDomain}
                                                        onChange={(e) => setDomainConfig({ ...domainConfig, customDomain: e.target.value })}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                                                    />
                                                </div>

                                                {/* Instruções Detalhadas */}
                                                <div className="space-y-3">
                                                    {/* Opção Recomendada: Cloudflare */}
                                                    <div className="bg-blue-500/10 border-2 border-blue-500/50 rounded-lg p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Star size={16} className="text-blue-400" />
                                                            <h4 className="text-white font-bold text-sm">Opção Recomendada: Com SSL Grátis (Cloudflare)</h4>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mb-3">Configure através do Cloudflare para ter HTTPS (cadeado) grátis.</p>

                                                        <div className="space-y-2 text-xs">
                                                            <div className="flex gap-2">
                                                                <span className="text-blue-400 font-bold">1.</span>
                                                                <p className="text-gray-300">Crie conta grátis em <a href="https://cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">cloudflare.com</a></p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="text-blue-400 font-bold">2.</span>
                                                                <p className="text-gray-300">Adicione seu domínio e altere os nameservers conforme instruções</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="text-blue-400 font-bold">3.</span>
                                                                <div className="flex-1">
                                                                    <p className="text-gray-300 mb-1">Configure DNS no Cloudflare:</p>
                                                                    <div className="bg-gray-900 rounded p-2 font-mono text-[10px]">
                                                                        <div>Tipo: <span className="text-white">CNAME</span></div>
                                                                        <div>Nome: <span className="text-white">www</span></div>
                                                                        <div>Destino: <span className="text-primary-500">{domainConfig.slug}.barbermaster.com.br</span></div>
                                                                        <div>Proxy: <span className="text-green-500">✓ Ativado</span> (nuvem laranja)</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <span className="text-blue-400 font-bold">4.</span>
                                                                <p className="text-gray-300">SSL/TLS → Modo: <strong className="text-white">Full</strong></p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Opção Alternativa: Sem SSL */}
                                                    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                                            <Info size={16} className="text-gray-400" />
                                                            Alternativa: Sem SSL (Não Recomendado)
                                                        </h4>

                                                        <div className="space-y-3 text-xs text-gray-400">
                                                            <div className="flex gap-3">
                                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-dark-950 flex items-center justify-center font-bold text-[10px]">1</div>
                                                                <div>
                                                                    <p className="text-white font-medium mb-1">Acesse o painel do seu provedor de domínio</p>
                                                                    <p>Exemplos: Registro.br, GoDaddy, Hostinger, HostGator, etc.</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-dark-950 flex items-center justify-center font-bold text-[10px]">2</div>
                                                                <div>
                                                                    <p className="text-white font-medium mb-1">Vá até a seção de DNS / Zona de DNS</p>
                                                                    <p>Procure por "Gerenciar DNS", "Zona DNS" ou "DNS Settings"</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-dark-950 flex items-center justify-center font-bold text-[10px]">3</div>
                                                                <div>
                                                                    <p className="text-white font-medium mb-2">Adicione um registro CNAME</p>
                                                                    <div className="bg-gray-800 rounded p-2 font-mono text-[10px] space-y-1">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-500">Tipo:</span>
                                                                            <span className="text-white">CNAME</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-500">Nome/Host:</span>
                                                                            <span className="text-white">www</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-500">Valor/Destino:</span>
                                                                            <span className="text-primary-500">{domainConfig.slug}.barbermaster.com.br</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-dark-950 flex items-center justify-center font-bold text-[10px]">4</div>
                                                                <div>
                                                                    <p className="text-white font-medium mb-1">Aguarde a propagação do DNS</p>
                                                                    <p>Pode levar de 5 minutos até 48 horas (geralmente 1-2 horas)</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-dark-950 flex items-center justify-center font-bold text-[10px]">5</div>
                                                                <div>
                                                                    <p className="text-white font-medium mb-1">Salve as configurações aqui</p>
                                                                    <p>Clique em "Salvar Configurações" no topo da página</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>

                                                {/* Status de Verificação */}
                                                <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        {domainConfig.isVerified ? (
                                                            <>
                                                                <CheckCircle2 size={16} className="text-green-500" />
                                                                <span className="text-sm text-green-500 font-medium">Domínio configurado</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertTriangle size={16} className="text-yellow-500" />
                                                                <span className="text-sm text-gray-400">Aguardando configuração</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={verifyDomain}
                                                        className={`text-xs px-4 py-2 rounded font-bold transition-colors ${domainConfig.isVerified
                                                            ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                                                            : 'bg-primary-500 text-dark-950 hover:bg-primary-600'
                                                            }`}
                                                        disabled={domainConfig.isVerified}
                                                    >
                                                        {domainConfig.isVerified ? 'Verificado ✓' : 'Verificar DNS'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: FUNCIONALIDADES === */}
                        {activeTab === 'features' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Star size={18} className="text-primary-500" /> Módulos do App</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500"><Gift size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white">Programa de Fidelidade</p>
                                                <p className="text-xs text-gray-400">Permitir que clientes acumulem pontos.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleFeature('loyaltyProgram')} className={`w-12 h-6 rounded-full relative transition-colors ${features.loyaltyProgram ? 'bg-green-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${features.loyaltyProgram ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500"><ImageIcon size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white">Galeria de Fotos</p>
                                                <p className="text-xs text-gray-400">Exibir cortes recentes no perfil.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleFeature('photoGallery')} className={`w-12 h-6 rounded-full relative transition-colors ${features.photoGallery ? 'bg-green-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${features.photoGallery ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500"><MessageSquare size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white">Avaliações e Reviews</p>
                                                <p className="text-xs text-gray-400">Coletar feedback após o serviço.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleFeature('reviews')} className={`w-12 h-6 rounded-full relative transition-colors ${features.reviews ? 'bg-green-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${features.reviews ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-pink-500/20 rounded-lg text-pink-500"><TicketPercent size={20} /></div>
                                            <div>
                                                <p className="font-bold text-white">Clube de Vantagens</p>
                                                <p className="text-xs text-gray-400">Exibir cupons de parceiros.</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleFeature('partnersClub')} className={`w-12 h-6 rounded-full relative transition-colors ${features.partnersClub ? 'bg-green-500' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${features.partnersClub ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === ABA: HORÁRIOS === */}
                        {activeTab === 'hours' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Clock size={18} className="text-primary-500" /> Horário de Funcionamento</h3>
                                <div className="space-y-2">
                                    {hours.map((item, index) => (
                                        <div key={item.day} className={`flex items-center justify-between p-3 rounded-lg border ${item.isOpen ? 'bg-gray-800 border-gray-700' : 'bg-gray-900/50 border-gray-800 opacity-60'}`}>
                                            <div className="flex items-center gap-3 w-32">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isOpen}
                                                    onChange={() => handleDayToggle(index)}
                                                    className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-primary-500 focus:ring-primary-500"
                                                />
                                                <span className="text-sm font-medium text-white">{item.day}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={item.open}
                                                    disabled={!item.isOpen}
                                                    onChange={(e) => handleTimeChange(index, 'open', e.target.value)}
                                                    className="bg-gray-900 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                                                />
                                                <span className="text-gray-500 text-xs">até</span>
                                                <input
                                                    type="time"
                                                    value={item.close}
                                                    disabled={!item.isOpen}
                                                    onChange={(e) => handleTimeChange(index, 'close', e.target.value)}
                                                    className="bg-gray-900 border border-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-primary-500 disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Lado Direito - Preview Interativo */}
                <div className="lg:col-span-5 flex justify-center items-center h-full relative">
                    <div className="relative border-gray-900 bg-black border-[12px] rounded-[3rem] h-[720px] w-[360px] shadow-2xl overflow-hidden flex flex-col ring-1 ring-gray-800 animate-in slide-in-from-right-8 duration-500">
                        {/* Notch */}
                        <div className="absolute top-0 inset-x-0 h-8 bg-black z-40 flex justify-between px-6 items-center">
                            <span className="text-[12px] font-bold text-white">9:41</span>
                            <div className="flex gap-1"><div className="w-5 h-2.5 bg-white rounded-sm"></div></div>
                        </div>

                        {/* TELA PRINCIPAL DO APP */}
                        {previewScreen === 'app' && (
                            <div className="flex-1 bg-gray-950 overflow-y-auto no-scrollbar relative font-sans text-gray-100 animate-in fade-in flex flex-col">

                                {/* Conteúdo Dinâmico Baseado na Aba do App */}
                                <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                                    {appTab === 'home' && (
                                        <>
                                            {/* Header Dinâmico Baseado no homeStyle */}
                                            {layoutConfig.homeStyle === 'modern' ? (
                                                <div className="relative h-48 bg-gray-900 overflow-hidden">
                                                    <img src={settings.coverPreview} className="w-full h-full object-cover opacity-40" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
                                                    <div className="absolute bottom-6 left-5 right-5 flex items-end gap-3">
                                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 bg-gray-800 shadow-xl">
                                                            <img src={settings.logoPreview} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="mb-0.5">
                                                            <h2 className="text-white font-black text-base leading-tight">{settings.name}</h2>
                                                            <p className="text-primary-500 font-bold text-[10px] uppercase tracking-wider">{settings.slogan}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : layoutConfig.homeStyle === 'minimal' ? (
                                                <div className="pt-10 px-5 pb-4 bg-gray-950 border-b border-gray-900 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: settings.primaryColor }}>
                                                            <img src={settings.logoPreview} className="w-full h-full object-cover" />
                                                        </div>
                                                        <h2 className="text-white font-bold text-sm tracking-tight">{settings.name}</h2>
                                                    </div>
                                                    <div className="p-1.5 bg-gray-800 rounded-lg text-gray-500">
                                                        <Bell size={16} />
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Classic */
                                                <div className="relative">
                                                    <div className="h-40 w-full relative">
                                                        <img src={settings.coverPreview} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent"></div>
                                                        <div className="absolute top-10 right-4 flex gap-2">
                                                            <button className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white"><Bell size={18} /></button>
                                                        </div>
                                                    </div>
                                                    <div className="px-5 -mt-10 relative z-10 flex items-end gap-3">
                                                        <div className="w-20 h-20 rounded-2xl border-4 border-gray-950 bg-gray-800 shadow-xl overflow-hidden">
                                                            <img src={settings.logoPreview} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="mb-2">
                                                            <h2 className="text-white font-bold text-lg leading-tight">{settings.name}</h2>
                                                            <p className="text-gray-300 text-[10px] mt-0.5">{settings.slogan}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`px-5 space-y-5 ${layoutConfig.homeStyle === 'classic' ? 'mt-4' : 'mt-6'}`}>

                                                {/* Saudação Compacta */}
                                                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex justify-between items-center">
                                                    <div>
                                                        <p className="text-gray-500 text-[10px] uppercase font-bold tracking-tighter">Bem-vindo,</p>
                                                        <p className="text-white text-base font-black">João Silva 👋</p>
                                                    </div>
                                                    {layoutConfig.homeStyle === 'minimal' && (
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-gray-500">Pontos</p>
                                                            <p className="text-primary-500 font-bold text-xs">350</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Cartão de Fidelidade Premium */}
                                                {features.loyaltyProgram && layoutConfig.homeStyle !== 'minimal' && (
                                                    <div
                                                        className="rounded-2xl p-4 relative overflow-hidden shadow-lg"
                                                        style={{
                                                            background: `linear-gradient(135deg, #1f2937 0%, ${settings.primaryColor} 150%)`
                                                        }}
                                                    >
                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <p className="text-white/70 text-[10px] uppercase font-black tracking-wider">Membro Gold</p>
                                                                    <p className="text-white text-2xl font-black">350 <span className="text-xs text-white/60 font-medium">pts</span></p>
                                                                </div>
                                                                <Star size={20} fill="white" className="text-white/20" />
                                                            </div>
                                                            <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mb-1">
                                                                <div className="bg-white h-full w-[70%]" style={{ boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Card Próximo Agendamento */}
                                                <div className="bg-gray-900 border-2 rounded-2xl p-4 flex items-center justify-between shadow-xl" style={{ borderColor: settings.primaryColor }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-800 rounded-lg" style={{ color: settings.primaryColor }}>
                                                            <CalendarCheck size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-black text-xs">Próximo Corte</p>
                                                            <p className="text-gray-400 text-[10px]">Hoje, 15:00 com Carlos</p>
                                                        </div>
                                                    </div>
                                                    <button className="text-[10px] font-black text-white bg-green-600 px-2 py-1 rounded-md uppercase tracking-tighter">Confirmado</button>
                                                </div>

                                                {/* Lista de Serviços */}
                                                <div className="space-y-3">
                                                    <h3 className="font-black text-white text-base">Destaques</h3>
                                                    {MOCK_SERVICES.slice(0, 2).map(s => (
                                                        <div key={s.id} className="flex justify-between items-center p-3 bg-gray-950 rounded-xl border border-gray-800 group hover:border-gray-700">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primaryColor}10` }}>
                                                                    <Star style={{ color: settings.primaryColor }} size={16} fill={settings.primaryColor} />
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs font-black text-white block">{s.name}</span>
                                                                    <span className="text-[10px] text-gray-400">R$ {s.price} • {s.duration}m</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-950 shadow-md"
                                                                style={{ backgroundColor: settings.primaryColor }}
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* CLUBE DE VANTAGENS (PARCERIAS) */}
                                                {features.partnersClub && coupons.length > 0 && (
                                                    <div className="space-y-3 pb-2">
                                                        <h3 className="font-black text-white text-base">Vantagens</h3>
                                                        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
                                                            {coupons.map(coupon => (
                                                                <div key={coupon.id} className={`min-w-[160px] p-3 rounded-xl border relative flex flex-col ${coupon.vipOnly ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/30' : 'bg-gray-900 border-gray-800'}`}>
                                                                    <p className="text-[8px] text-gray-500 uppercase font-black mb-1 truncate">{coupon.partnerName}</p>
                                                                    <p className={`font-black text-xs leading-tight mb-2 ${coupon.vipOnly ? 'text-yellow-500' : 'text-primary-500'}`}>{coupon.offer}</p>
                                                                    <div className="bg-black/30 rounded p-1.5 text-center border border-dashed border-gray-700">
                                                                        <span className="text-[8px] font-mono text-white font-bold">{coupon.code}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Localização Minimalista */}
                                                {layoutConfig.homeStyle === 'minimal' && (
                                                    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-center">
                                                        <MapPin size={16} className="mx-auto mb-1 text-gray-500" />
                                                        <p className="text-[10px] text-gray-400 font-bold truncate">{settings.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {appTab === 'schedule' && (
                                        <div className="p-5 pt-12 h-full flex flex-col">
                                            {/* Cabeçalho */}
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <h2 className="text-xl font-black text-white leading-tight">Agendar<br />Horário</h2>
                                                </div>
                                                {previewBookingStep !== 'service' && (
                                                    <button onClick={() => setPreviewBookingStep(prev => prev === 'confirm' ? 'datetime' : prev === 'datetime' ? 'professional' : 'service')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                                                        <ArrowLeft size={18} className="text-white" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Steps */}
                                            <div className="flex gap-1 mb-6">
                                                {['service', 'professional', 'datetime', 'confirm'].map((step, idx) => {
                                                    const steps = ['service', 'professional', 'datetime', 'confirm'];
                                                    const currentIdx = steps.indexOf(previewBookingStep);
                                                    const isActive = idx <= currentIdx;
                                                    return (
                                                        <div
                                                            key={step}
                                                            className={`h-1 flex-1 rounded-full transition-all duration-500 ${isActive ? 'bg-primary-500' : 'bg-gray-800'}`}
                                                            style={{ backgroundColor: isActive ? settings.primaryColor : undefined }}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {/* Conteúdo Dinâmico */}
                                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                                                {previewBookingStep === 'service' && (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <h3 className="text-white text-sm font-bold mb-2">Selecione o Serviço</h3>
                                                        {MOCK_SERVICES.map(service => (
                                                            <button
                                                                key={service.id}
                                                                onClick={() => {
                                                                    setPreviewSelectedService(service);
                                                                    setPreviewBookingStep('professional');
                                                                }}
                                                                className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 flex justify-between items-center hover:bg-gray-800 hover:border-gray-700 transition-all group"
                                                            >
                                                                <div className="flex items-center gap-3 text-left">
                                                                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                                                                        <Scissors size={18} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-white font-bold text-xs">{service.name}</p>
                                                                        <p className="text-gray-500 text-[10px]">{service.duration} min • R$ {service.price.toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight size={16} className="text-gray-600" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {previewBookingStep === 'professional' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <h3 className="text-white text-sm font-bold mb-2">Selecione o Profissional</h3>
                                                        {[
                                                            { id: 1, name: 'Carlos Oliveira', role: 'Master Barber', avatar: 'https://images.unsplash.com/photo-1583336633292-2ec016fb15d3?w=100&h=100&fit=crop' },
                                                            { id: 2, name: 'Lucas Santos', role: 'Barber', avatar: 'https://images.unsplash.com/photo-1618077553763-ebfba3d3ab29?w=100&h=100&fit=crop' },
                                                            { id: 3, name: 'Marcos Silva', role: 'Barber', avatar: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=100&h=100&fit=crop' }
                                                        ].map(prof => (
                                                            <button
                                                                key={prof.id}
                                                                onClick={() => {
                                                                    setPreviewSelectedProfessional(prof);
                                                                    setPreviewBookingStep('datetime');
                                                                }}
                                                                className="w-full p-3 rounded-xl bg-gray-900 border border-gray-800 flex items-center gap-3 hover:bg-gray-800 hover:border-gray-700 transition-all"
                                                            >
                                                                <img src={prof.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-gray-800" />
                                                                <div className="text-left">
                                                                    <p className="text-white font-bold text-sm">{prof.name}</p>
                                                                    <p className="text-gray-500 text-xs">{prof.role}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {previewBookingStep === 'datetime' && (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <div>
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h3 className="text-white font-bold">Hoje</h3>
                                                                <div className="flex gap-2">
                                                                    <button className="p-1 text-gray-400 hover:text-white"><ArrowLeft size={16} /></button>
                                                                    <button className="p-1 text-white hover:text-white"><ArrowRight size={16} /></button>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                                {[...Array(7)].map((_, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => setPreviewSelectedDate(new Date())}
                                                                        className={`min-w-[45px] p-2 rounded-xl flex flex-col items-center gap-1 border border-gray-800 transition-colors ${i === 0 ? 'bg-primary-500 border-transparent' : 'bg-gray-900'
                                                                            }`}
                                                                        style={i === 0 ? { backgroundColor: settings.primaryColor } : {}}
                                                                    >
                                                                        <span className={`text-[9px] font-bold uppercase ${i === 0 ? 'text-dark-950' : 'text-gray-500'}`}>SEG</span>
                                                                        <span className={`text-sm font-black ${i === 0 ? 'text-dark-950' : 'text-white'}`}>{10 + i}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h3 className="text-white font-bold mb-3 text-sm">Disponíveis</h3>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                                                                    <button
                                                                        key={t}
                                                                        onClick={() => {
                                                                            setPreviewSelectedTime(t);
                                                                            setPreviewBookingStep('confirm');
                                                                        }}
                                                                        className="bg-gray-800 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-white hover:text-dark-950 transition-colors"
                                                                    >
                                                                        {t}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {previewBookingStep === 'confirm' && (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-4">
                                                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 text-green-500">
                                                                <CheckCircle2 size={32} />
                                                            </div>
                                                            <h3 className="text-white font-black text-lg">Confirmar?</h3>
                                                            <div className="space-y-3 text-left">
                                                                <div className="flex justify-between text-sm py-2 border-b border-gray-800">
                                                                    <span className="text-gray-500">Serviço</span>
                                                                    <span className="text-white font-bold">{previewSelectedService?.name}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm py-2 border-b border-gray-800">
                                                                    <span className="text-gray-500">Profissional</span>
                                                                    <span className="text-white font-bold">{previewSelectedProfessional?.name}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm py-2 border-b border-gray-800">
                                                                    <span className="text-gray-500">Data</span>
                                                                    <span className="text-white font-bold">Hoje às {previewSelectedTime}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm py-2">
                                                                    <span className="text-gray-500">Valor</span>
                                                                    <span className="text-green-500 font-black">R$ {previewSelectedService?.price.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => {
                                                                alert('Agendamento simulado com sucesso! 🎉');
                                                                setAppTab('home');
                                                                setPreviewBookingStep('service');
                                                            }}
                                                            className="w-full py-4 rounded-xl font-bold bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-105 transition-transform"
                                                        >
                                                            Confirmar Agendamento
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {appTab === 'rewards' && (
                                        <div className="p-5 pt-12">
                                            <h2 className="text-xl font-black text-white mb-6 tracking-tight">Clube de Recompensas</h2>

                                            {/* Card de Pontos */}
                                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 mb-6 border border-gray-700 shadow-xl" style={{ borderLeft: `4px solid ${settings.primaryColor}` }}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Saldo Atual</p>
                                                        <p className="text-white text-3xl font-black">350</p>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-primary-500">Gold</div>
                                                </div>
                                                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                                    <div className="h-full" style={{ width: '70%', backgroundColor: settings.primaryColor }}></div>
                                                </div>
                                            </div>

                                            {/* Lista de Recompensas */}
                                            <div className="space-y-3">
                                                <h3 className="text-white font-black mb-3 text-sm">Prêmios Disponíveis</h3>
                                                {rewards.slice(0, 3).map(reward => (
                                                    <div key={reward.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex justify-between items-center transition-all hover:bg-gray-800">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg" style={{ backgroundColor: `${settings.primaryColor}10` }}>
                                                                <Gift style={{ color: settings.primaryColor }} size={16} />
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-black text-xs">{reward.title}</p>
                                                                <p className="text-gray-500 text-[9px] font-bold uppercase">{reward.pointsCost} pontos</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter"
                                                            style={{
                                                                backgroundColor: reward.pointsCost <= 350 ? settings.primaryColor : 'transparent',
                                                                color: reward.pointsCost <= 350 ? '#000' : '#444',
                                                                border: reward.pointsCost > 350 ? '1px solid #333' : 'none'
                                                            }}
                                                            disabled={reward.pointsCost > 350}
                                                        >
                                                            {reward.pointsCost <= 350 ? 'Resgatar' : 'Bloqueado'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {appTab === 'profile' && (
                                        <div className="p-5 pt-12 h-full flex flex-col">
                                            {previewProfileSubscreen === 'main' && (
                                                <div className="text-center animate-in fade-in slide-in-from-left-4 duration-300">
                                                    <div className="w-20 h-20 rounded-3xl bg-gray-800 mx-auto mb-4 border-2 p-1 overflow-hidden shadow-2xl" style={{ borderColor: settings.primaryColor }}>
                                                        <img src={simulationUser.avatar} className="w-full h-full object-cover rounded-2xl" />
                                                    </div>
                                                    <h2 className="text-lg font-black text-white">{simulationUser.name}</h2>
                                                    <p className="text-gray-500 text-xs mb-8">{simulationUser.email}</p>

                                                    <div className="grid grid-cols-1 gap-2 text-left">
                                                        {[
                                                            { id: 'history', icon: Clock, label: 'Histórico de Cortes' },
                                                            { id: 'purchases', icon: CreditCard, label: 'Minhas Compras' },
                                                            { id: 'rewards', icon: Gift, label: 'Prêmios Resgatados' },
                                                            { id: 'notifications', icon: Bell, label: 'Notificações' }
                                                        ].map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => setPreviewProfileSubscreen(item.id as any)}
                                                                className="w-full px-4 py-3 bg-gray-900/50 rounded-xl flex justify-between items-center text-white border border-gray-800 hover:bg-gray-800 transition-colors"
                                                            >
                                                                <span className="flex items-center gap-3 text-xs font-bold text-gray-300">
                                                                    <item.icon size={16} style={{ color: settings.primaryColor }} /> {item.label}
                                                                </span>
                                                                <ChevronRight size={14} className="text-gray-700" />
                                                            </button>
                                                        ))}
                                                        <button onClick={() => setPreviewScreen('login')} className="w-full p-3 bg-red-500/10 rounded-xl flex justify-center items-center text-red-500 border border-red-500/20 mt-4 text-xs font-black uppercase tracking-widest transition-colors hover:bg-red-500/20">
                                                            Sair da Conta
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sub-telas do Perfil */}
                                            {previewProfileSubscreen !== 'main' && (
                                                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <button
                                                            onClick={() => setPreviewProfileSubscreen('main')}
                                                            className="p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors"
                                                        >
                                                            <ArrowLeft size={16} />
                                                        </button>
                                                        <h2 className="text-lg font-bold text-white">
                                                            {previewProfileSubscreen === 'history' && 'Histórico'}
                                                            {previewProfileSubscreen === 'purchases' && 'Compras'}
                                                            {previewProfileSubscreen === 'rewards' && 'Meus Prêmios'}
                                                            {previewProfileSubscreen === 'notifications' && 'Notificações'}
                                                        </h2>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                                                        {previewProfileSubscreen === 'history' && (
                                                            <>
                                                                {[1, 2, 3].map(i => (
                                                                    <div key={i} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex justify-between items-center">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                                                <Scissors size={18} className="text-gray-500" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-white font-bold text-xs">Corte Clássico</p>
                                                                                <p className="text-gray-500 text-[10px]">2{i} de Out, 15:00</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-white font-bold text-xs">R$ 60,00</p>
                                                                            <span className="text-[9px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded uppercase font-bold">Concluído</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}

                                                        {previewProfileSubscreen === 'purchases' && (
                                                            <>
                                                                {[1, 2].map(i => (
                                                                    <div key={i} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex justify-between items-center">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                                                <Package size={18} className="text-gray-500" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-white font-bold text-xs">Pomada Matte</p>
                                                                                <p className="text-gray-500 text-[10px]">1{i} de Out, 10:30</p>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-white font-bold text-xs">R$ 45,00</p>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}

                                                        {previewProfileSubscreen === 'rewards' && (
                                                            <>
                                                                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex justify-between items-center opacity-50">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                                                                            <Gift size={18} className="text-gray-500" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-white font-bold text-xs">Corte Grátis</p>
                                                                            <p className="text-gray-500 text-[10px]">Resgatado em 10/10/2023</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[9px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded uppercase font-bold">Usado</span>
                                                                </div>
                                                            </>
                                                        )}

                                                        {previewProfileSubscreen === 'notifications' && (
                                                            <>
                                                                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="text-white font-bold text-xs">Lembrete de Agendamento</p>
                                                                        <span className="text-[9px] text-gray-500">2h atrás</span>
                                                                    </div>
                                                                    <p className="text-gray-400 text-[10px]">Seu corte é hoje às 15:00. Não se atrase!</p>
                                                                </div>
                                                                <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl space-y-1">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="text-white font-bold text-xs">Promoção Relâmpago</p>
                                                                        <span className="text-[9px] text-gray-500">1d atrás</span>
                                                                    </div>
                                                                    <p className="text-gray-400 text-[10px]">50% OFF em produtos de barba só hoje.</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Navigation */}
                                <div className="h-16 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 flex justify-around items-center px-2 z-20 absolute bottom-0 w-full">
                                    <button onClick={() => setAppTab('home')} className={`flex flex-col items-center gap-1 p-2 ${appTab === 'home' ? 'text-primary-500' : 'text-gray-500'}`}>
                                        <Home size={20} />
                                        <span className="text-[10px] font-medium">Início</span>
                                    </button>
                                    <button onClick={() => setAppTab('schedule')} className={`flex flex-col items-center gap-1 p-2 ${appTab === 'schedule' ? 'text-primary-500' : 'text-gray-500'}`}>
                                        <Calendar size={20} />
                                        <span className="text-[10px] font-medium">Agendar</span>
                                    </button>
                                    <button onClick={() => setAppTab('rewards')} className={`flex flex-col items-center gap-1 p-2 ${appTab === 'rewards' ? 'text-primary-500' : 'text-gray-500'}`}>
                                        <Gift size={20} />
                                        <span className="text-[10px] font-medium">Clube</span>
                                    </button>
                                    <button onClick={() => setAppTab('profile')} className={`flex flex-col items-center gap-1 p-2 ${appTab === 'profile' ? 'text-primary-500' : 'text-gray-500'}`}>
                                        <User size={20} />
                                        <span className="text-[10px] font-medium">Perfil</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TELA DE LOGIN (Preview) */}
                        {previewScreen === 'login' && (
                            <div
                                className="flex-1 overflow-hidden relative font-sans flex flex-col items-center justify-center p-6 transition-all duration-500 animate-in fade-in"
                                style={{
                                    backgroundColor: settings.primaryColor,
                                    backgroundImage: `linear-gradient(135deg, ${settings.primaryColor} 0%, #000000 150%)`
                                }}
                            >
                                <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl flex items-center justify-center mb-6 p-2 animate-in zoom-in duration-500">
                                    <img src={settings.logoPreview} className="w-full h-full object-contain rounded-xl" />
                                </div>

                                <div className="w-full max-w-xs animate-in slide-in-from-bottom-8 duration-500">
                                    <div className="bg-gray-900/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/5 shadow-2xl">

                                        {previewLoginStep === 'phone' ? (
                                            <div className="space-y-4">
                                                <div className="text-center mb-2">
                                                    <h2 className="text-base font-bold text-white leading-tight">Acesso Rápido</h2>
                                                    <p className="text-gray-400 text-[10px] mt-0.5">Entre com seu WhatsApp</p>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-1">Seu Telefone</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                        <input
                                                            type="tel"
                                                            placeholder="(11) 99999-9999"
                                                            value={previewPhone}
                                                            onChange={(e) => setPreviewPhone(e.target.value)}
                                                            className="w-full bg-gray-950/50 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary-500 transition-all placeholder:text-gray-700"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        if (previewPhone.length >= 10) {
                                                            setPreviewLoginStep('otp'); // Usando o estado existente para simular o segundo passo (Nome)
                                                        }
                                                    }}
                                                    className="w-full py-3 rounded-xl font-black text-dark-950 text-sm shadow-xl transition-all"
                                                    style={{ backgroundColor: settings.primaryColor }}
                                                >
                                                    Acessar App
                                                </button>

                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="h-px flex-1 bg-gray-800"></div>
                                                    <span className="text-[8px] font-bold text-gray-600 uppercase">ou</span>
                                                    <div className="h-px flex-1 bg-gray-800"></div>
                                                </div>

                                                <button className="w-full py-3 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold flex items-center justify-center gap-2 text-xs border border-[#25D366]/10">
                                                    <MessageCircle size={14} /> WhatsApp
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="text-center mb-2">
                                                    <h2 className="text-base font-bold text-white">Quase lá!</h2>
                                                    <p className="text-gray-400 text-[10px] mt-0.5">Como devemos te chamar?</p>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-1">Seu Nome</label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                        <input
                                                            type="text"
                                                            placeholder="João Silva"
                                                            className="w-full bg-gray-950/50 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-primary-500"
                                                        />
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setPreviewScreen('app');
                                                        setPreviewLoginStep('phone');
                                                    }}
                                                    className="w-full py-3 rounded-xl font-black text-dark-950 text-sm shadow-xl transition-all"
                                                    style={{ backgroundColor: settings.primaryColor }}
                                                >
                                                    Finalizar e Entrar
                                                </button>

                                                <button
                                                    onClick={() => setPreviewLoginStep('phone')}
                                                    className="w-full text-[10px] font-bold text-gray-600"
                                                >
                                                    Voltar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p className="mt-6 text-white/50 text-[10px] font-medium uppercase tracking-widest">Preview do fluxo de login</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppCustomizationPage;
