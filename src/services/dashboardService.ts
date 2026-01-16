
import { supabase } from '../supabaseClient';

export interface DashboardStats {
    totalRevenue: number;
    totalAppointments: number;
    newClients: number;
    ticketMedio: number;
    mrr: number;
    commissions: number;
    todayAppointments: any[];
    weeklyRevenue: { name: string; revenue: number }[];
}

export const dashboardService = {
    async getAdminStats(tenantId: string): Promise<DashboardStats> {
        const today = new Date().toISOString().split('T')[0];

        // 1. Appointments for today (Status/Count)
        const { data: appts } = await supabase
            .from('appointments')
            .select('status, start_time, end_time, clients(name), services(name), profiles(name)')
            .eq('tenant_id', tenantId)
            .eq('date', today);

        const activeAppts = appts?.filter(a => a.status !== 'Cancelado') || [];
        const todayApptCount = activeAppts.length;

        // 2. Revenue from CLOSED COMANDAS (Today)
        const { data: dailyComandas, error: comandaError } = await supabase
            .from('comandas')
            .select('total')
            .eq('tenant_id', tenantId)
            .eq('status', 'paid')
            .gte('close_date', today + ' 00:00:00')
            .lte('close_date', today + ' 23:59:59');

        if (comandaError) console.error('Error fetching comandas:', comandaError);

        const todayRevenue = dailyComandas?.reduce((acc, c) => acc + (Number(c.total) || 0), 0) || 0;

        // 3. Total Clients
        const { count: totalClients } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        // 4. MRR (Subscriptions)
        const { data: subscribers } = await supabase
            .from('clients')
            .select('subscription_status')
            .eq('tenant_id', tenantId)
            .eq('subscription_status', 'active');

        const mrr = (subscribers || []).length * 89.90; // Fallback value assuming average plan price

        // 5. Weekly Revenue (from paid comandas)
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weeklyRevenue = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];

            const { data: dayComandas } = await supabase
                .from('comandas')
                .select('total')
                .eq('tenant_id', tenantId)
                .eq('status', 'paid')
                .gte('close_date', dStr + ' 00:00:00')
                .lte('close_date', dStr + ' 23:59:59');

            const dayRev = dayComandas?.reduce((acc, c) => acc + (Number(c.total) || 0), 0) || 0;
            weeklyRevenue.push({ name: days[d.getDay()], revenue: dayRev });
        }

        return {
            totalRevenue: todayRevenue,
            totalAppointments: todayApptCount,
            newClients: totalClients || 0,
            ticketMedio: todayApptCount > 0 ? todayRevenue / todayApptCount : 0,
            mrr,
            commissions: todayRevenue * 0.4, // Simplified estimated commission
            todayAppointments: appts || [],
            weeklyRevenue
        };
    },

    async getBarberStats(tenantId: string, barberId: string): Promise<any> {
        const today = new Date().toISOString().split('T')[0];

        const { data: appts } = await supabase
            .from('appointments')
            .select('price, status, start_time, end_time, clients(name), services(name)')
            .eq('tenant_id', tenantId)
            .eq('barber_id', barberId)
            .eq('date', today);

        const activeAppts = appts?.filter(a => a.status !== 'Cancelado') || [];
        const totalProduction = activeAppts.reduce((acc, a) => acc + (Number(a.price) || 0), 0);

        return {
            totalProduction,
            appointmentsCount: activeAppts.length,
            upcomingAppointments: activeAppts.filter(a => a.status === 'Agendado'),
            todayAppointments: appts || []
        };
    }
};
