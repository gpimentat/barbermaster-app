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

        const { tenantId, name, cpfCnpj, email, birthDate, companyType, incomeValue, phone, mobilePhone, address, addressNumber, complement, province, postalCode } = await req.json();
        if (!tenantId || !name || !cpfCnpj || !email || !postalCode) {
            throw new Error('Campos obrigatórios faltando');
        }

        // Confirma que quem chamou é admin/gerente/super_admin do próprio salão
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, tenant_id')
            .eq('id', userData.user.id)
            .single();

        const isAdminRole = profile?.role && ['admin', 'super_admin', 'gerente'].includes(profile.role);
        const ownsTenant = profile?.role === 'super_admin' || profile?.tenant_id === tenantId;
        if (!isAdminRole || !ownsTenant) throw new Error('Acesso negado');

        const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
        if (!asaasApiKey) throw new Error('ASAAS_API_KEY não configurada na plataforma');

        const asaasRes = await fetch('https://api.asaas.com/v3/accounts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': asaasApiKey
            },
            body: JSON.stringify({
                name, email, cpfCnpj, birthDate, companyType, incomeValue,
                phone, mobilePhone, address, addressNumber, complement, province, postalCode
            })
        });

        const asaasData = await asaasRes.json();
        if (!asaasRes.ok || !asaasData.walletId) {
            throw new Error(asaasData.errors?.[0]?.description || 'Erro ao criar conta na Asaas');
        }

        const { error: updateError } = await supabase
            .from('tenants')
            .update({ asaas_wallet_id: asaasData.walletId, asaas_person_type: 'CNPJ' })
            .eq('id', tenantId);

        if (updateError) throw updateError;

        return new Response(
            JSON.stringify({ success: true, walletId: asaasData.walletId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Asaas Create Subaccount Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
