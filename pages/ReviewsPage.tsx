
import React, { useState, useEffect } from 'react';
import { Star, Check, X, Trash2, MessageCircle, Clock, Search, Filter, Camera } from 'lucide-react';
import { useAuth } from '../AuthContext';
import reviewService, { Review } from '../src/services/reviewService';

const ReviewsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser?.tenantId) {
            loadReviews();
        }
    }, [currentUser]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const data = await reviewService.getAllReviews(currentUser!.tenantId);
            setReviews(data);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await reviewService.updateReviewStatus(id, status);
            setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta avaliação permanentemente?')) return;
        try {
            await reviewService.deleteReview(id);
            setReviews(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting review:', error);
            alert('Erro ao excluir avaliação.');
        }
    };

    const filteredReviews = reviews.filter(r => {
        const matchesSearch = r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.comment.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' ? true : r.status === filter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Avaliações <span className="text-primary-500">dos Clientes</span></h1>
                    <p className="text-gray-400 text-sm">Gerencie o feedback e as fotos enviadas pelos seus clientes.</p>
                </div>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou comentário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-dark-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-all font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f
                                    ? 'bg-primary-500 text-dark-950 shadow-lg shadow-primary-500/20'
                                    : 'bg-dark-900 text-gray-500 border border-gray-800 hover:border-gray-600'
                                }`}
                        >
                            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : f === 'rejected' ? 'Rejeitadas' : 'Todas'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
                </div>
            ) : filteredReviews.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {filteredReviews.map((review) => (
                        <div
                            key={review.id}
                            className={`bg-dark-900 border rounded-2xl p-6 shadow-xl transition-all hover:border-gray-700 relative overflow-hidden group ${review.status === 'pending' ? 'border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent' : 'border-gray-800'
                                }`}
                        >
                            <div className="flex gap-6">
                                {/* Foto do Review (se houver) */}
                                {review.photo_url && (
                                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gray-800 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(review.photo_url!, '_blank')}>
                                        <img src={review.photo_url} className="w-full h-full object-cover" alt="Corte do cliente" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Camera size={16} className="text-white" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="text-white font-black uppercase text-sm tracking-tight">{review.client_name}</h3>
                                            <div className="flex gap-0.5 my-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={12}
                                                        fill={i < review.rating ? "#eab308" : "none"}
                                                        stroke={i < review.rating ? "#eab308" : "#374151"}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>

                                    <p className="text-gray-400 text-sm leading-relaxed mb-4 italic">
                                        "{review.comment}"
                                    </p>

                                    <div className="flex items-center gap-2">
                                        {review.status === 'pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(review.id, 'approved')}
                                                    className="flex-1 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-dark-950 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-green-500/30 flex items-center justify-center gap-2"
                                                >
                                                    <Check size={14} /> Aprovar
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(review.id, 'rejected')}
                                                    className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30 flex items-center justify-center gap-2"
                                                >
                                                    <X size={14} /> Rejeitar
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${review.status === 'approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                    }`}>
                                                    {review.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                                                </span>
                                                <button
                                                    onClick={() => handleDelete(review.id)}
                                                    className="text-gray-600 hover:text-red-500 p-2 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 rounded-3xl border border-dashed border-gray-800">
                    <MessageCircle size={48} className="text-gray-700 mb-4" />
                    <p className="text-gray-500 font-bold">Nenhuma avaliação encontrada.</p>
                </div>
            )}
        </div>
    );
};

export default ReviewsPage;
