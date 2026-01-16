
import React, { useState } from 'react';
import { X, Calendar, Clock, User, Scissors, AlertTriangle, CheckCircle } from 'lucide-react';
import { appointmentService } from '../src/services/appointmentService';
import { supabase } from '../src/supabaseClient';

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: any; // Using any for flexibility with the enriched object from Schedule
    onUpdate: () => void; // Trigger refresh
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({ isOpen, onClose, appointment, onUpdate }) => {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isEditingService, setIsEditingService] = useState(false);
    const [services, setServices] = useState<any[]>([]);
    const [cancelReason, setCancelReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultMsg, setResultMsg] = useState<any>(null);

    // Fetch services when modal opens
    React.useEffect(() => {
        if (isOpen) {
            fetchServices();
        }
    }, [isOpen]);

    const fetchServices = async () => {
        const { data } = await supabase.from('services').select('*');
        if (data) setServices(data);
    };

    if (!isOpen || !appointment) return null;

    const handleConfirm = async () => {
        setLoading(true);
        const result = await appointmentService.confirmAppointment(appointment.id);
        setLoading(false);
        if (result.success) {
            onUpdate();
            onClose();
        } else {
            alert(result.message);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) return;
        setLoading(true);
        const result = await appointmentService.deleteAppointment(appointment.id);
        setLoading(false);
        if (result.success) {
            onUpdate();
            onClose();
        } else {
            alert(result.message);
        }
    };

    const handleUpdateService = async (serviceId: string) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        setLoading(true);
        const result = await appointmentService.updateAppointment(appointment.id, {
            service_id: serviceId,
            price: service.price
        });
        setLoading(false);

        if (result.success) {
            setIsEditingService(false);
            onUpdate();
            onClose(); // Close to refresh the object prop
        } else {
            alert(result.message);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            alert('Por favor, informe o motivo do cancelamento.');
            return;
        }
        setLoading(true);
        const result = await appointmentService.cancelAppointment(appointment.id, cancelReason);
        setLoading(false);

        if (result.success) {
            setResultMsg(result);
            setIsCancelling(false);
            // Don't close immediately so user sees the waitlist msg
        } else {
            alert(result.message);
        }
    };

    const handleClose = () => {
        setResultMsg(null);
        setIsCancelling(false);
        setCancelReason('');
        if (resultMsg?.success) onUpdate(); // Refresh on close if something changed
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden">
                {!resultMsg ? (
                    <>
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                            <h3 className="text-xl font-bold text-white">Detalhes do Agendamento</h3>
                            <button onClick={handleClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <User className="text-primary-500" size={20} />
                                    <div>
                                        <p className="text-xs text-gray-500">Cliente</p>
                                        <p className="font-bold text-white">{appointment.client?.name || 'Cliente'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <Scissors className="text-primary-500" size={20} />
                                    <div>
                                        <p className="text-xs text-gray-500">Serviço</p>
                                        <p className="font-bold text-white">{appointment.service?.name || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <Clock className="text-primary-500" size={20} />
                                    <div>
                                        <p className="text-xs text-gray-500">Horário</p>
                                        <p className="font-bold text-white">{appointment.startTime} - {appointment.endTime}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <AlertTriangle size={20} className={appointment.status === 'Cancelado' ? 'text-red-500' : 'text-green-500'} />
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        <p className={`font-bold ${appointment.status === 'Cancelado' ? 'text-red-400' : 'text-green-400'}`}>{appointment.status}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {appointment.status !== 'Cancelado' && !isCancelling && !isEditingService && (
                                <div className="grid grid-cols-2 gap-3">
                                    {appointment.status !== 'Confirmado' ? (
                                        <button
                                            onClick={handleConfirm}
                                            disabled={loading}
                                            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                        >
                                            <CheckCircle size={18} /> Confirmar
                                        </button>
                                    ) : (
                                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-lg font-bold flex items-center justify-center gap-2">
                                            <CheckCircle size={18} /> Confirmado
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setIsEditingService(true)}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/30 p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    >
                                        <Scissors size={18} /> Alterar Serviço
                                    </button>

                                    <button
                                        onClick={() => setIsCancelling(true)}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    >
                                        <AlertTriangle size={18} /> Cancelar
                                    </button>

                                    <button
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-600/30 p-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                                    >
                                        <X size={18} /> Excluir
                                    </button>
                                </div>
                            )}

                            {/* Service Management */}
                            {isEditingService && (
                                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg animate-in slide-in-from-bottom-2">
                                    <p className="text-sm text-blue-200 mb-3 font-bold">Selecionar novo serviço:</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {services.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => handleUpdateService(s.id)}
                                                className={`w-full text-left p-2 rounded text-sm transition-colors ${appointment.service_id === s.id ? 'bg-primary-500 text-dark-950 font-bold' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span>{s.name}</span>
                                                    <span className="opacity-70">R$ {s.price}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setIsEditingService(false)}
                                        className="w-full mt-4 py-2 text-gray-400 hover:text-white text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {/* Cancellation Form */}
                            {isCancelling && (
                                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-lg animate-in slide-in-from-bottom-2">
                                    <p className="text-sm text-red-200 mb-2 font-bold">Motivo do cancelamento:</p>
                                    <textarea
                                        value={cancelReason}
                                        onChange={e => setCancelReason(e.target.value)}
                                        className="w-full bg-dark-950 border border-red-500/30 rounded p-2 text-white text-sm mb-3 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                        placeholder="Ex: Cliente imprevisto..."
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            disabled={loading}
                                            className="flex-1 bg-red-600 hover:bg-red-500 text-white p-2 rounded font-bold text-sm disabled:opacity-50"
                                        >
                                            {loading ? 'Processando...' : 'Confirmar Cancelamento'}
                                        </button>
                                        <button
                                            onClick={() => setIsCancelling(false)}
                                            className="px-3 py-2 bg-gray-700 text-white rounded font-bold text-sm hover:bg-gray-600"
                                        >
                                            Voltar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // Result View
                    <div className="p-8 text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Agendamento Cancelado</h3>
                        <p className="text-gray-400 text-sm mb-6">{resultMsg.message}</p>

                        {resultMsg.waitlistTriggered && resultMsg.nextClient && (
                            <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-xl text-left mb-6">
                                <p className="text-blue-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Fila de Espera Recomendada</p>
                                <p className="text-white text-sm">O cliente <strong>{resultMsg.nextClient.name}</strong> está aguardando por este horário!</p>
                                <a
                                    href={`https://wa.me/${resultMsg.nextClient.phone.replace(/\D/g, '')}?text=Olá ${resultMsg.nextClient.name}, surgiu uma vaga para ${resultMsg.nextClient.serviceName} no horário que você queria! Vamos agendar?`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-3 block text-center bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold text-sm transition-colors"
                                >
                                    Chamar no WhatsApp
                                </a>
                            </div>
                        )}

                        <button onClick={handleClose} className="w-full bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg font-bold">
                            Fechar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppointmentDetailsModal;
