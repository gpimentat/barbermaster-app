import React, { useState, useEffect } from 'react';
import { Star, Camera, Send, ChevronLeft, Image as ImageIcon, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clientService from '../../src/services/clientService';

interface ClientFeedbackProps {
    tenant: any;
    clientData: any;
}

const ClientFeedback: React.FC<ClientFeedbackProps> = ({ tenant, clientData }) => {
    const navigate = useNavigate();
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [myReviews, setMyReviews] = useState<any[]>([]);
    const [fetchingHistory, setFetchingHistory] = useState(true);

    const primaryColor = tenant?.settings?.app_config?.general?.primaryColor || '#eab308';

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const reviews = await clientService.getMyReviews(clientData.clientId);
            setMyReviews(reviews);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setFetchingHistory(false);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rating) return;

        setLoading(true);
        try {
            await clientService.submitReview({
                tenantId: tenant.id,
                clientId: clientData.clientId,
                clientName: clientData.name,
                rating,
                comment,
                photoFile: photo || undefined
            });

            alert('✅ Feedback enviado com sucesso! Ele aparecerá para outros clientes após a aprovação do barbeiro.');
            setRating(5);
            setComment('');
            setPhoto(null);
            setPhotoPreview(null);
            loadHistory();
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Erro ao enviar feedback. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header Fixo */}
            <div className="fixed top-0 left-0 right-0 bg-gray-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 z-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center border border-white/5">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-lg font-black uppercase tracking-tighter">Feedback</h1>
                </div>
            </div>

            <div className="pt-24 pb-20 px-6 max-w-lg mx-auto space-y-8">
                {/* Formulário */}
                <div className="bg-gray-900/40 rounded-[2rem] p-8 border border-white/5 shadow-2xl">
                    <h2 className="text-xl font-bold mb-2">Como foi sua experiência?</h2>
                    <p className="text-gray-500 text-xs mb-8">Sua opinião nos ajuda a evoluir e as fotos inspiram outros clientes!</p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Estrelas */}
                        <div className="flex items-center justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="transition-all duration-300 transform active:scale-125"
                                >
                                    <Star
                                        size={36}
                                        fill={star <= rating ? primaryColor : 'transparent'}
                                        className={star <= rating ? 'text-primary-500' : 'text-gray-800'}
                                        style={{ color: star <= rating ? primaryColor : undefined }}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Comentário */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500">Comentário</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="O que você mais gostou no serviço?"
                                className="w-full bg-gray-800/50 border border-white/5 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary-500 transition-colors h-32 resize-none"
                            />
                        </div>

                        {/* Upload de Foto */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500">Foto do Corte (Opcional)</label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    id="photo-upload"
                                />
                                <label
                                    htmlFor="photo-upload"
                                    className={`flex flex-col items-center justify-center w-full h-48 rounded-3xl border-2 border-dashed transition-all duration-500 cursor-pointer overflow-hidden ${photoPreview ? 'border-primary-500' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                        }`}
                                >
                                    {photoPreview ? (
                                        <div className="relative w-full h-full">
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white" size={32} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                                <ImageIcon size={24} className="text-gray-500" />
                                            </div>
                                            <span className="text-xs text-gray-400 font-bold">Clique para subir uma foto</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !rating}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl disabled:opacity-50`}
                            style={{ backgroundColor: primaryColor, color: '#000' }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> Enviar Feedback</>}
                        </button>
                    </form>
                </div>

                {/* Histórico */}
                <div className="space-y-4 pb-10">
                    <h3 className="text-[10px] uppercase font-black tracking-widest text-gray-500 px-2">Meus Feedbacks Enviados</h3>

                    {fetchingHistory ? (
                        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-700" size={24} /></div>
                    ) : myReviews.length === 0 ? (
                        <div className="bg-gray-900/20 border border-white/5 rounded-3xl p-8 text-center">
                            <p className="text-gray-600 text-sm">Você ainda não enviou nenhum feedback.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {myReviews.map((review) => (
                                <div key={review.id} className="bg-gray-900/60 rounded-3xl p-5 border border-white/5 flex gap-4">
                                    {review.photo_url && (
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                                            <img src={review.photo_url} className="w-full h-full object-cover" alt="Review" />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-0.5">
                                                {[...Array(review.rating)].map((_, i) => (
                                                    <Star key={i} size={10} fill={primaryColor} stroke="none" />
                                                ))}
                                            </div>
                                            <span className="text-[9px] text-gray-600 uppercase font-black">{new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-300 line-clamp-2">{review.comment}</p>
                                        <div className="pt-1">
                                            {review.status === 'approved' ? (
                                                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-green-500">
                                                    <CheckCircle2 size={10} /> Aprovado
                                                </div>
                                            ) : review.status === 'rejected' ? (
                                                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500">
                                                    <XCircle size={10} /> Reprovado
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-yellow-500">
                                                    <Clock size={10} /> Aguardando Aprovação
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientFeedback;
