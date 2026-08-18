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
        const authHeader = req.headers.get('Authorization') || '';
        const jwt = authHeader.replace('Bearer ', '');

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
        if (userError || !userData?.user) throw new Error('Não autenticado');

        // apiKey aqui é a chave PESSOAL do dono da barbearia (CPF) — usada uma
        // única vez pra descobrir o walletId dele. Nunca é salva.
        const { tenantId, apiKey } = await req.json();
        if (!tenantId || !apiKey) throw new Error('tenantId e apiKey são obrigatórios');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', userData.user.id)
            .single();

        const isAdminRole = profile?.role && ['admin', 'super_admin', 'gerente'].includes(profile.role);
        const ownsTenant = profile?.role === 'super_admin' || profile?.tenant_id === tenantId;
        if (!isAdminRole || !ownsTenant) throw new Error('Acesso negado');

        const walletRes = await fetch('https://api.asaas.com/v3/wallets/', {
            method: 'GET',
            headers: { 'access_token': apiKey }
        });

        const walletData = await walletRes.json();
        if (!walletRes.ok) {
            throw new Error(walletData.errors?.[0]?.description || 'Chave de API inválida na Asaas');
        }

        const walletId = walletData?.data?.[0]?.id;
        if (!walletId) throw new Error('Não foi possível encontrar sua carteira Asaas');

        const { error: updateError } = await supabase
            .from('tenants')
            .update({ asaas_wallet_id: walletId, asaas_person_type: 'CPF' })
            .eq('id', tenantId);

        if (updateError) throw updateError;

        return new Response(
            JSON.stringify({ success: true, walletId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Asaas Connect Wallet Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
