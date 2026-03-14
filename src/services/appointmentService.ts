
import { supabase } from '../supabaseClient';

export interface CancelResult {
    success: boolean;
    message: string;
    waitlistTriggered?: boolean;
    nextClient?: {
        name: string;
        phone: string;
        serviceName: string;
    };
}

export const appointmentService = {
    async cancelAppointment(appointmentId: string, reason: string): Promise<CancelResult> {
        try {
            // 1. Get Appointment Details first to know barber and date
            const { data: appt, error: fetchError } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .single();

            if (fetchError || !appt) throw new Error('Agendamento não encontrado.');

            // 2. Update Appointment Status
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    status: 'Cancelado',
                    notes: appt.notes ? `${appt.notes}\nMotivo Cancelamento: ${reason}` : `Motivo Cancelamento: ${reason}`
                    // storing in notes for now to avoid schema migration if column missing, 
                    // but cleaner would be cancellation_reason column.
                })
                .eq('id', appointmentId);

            if (updateError) throw updateError;

            // 3. Check Waitlist
            const { data: waiters } = await supabase
                .from('waitlist')
                .select('*, clients(name, phone), services(name)')
                .eq('barber_id', appt.barber_id)
                .eq('desired_date', appt.date)
                .eq('status', 'waiting')
                .order('request_time', { ascending: true }) // First come, first served
                .limit(1);

            let result: CancelResult = {
                success: true,
                message: 'Agendamento cancelado com sucesso.'
            };

            if (waiters && waiters.length > 0) {
                const next = waiters[0];
                result.waitlistTriggered = true;
                result.nextClient = {
                    name: next.clients?.name || 'Cliente',
                    phone: next.clients?.phone || '',
                    serviceName: next.services?.name || 'Serviço'
                };
            }

            return result;

        } catch (error: any) {
            console.error('Cancel Error:', error);
            return {
                success: false,
                message: error.message || 'Erro ao cancelar agendamento.'
            };
        }
    },

    async confirmAppointment(appointmentId: string): Promise<{ success: boolean; message: string }> {
        try {
            // 1. Update appointment status to Confirmado
            const { error: updateError } = await supabase
                .from('appointments')
                .update({ status: 'Confirmado' })
                .eq('id', appointmentId);

            if (updateError) throw updateError;

            return {
                success: true,
                message: 'Agendamento confirmado com sucesso! A comanda agora pode ser aberta manualmente.'
            };
        } catch (error: any) {
            console.error('Confirm Error:', error);
            return {
                success: false,
                message: error.message || 'Erro ao confirmar agendamento.'
            };
        }
    },

    async openComandaFromAppointment(appointmentId: string): Promise<{ success: boolean; message: string; comandaId?: string }> {
        try {
            // 1. Fetch appointment details with related data
            const { data: appt, error: fetchError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    clients (id, name),
                    services (id, name, price),
                    profiles!appointments_barber_id_fkey (id, name)
                `)
                .eq('id', appointmentId)
                .single();

            if (fetchError || !appt) {
                throw new Error('Agendamento não encontrado.');
            }

            if (appt.comanda_id) {
                throw new Error('Este agendamento já possui uma comanda aberta.');
            }

            // 2. Create comanda
            const comandaData = {
                client_id: appt.client_id,
                client_name: appt.clients?.name || 'Cliente',
                total: appt.services?.price || appt.price || 0,
                status: 'open',
                open_date: new Date().toISOString(),
                tenant_id: appt.tenant_id
            };

            const { data: newComanda, error: comandaError } = await supabase
                .from('comandas')
                .insert([comandaData])
                .select()
                .single();

            if (comandaError) throw comandaError;

            // 3. Add service as comanda_item
            const itemData = {
                comanda_id: newComanda.id,
                type: 'service',
                item_id: appt.service_id,
                name: appt.services?.name || 'Serviço',
                price: appt.services?.price || appt.price || 0,
                quantity: 1,
                barber_id: appt.barber_id,
                tenant_id: appt.tenant_id
            };

            const { error: itemError } = await supabase
                .from('comanda_items')
                .insert([itemData]);

            if (itemError) throw itemError;

            // 3.5 Add additional services as comanda_items
            if (appt.additional_services && Array.isArray(appt.additional_services)) {
                for (const extra of appt.additional_services) {
                    const extraItemData = {
                        comanda_id: newComanda.id,
                        type: 'service',
                        item_id: extra.service_id,
                        name: extra.name,
                        price: extra.price,
                        quantity: 1,
                        barber_id: appt.barber_id,
                        tenant_id: appt.tenant_id
                    };
                    const { error: extraError } = await supabase
                        .from('comanda_items')
                        .insert([extraItemData]);
                    if (extraError) throw extraError;
                }
            }

            // 4. Link comanda back to appointment
            const { error: linkError } = await supabase
                .from('appointments')
                .update({ comanda_id: newComanda.id })
                .eq('id', appointmentId);

            if (linkError) throw linkError;

            return {
                success: true,
                message: 'Comanda aberta com sucesso!',
                comandaId: newComanda.id
            };
        } catch (error: any) {
            console.error('Open Comanda Error:', error);
            return {
                success: false,
                message: error.message || 'Erro ao abrir comanda.'
            };
        }
    },

    async deleteAppointment(appointmentId: string): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointmentId);

            if (error) throw error;

            return { success: true, message: 'Agendamento excluído com sucesso.' };
        } catch (error: any) {
            console.error('Delete Error:', error);
            return { success: false, message: error.message || 'Erro ao excluir agendamento.' };
        }
    },

    async updateAppointment(appointmentId: string, data: any): Promise<{ success: boolean; message: string }> {
        try {
            const { error } = await supabase
                .from('appointments')
                .update(data)
                .eq('id', appointmentId);

            if (error) throw error;

            return { success: true, message: 'Agendamento atualizado com sucesso.' };
        } catch (error: any) {
            console.error('Update Error:', error);
            return { success: false, message: error.message || 'Erro ao atualizar agendamento.' };
        }
    },

    async checkAvailability(barberId: string, date: string, time: string, duration: number, excludeAppointmentId?: string): Promise<boolean> {
        // Calculate End Time
        const [hours, minutes] = time.split(':').map(Number);
        const startTotal = hours * 60 + minutes;
        const endTotal = startTotal + duration;

        // Fetch appointments for that day/barber
        let query = supabase
            .from('appointments')
            .select('start_time, end_time')
            .eq('barber_id', barberId)
            .eq('date', date)
            .neq('status', 'Cancelado');

        if (excludeAppointmentId) {
            query = query.neq('id', excludeAppointmentId);
        }

        const { data: appts } = await query;

        if (!appts) return true;

        // Check overlap
        for (const appt of appts) {
            const [appStartH, appStartM] = appt.start_time.split(':').map(Number);
            const [appEndH, appEndM] = appt.end_time.split(':').map(Number);

            const appStartTotal = appStartH * 60 + appStartM;
            const appEndTotal = appEndH * 60 + appEndM;

            // Overlap Condition: (StartA < EndB) and (EndA > StartB)
            if (startTotal < appEndTotal && endTotal > appStartTotal) {
                return false; // Conflict
            }
        }
        return true;
    }
};
