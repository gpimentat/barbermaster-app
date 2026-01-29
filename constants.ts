
import { Barber, Service, Client, Appointment, Transaction, AppointmentStatus, PaymentMethod, Product, Comanda, SubscriptionPlan, Reward, ServicePackage, ChatSession, WaitlistEntry } from './types';

// Atualizando as permissões para refletir os perfis
export const MOCK_BARBERS: Barber[] = [
  {
    id: '1',
    name: 'Carlos Silva',
    email: 'carlos@barbermaster.com.br',
    password: 'securepassword',
    mustChangePassword: false,
    role: 'Master Barber',
    avatar: 'https://picsum.photos/150/150?random=1',
    active: true,
    commissionRate: 50,
    loginEnabled: true,
    // Perfil Barbeiro: Vê própria agenda e comissões
    permissions: ['view_own_schedule', 'manage_schedule', 'view_own_commissions']
  },
  {
    id: '2',
    name: 'André Santos',
    email: 'andre@barbermaster.com.br',
    password: '1234', // Simula um usuário que acabou de ser criado
    mustChangePassword: true, // Vai pedir troca de senha ao logar
    role: 'Barbeiro Pleno',
    avatar: 'https://picsum.photos/150/150?random=2',
    active: true,
    commissionRate: 40,
    loginEnabled: true,
    // Perfil Barbeiro
    permissions: ['view_own_schedule', 'manage_schedule', 'view_own_commissions']
  },
  {
    id: '3',
    name: 'Ana Recepção',
    email: 'ana@barbermaster.com.br',
    password: 'securepassword',
    mustChangePassword: false,
    role: 'Recepcionista',
    avatar: 'https://ui-avatars.com/api/?name=Ana+Recepcao&background=FF69B4&color=fff',
    active: false, // Não aparece na agenda para corte
    commissionRate: 0,
    loginEnabled: true,
    // Perfil Recepcionista: Vê tudo operacional, mas não Financeiro/Config
    permissions: ['view_full_schedule', 'manage_schedule', 'manage_clients', 'manage_products', 'manage_comandas']
  },
];

export const MOCK_SERVICES: Service[] = [
  { id: 's1', name: 'Corte Clássico', price: 60.00, durationMinutes: 45, description: 'Corte tradicional com tesoura e máquina.', chips: 2 },
  { id: 's2', name: 'Barba Completa', price: 45.00, durationMinutes: 30, description: 'Modelagem de barba com toalha quente.', chips: 1 },
  { id: 's3', name: 'Corte + Barba', price: 95.00, durationMinutes: 75, description: 'Combo completo.', chips: 3 },
  { id: 's4', name: 'Pezinho / Acabamento', price: 20.00, durationMinutes: 15, description: 'Apenas acabamento nas laterais e nuca.', chips: 0.5 },
  { id: 's5', name: 'Hidratação Capilar', price: 35.00, durationMinutes: 20, description: 'Tratamento profundo para os fios.', chips: 1 },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Pomada Modeladora Matte', price: 45.00, costPrice: 20.00, stock: 24, minStock: 10, category: 'Cabelo', image: 'https://picsum.photos/200/200?random=20', description: 'Alta fixação com efeito seco.' },
  { id: 'p2', name: 'Óleo para Barba', price: 35.00, costPrice: 15.00, stock: 8, minStock: 10, category: 'Barba', image: 'https://picsum.photos/200/200?random=21', description: 'Hidratação e brilho para a barba.' },
  { id: 'p3', name: 'Shampoo Mentolado', price: 30.00, costPrice: 12.00, stock: 15, minStock: 5, category: 'Cabelo', image: 'https://picsum.photos/200/200?random=22', description: 'Refrescância e limpeza profunda.' },
  { id: 'p4', name: 'Minoxidil 5%', price: 80.00, costPrice: 40.00, stock: 3, minStock: 5, category: 'Tratamento', image: 'https://picsum.photos/200/200?random=23', description: 'Loção para crescimento capilar.' },
  { id: 'p5', name: 'Pente de Madeira', price: 25.00, costPrice: 8.00, stock: 30, minStock: 5, category: 'Acessórios', image: 'https://picsum.photos/200/200?random=24', description: 'Antiestático, ideal para barba.' },
];

export const MOCK_REWARDS: Reward[] = [
  { id: 'r1', title: 'Corte de Cabelo Grátis', pointsCost: 100, description: 'Um corte clássico por nossa conta.' },
  { id: 'r2', title: 'Pomada Modeladora', pointsCost: 50, description: 'Leve uma pomada para casa.' },
  { id: 'r3', title: '50% OFF na Barba', pointsCost: 30, description: 'Desconto exclusivo no serviço de barba.' },
];

export const MOCK_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'sub1',
    name: 'Clube do Corte',
    price: 89.90,
    frequency: 'monthly',
    features: ['Cortes ilimitados', '10% OFF em produtos', 'Agenda preferencial'],
    active: true
  },
  {
    id: 'sub2',
    name: 'Barba VIP',
    price: 69.90,
    frequency: 'monthly',
    features: ['Barba ilimitada', 'Toalha quente inclusa', 'Bebida grátis'],
    active: true
  },
  {
    id: 'sub3',
    name: 'Barber Master Pass',
    price: 149.90,
    frequency: 'monthly',
    features: ['Corte e Barba ilimitados', '20% OFF em produtos', 'Convidado mensal grátis'],
    active: true
  }
];

export const MOCK_PACKAGES: ServicePackage[] = [
  {
    id: 'pack1',
    name: 'Combo 5 Cortes',
    price: 250.00,
    validityDays: 90,
    features: ['5 Cortes Clássicos', 'Válido por 90 dias', 'Economia de R$ 50,00'],
    active: true
  },
  {
    id: 'pack2',
    name: 'Dia do Noivo',
    price: 450.00,
    validityDays: 30,
    features: ['Corte + Barba', 'Limpeza de Pele', 'Massagem Capilar', 'Serviço para 2 Padrinhos'],
    active: true
  }
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'João Pereira',
    email: 'joao@example.com',
    phone: '(11) 99999-1111',
    totalVisits: 12,
    lastVisit: '2023-10-25',
    avatar: 'https://picsum.photos/100/100?random=10',
    loyaltyPoints: 350,
    subscriptionPlanId: 'sub3',
    subscriptionStatus: 'active',
    subscriptionRenewsAt: '2023-11-25'
  },
  {
    id: 'c2',
    name: 'Lucas Oliveira',
    email: 'lucas@example.com',
    phone: '(11) 98888-2222',
    totalVisits: 5,
    lastVisit: '2023-10-20',
    avatar: 'https://picsum.photos/100/100?random=11',
    loyaltyPoints: 120,
    subscriptionPlanId: 'sub1',
    subscriptionStatus: 'active',
    subscriptionRenewsAt: '2023-11-10'
  },
  {
    id: 'c3',
    name: 'Mateus Souza',
    email: 'mateus@example.com',
    phone: '(11) 97777-3333',
    totalVisits: 1,
    lastVisit: '2023-10-01',
    avatar: 'https://picsum.photos/100/100?random=12',
    loyaltyPoints: 45
  },
  {
    id: 'c4',
    name: 'Roberto Costa',
    email: 'roberto@email.com',
    phone: '(11) 96666-4444',
    totalVisits: 8,
    avatar: 'https://picsum.photos/100/100?random=13',
    loyaltyPoints: 80
  },
  {
    id: 'c5',
    name: 'Fernando Lima',
    email: 'fernando@email.com',
    phone: '(11) 95555-5555',
    totalVisits: 3,
    avatar: 'https://picsum.photos/100/100?random=14',
    loyaltyPoints: 30
  }
];

export const MOCK_CHATS: ChatSession[] = [
  {
    id: 'chat1',
    clientId: 'c1',
    clientName: 'João Pereira',
    clientAvatar: 'https://picsum.photos/100/100?random=10',
    lastMessage: 'Combinado, obrigado!',
    lastMessageAt: '2023-10-27T10:30:00Z',
    unreadCount: 0,
    status: 'active',
    messages: [
      { id: 'm1', text: 'Bom dia, João! Confirmando seu horário amanhã.', sender: 'admin', timestamp: '2023-10-27T09:00:00Z', isRead: true },
      { id: 'm2', text: 'Bom dia! Confirmado sim.', sender: 'client', timestamp: '2023-10-27T09:15:00Z', isRead: true },
      { id: 'm3', text: 'Combinado, obrigado!', sender: 'admin', timestamp: '2023-10-27T10:30:00Z', isRead: true }
    ]
  },
  {
    id: 'chat2',
    clientId: 'c2',
    clientName: 'Lucas Oliveira',
    clientAvatar: 'https://picsum.photos/100/100?random=11',
    lastMessage: 'Tem horário para hoje?',
    lastMessageAt: '2023-10-28T08:00:00Z',
    unreadCount: 1,
    status: 'active',
    messages: [
      { id: 'm4', text: 'Tem horário para hoje à tarde?', sender: 'client', timestamp: '2023-10-28T08:00:00Z', isRead: false }
    ]
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1', clientId: 'c1', barberId: '1', serviceId: 's3', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:15', status: AppointmentStatus.SCHEDULED, price: 95.00 },
  { id: 'a2', clientId: 'c2', barberId: '2', serviceId: 's1', date: new Date().toISOString().split('T')[0], startTime: '11:00', endTime: '11:45', status: AppointmentStatus.COMPLETED, price: 60.00 },
  { id: 'a3', clientId: 'c3', barberId: '1', serviceId: 's2', date: new Date().toISOString().split('T')[0], startTime: '14:00', endTime: '14:30', status: AppointmentStatus.SCHEDULED, price: 45.00 },
  { id: 'a4', clientId: 'c1', barberId: '3', serviceId: 's1', date: new Date().toISOString().split('T')[0], startTime: '16:00', endTime: '16:45', status: AppointmentStatus.CANCELED, price: 60.00 },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2023-10-26', description: 'Corte - João Pereira', amount: 95.00, type: 'income', category: 'Serviços', method: PaymentMethod.PIX },
  { id: 't2', date: '2023-10-26', description: 'Corte - Lucas Oliveira', amount: 60.00, type: 'income', category: 'Serviços', method: PaymentMethod.CREDIT_CARD },
  { id: 't3', date: '2023-10-25', description: 'Compra de Lâminas', amount: 150.00, type: 'expense', category: 'Insumos' },
  { id: 't4', date: '2023-10-25', description: 'Conta de Luz', amount: 450.00, type: 'expense', category: 'Utilidades' },
  { id: 't5', date: '2023-10-24', description: 'Barba - Mateus', amount: 45.00, type: 'income', category: 'Serviços', method: PaymentMethod.CASH },
];

export const MOCK_COMANDAS: Comanda[] = [
  {
    id: 'cmd1',
    clientId: 'c1',
    clientName: 'João Pereira',
    status: 'open',
    openDate: new Date().toISOString(),
    total: 140.00,
    items: [
      { id: 'i1', type: 'service', itemId: 's3', name: 'Corte + Barba', price: 95.00, quantity: 1, barberId: '1' },
      { id: 'i2', type: 'product', itemId: 'p1', name: 'Pomada Modeladora Matte', price: 45.00, quantity: 1 }
    ]
  },
  {
    id: 'cmd2',
    clientId: 'c2',
    clientName: 'Lucas Oliveira',
    status: 'paid',
    openDate: '2023-10-25T14:30:00.000Z',
    closeDate: '2023-10-25T15:30:00.000Z',
    total: 60.00,
    paymentMethod: PaymentMethod.CREDIT_CARD,
    items: [
      { id: 'i3', type: 'service', itemId: 's1', name: 'Corte Clássico', price: 60.00, quantity: 1, barberId: '2' }
    ]
  }
];

export const MOCK_WAITLIST: WaitlistEntry[] = [
  {
    id: 'wl1',
    clientId: 'c4',
    barberId: '1', // Carlos Silva
    serviceId: 's1',
    desiredDate: new Date().toISOString().split('T')[0],
    requestTime: '2023-10-27T08:30:00Z',
    status: 'waiting',
    notes: 'Precisa ser depois das 14h'
  },
  {
    id: 'wl2',
    clientId: 'c5',
    barberId: '1', // Carlos Silva
    serviceId: 's3',
    desiredDate: new Date().toISOString().split('T')[0],
    requestTime: '2023-10-27T09:00:00Z',
    status: 'waiting'
  }
];

export const CHART_DATA = [
  { name: 'Seg', revenue: 1200 },
  { name: 'Ter', revenue: 900 },
  { name: 'Qua', revenue: 1500 },
  { name: 'Qui', revenue: 1100 },
  { name: 'Sex', revenue: 2200 },
  { name: 'Sáb', revenue: 3500 },
  { name: 'Dom', revenue: 500 },
];
