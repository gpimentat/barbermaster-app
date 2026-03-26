import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { planId, clientId, tenantId } = await req.json();
    console.log(`Initiating subscription: Plan=${planId}, Client=${clientId}, Tenant=${tenantId}`);

    if (!planId || !clientId || !tenantId) throw new Error('planId, clientId e tenantId são obrigatórios');

    // 1. Buscar plano
    const { data: plan, error: pError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (pError || !plan) throw new Error('Plano não encontrado');
    if (plan.price <= 0) throw new Error('O preço do plano deve ser maior que zero');

    // 2. Buscar cliente
    const { data: client, error: cError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (cError || !client) throw new Error('Cliente não encontrado');

    // 3. Usar Token Mestre (SaaS Owner)
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_MASTER_TOKEN');
    
    if (!mpAccessToken) {
        console.error('CRITICAL: MERCADO_PAGO_MASTER_TOKEN not found in env');
        return new Response(
            JSON.stringify({ error: 'Plano não encontrado no banco de dados da plataforma.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    // 4. Verificar se o plano já existe no MP Master
    let gatewayPlanId = plan.gateway_plan_id;

    if (!gatewayPlanId) {
        console.log(`Plan ${planId} not synced. Syncing now...`);
        const { data: tenantData } = await supabase.from('tenants').select('name').eq('id', tenantId).single();
        const displayName = `[${tenantData?.name || 'BM'}] ${plan.name}`;

        let frequency = 1;
        if (plan.frequency === 'quarterly') frequency = 3;
        if (plan.frequency === 'yearly') frequency = 12;

        const mpPlanResponse = await fetch('https://api.mercadopago.com/preapproval_plan', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: displayName,
                auto_setup: 'yes',
                payment_methods_allowed: {
                    payment_types: [
                        { id: 'credit_card' },
                        { id: 'ticket' }, 
                        { id: 'bank_transfer' } 
                    ],
                    payment_methods: []
                },
                auto_recurring: {
                    frequency: frequency,
                    frequency_type: 'months',
                    transaction_amount: plan.price,
                    currency_id: 'BRL'
                },
                back_url: `https://barbermaster.com.br/client/success`
            })
        });

        const mpPlanData = await mpPlanResponse.json();
        
        if (mpPlanData.id) {
            gatewayPlanId = mpPlanData.id;
            await supabase.from('subscription_plans').update({ gateway_plan_id: gatewayPlanId }).eq('id', plan.id);
            console.log(`Plan synced successfully: ${gatewayPlanId}`);
        } else {
            console.error('Erro ao Criar Plano no MP:', mpPlanData);
            throw new Error(`Erro ao registrar plano no gateway: ${mpPlanData.message || 'Verifique as credenciais Master'}`);
        }
    }

    // 5. Criar a Assinatura (Pre-approval)
    console.log(`Creating subscription for ${client.email}`);
    
    let frequencySub = 1;
    if (plan.frequency === 'quarterly') frequencySub = 3;
    if (plan.frequency === 'yearly') frequencySub = 12;

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            reason: `Assinatura ${plan.name}`,
            payer_email: client.email || 'cliente@barbermaster.com.br',
            external_reference: `${tenantId}|${clientId}|${planId}`,
            back_url: `https://barbermaster.com.br`,
            auto_recurring: {
                frequency: frequencySub,
                frequency_type: 'months',
                transaction_amount: plan.price,
                currency_id: 'BRL'
            }
        })
    });

    const mpData = await mpResponse.json();

    if (!mpData.init_point) {
        console.error('CRITICAL: Mercado Pago did not return init_point. Response:', mpData);
        return new Response(
            JSON.stringify({ 
                error: `Erro MP: ${mpData.message || 'Link de pagamento não gerado. Verifique o MASTER_TOKEN.'}`,
                details: mpData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        init_point: mpData.init_point || mpData.sandbox_init_point || mpData.user_ready_url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create Checkout Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
