
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
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'Confirmado' })
                .eq('id', appointmentId);

            if (error) throw error;

            return { success: true, message: 'Agendamento confirmado com sucesso.' };
        } catch (error: any) {
            console.error('Confirm Error:', error);
            return { success: false, message: error.message || 'Erro ao confirmar agendamento.' };
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
    }
};
