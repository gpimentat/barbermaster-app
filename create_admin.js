
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aogsaxrduljhmrdajvlo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvZ3NheHJkdWxqaG1yZGFqdmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NDU2NDMsImV4cCI6MjA4MjAyMTY0M30.fQGEGSLG4U2iLuAmNHNJzyO9zrqJBtfxP8piMVX8AKs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
    const { data, error } = await supabase.auth.signUp({
        email: 'admin@barbermaster.com',
        password: 'admin123',
        options: {
            data: {
                name: 'Admin Master' // Trigger will pick this up
            }
        }
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('User created:', data.user?.id);
    }
}

createAdmin();
