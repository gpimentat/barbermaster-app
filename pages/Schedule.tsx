
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
            barber_id, client_id, service_id,
            clients (name),
            services (name, duration_minutes) -- Assuming services table exists
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
        service: { name: appt.services?.name, durationMinutes: appt.services?.duration_minutes },
        client: { name: appt.clients?.name },
        // Fallback for barber name from mock or context if needed, but we can verify role logic
      }));
      setAppointments(mapped);
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

  if (role === 'barber' && currentUser && !canViewAll) {
    displayAppointments = displayAppointments.filter(appt => appt.barberId === currentUser.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Agenda</h1>
          {role === 'barber' && !canViewAll && <p className="text-gray-500 text-sm">Visualizando apenas seus agendamentos.</p>}
        </div>

        {/* FIX: Botão de Novo Agendamento apenas para quem tem permissão */}
        {(role === 'admin' || role === 'super_admin' || role === 'receptionist' || currentUser?.permissions?.includes('manage_schedule')) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            <Plus size={20} />
            Novo Agendamento
          </button>
        )}
      </div>

      {/* Date Picker & Stats (Assume existing code here, omitted for brevity in replace if not targeted) */}
      <div className="flex items-center justify-between bg-dark-900 p-4 rounded-xl border border-gray-800">
        <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-primary-500" />
          <span className="text-xl font-bold text-white capitalize">{formatDate(selectedDate)}</span>
        </div>
        <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Timeline / Multi-column View */}
      <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[70vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">Agenda por Profissional</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div> Agendado
            <div className="w-3 h-3 rounded-full bg-green-500"></div> Concluído
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <div className="flex min-w-full" style={{ width: 'max-content' }}>
            {/* Seletor de Profissionais / Colunas */}
            {(() => {
              const filteredBarbers = (role === 'barber' && currentUser && !canViewAll
                ? barbers.filter(b => b.id === currentUser.id)
                : barbers.filter(b => b.active)
              );

              return filteredBarbers.map((barber) => {
                const barberAppts = displayAppointments.filter(a => a.barberId === barber.id);

                return (
                  <div key={barber.id} className="min-w-[280px] w-72 border-r border-gray-800 last:border-r-0 flex flex-col bg-gray-900/20">
                    {/* Header do Profissional */}
                    <div className="p-3 border-b border-gray-800 bg-gray-900/40 sticky top-0 z-10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-dark-950 font-bold overflow-hidden">
                        {barber.avatar ? (
                          <img src={barber.avatar} alt={barber.name} className="w-full h-full object-cover" />
                        ) : (
                          barber.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white truncate w-32">{barber.name}</h3>
                        <p className="text-[10px] text-gray-500">{barber.role}</p>
                      </div>
                      <div className="ml-auto text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                        {barberAppts.length}
                      </div>
                    </div>

                    {/* Lista de Agendamentos para o Profissional */}
                    <div className="p-2 space-y-2 flex-1">
                      {barberAppts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 opacity-30">
                          <User size={32} className="text-gray-600 mb-2" />
                          <span className="text-xs text-center px-4">Sem horários para hoje</span>
                        </div>
                      ) : (
                        barberAppts.map((appt) => (
                          <div
                            key={appt.id}
                            onClick={() => {
                              setSelectedAppointment(appt);
                              setIsDetailsModalOpen(true);
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${getStatusColor(appt.status)}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-bold">{appt.startTime}</span>
                              <span className="text-[10px] opacity-70">{appt.endTime}</span>
                            </div>
                            <h4 className="text-sm font-bold truncate mb-1">{appt.client?.name || 'Cliente'}</h4>
                            <div className="flex items-center gap-1 text-[10px] opacity-80">
                              <ScissorsIcon size={10} />
                              <span className="truncate">{appt.service?.name}</span>
                            </div>
                            <div className="mt-2 text-[10px] font-bold flex justify-between border-t border-current/20 pt-1">
                              <span>R$ {Number(appt.price || 0).toFixed(2)}</span>
                              <span>{appt.service?.durationMinutes} min</span>
                            </div>
                          </div>
                        ))
                      )}
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
