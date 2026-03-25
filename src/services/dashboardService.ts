
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

export interface SaaSStats {
    totalTenants: number;
    activeTenants: number;
    mrr: number;
    churnRate: number;
    revenueGrowth: { name: string; value: number }[];
    newUserGrowth: { name: string; value: number }[];
}

export const dashboardService = {
    async getSaasStats(adminEmail?: string): Promise<{ stats: SaaSStats, users: any[] }> {
        const targetAdminEmail = adminEmail || 'g.pimentat@gmail.com';

        // 1. Fetch only account OWNER profiles (excluding the system owner)
        const { data: ownerProfiles, error: ownerError } = await supabase
            .from('profiles')
            .select('*, tenants(*)')
            .in('role', ['admin', 'super_admin'])
            .neq('email', targetAdminEmail)
            .order('name');

        if (ownerError) throw ownerError;

        // 2. Identify unique Tenants that belong to these owners
        const realTenantsMap = new Map();
        ownerProfiles?.forEach(p => {
            if (p.tenants && !realTenantsMap.has(p.tenant_id)) {
                realTenantsMap.set(p.tenant_id, p.tenants);
            }
        });
        const realTenants = Array.from(realTenantsMap.values());

        // 3. Subscription status proxy (Premium vs Base)
        const { data: activeSubs } = await supabase
            .from('clients')
            .select('tenant_id')
            .eq('subscription_status', 'active');

        const premiumTenantIds = new Set(activeSubs?.map(s => s.tenant_id) || []);

        // 4. Calculate MRR strictly for these owner-led tenants
        let mrr = 0;
        realTenants.forEach(t => {
            if (premiumTenantIds.has(t.id)) mrr += 377;
            else mrr += 97;
        });

        // 5. Churn Rate for these tenants
        const inactiveTenants = realTenants.filter(t => t.subscription_status === 'inactive').length;
        const churnRate = realTenants.length > 0 ? (inactiveTenants / realTenants.length) * 100 : 0;

        // 6. Growth Data (Last 6 Months) strictly based on Owners
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const newUserGrowth = [];
        const revenueGrowth = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = months[d.getMonth()];
            const monthRangeEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

            // Count unique owners created up to this specific month
            const ownersUpToMonth = ownerProfiles?.filter(p => p.tenants?.created_at && new Date(p.tenants.created_at) <= monthRangeEnd) || [];
            const uniqueTenantsUpToMonthIds = new Set(ownersUpToMonth.map(p => p.tenant_id));

            let monthlyMrr = 0;
            uniqueTenantsUpToMonthIds.forEach(tid => {
                const tenant = realTenantsMap.get(tid);
                if (tenant && tenant.subscription_status === 'active') {
                    if (premiumTenantIds.has(tid)) monthlyMrr += 377;
                    else monthlyMrr += 97;
                }
            });

            newUserGrowth.push({ name: monthName, value: uniqueTenantsUpToMonthIds.size });
            revenueGrowth.push({ name: monthName, value: monthlyMrr });
        }

        return {
            stats: {
                totalTenants: realTenants.length,
                activeTenants: realTenants.filter(t => t.subscription_status === 'active').length,
                mrr,
                churnRate: parseFloat(churnRate.toFixed(1)),
                revenueGrowth,
                newUserGrowth
            },
            users: ownerProfiles || []
        };
    },

    async getAdminStats(tenantId: string, adminEmail?: string): Promise<DashboardStats> {
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

        // 2.1 Ticket Médio TRIMESTRAL (Last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

        const { data: quarterlyComandas } = await supabase
            .from('comandas')
            .select('total')
            .eq('tenant_id', tenantId)
            .eq('status', 'paid')
            .gte('close_date', ninetyDaysAgoStr + ' 00:00:00');

        const quarterlyTotalRevenue = quarterlyComandas?.reduce((acc: number, c: any) => acc + (Number(c.total) || 0), 0) || 0;
        const quarterlyCount = quarterlyComandas?.length || 0;
        const ticketMedioTrimestral = quarterlyCount > 0 ? quarterlyTotalRevenue / quarterlyCount : 0;

        // 3. Total Clients
        const { count: totalClients } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);

        // 4. MRR (Subscriptions) - Dados Reais
        const { data: subscribers } = await supabase
            .from('clients')
            .select('subscription_plan_id, email')
            .eq('tenant_id', tenantId)
            .eq('subscription_status', 'active');

        // Filtrar o admin se o e-mail for fornecido
        const activeSubscribers = adminEmail
            ? (subscribers || []).filter(s => s.email !== adminEmail)
            : (subscribers || []);

        // Mapa de preços dos planos (importado ou definido localmente se necessário, 
        // mas para precisão absoluta deveríamos buscar da tabela se existisse, 
        // como não existe, usamos o mapeamento dos MOCKs que refletem os IDs usados)
        const planPrices: Record<string, number> = {
            'sub1': 89.90,
            'sub2': 69.90,
            'sub3': 149.90
        };

        const mrr = activeSubscribers.reduce((acc, s) => {
            const price = planPrices[s.subscription_plan_id] || 0;
            return acc + price;
        }, 0);

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
            ticketMedio: ticketMedioTrimestral,
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
