import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BJ9Jyw8XiQOfr87AbjKHvwFTNYOMg-hUu4UBpc_Pd1SVBYXpfE6rG-rJLqGeaUChNV6CRKBW2jYBzjlTbfJOUow';
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

        // TESTE: Forçar envio para o tenant específico
        const tenantId = '63f22a97-eb14-4862-93b6-815ca41b83a4';
        const userId = 'a121891a-57e8-4ed8-be2d-20e93e20fc48';

        // Calcular receita de hoje
        const now = new Date();
        const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const todayStr = brNow.toISOString().split('T')[0];

        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('tenant_id', tenantId)
            .eq('type', 'income')
            .eq('date', todayStr);

        if (txError) throw txError;

        const totalRevenue = transactions?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

        console.log(`Receita calculada: R$ ${totalRevenue.toFixed(2)}`);

        // Buscar subscriptions
        const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId);

        if (subsError) throw subsError;

        console.log(`Encontradas ${subs?.length || 0} subscriptions`);

        if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nenhuma subscription encontrada',
                user_id: userId
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const payload = JSON.stringify({
            title: '🧪 TESTE - Relatório de Faturamento 💰',
            body: `Teste manual! Receita de hoje: R$ ${totalRevenue.toFixed(2)}`,
            url: '/financial'
        });

        const results = [];
        for (const sub of subs) {
            try {
                console.log('Enviando notificação...');
                await webpush.sendNotification(sub.subscription, payload);
                results.push({ status: 'success' });
                console.log('✅ Notificação enviada com sucesso!');
            } catch (e) {
                console.error('❌ Erro ao enviar:', e);
                results.push({ status: 'error', error: e.message });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            revenue: totalRevenue,
            subscriptions_found: subs.length,
            results
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('Erro geral:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
