import { supabase } from '../supabaseClient';
import { SubscriptionPlan, ServicePackage, ClientSubscription, ClientPackage } from '../types';

const subscriptionService = {
    // --- PLANS ---
    async getPlans(tenantId: string): Promise<SubscriptionPlan[]> {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async savePlan(tenantId: string, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
        const { data, error } = await supabase
            .from('subscription_plans')
            .upsert({ ...plan, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePlan(id: string): Promise<void> {
        const { error } = await supabase
            .from('subscription_plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- PACKAGES ---
    async getPackages(tenantId: string): Promise<ServicePackage[]> {
        const { data, error } = await supabase
            .from('service_packages')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async savePackage(tenantId: string, pkg: Partial<ServicePackage>): Promise<ServicePackage> {
        const { data, error } = await supabase
            .from('service_packages')
            .upsert({ ...pkg, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePackage(id: string): Promise<void> {
        const { error } = await supabase
            .from('service_packages')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- CLIENT SUBSCRIPTIONS ---
    async getClientSubscriptions(tenantId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('client_subscriptions')
            .select('*, clients(name, avatar)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // --- GATEWAY CONFIG ---
    async updateGatewayConfig(tenantId: string, config: any): Promise<void> {
        const { data: tenant } = await supabase
            .from('tenants')
            .select('settings')
            .eq('id', tenantId)
            .single();

        const newSettings = {
            ...(tenant?.settings || {}),
            gateways: {
                ...(tenant?.settings?.gateways || {}),
                mercado_pago: config
            }
        };

        const { error } = await supabase
            .from('tenants')
            .update({ settings: newSettings })
            .eq('id', tenantId);

        if (error) throw error;
    },

    // --- CHECKOUT ---
    async createCheckoutSession(tenantId: string, clientId: string, planId: string): Promise<string> {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { tenantId, clientId, planId }
        });

        if (error) throw error;
        return data.init_point;
    }
};

export default subscriptionService;
