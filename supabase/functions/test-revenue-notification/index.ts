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

        // Dados fixos para teste
        const tenantId = '63f22a97-eb14-4862-93b6-815ca41b83a4';
        const userId = 'a121891a-57e8-4ed8-be2d-20e93e20fc48';
        const testDate = '2026-02-08'; // Sábado

        console.log('🧪 TESTE: Enviando relatório de faturamento');
        console.log(`Tenant: ${tenantId}`);
        console.log(`User: ${userId}`);
        console.log(`Data: ${testDate}`);

        // Calcular receita de sábado
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('tenant_id', tenantId)
            .eq('type', 'income')
            .eq('date', testDate);

        if (txError) {
            console.error('❌ Erro ao buscar transações:', txError);
            throw txError;
        }

        const totalRevenue = transactions?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;
        console.log(`💰 Receita calculada: R$ ${totalRevenue.toFixed(2)}`);

        // Buscar subscriptions
        const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', userId);

        if (subsError) {
            console.error('❌ Erro ao buscar subscriptions:', subsError);
            throw subsError;
        }

        console.log(`📱 Subscriptions encontradas: ${subs?.length || 0}`);

        if (!subs || subs.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Nenhuma subscription encontrada',
                user_id: userId
            }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            });
        }

        const payload = JSON.stringify({
            title: '🧪 TESTE - Relatório de Faturamento 💰',
            body: `Receita de Sábado (08/02): R$ ${totalRevenue.toFixed(2)}`,
            url: '/financial'
        });

        console.log('📤 Payload:', payload);

        const results = [];
        for (const sub of subs) {
            try {
                console.log(`Enviando para subscription ${sub.id}...`);
                await webpush.sendNotification(sub.subscription, payload);
                results.push({ id: sub.id, status: 'success' });
                console.log(`✅ Enviado com sucesso para ${sub.id}`);
            } catch (e) {
                console.error(`❌ Erro ao enviar para ${sub.id}:`, e);
                results.push({ id: sub.id, status: 'error', error: e.message });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            date: testDate,
            revenue: totalRevenue,
            subscriptions_found: subs.length,
            results
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('💥 Erro geral:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
