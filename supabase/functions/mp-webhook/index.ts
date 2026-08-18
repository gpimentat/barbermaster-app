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
        const url = new URL(req.url);
        
        let bodyText = await req.text();
        let payload: any = {};
        try {
            payload = JSON.parse(bodyText);
        } catch { }

        // Mercado Pago sends notifications like:
        // action="payment.created" or type="payment" and data.id = "12345"
        // Recurring subscription status changes (cancelled by client, paused, etc.)
        // arrive as type="subscription" with data.id = the preapproval id.
        const notificationType = payload.type;
        const eventType = payload.action || payload.type;
        const resourceId = payload.data?.id || url.searchParams.get('data.id');

        console.log(`Webhook triggered: Type=${notificationType}, EventType=${eventType}, ResourceID=${resourceId}`);

        if (!resourceId) {
            return new Response(JSON.stringify({ status: 'ignored', message: 'No resource ID' }), { status: 200 });
        }

        const mpAccessToken = Deno.env.get('MERCADO_PAGO_MASTER_TOKEN');
        if (!mpAccessToken) throw new Error('MERCADO_PAGO_MASTER_TOKEN missing');

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // --- Subscription (preapproval) status changes: cancelled / paused ---
        if (notificationType === 'subscription') {
            const preRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
                headers: { 'Authorization': `Bearer ${mpAccessToken}` }
            });
            if (!preRes.ok) throw new Error(`Fetch preapproval failed: ${preRes.status}`);
            const preData = await preRes.json();

            const extRefSub = preData.external_reference;
            if (!extRefSub || extRefSub === 'null') {
                return new Response(JSON.stringify({ status: 'ignored', message: 'Preapproval has no external_reference' }), { status: 200 });
            }
            const subParts = extRefSub.split('|');
            if (subParts.length < 3) {
                return new Response(JSON.stringify({ status: 'ignored', message: 'Invalid external_reference format' }), { status: 200 });
            }
            const [subTenantId, subClientId, subPlanId] = subParts;

            let newLocalStatus: string | null = null;
            if (preData.status === 'cancelled') newLocalStatus = 'canceled';
            else if (preData.status === 'paused') newLocalStatus = 'past_due';
            else if (preData.status === 'authorized') newLocalStatus = 'active';

            if (!newLocalStatus) {
                return new Response(JSON.stringify({ status: 'ignored', message: `Preapproval status: ${preData.status}` }), { status: 200 });
            }

            // Upsert so we don't silently no-op if this subscription notification
            // arrives before the first payment ever created the row.
            const { data: existingForSub } = await supabase
                .from('client_subscriptions')
                .select('id')
                .eq('client_id', subClientId)
                .eq('plan_id', subPlanId)
                .maybeSingle();

            if (existingForSub) {
                const { error: subUpdateError } = await supabase
                    .from('client_subscriptions')
                    .update({ status: newLocalStatus, gateway_subscription_id: resourceId, updated_at: new Date().toISOString() })
                    .eq('id', existingForSub.id);
                if (subUpdateError) throw subUpdateError;
            } else {
                const { error: subInsertError } = await supabase
                    .from('client_subscriptions')
                    .insert({
                        tenant_id: subTenantId,
                        client_id: subClientId,
                        plan_id: subPlanId,
                        status: newLocalStatus,
                        gateway_subscription_id: resourceId
                    });
                if (subInsertError) throw subInsertError;
            }

            console.log(`Subscription ${resourceId} -> local status ${newLocalStatus} for client ${subClientId}`);
            return new Response(JSON.stringify({ status: 'success', message: `Subscription marked as ${newLocalStatus}` }), { status: 200 });
        }

        if (eventType !== 'payment.created' && eventType !== 'payment' && eventType !== 'payment.updated') {
            return new Response(JSON.stringify({ status: 'ignored', message: 'Not a relevant payment event' }), { status: 200 });
        }

        // Buscar Payment no Mercado Pago para autenticitar e pegar os dados reais
        const paymentId = resourceId;
        const mpUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
        const paymentRes = await fetch(mpUrl, {
            headers: { 'Authorization': `Bearer ${mpAccessToken}` }
        });

        if (!paymentRes.ok) throw new Error(`Fetch payment failed: ${paymentRes.status}`);
        const paymentData = await paymentRes.json();

        const extRef = paymentData.external_reference;
        if (!extRef || extRef === 'null') {
            return new Response(JSON.stringify({ status: 'ignored', message: 'No external_reference found (not a Barbermaster Plan checkout)' }), { status: 200 });
        }

        // extRef formato: tenantId|clientId|planId
        const parts = extRef.split('|');
        if (parts.length < 3) {
            return new Response(JSON.stringify({ status: 'ignored', message: 'Invalid external_reference format' }), { status: 200 });
        }

        const tenantId = parts[0];
        const clientId = parts[1];
        const planId = parts[2];

        // Recurring charge failed/was declined: reflect it locally so access can be
        // gated instead of silently staying "active" forever.
        if (['rejected', 'cancelled'].includes(paymentData.status)) {
            const { error: pastDueError } = await supabase
                .from('client_subscriptions')
                .update({ status: 'past_due', updated_at: new Date().toISOString() })
                .eq('client_id', clientId)
                .eq('plan_id', planId);

            if (pastDueError) throw pastDueError;

            return new Response(JSON.stringify({ status: 'ignored', message: `Payment ${paymentData.status}, subscription marked past_due` }), { status: 200 });
        }

        if (paymentData.status !== 'approved') {
            return new Response(JSON.stringify({ status: 'ignored', message: `Payment status: ${paymentData.status}` }), { status: 200 });
        }

        const transactionAmount = parseFloat(paymentData.transaction_amount || 0);

        if (transactionAmount <= 0) {
             return new Response(JSON.stringify({ status: 'ignored', message: 'Amount is 0' }), { status: 200 });
        }

        // Prevenir débito/crédito duplicado no webhook retry
        const { data: existingTx } = await supabase
            .from('balance_transactions')
            .select('id')
            .eq('reference_id', `mp_payment_${paymentId}`)
            .single();

        if (existingTx) {
            return new Response(JSON.stringify({ status: 'ignored', message: 'Payment already processed and wallet credited' }), { status: 200 });
        }

        // Regra de SaaS: Taxa de Gateway/Plataforma (ex: 5%)
        const platformFeePercentage = 0.05; 
        const platformFee = transactionAmount * platformFeePercentage;
        const netAmount = transactionAmount - platformFee;

        // 1. Inserir a transação do Lojista (Tenant)
        const { error: txError } = await supabase
            .from('balance_transactions')
            .insert({
                tenant_id: tenantId,
                amount: netAmount,
                platform_fee: platformFee,
                type: 'credit',
                description: `Assinatura de Plano via Mercado Pago`,
                reference_id: `mp_payment_${paymentId}`
            });

        if (txError) throw txError;

        // 2. Adicionar o dinheiro na Carteira Digital (Wallet) do Tenant — incremento
        // atômico no banco, evita perder dinheiro se dois pagamentos chegarem juntos.
        const { error: creditError } = await supabase.rpc('credit_tenant_balance', {
            p_tenant_id: tenantId,
            p_amount: netAmount
        });

        if (creditError) throw creditError;

        // 3. Ativar/Renovar a assinatura do cliente final dentro do sistema
        const { data: plan } = await supabase
           .from('subscription_plans')
           .select('frequency')
           .eq('id', planId)
           .maybeSingle();

        let daysToAdd = 30;
        if (plan?.frequency === 'yearly') daysToAdd = 365;
        if (plan?.frequency === 'quarterly') daysToAdd = 90;

        const renewsAt = new Date();
        renewsAt.setDate(renewsAt.getDate() + daysToAdd);

        const { data: existingSub } = await supabase
            .from('client_subscriptions')
            .select('id')
            .eq('client_id', clientId)
            .eq('plan_id', planId)
            .maybeSingle();

        if (existingSub) {
             await supabase
                .from('client_subscriptions')
                .update({ status: 'active', renews_at: renewsAt.toISOString(), updated_at: new Date().toISOString() })
                .eq('id', existingSub.id);
        } else {
             await supabase
                .from('client_subscriptions')
                .insert({
                    tenant_id: tenantId,
                    client_id: clientId,
                    plan_id: planId,
                    status: 'active',
                    renews_at: renewsAt.toISOString()
                });
        }

        console.log(`Payment processed successfully for tenant ${tenantId}. Net amount: R$ ${netAmount}`);
        return new Response(JSON.stringify({ status: 'success', message: 'Payment applied to wallet & sub activated' }), { status: 200 });

    } catch (err) {
        console.error('Webhook Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
