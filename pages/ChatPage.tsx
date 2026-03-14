
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send,
  Search,
  MoreVertical,
  Phone,
  User,
  ArrowLeft,
  Check,
  CheckCheck,
  Smile,
  Loader2
} from 'lucide-react';
import { ChatSession, ChatMessage } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const ChatPage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- FETCH SESSIONS ---
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          *,
          client:clients (
            id,
            name,
            avatar
          )
        `)
        .eq('tenant_id', currentUser?.tenantId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const mapped: ChatSession[] = (data || []).map(s => ({
        id: s.id,
        clientId: s.client_id,
        clientName: s.client?.name || 'Cliente',
        clientAvatar: s.client?.avatar || null,
        lastMessage: s.last_message,
        lastMessageAt: s.last_message_at,
        unreadCount: s.unread_count,
        status: s.status as any,
        messages: [] // Will fetch messages on demand or keep it in session if needed
      }));

      setSessions(mapped);
    } catch (error) {
      console.error('Erro ao buscar sessões de chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.tenantId) {
      fetchSessions();

      // Subscribe to sessions changes
      const channel = supabase
        .channel('chat_sessions_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `tenant_id=eq.${currentUser.tenantId}`
        }, () => {
          fetchSessions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser?.tenantId]);

  // Handle location state (redirect from feedback etc)
  useEffect(() => {
    if (location.state?.clientId && sessions.length > 0) {
      const existing = sessions.find(s => s.clientId === location.state.clientId);
      if (existing) {
        setSelectedSessionId(existing.id);
        if (location.state?.initialMessage) {
          setInputText(location.state.initialMessage);
        }
      } else {
        // Session might not be in the current tenant's sessions list or needs creation
        const ensureSession = async () => {
          try {
            // 1. Check if session exists in DB
            const { data: existingData } = await supabase
              .from('chat_sessions')
              .select('id')
              .eq('client_id', location.state.clientId)
              .eq('tenant_id', currentUser?.tenantId)
              .single();

            if (existingData) {
              setSelectedSessionId(existingData.id);
            } else {
              // 2. Create session
              const { data: newData, error: createError } = await supabase
                .from('chat_sessions')
                .insert([{
                  client_id: location.state.clientId,
                  tenant_id: currentUser?.tenantId,
                  status: 'active'
                }])
                .select()
                .single();

              if (createError) throw createError;

              // Refresh sessions list so it shows up in sidebar
              await fetchSessions();
              setSelectedSessionId(newData.id);
            }

            if (location.state?.initialMessage) {
              setInputText(location.state.initialMessage);
            }
          } catch (error) {
            console.error('Erro ao garantir sessão de chat:', error);
          }
        };
        ensureSession();
      }
    }
  }, [location.state, sessions.length]); // Added sessions.length as dependency

  // --- FETCH MESSAGES FOR SELECTED SESSION ---
  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', selectedSessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
      }

      setSessions(prev => prev.map(s => s.id === selectedSessionId ? {
        ...s,
        messages: data.map(m => ({
          id: m.id,
          text: m.content,
          sender: m.sender_type as any,
          timestamp: m.created_at,
          isRead: m.is_read
        })),
        unreadCount: 0 // Reset local unread count
      } : s));

      // Reset unread count in DB
      await supabase
        .from('chat_sessions')
        .update({ unread_count: 0 })
        .eq('id', selectedSessionId);
    };

    fetchMessages();

    // Subscribe to NEW messages in this session
    const channel = supabase
      .channel(`session_${selectedSessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${selectedSessionId}`
      }, (payload) => {
        const newMessage: ChatMessage = {
          id: payload.new.id,
          text: payload.new.content,
          sender: payload.new.sender_type as any,
          timestamp: payload.new.created_at,
          isRead: payload.new.is_read
        };

        setSessions(prev => prev.map(s => s.id === selectedSessionId ? {
          ...s,
          messages: [...s.messages, newMessage]
        } : s));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [selectedSessionId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === selectedSessionId);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedSessionId || !currentUser) return;

    const content = inputText.trim();
    setInputText('');

    try {
      // 1. Insert message
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: selectedSessionId,
          tenant_id: currentUser.tenantId,
          sender_type: 'admin',
          sender_id: currentUser.id,
          content: content
        }]);

      if (msgError) throw msgError;

      // 2. Update session last message
      await supabase
        .from('chat_sessions')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString()
        })
        .eq('id', selectedSessionId);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-dark-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl animate-in fade-in">

      {/* Sidebar - Lista de Conversas */}
      <div className={`w-full md:w-80 border-r border-gray-800 flex flex-col bg-gray-900/50 ${selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Mensagens</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredSessions.map(session => (
            <div
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-800 ${selectedSessionId === session.id ? 'bg-gray-800 border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}
            >
              <div className="relative">
                <img src={session.clientAvatar} alt={session.clientName} className="w-12 h-12 rounded-full object-cover bg-gray-700" />
                {session.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary-500 text-dark-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-900">
                    {session.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`text-sm font-bold truncate ${selectedSessionId === session.id ? 'text-white' : 'text-gray-300'}`}>
                    {session.clientName}
                  </h3>
                  <span className="text-[10px] text-gray-500">
                    {new Date(session.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-xs truncate ${session.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-500'}`}>
                  {session.lastMessage || 'Nova conversa iniciada'}
                </p>
              </div>
            </div>
          ))}

          {filteredSessions.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-sm">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Área Principal - Chat */}
      <div className={`flex-1 flex flex-col bg-gray-950 ${!selectedSessionId ? 'hidden md:flex' : 'flex'}`}>
        {selectedSessionId && activeSession ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-gray-800 flex items-center justify-between bg-dark-900 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedSessionId(null)} className="md:hidden p-2 text-gray-400 hover:text-white">
                  <ArrowLeft size={20} />
                </button>
                <img src={activeSession.clientAvatar} className="w-10 h-10 rounded-full bg-gray-800" />
                <div>
                  <h3 className="font-bold text-white text-sm">{activeSession.clientName}</h3>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online agora
                  </p>
                </div>
              </div>
              <div className="flex gap-2 text-gray-400">
                <button className="p-2 hover:bg-gray-800 rounded-lg hover:text-white transition-colors"><Phone size={20} /></button>
                <button className="p-2 hover:bg-gray-800 rounded-lg hover:text-white transition-colors"><User size={20} /></button>
                <button className="p-2 hover:bg-gray-800 rounded-lg hover:text-white transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-dots-pattern">
              {activeSession.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                    <Smile size={32} className="text-gray-600" />
                  </div>
                  <p>Inicie a conversa com {activeSession.clientName}</p>
                  <p className="text-xs">As mensagens são seguras e criptografadas.</p>
                </div>
              )}

              {activeSession.messages.map((msg) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm relative group ${isAdmin
                        ? 'bg-primary-500 text-dark-950 rounded-tr-none'
                        : 'bg-gray-800 text-gray-200 rounded-tl-none'
                        }`}
                    >
                      <p>{msg.text}</p>
                      <div className={`text-[10px] mt-1 flex items-center gap-1 justify-end ${isAdmin ? 'text-dark-950/60' : 'text-gray-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isAdmin && (
                          msg.isRead ? <CheckCheck size={12} /> : <Check size={12} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-dark-900 border-t border-gray-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 bg-primary-500 text-dark-950 rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
              <Send size={32} className="text-gray-700" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Suporte e Chat</h3>
            <p>Selecione uma conversa para começar o atendimento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
