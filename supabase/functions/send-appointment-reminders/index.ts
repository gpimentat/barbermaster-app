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

Deno.serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Buscamos agendamentos de HOJE que:
        // 1. Estão com status 'scheduled'
        // 2. Ainda não tiveram o lembrete enviado
        // 3. O horário de início está próximo (nas próximas 2 horas)

        const { data: appointments, error: appError } = await supabase
            .from('appointments')
            .select(`
                id, 
                date,
                status,
                reminder_sent,
                client_id,
                tenant_id,
                services(name),
                tenants(slug, name)
            `)
            .eq('date', todayStr)
            .eq('status', 'Agendado')
            .eq('reminder_sent', false);

        if (appError) throw appError;

        const results = [];

        for (const app of (appointments || [])) {
            // Lógica simples de janela de tempo (ex: lembrete 30min a 2h antes)
            // Aqui vamos apenas disparar se for no dia de hoje e ainda não enviado

            // 1. In-App Notification
            await supabase.from('client_notifications').insert({
                client_id: app.client_id,
                tenant_id: app.tenant_id,
                title: 'Lembrete de Agendamento 💈',
                message: `Seu horário para ${app.services?.name || 'seu serviço'} está chegando em breve na ${app.tenants?.name || 'Barbearia'}!`,
                type: 'info'
            });

            // 2. Push Notification
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('id, subscription')
                .eq('user_id', app.client_id);

            if (!subs || subs.length === 0) continue;

            const payload = JSON.stringify({
                title: 'Lembrete de Agendamento 💈',
                body: `Seu horário para ${app.services?.name || 'seu serviço'} está chegando em breve na ${app.tenants?.name || 'Barbearia'}!`,
                url: `/app/${app.tenants?.slug || ''}`
            });

            for (const sub of subs) {
                try {
                    await webpush.sendNotification(sub.subscription, payload);
                    results.push({ app_id: app.id, status: 'sent' });
                } catch (error) {
                    console.error('Push error:', error);
                    // If subscription is expired or invalid, remove it
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                        results.push({ app_id: app.id, status: 'removed' });
                    }
                }
            }

            // Marcar como enviado
            await supabase
                .from('appointments')
                .update({ reminder_sent: true })
                .eq('id', app.id);
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
