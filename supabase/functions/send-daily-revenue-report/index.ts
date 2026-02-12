import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BNqc8pq8BmuX53io0S4Bg9D1XUhkGZvRQCvHzG_FaH3hPV1bauVC7Z0tbrw9rRcO91AKmWFccANx9uKiYxps9f8';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_EMAIL = 'mailto:admin@barbermaster.com.br';

webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

const DAY_MAP: Record<number, string> = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado'
};

Deno.serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get current time in PT-BR (Brasilia) context
        // For simplicity, we use current UTC and subtract 3 hours (standard Brasilia)
        const now = new Date();
        const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const todayStr = brNow.toISOString().split('T')[0];
        const currentDayName = DAY_MAP[brNow.getDay()];
        const currentTimeStr = `${String(brNow.getHours()).padStart(2, '0')}:${String(brNow.getMinutes()).padStart(2, '0')}`;

        console.log(`Checking reports for Date: ${todayStr}, Day: ${currentDayName}, Time: ${currentTimeStr}`);

        // 1. Fetch all tenants
        const { data: tenants, error: tenantError } = await supabase
            .from('tenants')
            .select('id, name, settings');

        if (tenantError) throw tenantError;

        const results = [];

        for (const tenant of (tenants || [])) {
            const hours = tenant.settings?.app_config?.hours || [];
            const dayConfig = hours.find((h: any) => h.day === currentDayName);

            if (!dayConfig || !dayConfig.isOpen) continue;

            // 2. Check if it's 30 mins after closing
            const [closeH, closeM] = dayConfig.close.split(':').map(Number);
            const closeMinutes = (closeH * 60) + closeM;
            const targetMinutes = closeMinutes + 30; // 30 minutes after closing

            const currentMinutes = (brNow.getHours() * 60) + brNow.getMinutes();

            // We allow a window (e.g., if now is after targetMinutes)
            if (currentMinutes < targetMinutes) continue;

            // 3. Check if already sent today
            const { data: alreadySent } = await supabase
                .from('revenue_reports_log')
                .select('id')
                .eq('tenant_id', tenant.id)
                .eq('date', todayStr)
                .maybeSingle();

            if (alreadySent) continue;

            // 4. Calculate Revenue
            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('tenant_id', tenant.id)
                .eq('type', 'income')
                .eq('date', todayStr);

            if (txError) {
                console.error(`Error calculating revenue for ${tenant.name}:`, txError);
                continue;
            }

            const totalRevenue = transactions?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

            // 5. Find Target Admins
            const { data: targetSettings } = await supabase
                .from('notification_settings')
                .select('user_id')
                .eq('tenant_id', tenant.id)
                .eq('type', 'daily_revenue')
                .eq('enabled', true);

            if (!targetSettings || targetSettings.length === 0) {
                // Log skip but don't re-run
                await supabase.from('revenue_reports_log').insert({ tenant_id: tenant.id, date: todayStr });
                continue;
            }

            const userIds = targetSettings.map(s => s.user_id);

            // 6. Get Push Subscriptions
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('id, subscription')
                .in('user_id', userIds);

            if (subs && subs.length > 0) {
                const payload = JSON.stringify({
                    title: 'Relatório de Faturamento 💰',
                    body: `O dia terminou! Sua receita total hoje foi de R$ ${totalRevenue.toFixed(2)}.`,
                    url: '/financial'
                });

                for (const sub of subs) {
                    try {
                        await webpush.sendNotification(sub.subscription, payload);
                    } catch (e) {
                        console.error('Push error:', e);
                        // If subscription is expired or invalid, remove it
                        if (e.statusCode === 410 || e.statusCode === 404) {
                            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                        }
                    }
                }
            }

            // 7. Log success
            await supabase.from('revenue_reports_log').insert({ tenant_id: tenant.id, date: todayStr });
            results.push({ tenant: tenant.name, revenue: totalRevenue });
        }

        return new Response(JSON.stringify({ success: true, processed: results }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
