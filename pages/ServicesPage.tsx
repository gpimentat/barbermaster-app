import React, { useState, useEffect } from 'react';
import { Clock, Edit2, Trash2, Plus, X, Save, DollarSign, FileText, Ticket, Loader2 } from 'lucide-react';
import { Service } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const ServicesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        const mappedServices: Service[] = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price) || 0,
          durationMinutes: s.duration_minutes || 30,
          description: s.description || '',
          chips: Number(s.chips) || 0
        }));
        setServices(mappedServices);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddNew = () => {
    setSelectedService({
      id: '', // Empty for new
      name: '',
      price: 0,
      durationMinutes: 30,
      description: '',
      chips: 1
    });
    setIsDeleteConfirming(false);
  };

  const handleEdit = (service: Service) => {
    setSelectedService({ ...service });
    setIsDeleteConfirming(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('✅ Serviço excluído com sucesso!');
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert(`❌ Erro ao excluir: ${error.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    const dataToSave = {
      name: selectedService.name,
      price: selectedService.price,
      duration_minutes: selectedService.durationMinutes,
      description: selectedService.description,
      chips: selectedService.chips,
      tenant_id: currentUser?.tenantId
    };

    try {
      if (selectedService.id) {
        // Update
        const { error } = await supabase
          .from('services')
          .update(dataToSave)
          .eq('id', selectedService.id);
        if (error) throw error;
        alert('Serviço atualizado!');
      } else {
        // Insert
        const { error } = await supabase
          .from('services')
          .insert([dataToSave]);
        if (error) throw error;
        alert('Serviço cadastrado!');
      }

      setSelectedService(null);
      fetchServices();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const updateField = (field: keyof Service, value: any) => {
    if (selectedService) {
      setSelectedService({ ...selectedService, [field]: value });
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Serviços</h1>
          <p className="text-gray-400">Gerencie o catálogo de serviços oferecidos.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
        >
          <Plus size={20} />
          Novo Serviço
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>Carregando serviços...</p>
          </div>
        ) : services.length > 0 ? (
          services.map((service) => (
            <div key={service.id} className="bg-dark-900 p-6 rounded-xl border border-gray-800 hover:border-primary-500/50 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-full bg-gray-800 text-primary-500">
                  <Clock size={24} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
              <p className="text-gray-400 text-sm mb-4 h-10 line-clamp-2">{service.description}</p>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-primary-500 bg-primary-500/10 border border-primary-500/20 px-2 py-1 rounded-md flex items-center gap-1">
                  <Ticket size={12} /> {service.chips || 0} Fichas
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase">Preço</span>
                  <span className="text-lg font-bold text-white">R$ {service.price.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-500 uppercase">Duração</span>
                  <span className="text-lg font-medium text-gray-300">{service.durationMinutes} min</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center border border-dashed border-gray-800 rounded-xl text-gray-500">
            Nenhum serviço cadastrado. Clique em "Novo Serviço" para começar.
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">
                {services.some(s => s.id === selectedService.id) ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button
                onClick={() => setSelectedService(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">

              {/* Nome do Serviço */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  value={selectedService.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 placeholder-gray-600"
                  placeholder="Ex: Corte Degradê"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Preço */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Preço (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input
                      type="number"
                      step="0.01"
                      value={selectedService.price}
                      onChange={(e) => updateField('price', parseFloat(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Duração */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Duração (minutos)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                    <input
                      type="number"
                      step="5"
                      value={selectedService.durationMinutes}
                      onChange={(e) => updateField('durationMinutes', parseInt(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Fichas (Rateio de Assinatura) */}
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-800">
                <h3 className="text-xs font-bold text-primary-500 uppercase mb-2 flex items-center gap-2">
                  <Ticket size={14} /> Rateio de Assinaturas
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Quantidade de Fichas</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={selectedService.chips || 0}
                    onChange={(e) => updateField('chips', parseFloat(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    placeholder="Ex: 1.0"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Utilizado para calcular o repasse quando o serviço é realizado via plano de assinatura.
                  </p>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-500" size={16} />
                  <textarea
                    rows={3}
                    value={selectedService.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500 resize-none placeholder-gray-600"
                    placeholder="Detalhes sobre o serviço..."
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between w-full pt-4 border-t border-gray-800">
                {/* Delete Area */}
                <div>
                  {selectedService.id && (
                    isDeleteConfirming ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in">
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedService.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                          SIM, APAGAR
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeleteConfirming(false)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirming(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-bold rounded-lg transition-colors border border-red-500/20"
                      >
                        <Trash2 size={20} />
                        Excluir
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg"
                  >
                    <Save size={20} />
                    {selectedService.id ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
