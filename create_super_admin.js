
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aogsaxrduljhmrdajvlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZ3NheHJkdWxqaG1yZGFqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDU2NDMsImV4cCI6MjA4MjAyMTY0M30.fQGEGSLG4U2iLuAmNHNJzyO9zrqJBtfxP8piMVX8AKs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperAdmin() {
    console.log("Creating Super Admin...");
    const { data, error } = await supabase.auth.signUp({
        email: 'g.pimentat@gmail.com',
        password: 'Guigui0106@',
        options: {
            data: {
                name: 'Gui Pimenta (Super Admin)'
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created:', data.user?.id);
    }
}

createSuperAdmin();
