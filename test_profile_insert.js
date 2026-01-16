
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aogsaxrduljhmrdajvlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZ3NheHJkdWxqaG1yZGFqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDU2NDMsImV4cCI6MjA4MjAyMTY0M30.fQGEGSLG4U2iLuAmNHNJzyO9zrqJBtfxP8piMVX8AKs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const randomId = crypto.randomUUID();
    console.log('Attempting to insert profile with random ID:', randomId);

    const { data, error } = await supabase
        .from('profiles')
        .insert([
            {
                id: randomId,
                name: 'Test Barber',
                email: `test_${randomId}@barber.com`,
                role: 'Barber',
                active: true,
                login_enabled: false
            }
        ])
        .select();

    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Insert Success:', data);
        // Cleanup
        await supabase.from('profiles').delete().eq('id', randomId);
    }
}

testInsert();
