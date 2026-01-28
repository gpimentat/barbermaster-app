/**
 * Script to reset passwords for existing staff members
 * This uses the Supabase Admin API to properly reset passwords
 * 
 * Usage:
 * 1. Install dependencies: npm install @supabase/supabase-js
 * 2. Set environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 3. Run: node reset_staff_passwords.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://aogsaxrduljhmrdajvlo.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.error('Get it from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function resetStaffPasswords() {
    console.log('🔄 Fetching staff members that need password reset...\n');

    // Get all staff with login enabled
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('login_enabled', true)
        .in('role', ['Barbeiro', 'Recepcionista', 'Gerente']);

    if (profileError) {
        console.error('❌ Error fetching profiles:', profileError);
        return;
    }

    console.log(`Found ${profiles.length} staff members with login enabled\n`);

    const newPassword = '1234';
    let successCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
        try {
            console.log(`Resetting password for: ${profile.name} (${profile.email})...`);

            const { data, error } = await supabase.auth.admin.updateUserById(
                profile.id,
                {
                    password: newPassword,
                    email_confirm: true
                }
            );

            if (error) {
                console.error(`  ❌ Error: ${error.message}`);
                errorCount++;
            } else {
                console.log(`  ✅ Success! Password reset to: ${newPassword}`);
                successCount++;
            }
        } catch (err) {
            console.error(`  ❌ Unexpected error:`, err);
            errorCount++;
        }
        console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${errorCount}`);
    console.log(`  📝 Total: ${profiles.length}`);
    console.log('\n🔐 All staff can now login with password: 1234');
    console.log('⚠️  They should change their password after first login\n');
}

resetStaffPasswords().catch(console.error);
