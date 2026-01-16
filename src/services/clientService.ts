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
        const { data: client, error } = await supabase
            .from('clients')
            .insert({
                tenant_id: tenantId,
                name: data.name,
                phone: data.phone,
                email: data.email,
                birth_date: data.birthDate,
                loyalty_points: 0
            })
            .select()
            .single();

        if (error) throw error;
        return client;
    },

    // Login (buscar cliente por telefone)
    async login(tenantId: string, phone: string): Promise<Client | null> {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .single();

        if (error) return null;
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
