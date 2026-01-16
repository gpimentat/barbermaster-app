import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../src/supabaseClient';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { appointmentService } from '../src/services/appointmentService';

const AppointmentActionPage: React.FC = () => {
    const { id, action } = useParams<{ id: string; action: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        handleAction();
    }, [id, action]);

    const handleAction = async () => {
        if (!id || !action) {
            setStatus('error');
            setMessage('Link inválido.');
            return;
        }

        try {
            // 1. Fetch Appointment to get client name for friendly message
            const { data: appt, error: fetchError } = await supabase
                .from('appointments')
                .select('*, clients(name)')
                .eq('id', id)
                .single();

            if (fetchError || !appt) throw new Error('Agendamento não encontrado.');

            if (action === 'confirm') {
                const { error } = await supabase
                    .from('appointments')
                    .update({ status: 'Confirmado' })
                    .eq('id', id);
                if (error) throw error;
                setMessage(`Obrigado ${appt.clients?.name || ''}! Seu agendamento foi confirmado.`);
                setStatus('success');
            }
            else if (action === 'cancel') {
                // Use the shared service
                const result = await appointmentService.cancelAppointment(id, 'Cancelado pelo Cliente via Link');

                if (!result.success) {
                    throw new Error(result.message);
                }

                setMessage(result.message || 'Agendamento cancelado. Uma pena não podermos te atender desta vez.');
                setStatus('success');

                if (result.waitlistTriggered && result.nextClient) {
                    console.log("WAITLIST ALERT: Client waiting!", result.nextClient);
                }
            }
            else {
                throw new Error('Ação desconhecida.');
            }

        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(err.message || 'Erro ao processar sua solicitação.');
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
            <div className="bg-dark-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">

                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 size={48} className="text-primary-500 animate-spin" />
                        <h2 className="text-xl font-bold text-white">Processando...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                        {action === 'confirm' ? (
                            <CheckCircle size={64} className="text-green-500" />
                        ) : (
                            <CheckCircle size={64} className="text-gray-400" />
                        )}
                        <h2 className="text-2xl font-bold text-white">
                            {action === 'confirm' ? 'Confirmado!' : 'Cancelado'}
                        </h2>
                        <p className="text-gray-400">{message}</p>
                        {action === 'cancel' && (
                            <div className="mt-4 bg-gray-800 p-4 rounded-lg text-sm text-gray-300">
                                <p>Precisa reagendar?</p>
                                <button onClick={() => navigate('/')} className="text-primary-500 font-bold hover:underline mt-1">
                                    Voltar para o site
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 animate-in shake duration-300">
                        <AlertTriangle size={64} className="text-red-500" />
                        <h2 className="text-2xl font-bold text-white">Ops!</h2>
                        <p className="text-gray-400">{message}</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AppointmentActionPage;
