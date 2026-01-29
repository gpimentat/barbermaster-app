import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push';
import { corsHeaders } from '../_shared/cors.ts';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_EMAIL = 'mailto:admin@barbermaster.com.br';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('VAPID Keys not set in environment variables');
}

webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { user_id, title, message, url } = await req.json();

        if (!user_id) throw new Error('user_id is required');

        // Get all subscriptions for this user
        const { data: subs, error: subsError } = await supabase
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', user_id);

        if (subsError) throw subsError;

        const results = [];
        const payload = JSON.stringify({
            title: title || 'BarberMaster',
            body: message || 'Nova notificação!',
            url: url || '/'
        });

        for (const sub of (subs || [])) {
            try {
                await webpush.sendNotification(sub.subscription, payload);
                results.push({ id: sub.id, status: 'success' });
            } catch (error) {
                console.error(`Error sending to sub ${sub.id}:`, error);
                // If subscription is expired or invalid, remove it
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    results.push({ id: sub.id, status: 'removed' });
                } else {
                    results.push({ id: sub.id, status: 'error', error: error.message });
                }
            }
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
