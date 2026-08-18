import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { clientId, planId } = await req.json();
        if (!clientId || !planId) throw new Error('clientId e planId são obrigatórios');

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: sub, error: subError } = await supabase
            .from('client_subscriptions')
            .select('id, gateway_subscription_id, status')
            .eq('client_id', clientId)
            .eq('plan_id', planId)
            .maybeSingle();

        if (subError) throw subError;
        if (!sub) throw new Error('Assinatura não encontrada');

        if (sub.status === 'canceled') {
            return new Response(
                JSON.stringify({ success: true, message: 'Assinatura já estava cancelada' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (sub.gateway_subscription_id) {
            const mpAccessToken = Deno.env.get('MERCADO_PAGO_MASTER_TOKEN');
            if (!mpAccessToken) throw new Error('MERCADO_PAGO_MASTER_TOKEN missing');

            const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${sub.gateway_subscription_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${mpAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (!mpRes.ok) {
                const mpErr = await mpRes.json().catch(() => ({}));
                throw new Error(`Erro ao cancelar no Mercado Pago: ${mpErr.message || mpRes.status}`);
            }
        }

        // Atualiza localmente já — o webhook do MP também vai confirmar depois.
        const { error: updateError } = await supabase
            .from('client_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('id', sub.id);

        if (updateError) throw updateError;

        return new Response(
            JSON.stringify({ success: true, message: 'Assinatura cancelada com sucesso' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
