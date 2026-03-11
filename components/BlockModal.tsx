import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, User, Trash2 } from 'lucide-react';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

interface BlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedDate: Date;
}

const BlockModal: React.FC<BlockModalProps> = ({ isOpen, onClose, onSuccess, selectedDate }) => {
    const { currentUser, barbers, role } = useAuth();

    const [formData, setFormData] = useState({
        barber_id: currentUser?.id || '',
        date: selectedDate.toISOString().split('T')[0],
        start_time: '12:00',
        end_time: '13:00',
        reason: 'Almoço'
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const offset = selectedDate.getTimezoneOffset() * 60000;
            const dateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];
            setFormData(prev => ({
                ...prev,
                date: dateStr,
                // Set default barber to first available if not current user
                barber_id: (role === 'barber' ? currentUser?.id : (barbers[0]?.id || '')) as string
            }));
        }
    }, [isOpen, selectedDate, currentUser, role, barbers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('schedule_blocks')
                .insert([{
                    tenant_id: currentUser?.tenantId,
                    barber_id: formData.barber_id,
                    date: formData.date,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    reason: formData.reason
                }]);

            if (error) throw error;

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao criar bloqueio: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const canSelectBarber = role === 'admin' || role === 'super_admin' || role === 'receptionist';
    const availableBarbers = barbers.filter(b => b.active);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-dark-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-800/20">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Clock size={24} className="text-gray-400" />
                        Adicionar Bloqueio
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors bg-dark-900 rounded-xl hover:bg-gray-800">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {canSelectBarber && (
                        <div>
                            <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1">
                                <User size={14} /> Profissional
                            </label>
                            <select
                                name="barber_id"
                                value={formData.barber_id}
                                onChange={handleChange}
                                required
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-500 transition-colors"
                            >
                                <option value="">Selecione...</option>
                                {availableBarbers.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1">
                            <Calendar size={14} /> Data
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-500 transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Início</label>
                            <input
                                type="time"
                                name="start_time"
                                value={formData.start_time}
                                onChange={handleChange}
                                required
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-black text-lg focus:outline-none focus:border-gray-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest">Fim</label>
                            <input
                                type="time"
                                name="end_time"
                                value={formData.end_time}
                                onChange={handleChange}
                                required
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-black text-lg focus:outline-none focus:border-gray-500 transition-colors"
                                min={formData.start_time}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-widest flex items-center gap-1">
                            <FileText size={14} /> Motivo / Título
                        </label>
                        <input
                            type="text"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            required
                            placeholder="Ex: Almoço, Imprevisto, Médico..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gray-500 transition-colors placeholder-gray-600"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-gray-400 hover:text-white font-black text-xs uppercase tracking-widest transition-colors rounded-xl hover:bg-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-gray-200 hover:bg-white text-dark-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-white/5 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Bloqueio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BlockModal;
