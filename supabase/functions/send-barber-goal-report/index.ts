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

        // Time context (Brasilia)
        const now = new Date();
        const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const todayStr = brNow.toISOString().split('T')[0];
        const currentDayName = DAY_MAP[brNow.getDay()];

        // Calculate week bounds (Monday to Sunday)
        const currentDay = brNow.getDay(); // 0 is Sunday, 1 is Monday
        const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(brNow);
        monday.setDate(brNow.getDate() - diffToMonday);
        const mondayStr = monday.toISOString().split('T')[0];

        console.log(`Processing Barber Goal Reports - Today: ${todayStr}, Week starts: ${mondayStr}`);

        // 1. Fetch tenants to check hours
        const { data: tenants } = await supabase.from('tenants').select('id, name, settings');

        for (const tenant of (tenants || [])) {
            const hours = tenant.settings?.app_config?.hours || [];
            const dayConfig = hours.find((h: any) => h.day === currentDayName);

            if (!dayConfig || !dayConfig.isOpen) continue;

            // Check 30 min delay
            const [closeH, closeM] = dayConfig.close.split(':').map(Number);
            const closeMinutes = (closeH * 60) + closeM;
            const targetMinutes = closeMinutes + 30;
            const currentMinutes = (brNow.getHours() * 60) + brNow.getMinutes();

            if (currentMinutes < targetMinutes) continue;

            // 2. Fetch barbers for this tenant
            const { data: barbers } = await supabase
                .from('profiles')
                .select('id, name, weekly_goal')
                .eq('tenant_id', tenant.id)
                .or('role.ilike.%barber%,role.ilike.%barbeiro%');

            for (const barber of (barbers || [])) {
                if (!barber.weekly_goal || barber.weekly_goal <= 0) continue;

                // 3. Check if already sent today
                const { data: alreadySent } = await supabase
                    .from('barber_goal_reports_log')
                    .select('id')
                    .eq('user_id', barber.id)
                    .eq('date', todayStr)
                    .maybeSingle();

                if (alreadySent) continue;

                // 4. Check if barber has "goal_progress" enabled
                const { data: notifSetting } = await supabase
                    .from('notification_settings')
                    .select('enabled')
                    .eq('user_id', barber.id)
                    .eq('type', 'goal_progress')
                    .maybeSingle();

                if (notifSetting?.enabled === false) {
                    // Skip but log so we don't keep checking
                    await supabase.from('barber_goal_reports_log').insert({ user_id: barber.id, date: todayStr });
                    continue;
                }

                // 5. Calculate Weekly Production (Monday to Today)
                // Sum of 'income' transactions created from 'comandas' where barber_id matches
                // Note: Based on ComandasPage.tsx, income transactions for services have barber_id?
                // Let's check transaction schema again. Actually financialService.ts calculates it from comandas.

                const { data: comandas } = await supabase
                    .from('comandas')
                    .select('id, comanda_items')
                    .eq('tenant_id', tenant.id)
                    .eq('status', 'paid')
                    .gte('close_date', mondayStr + 'T00:00:00')
                    .lte('close_date', todayStr + 'T23:59:59');

                let totalProduction = 0;
                comandas?.forEach(c => {
                    const items = typeof c.comanda_items === 'string' ? JSON.parse(c.comanda_items) : c.comanda_items;
                    (items || []).forEach((item: any) => {
                        if (item.type === 'service' && item.barber_id === barber.id) {
                            totalProduction += (Number(item.price) || 0) * (item.quantity || 1);
                        }
                    });
                });

                const percent = Math.round((totalProduction / barber.weekly_goal) * 100);
                const remaining = Math.max(0, barber.weekly_goal - totalProduction);

                // 6. Send Push
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('id, subscription')
                    .eq('user_id', barber.id);

                if (subs && subs.length > 0) {
                    const payload = JSON.stringify({
                        title: 'Resumo do Dia 🔋',
                        body: `Expediente encerrado! Você atingiu ${percent}% da sua meta semanal. Faltam R$ ${remaining.toFixed(2)} para o objetivo!`,
                        url: '/dashboard'
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

                // 7. Log Success
                await supabase.from('barber_goal_reports_log').insert({ user_id: barber.id, date: todayStr });
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
