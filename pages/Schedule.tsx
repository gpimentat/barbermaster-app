
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react';
import { AppointmentStatus, Appointment } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../src/supabaseClient'; // Adjusted path
import AppointmentModal from '../components/AppointmentModal';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import BlockModal from '../components/BlockModal';
import { MOCK_BARBERS, MOCK_SERVICES, MOCK_CLIENTS } from '../constants';

const Schedule: React.FC = () => {
  const { role, currentUser, barbers } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Helper to format date like "Segunda, 26 de Outubro"
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case AppointmentStatus.COMPLETED: return 'bg-green-500/10 text-green-500 border-green-500/20';
      case AppointmentStatus.SCHEDULED: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case AppointmentStatus.CANCELED: return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    // Fetch appointments for the selected date
    // Note: In a real app we would join tables, here we might fetch and map manually for simplicity like ClientsPage
    // But let's try a join for cleaner code
    // Fix Timezone Issue: Use local date instead of UTC
    const offset = selectedDate.getTimezoneOffset() * 60000;
    const dateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select(`
            id, date, start_time, end_time, status, price,
            barber_id, client_id, service_id, comanda_id,
            additional_services, duration_override,
            clients (name),
            services (name, duration_minutes, price) -- Assuming services table exists
        `) // removed barbers join for now to avoid complexity if RLS issues, using context
      .eq('date', dateStr)
      .order('start_time');

    if (data) {
      // Map to enriched format
      const mapped = data.map((appt: any) => ({
        id: appt.id,
        startTime: appt.start_time.slice(0, 5),
        endTime: appt.end_time.slice(0, 5),
        status: appt.status,
        price: appt.price,
        barberId: appt.barber_id,
        comanda_id: appt.comanda_id,
        additional_services: appt.additional_services,
        duration_override: appt.duration_override,
        service: {
          name: appt.services?.name,
          durationMinutes: appt.services?.duration_minutes,
          price: appt.services?.price
        },
        client: { name: appt.clients?.name },
        // Fallback for barber name from mock or context if needed, but we can verify role logic
      }));
      setAppointments(mapped);
    }

    // Fetch schedule blocks
    const { data: blocksData, error: blocksError } = await supabase
      .from('schedule_blocks')
      .select('*')
      .eq('date', dateStr);

    if (blocksData) {
      setScheduleBlocks(blocksData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();

    const subscription = supabase
      .channel('appointments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedDate, currentUser]);

  // Filter Logic
  // FIX: Se for barbeiro, só filtra se NÃO tiver permissão de ver tudo
  // Se tiver 'view_full_schedule', vê tudo igual admin
  let displayAppointments = appointments;

  // Função auxiliar para checar permissão localmente se não estiver no context
  const canViewAll = role === 'admin' || role === 'super_admin' || role === 'receptionist' || (currentUser?.permissions?.includes('view_full_schedule'));
  const canManageBlocks = role === 'admin' || role === 'super_admin' || currentUser?.permissions?.includes('manage_schedule_blocks');

  if (role === 'barber' && currentUser && !canViewAll) {
    displayAppointments = displayAppointments.filter(appt => appt.barberId === currentUser.id);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Agenda 📅</h1>
          {role === 'barber' && !canViewAll && (
            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Visualizando seus atendimentos</p>
          )}
        </div>

        {/* Botões - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 w-full md:w-auto">
          {canManageBlocks && (
            <button
              onClick={() => setIsBlockModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-6 py-4 md:py-3 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 text-[10px]"
            >
              <Clock size={16} strokeWidth={3} />
              Bloquear Horário
            </button>
          )}

          {(role === 'admin' || role === 'super_admin' || role === 'receptionist' || currentUser?.permissions?.includes('manage_schedule')) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-3 bg-primary-500 hover:bg-primary-600 text-dark-950 px-8 py-4 md:py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-500/20 active:scale-95 text-[11px]"
            >
              <Plus size={20} strokeWidth={3} />
              Novo Agendamento
            </button>
          )}
        </div>
      </div>

      {/* Date Picker - Premium Selector */}
      <div className="flex items-center justify-between bg-dark-900/50 p-4 md:p-6 rounded-[2rem] border border-gray-800/50 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
          className="p-3 md:p-4 hover:bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-90 border border-transparent hover:border-gray-700"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <CalendarIcon size={18} className="text-primary-500" />
            <span className="text-sm md:text-lg font-black text-white uppercase tracking-tighter">{formatDate(selectedDate)}</span>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Navegação Temporal</p>
        </div>
        <button
          onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
          className="p-3 md:p-4 hover:bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-90 border border-transparent hover:border-gray-700"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Timeline / Multi-column View - Professional Layout */}
      <div className="bg-dark-900/40 rounded-[3rem] border border-gray-800/50 overflow-hidden flex flex-col h-[75vh] shadow-3xl">
        <div className="p-6 md:p-8 border-b border-gray-800/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-dark-900/60 backdrop-blur-md">
          <h2 className="text-sm md:text-base font-black text-white uppercase tracking-tight flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
            Fluxo de Trabalho
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div> Agendado
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> Concluído
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-dark-950/20">
          <div className="flex min-w-full h-full" style={{ width: 'max-content' }}>
            {(() => {
              const filteredBarbers = (role === 'barber' && currentUser && !canViewAll
                ? barbers.filter(b => b.id === currentUser.id)
                : barbers.filter(b => b.active)
              );

              return filteredBarbers.map((barber) => {
                const barberAppts = displayAppointments.filter(a => a.barberId === barber.id);

                return (
                  <div key={barber.id} className="min-w-[280px] md:min-w-[320px] w-72 md:w-80 border-r border-gray-800/30 last:border-r-0 flex flex-col group/col">
                    {/* Header do Profissional - Premium Stick */}
                    <div className="p-5 border-b border-gray-800/30 bg-dark-900/80 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md group-hover/col:bg-dark-900 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-dark-950 border border-gray-800 flex items-center justify-center text-primary-500 font-black overflow-hidden shadow-2xl relative">
                        {barber.avatar ? (
                          <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{barber.name.charAt(0).toUpperCase()}</span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-white truncate uppercase tracking-tight leading-none mb-1">{barber.name.split(' ')[0]}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">{barber.role}</p>
                      </div>
                      <div className="text-[10px] px-3 py-1 bg-dark-950 rounded-xl text-primary-500 font-black border border-gray-800/50 shadow-inner">
                        {barberAppts.length} slots
                      </div>
                    </div>

                    {/* Lista de Agendamentos - Grid Based */}
                    <div className="relative flex-1 overflow-y-auto custom-scrollbar bg-dark-950/30">
                      {/* Background Time Slots */}
                      <div className="absolute inset-0 min-h-[1680px]"> {/* 14 hours * 120px */}
                        {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                          <div key={hour} className="h-[120px] border-b border-gray-800/30 w-full flex items-start p-2 relative">
                            <span className="text-[10px] font-black text-gray-500 w-10 text-right pr-2 select-none">
                              {hour.toString().padStart(2, '0')}:00
                            </span>
                            <div className="absolute left-10 top-0 bottom-0 w-px bg-gray-800/30" />
                          </div>
                        ))}
                      </div>

                      {/* Appointments */}
                      <div className="absolute inset-0 left-10 pointer-events-none pb-4">
                        {barberAppts.map((appt) => {
                          const [h, m] = appt.startTime.split(':').map(Number);
                          const startMins = (h - 7) * 60 + m; // Starts at 07:00
                          const top = (startMins / 60) * 120;
                          const height = (Math.max(appt.service?.durationMinutes || 60, 15) / 60) * 120;

                          return (
                            <div
                              key={appt.id}
                              style={{ top: `${top}px`, height: `${height - 4}px` }}
                              onClick={() => {
                                setSelectedAppointment(appt);
                                setIsDetailsModalOpen(true);
                              }}
                              className="absolute left-2 right-2 rounded-xl border border-gray-700/50 cursor-pointer pointer-events-auto transition-all hover:scale-[1.02] shadow-lg group overflow-hidden bg-dark-900 z-10 hover:border-primary-500/50 flex flex-col p-3"
                            >
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${appt.status === 'Concluído' ? 'bg-green-500' :
                                appt.status === 'Agendado' ? 'bg-blue-500' : 'bg-gray-700'
                                }`} />

                              <div className="flex justify-between items-start mb-1">
                                <div className="text-[10px] font-black text-gray-400">
                                  {appt.startTime} - {appt.endTime}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getStatusColor(appt.status)}`}>
                                  {appt.status}
                                </span>
                              </div>

                              <h4 className="text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-primary-500 transition-colors">
                                {appt.client?.name || 'Cliente Particular'}
                              </h4>

                              <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-auto">
                                <ScissorsIcon size={10} />
                                <span className="truncate">{appt.service?.name}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Render Schedule Blocks */}
                        {scheduleBlocks.filter(b => b.barber_id === barber.id).map((block) => {
                          const [startH, startM] = block.start_time.split(':').map(Number);
                          const [endH, endM] = block.end_time.split(':').map(Number);

                          const startMins = (startH - 7) * 60 + startM;
                          const durationMins = (endH * 60 + endM) - (startH * 60 + startM);

                          const top = (startMins / 60) * 120;
                          const height = (Math.max(durationMins, 15) / 60) * 120;

                          return (
                            <div
                              key={block.id}
                              style={{ top: `${top}px`, height: `${height - 4}px` }}
                              className="absolute left-2 right-2 rounded-xl border border-gray-700/50 cursor-pointer pointer-events-auto transition-all shadow-lg group overflow-hidden bg-gray-900/80 z-20 flex flex-col p-3 backdrop-blur-sm"
                              title="Clique para excluir bloqueio (Administradores)"
                              onClick={async () => {
                                if (canManageBlocks && window.confirm(`Deseja excluir o bloqueio "${block.reason}"?`)) {
                                  await supabase.from('schedule_blocks').delete().eq('id', block.id);
                                  fetchAppointments();
                                }
                              }}
                            >
                              {/* Striping pattern for visual distinction */}
                              <div className="absolute inset-0 opacity-10"
                                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff 10px, #ffffff 20px)' }}
                              />

                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600" />

                              <div className="relative z-10 flex flex-col h-full">
                                <div className="text-[10px] font-black text-gray-400 mb-1">
                                  {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                                </div>
                                <h4 className="text-sm font-black text-gray-300 truncate uppercase tracking-tight">
                                  {block.reason}
                                </h4>
                                <div className="mt-auto flex items-center gap-1">
                                  <Clock size={10} className="text-gray-500" />
                                  <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Bloqueio Interno</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAppointments}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAppointment}
        onUpdate={fetchAppointments}
      />

      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onSuccess={fetchAppointments}
        selectedDate={selectedDate}
      />
    </div>
  );
};

// Helper icon component
const ScissorsIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

export default Schedule;
