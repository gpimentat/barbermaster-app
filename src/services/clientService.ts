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
    time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
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

    // Criar agendamento
    async createAppointment(data: {
        tenantId: string;
        clientId: string;
        barberId: string;
        serviceId: string;
        date: string;
        time: string;
    }): Promise<Appointment> {
        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
                tenant_id: data.tenantId,
                client_id: data.clientId,
                barber_id: data.barberId,
                service_id: data.serviceId,
                date: data.date,
                time: data.time,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
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
            .update({ loyalty_points: client.loyalty_points + points })
            .eq('id', clientId);

        if (error) throw error;
    }
};

export default clientService;
