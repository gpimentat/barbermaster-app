import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BJ9Jyw8XiQOfr87AbjKHvwFTNYOMg-hUu4UBpc_Pd1SVBYXpfE6rG-rJLqGeaUChNV6CRKBW2jYBzjlTbfJOUow';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '6TGcTgG9s3DjpYgGIY9n7FIk0CoPzdID04gQbXBY3qU';
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
                start_time, 
                date,
                tenant_id,
                client_id,
                services(name),
                tenants(slug, name)
            `)
            .eq('date', todayStr)
            .eq('status', 'scheduled')
            .eq('reminder_sent', false);

        if (appError) throw appError;

        const results = [];

        for (const app of (appointments || [])) {
            // Lógica simples de janela de tempo (ex: lembrete 30min a 2h antes)
            // Aqui vamos apenas disparar se for no dia de hoje e ainda não enviado

            // Buscar subscriptions do cliente
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
