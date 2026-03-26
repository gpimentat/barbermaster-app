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
        const eventType = payload.action || payload.type;
        const paymentId = payload.data?.id || url.searchParams.get('data.id');

        console.log(`Webhook triggered: EventType=${eventType}, PaymentID=${paymentId}`);

        if (!paymentId) {
            return new Response(JSON.stringify({ status: 'ignored', message: 'No payment ID' }), { status: 200 });
        }

        if (eventType !== 'payment.created' && eventType !== 'payment' && eventType !== 'payment.updated') {
            return new Response(JSON.stringify({ status: 'ignored', message: 'Not a relevant payment event' }), { status: 200 });
        }

        const mpAccessToken = Deno.env.get('MERCADO_PAGO_MASTER_TOKEN');
        if (!mpAccessToken) throw new Error('MERCADO_PAGO_MASTER_TOKEN missing');

        // Buscar Payment no Mercado Pago para autenticitar e pegar os dados reais
        const mpUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
        const paymentRes = await fetch(mpUrl, {
            headers: { 'Authorization': `Bearer ${mpAccessToken}` }
        });
        
        if (!paymentRes.ok) throw new Error(`Fetch payment failed: ${paymentRes.status}`);
        const paymentData = await paymentRes.json();

        if (paymentData.status !== 'approved') {
            return new Response(JSON.stringify({ status: 'ignored', message: `Payment status: ${paymentData.status}` }), { status: 200 });
        }

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
        const transactionAmount = parseFloat(paymentData.transaction_amount || 0);

        if (transactionAmount <= 0) {
             return new Response(JSON.stringify({ status: 'ignored', message: 'Amount is 0' }), { status: 200 });
        }

        // Supabase Init
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

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

        // 2. Adicionar o dinheiro na Carteira Digital (Wallet) do Tenant
        const { data: currentBalance } = await supabase
            .from('tenant_balances')
            .select('balance')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (currentBalance) {
            const newBalance = currentBalance.balance + netAmount;
            await supabase
                .from('tenant_balances')
                .update({ balance: newBalance, updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId);
        } else {
             await supabase
                .from('tenant_balances')
                .insert({ tenant_id: tenantId, balance: netAmount, withdrawn_total: 0, pending_payout: 0 });
        }

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
