import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTenantDomains() {
    try {
        console.log('🔍 Buscando todos os tenants...\n');

        // Buscar todos os tenants
        const { data: tenants, error: fetchError } = await supabase
            .from('tenants')
            .select('id, name, slug, settings');

        if (fetchError) {
            console.error('❌ Erro ao buscar tenants:', fetchError);
            return;
        }

        if (!tenants || tenants.length === 0) {
            console.log('⚠️  Nenhum tenant encontrado.');
            return;
        }

        console.log(`📋 Encontrados ${tenants.length} tenant(s)\n`);

        for (const tenant of tenants) {
            console.log(`\n🔧 Processando: ${tenant.name} (${tenant.slug})`);

            let settings = tenant.settings || {};
            let updated = false;

            // Garantir estrutura app_config
            if (!settings.app_config) {
                settings.app_config = {};
                updated = true;
            }

            // Atualizar domínio se necessário
            if (!settings.app_config.domain) {
                settings.app_config.domain = {
                    type: 'platform',
                    slug: tenant.slug || 'barbershop',
                    customDomain: '',
                    verified: false
                };
                updated = true;
                console.log('   ✓ Adicionada configuração de domínio');
            } else {
                // Verificar se o slug está correto
                if (settings.app_config.domain.slug !== tenant.slug) {
                    settings.app_config.domain.slug = tenant.slug;
                    updated = true;
                    console.log('   ✓ Slug sincronizado');
                }
            }

            // Garantir configuração geral
            if (!settings.app_config.general) {
                settings.app_config.general = {
                    primaryColor: '#eab308',
                    logoUrl: '',
                    website: 'barbermaster.com.br'
                };
                updated = true;
                console.log('   ✓ Adicionada configuração geral');
            } else if (settings.app_config.general && settings.app_config.general.website === 'barbermaster.com') {
                settings.app_config.general.website = 'barbermaster.com.br';
                updated = true;
                console.log('   ✓ Website atualizado para .com.br');
            }

            // Garantir features
            if (!settings.app_config.features) {
                settings.app_config.features = {
                    enableRewards: true,
                    enablePartners: true,
                    enableGallery: true,
                    enableFeedbacks: true
                };
                updated = true;
                console.log('   ✓ Features habilitadas');
            }

            // Atualizar no banco se houve mudanças
            if (updated) {
                const { error: updateError } = await supabase
                    .from('tenants')
                    .update({ settings })
                    .eq('id', tenant.id);

                if (updateError) {
                    console.error(`   ❌ Erro ao atualizar: ${updateError.message}`);
                } else {
                    console.log('   ✅ Configurações atualizadas com sucesso!');
                }
            } else {
                console.log('   ℹ️  Nenhuma atualização necessária');
            }
        }

        console.log('\n\n✅ Processo concluído!\n');
        console.log('🔄 Agora recarregue a página de Customização (Ctrl+F5) para ver as mudanças!\n');

    } catch (error) {
        console.error('❌ Erro inesperado:', error);
    }
}

// Executar
fixTenantDomains();
