// Script para descobrir o slug da sua barbearia
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function findSlug() {
    console.log('🔍 Buscando slugs das barbearias...\n');

    const { data: tenants, error } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Erro:', error);
        return;
    }

    if (!tenants || tenants.length === 0) {
        console.log('❌ Nenhuma barbearia encontrada!');
        return;
    }

    console.log('✅ Barbearias encontradas:\n');
    tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. ${tenant.name}`);
        console.log(`   Slug: ${tenant.slug}`);
        console.log(`   URL: http://localhost:3000/#/app/${tenant.slug}`);
        console.log('');
    });
}

findSlug();
