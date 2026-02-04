import { supabase } from '../../src/supabaseClient';

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
        service:services(name, price, duration),
        barber:profiles(name)
      `)
            .eq('client_id', clientId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Buscar slots disponíveis considerando horário de funcionamento e agendamentos
    async getAvailableSlots(tenantId: string, barberId: string, date: string, durationMinutes: number) {
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

                await supabase.functions.invoke('send-push-secured-v1', {
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
        // Tenta buscar de uma tabela de notificações (caso exista)
        const { data, error } = await supabase
            .from('client_notifications')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) {
            // Se a tabela não existir, retorna array vazio sem choro (feature flag implícita)
            return [];
        }
        return data || [];
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
    }
};

export default clientService;
