
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
  const { role, currentUser } = useAuth();
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

      {/* Timeline / List View */}
      <div className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Agendamentos do Dia</h2>
        </div>

        <div className="divide-y divide-gray-800">
          {displayAppointments.map((appt) => (
            <div key={appt.id} className="p-4 hover:bg-gray-800/30 transition-colors group">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">

                {/* Time */}
                <div className="flex flex-col items-center min-w-[80px]">
                  <span className="text-xl font-bold text-white">{appt.startTime}</span>
                  <span className="text-sm text-gray-500">{appt.endTime}</span>
                </div>

                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-medium text-primary-100">{appt.client?.name || 'Cliente'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <ScissorsIcon size={14} />
                      <span>{appt.service?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="flex items-center gap-6 mt-2 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="block text-lg font-bold text-white">R$ {appt.price.toFixed(2)}</span>
                    <span className="text-xs text-gray-500">{appt.service?.durationMinutes} min</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAppointment(appt);
                      setIsDetailsModalOpen(true);
                    }}
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-700 transition-all"
                  >
                    Detalhes
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!loading && displayAppointments.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              {role === 'barber'
                ? 'Você não tem agendamentos para este dia.'
                : 'Nenhum agendamento na barbearia para este dia.'}
            </div>
          )}

          {loading && (
            <div className="p-12 text-center text-gray-500">Carregando agenda...</div>
          )}
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
