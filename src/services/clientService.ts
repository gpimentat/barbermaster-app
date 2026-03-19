import { supabase } from '../../src/supabaseClient';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export interface Client {
    id: string;
    tenant_id: string;
    name: string;
    email?: string;
    phone: string;
    birth_date?: string;
    avatar_url?: string;
    loyalty_points: number;
    created_at: string;
}

export interface Appointment {
    id: string;
    tenant_id: string;
    client_id: string;
    barber_id: string;
    service_id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: 'Agendado' | 'Concluído' | 'Cancelado' | 'Pendente';
    notes?: string;
    created_at: string;
}

export const clientService = {
    // Registrar novo cliente
    async register(tenantId: string, data: {
        name: string;
        phone: string;
        email?: string;
        birthDate?: string;
        password: string;
    }): Promise<Client> {
        // Verificar se já existe
        const { data: existing } = await supabase
            .from('clients')
            .select('id, phone, password')
            .eq('tenant_id', tenantId)
            .eq('phone', data.phone)
            .maybeSingle();

        if (existing) {
            // Se já existe mas não tem senha, estamos "ativando" a conta legado
            if (!existing.password) {
                const { data: updated, error } = await supabase
                    .from('clients')
                    .update({
                        password: data.password,
                        name: data.name,
                        email: data.email,
                        birth_date: data.birthDate
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return updated;
            }
            throw { code: '23505' }; // Telefone já cadastrado
        }

        const { data: client, error } = await supabase
            .from('clients')
            .insert({
                tenant_id: tenantId,
                name: data.name,
                phone: data.phone,
                email: data.email,
                birth_date: data.birthDate,
                password: data.password, // Em produção, usar hash via RPC/Edge Function
                loyalty_points: 0
            })
            .select()
            .single();

        if (error) throw error;
        return client;
    },

    // Solicitar Código de Segurança (OTP)
    async requestOTP(phone: string): Promise<any> {
        const { data, error } = await supabase.functions.invoke('send-client-otp', {
            body: { phone }
        });

        if (error) throw error;
        return data;
    },

    // Verificar Código e Fazer Login
    async verifyOTP(tenantId: string, phone: string, code: string): Promise<any> {
        // 1. Verificar se o código é válido no banco
        const { data: verification, error: vError } = await supabase
            .from('client_verification_codes')
            .select('*')
            .eq('phone', phone)
            .eq('code', code)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (vError) throw vError;
        if (!verification) throw new Error('invalid_code');

        // 2. Marcar código como usado
        await supabase
            .from('client_verification_codes')
            .update({ used: true })
            .eq('id', verification.id);

        // 3. Buscar ou Criar o Cliente
        const { data: client, error: cError } = await supabase
            .from('clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .maybeSingle();

        if (cError) throw cError;

        // Retornar o cliente (pode ser nulo se for novo, o frontend tratará)
        return client || { phone, isNew: true };
    },

    // Buscar por telefone (Acesso rápido)
    async getByPhone(tenantId: string, phone: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // Login (Legado ou via senha se configurado)
    async login(tenantId: string, phone: string, password?: string): Promise<any> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Caso especial: conta sem senha (primeiro acesso pós-migração)
        if (!data.password) {
            return { ...data, needsPassword: true };
        }

        // Validar senha se fornecida
        if (password && data.password !== password) {
            throw new Error('invalid_password');
        }

        return data;
    },
    // Buscar cliente por ID
    async getById(clientId: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (error) return null;
        return data;
    },

    // Atualizar perfil
    async updateProfile(clientId: string, updates: Partial<Client>): Promise<Client> {
        const { data, error } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', clientId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Buscar agendamentos do cliente
    async getAppointments(clientId: string): Promise<Appointment[]> {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
        *,
        service:services(name, price, duration_minutes),
        barber:profiles(name)
      `)
            .eq('client_id', clientId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Buscar slots disponíveis considerando horário de funcionamento e agendamentos
    async getAvailableSlots(tenantId: string, barberId: string, date: string, durationMinutes: number) {
        // 0. Check Days Off
        const { data: profile } = await supabase
            .from('profiles')
            .select('work_settings')
            .eq('id', barberId)
            .single();

        if (profile?.work_settings?.daysOff) {
            const dateObj = new Date(date + 'T12:00:00Z');
            const dayOfWeek = dateObj.getUTCDay();
            const config = profile.work_settings.daysOff[dayOfWeek];

            if (config) {
                if (config === 'all') return [];
                
                if (config === 'alternate') {
                    const target = new Date(dateObj.valueOf());
                    const dayNr = (dateObj.getUTCDay() + 6) % 7;
                    target.setUTCDate(target.getUTCDate() - dayNr + 3);
                    const firstThursday = target.valueOf();
                    target.setUTCMonth(0, 1);
                    if (target.getUTCDay() !== 4) {
                        target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
                    }
                    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
                    
                    if (weekNum % 2 === 0) return [];
                }
            }
        }

        // 1. Buscar horários de funcionamento do tenant
        const { data: tenant } = await supabase
            .from('tenants')
            .select('settings')
            .eq('id', tenantId)
            .single();

        const config = tenant?.settings?.app_config;
        if (!config?.hours) return [];

        // 2. Identificar o dia da semana
        const dateObj = new Date(date + 'T12:00:00');
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayName = days[dateObj.getDay()];

        const dayConfig = config.hours.find((h: any) => h.day === dayName);
        if (!dayConfig || !dayConfig.isOpen) return [];

        // 3. Buscar agendamentos existentes
        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_time, end_time')
            .eq('tenant_id', tenantId)
            .eq('barber_id', barberId)
            .eq('date', date)
            .neq('status', 'Cancelado');

        // 4. Gerar slots a cada 30 min
        const slots: string[] = [];
        const [openH, openM] = dayConfig.open.split(':').map(Number);
        const [closeH, closeM] = dayConfig.close.split(':').map(Number);

        let currentMinutes = openH * 60 + openM;
        const limitMinutes = closeH * 60 + closeM;

        while (currentMinutes + durationMinutes <= limitMinutes) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            // Validar conflito
            const hasConflict = appointments?.some(app => {
                const [appStartH, appStartM] = app.start_time.split(':').map(Number);
                const [appEndH, appEndM] = app.end_time.split(':').map(Number);
                const appStartTotal = appStartH * 60 + appStartM;
                const appEndTotal = appEndH * 60 + appEndM;

                return currentMinutes < appEndTotal && (currentMinutes + durationMinutes) > appStartTotal;
            });

            if (!hasConflict) {
                slots.push(timeStr);
            }

            currentMinutes += 30;
        }

        return slots;
    },

    // Criar agendamento
    async createAppointment(data: {
        tenantId: string;
        clientId: string;
        barberId: string;
        serviceId: string;
        date: string;
        time: string;
    }): Promise<Appointment> {
        // Buscar duração do serviço
        const { data: service } = await supabase
            .from('services')
            .select('duration_minutes, price')
            .eq('id', data.serviceId)
            .single();

        if (!service) throw new Error('Serviço não encontrado');

        const duration = service.duration_minutes || 30;
        const [h, m] = data.time.split(':').map(Number);
        const endTotal = h * 60 + m + duration;
        const endH = Math.floor(endTotal / 60);
        const endM = endTotal % 60;
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
                tenant_id: data.tenantId,
                client_id: data.clientId,
                barber_id: data.barberId,
                service_id: data.serviceId,
                date: data.date,
                start_time: data.time,
                end_time: endTime,
                price: service.price,
                status: 'Agendado'
            })
            .select()
            .single();

        if (error) throw error;

        // 7. Instant Push Notification for Barber
        try {
            const { data: barberNotif } = await supabase
                .from('notification_settings')
                .select('enabled')
                .eq('user_id', data.barberId)
                .eq('type', 'new_appointment')
                .maybeSingle();

            if (barberNotif?.enabled !== false) {
                // Fetch service name and client name for better notification message
                const [{ data: serviceInfo }, { data: clientInfo }] = await Promise.all([
                    supabase.from('services').select('name').eq('id', data.serviceId).single(),
                    supabase.from('clients').select('name').eq('id', data.clientId).single()
                ]);

                await supabase.functions.invoke('send-push', {
                    body: {
                        user_id: data.barberId,
                        title: 'Novo Horário Agendado! ✂️',
                        message: `${serviceInfo?.name || 'Serviço'} com ${clientInfo?.name || 'Cliente'} em ${new Date(data.date).toLocaleDateString('pt-BR')} às ${data.time}`,
                        url: '/schedule'
                    }
                });
            }
        } catch (pushErr) {
            console.error('Error sending push to barber:', pushErr);
        }

        return appointment;
    },

    // Cancelar agendamento
    async cancelAppointment(appointmentId: string): Promise<void> {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointmentId);

        if (error) throw error;
    },

    // Adicionar pontos de fidelidade
    async addLoyaltyPoints(clientId: string, points: number): Promise<void> {
        const client = await this.getById(clientId);
        if (!client) throw new Error('Cliente não encontrado');

        const { error } = await supabase
            .from('clients')
            .update({ loyalty_points: Math.max(0, (client.loyalty_points || 0) + points) })
            .eq('id', clientId);

        if (error) throw error;
    },

    // Resgatar Recompensa
    async redeemReward(tenantId: string, clientId: string, reward: any): Promise<void> {
        // 1. Verificar se o cliente tem pontos suficientes
        const client = await this.getById(clientId);
        if (!client) throw new Error('client_not_found');

        if ((client.loyalty_points || 0) < reward.pointsCost) {
            throw new Error('insufficient_points');
        }

        // 2. Criar o registro de resgate
        const { error: redemptionError } = await supabase
            .from('reward_redemptions')
            .insert({
                tenant_id: tenantId,
                client_id: clientId,
                reward_id: reward.id,
                reward_title: reward.title,
                points_cost: reward.pointsCost,
                status: 'pending'
            });

        if (redemptionError) throw redemptionError;

        // 3. Deduzir os pontos
        await this.addLoyaltyPoints(clientId, -reward.pointsCost);
    },

    // Buscar histórico de recompensas resgatadas
    async getRedeemedRewards(clientId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('reward_redemptions')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching redemptions:', error);
            return [];
        }
        return data || [];
    },

    // Buscar histórico de produtos comprados (via Comandas Pagas)
    async getPurchases(clientId: string): Promise<any[]> {
        // Buscar comandas pagas do cliente
        const { data: comandas, error } = await supabase
            .from('comandas')
            .select('id, close_date, items')
            .eq('client_id', clientId)
            .eq('status', 'paid')
            .order('close_date', { ascending: false });

        if (error) {
            console.error('Error fetching purchases:', error);
            return [];
        }

        // Extrair apenas itens do tipo 'product'
        const purchases: any[] = [];
        comandas?.forEach(comanda => {
            const items = typeof comanda.items === 'string'
                ? JSON.parse(comanda.items)
                : comanda.items;

            if (Array.isArray(items)) {
                items.forEach((item: any) => {
                    if (item.type === 'product') {
                        purchases.push({
                            ...item,
                            date: comanda.close_date,
                            comandaId: comanda.id
                        });
                    }
                });
            }
        });

        return purchases;
    },

    // Buscar notificações
    async getNotifications(clientId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('client_notifications')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
        return data || [];
    },

    // Marcar notificação como lida
    async markAsRead(notificationId: string): Promise<void> {
        const { error } = await supabase
            .from('client_notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    },

    // Marcar todas como lidas
    async markAllAsRead(clientId: string): Promise<void> {
        const { error } = await supabase
            .from('client_notifications')
            .update({ is_read: true })
            .eq('client_id', clientId)
            .eq('is_read', false);

        if (error) throw error;
    },

    // --- ASSINATURAS E PACOTES ---

    // Buscar planos disponíveis para o tenant
    async getSubscriptionPlans(tenantId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('active', true);

        if (error) throw error;
        return data || [];
    },

    // Iniciar checkout de assinatura
    async subscribeToPlan(tenantId: string, clientId: string, planId: string): Promise<{ init_point: string }> {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { tenantId, clientId, planId }
        });

        if (error) throw error;
        return data; // Contém o init_point do Mercado Pago
    },

    // Buscar pacotes ativos do cliente
    async getClientPackages(clientId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('client_packages')
            .select(`
                *,
                package:service_packages(*)
            `)
            .eq('client_id', clientId)
            .eq('status', 'active');

        if (error) throw error;
        return data || [];
    },
    // --- NOTIFICAÇÕES PUSH ---

    // Verificar se o navegador suporta e se já está inscrito
    async checkPushSubscription(): Promise<boolean> {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            return false;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    },

    // Inscrever para Push
    async subscribeToPush(clientId: string, tenantId: string): Promise<void> {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            throw new Error('Push não suportado neste navegador');
        }

        const registration = await navigator.serviceWorker.ready;

        // Solicitar permissão
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Permissão negada');
        }

        // Chave VAPID Pública (Nova chave gerada)
        const VAPID_PUBLIC_KEY = 'BNqc8pq8BmuX53io0S4Bg9D1XUhkGZvRQCvHzG_FaH3hPV1bauVC7Z0tbrw9rRcO91AKmWFccANx9uKiYxps9f8';
        const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        // Salvar no banco
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: clientId,
                subscription: subscription.toJSON(),
                tenant_id: tenantId
            }, { onConflict: 'user_id' }); // Garantir uma subscrição por cliente

        if (error) throw error;
    },

    // --- REVIEWS & FEEDBACK ---
    async submitReview(data: {
        tenantId: string;
        clientId: string;
        clientName: string;
        rating: number;
        comment: string;
        photoFile?: File;
    }): Promise<any> {
        let photoUrl = '';

        // 1. Upload da foto se existir
        if (data.photoFile) {
            const fileExt = data.photoFile.name.split('.').pop();
            const fileName = `${data.tenantId}/${data.clientId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('reviews')
                .upload(fileName, data.photoFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('reviews')
                .getPublicUrl(fileName);

            photoUrl = publicUrl;
        }

        // 2. Salvar no banco
        const { data: review, error } = await supabase
            .from('client_reviews')
            .insert({
                tenant_id: data.tenantId,
                client_id: data.clientId,
                client_name: data.clientName,
                rating: data.rating,
                comment: data.comment,
                photo_url: photoUrl,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return review;
    },

    async getMyReviews(clientId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('client_reviews')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }
};

export default clientService;
