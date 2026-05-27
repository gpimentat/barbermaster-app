
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

  const getStatusColor = (status: AppointmentStatus | string) => {
    switch (status) {
      case 'Concluído':
      case AppointmentStatus.COMPLETED: return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Confirmado': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Agendado':
      case AppointmentStatus.SCHEDULED: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Cancelado':
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
  const [tenantHours, setTenantHours] = useState<any>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const offset = selectedDate.getTimezoneOffset() * 60000;
      const dateStr = new Date(selectedDate.getTime() - offset).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
              id, date, start_time, end_time, status, price,
              barber_id, client_id, service_id, comanda_id,
              additional_services, duration_override,
              clients (name),
              services (name, duration_minutes, price)
          `)
        .eq('date', dateStr)
        .order('start_time');

      if (data) {
        const mapped = data.map((appt: any) => ({
          id: appt.id,
          startTime: appt.start_time?.slice(0, 5) || '00:00',
          endTime: appt.end_time?.slice(0, 5) || '00:00',
          status: appt.status,
          price: appt.price,
          barberId: appt.barber_id,
          comanda_id: appt.comanda_id,
          additional_services: appt.additional_services,
          duration_override: appt.duration_override,
          service: {
            name: Array.isArray(appt.services) ? appt.services[0]?.name : appt.services?.name,
            durationMinutes: Array.isArray(appt.services) ? appt.services[0]?.duration_minutes : appt.services?.duration_minutes,
            price: Array.isArray(appt.services) ? appt.services[0]?.price : appt.services?.price
          },
          client: { name: Array.isArray(appt.clients) ? appt.clients[0]?.name : appt.clients?.name },
        }));
        setAppointments(mapped);
      }

      const { data: blocksData } = await supabase
        .from('schedule_blocks')
        .select('*')
        .eq('date', dateStr);

      if (blocksData) {
        setScheduleBlocks(blocksData);
      }

      if (currentUser?.tenantId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('settings')
          .eq('id', currentUser.tenantId)
          .single();
        if (tenant?.settings?.app_config?.hours) {
          setTenantHours(tenant.settings.app_config.hours);
        }
      }

    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
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

        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-dark-950/20 relative">
          
          {(() => {
            if (!tenantHours || !Array.isArray(tenantHours)) return null;
            const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const currentDayStr = daysOfWeek[selectedDate.getDay()];
            const dayConfig = tenantHours.find((h: any) => h.day === currentDayStr);
            const isClosed = dayConfig ? dayConfig.isOpen === false : false;

            if (isClosed) {
              return (
                <div className="absolute inset-0 z-50 bg-dark-950/80 backdrop-blur-md flex flex-col items-center justify-center pt-20">
                  <div className="p-8 bg-gray-800/50 rounded-[2rem] border border-gray-700/50 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center border border-gray-700 shadow-inner">
                      <span className="text-4xl filter grayscale">🚪</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-xl font-black text-white tracking-widest uppercase mb-2">Barbearia Fechada</span>
                      <span className="block text-sm text-gray-500 font-bold tracking-wider uppercase">Não há expediente neste dia</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="flex min-w-full h-full" style={{ width: 'max-content' }}>
            {(() => {
              const filteredBarbers = (role === 'barber' && currentUser && !canViewAll
                ? barbers.filter(b => b.id === currentUser.id)
                : barbers.filter(b => b.active)
              );

              return filteredBarbers.map((barber) => {
                const barberAppts = displayAppointments.filter(a => a.barberId === barber.id);

                // Check days off for visual block
                const dateString = selectedDate.toISOString().split('T')[0];
                const dateObj = new Date(dateString + 'T12:00:00Z');
                const dayOfWeek = dateObj.getUTCDay();
                const config = barber.workSettings?.daysOff?.[dayOfWeek];
                
                let isOff = false;
                if (config) {
                  if (config === 'all') isOff = true;
                  if (config === 'alternate') {
                    const target = new Date(dateObj.valueOf());
                    const dayNr = (target.getUTCDay() + 6) % 7;
                    target.setUTCDate(target.getUTCDate() - dayNr + 3);
                    const firstThursday = target.valueOf();
                    target.setUTCMonth(0, 1);
                    if (target.getUTCDay() !== 4) {
                        target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
                    }
                    const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
                    if (weekNum % 2 === 0) isOff = true;
                  }
                }

                return (
                  <div key={barber.id} className="min-w-[280px] md:min-w-[320px] w-72 md:w-80 border-r border-gray-800/30 last:border-r-0 flex flex-col group/col">
                    {/* Header do Profissional - Premium Stick */}
                    <div className="p-5 border-b border-gray-800/30 bg-dark-900/80 sticky top-0 z-10 flex items-center gap-4 backdrop-blur-md group-hover/col:bg-dark-900 transition-colors">
                      <div className={`w-12 h-12 rounded-2xl bg-dark-950 border border-gray-800 flex items-center justify-center font-black overflow-hidden shadow-2xl relative ${isOff ? 'text-gray-600 grayscale' : 'text-primary-500'}`}>
                        {barber.avatar ? (
                          <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{(barber.name || 'P').charAt(0).toUpperCase()}</span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-white truncate uppercase tracking-tight leading-none mb-1">{(barber.name || 'Profissional').split(' ')[0]}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">{barber.role}</p>
                      </div>
                      <div className="text-[10px] px-3 py-1 bg-dark-950 rounded-xl text-primary-500 font-black border border-gray-800/50 shadow-inner">
                        {barberAppts.length} slots
                      </div>
                    </div>

                    {/* Lista de Agendamentos - Grid Based */}
                    <div className="relative flex-1 overflow-y-auto custom-scrollbar bg-dark-950/30">
                      
                      {isOff && (
                        <div className="absolute inset-0 z-10 bg-dark-950/80 backdrop-blur-sm flex flex-col items-center justify-center" style={{ pointerEvents: 'all' }}>
                          <div className="p-5 bg-gray-800/50 rounded-[2rem] border border-gray-700/50 flex flex-col items-center gap-4 shadow-2xl backdrop-blur-lg transform -translate-y-20">
                            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center border border-gray-700 shadow-inner">
                              <span className="text-3xl filter grayscale opacity-80">😴</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-sm font-black text-gray-400 tracking-widest uppercase mb-1">Folga</span>
                              <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Agenda Bloqueada</span>
                            </div>
                          </div>
                        </div>
                      )}

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
                          const [h, m] = (appt.startTime || '07:00').split(':').map(Number);
                          const startMins = (h - 7) * 60 + m; // Starts at 07:00
                          
                          const [endH, endM] = (appt.endTime || '08:00').split(':').map(Number);
                          let durationMins = (endH * 60 + endM) - (h * 60 + m);
                          if (durationMins <= 0) durationMins = appt.service?.durationMinutes || 60;

                          const top = (startMins / 60) * 120;
                          const height = (Math.max(durationMins, 15) / 60) * 120;

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
                                appt.status === 'Confirmado' ? 'bg-emerald-500' :
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
                          const [startH, startM] = (block.start_time || '00:00').split(':').map(Number);
                          const [endH, endM] = (block.end_time || '00:00').split(':').map(Number);

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
                                  {(block.start_time || '00:00').slice(0, 5)} - {(block.end_time || '00:00').slice(0, 5)}
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
