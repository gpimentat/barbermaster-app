import { supabase } from '../supabaseClient';
import { Transaction, PaymentMethod, Barber, Service, Client } from '../../types';
import { MOCK_SUBSCRIPTION_PLANS } from '../../constants';

export interface FinancialStats {
    income: number;
    expense: number;
    balance: number;
    monthlyStats: Array<{
        label: string;
        income: number;
        expense: number;
        balance: number;
        sortKey: string;
    }>;
}

export interface BarberCommissionStats extends Barber {
    totalGenerated: number;
    serviceCount: number;
    averageTicket: number;
    commissionValue: number;
    servicesList: Array<{
        date: string;
        clientName: string;
        serviceName: string;
        price: number;
        commission: number;
    }>;
}

export interface ChipDistributionStats {
    totalMRR: number;
    distributionPot: number;
    globalTotalChips: number;
    stats: Array<Barber & {
        totalChips: number;
        serviceCount: number;
        sharePercentage: number;
        payoutValue: number;
    }>;
}

export const financialService = {
    // --- TRANSACTIONS CRUD ---

    async getTransactions(tenantId: string, limit = 100): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((t: any) => ({
            id: t.id,
            date: t.date,
            description: t.description || '',
            amount: Number(t.amount) || 0,
            type: t.type as 'income' | 'expense',
            category: t.category || '',
            method: t.method as PaymentMethod
        }));
    },

    async createTransaction(tenantId: string, data: Omit<Transaction, 'id'>): Promise<Transaction> {
        const { data: newTransaction, error } = await supabase
            .from('transactions')
            .insert([{
                ...data,
                tenant_id: tenantId
            }])
            .select()
            .single();

        if (error) throw error;
        return newTransaction;
    },

    async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
        const { error } = await supabase
            .from('transactions')
            .update(data)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTransaction(id: string): Promise<void> {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- FINANCIAL STATS (Simplified Aggregation) ---

    async getFinancialStats(tenantId: string): Promise<FinancialStats> {
        // Fetch all transactions for stats (can be optimized with improved SQL queries later)
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;

        const transactions = (data || []).map((t: any) => ({
            amount: Number(t.amount) || 0,
            type: t.type,
            date: t.date
        }));

        const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        // Calculate Monthly Stats
        const statsMap: Record<string, any> = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);

            if (!statsMap[sortKey]) {
                statsMap[sortKey] = { label: formattedLabel, income: 0, expense: 0, balance: 0, sortKey };
            }

            if (t.type === 'income') {
                statsMap[sortKey].income += t.amount;
            } else {
                statsMap[sortKey].expense += t.amount;
            }
            statsMap[sortKey].balance = statsMap[sortKey].income - statsMap[sortKey].expense;
        });

        const monthlyStats = Object.values(statsMap).sort((a: any, b: any) => b.sortKey.localeCompare(a.sortKey));

        return {
            income,
            expense,
            balance: income - expense,
            monthlyStats
        };
    },

    // --- COMMISSIONS LOGIC ---

    async getCommissionsData(tenantId: string, mrrAllocationPercentage: number = 40): Promise<{
        standardStats: BarberCommissionStats[];
        chipStats: ChipDistributionStats;
    }> {
        // 1. Fetch Necessary Data
        const [profilesRes, comandasRes, clientsRes, servicesRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('tenant_id', tenantId),
            supabase.from('comandas').select(`*, comanda_items (*)`).eq('tenant_id', tenantId).eq('status', 'paid'),
            supabase.from('clients').select('*').eq('tenant_id', tenantId),
            supabase.from('services').select('*').eq('tenant_id', tenantId)
        ]);

        const dbBarbers = profilesRes.data
            ?.filter(b => b.role?.toLowerCase().includes('barber') || b.role?.toLowerCase().includes('barbeiro'))
            .map(b => ({
                id: b.id,
                name: b.name,
                role: b.role,
                avatar: b.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=random`,
                commissionRate: Number(b.commission_rate) || 0,
                active: b.active
            })) || [];

        const dbComandas = comandasRes.data || [];
        const dbClients = clientsRes.data || [];
        const dbServices = servicesRes.data || [];

        // 2. Calculate Standard Commissions (Direct Services)
        const standardStats = dbBarbers.map((barber: any) => {
            const barberServices = dbComandas.flatMap((comanda: any) => {
                const client = dbClients.find((c: any) => c.id === comanda.client_id);
                // Ignore if client has active subscription (active subs use CHIPS logic)
                if (client?.subscription_status === 'active') return [];

                // Parse items if string (legacy) or use direct array
                const items = typeof comanda.comanda_items === 'string' ? JSON.parse(comanda.comanda_items) : comanda.comanda_items;

                return (items || [])
                    .filter((item: any) => item.type === 'service' && item.barber_id === barber.id)
                    .map((item: any) => ({
                        date: comanda.close_date || comanda.open_date,
                        clientName: comanda.client_name,
                        serviceName: item.name,
                        price: Number(item.price) * (item.quantity || 1),
                        commission: (Number(item.price) * (item.quantity || 1)) * (barber.commissionRate / 100)
                    }));
            });

            const totalGenerated = barberServices.reduce((acc: number, s: any) => acc + s.price, 0);
            const commissionValue = barberServices.reduce((acc: number, s: any) => acc + s.commission, 0);
            const serviceCount = barberServices.length;

            return {
                ...barber,
                totalGenerated,
                serviceCount,
                averageTicket: serviceCount > 0 ? totalGenerated / serviceCount : 0,
                commissionValue,
                servicesList: barberServices
            };
        }).sort((a: any, b: any) => b.commissionValue - a.commissionValue);


        // 3. Calculate Chip Distribution (Subscription MRR Share)
        const activeSubscribers = dbClients.filter((c: any) => c.subscription_status === 'active');

        // Calculate Total MRR based on plans (Using Mock for now as plans table not fully guaranteed or linked)
        // In a real scenario, should fetch plans table.
        const totalMRR = activeSubscribers.reduce((acc: number, client: any) => {
            const plan = MOCK_SUBSCRIPTION_PLANS.find(p => p.id === client.subscription_plan_id);
            return acc + (plan?.price || 0);
        }, 0);

        const distributionPot = totalMRR * (mrrAllocationPercentage / 100);

        let globalTotalChips = 0;

        const barberChipData = dbBarbers.map((barber: any) => {
            let barberChips = 0;
            let servicesCount = 0;

            dbComandas.forEach((comanda: any) => {
                const client = dbClients.find((c: any) => c.id === comanda.client_id);

                if (client?.subscription_status === 'active') {
                    const items = typeof comanda.comanda_items === 'string' ? JSON.parse(comanda.comanda_items) : comanda.comanda_items;

                    (items || []).forEach((item: any) => {
                        if (item.type === 'service' && item.barber_id === barber.id) {
                            const serviceDef = dbServices.find((s: any) => s.id === item.item_id || s.name === item.name);
                            // Default to 1 chip if service definition not found but it's a subscription service execution
                            const chipVal = serviceDef ? (Number(serviceDef.chips) || 0) : 0;

                            barberChips += (chipVal * (item.quantity || 1));
                            servicesCount++;
                        }
                    });
                }
            });

            globalTotalChips += barberChips;
            return {
                ...barber,
                totalChips: barberChips,
                serviceCount: servicesCount,
                sharePercentage: 0,
                payoutValue: 0
            };
        });

        const activeChipStats: any[] = barberChipData.map((b: any) => {
            const share = globalTotalChips > 0 ? b.totalChips / globalTotalChips : 0;
            return {
                ...b,
                sharePercentage: share * 100,
                payoutValue: distributionPot * share
            };
        }).sort((a: any, b: any) => b.payoutValue - a.payoutValue);

        return {
            standardStats,
            chipStats: {
                totalMRR,
                distributionPot,
                globalTotalChips,
                stats: activeChipStats
            }
        };
    }
};

export default financialService;
