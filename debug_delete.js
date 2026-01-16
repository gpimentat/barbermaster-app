
import { createClient } from '@supabase/supabase-js';

// Hardcoding for debug script purpose using values from .env and create_super_admin.js
const supabaseUrl = 'https://aogsaxrduljhmrdajvlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZ3NheHJkdWxqaG1yZGFqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDU2NDMsImV4cCI6MjA4MjAyMTY0M30.fQGEGSLG4U2iLuAmNHNJzyO9zrqJBtfxP8piMVX8AKs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log('--- STARTING DEBUG TEST ---');

    console.log('1. Signing in...');
    // Use the known admin credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'g.pimentat@gmail.com',
        password: 'Guigui0106@'
    });

    if (authError) {
        console.error('Login failed:', authError);
        return;
    }
    console.log('Logged in as:', authData.user.id);

    console.log('2. Creating dummy client...');
    const randomSuffix = Math.floor(Math.random() * 10000);
    const newClient = {
        name: `Test Delete ${randomSuffix}`,
        phone: `11999${randomSuffix}`,
        email: `test${randomSuffix}@example.com`,
        birth_date: '2000-01-01',
        tenant_id: authData.user.user_metadata?.tenantId || authData.user.id // Fallback
    };

    const { data: insertData, error: insertError } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single();

    if (insertError) {
        console.error('Insert failed:', insertError);
        return;
    }
    console.log('Client saved:', insertData.id, insertData.name);

    console.log('3. Deleting client via RPC...');
    const { data: deleteData, error: deleteError } = await supabase.rpc('delete_client_fully', {
        target_client_id: insertData.id
    });

    if (deleteError) {
        console.error('RPC DELETE FAILED:', deleteError);
    } else {
        console.log('RPC DELETE SUCCESS!');
    }

    // Verify deletion
    const { data: checkData } = await supabase.from('clients').select('*').eq('id', insertData.id);
    if (checkData && checkData.length === 0) {
        console.log('Verification: Client is GONE. Test PASSED.');
    } else {
        console.error('Verification: Client still exists!', checkData);
    }

    console.log('--- TEST FINISHED ---');
}

runTest();
