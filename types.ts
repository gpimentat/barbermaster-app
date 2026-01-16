
export enum AppointmentStatus {
  SCHEDULED = 'Agendado',
  COMPLETED = 'Concluído',
  CANCELED = 'Cancelado',
  NOSHOW = 'No-Show'
}

export enum PaymentMethod {
  CREDIT_CARD = 'Cartão de Crédito',
  DEBIT_CARD = 'Cartão de Débito',
  PIX = 'Pix',
  CASH = 'Dinheiro'
}

export interface Barber {
  id: string;
  name: string;
  email: string; // Novo campo para login
  password?: string; // Senha de acesso
  mustChangePassword?: boolean; // Flag para forçar troca de senha
  role: string; // e.g., "Master Barber", "Junior"
  avatar: string;
  active: boolean;
  commissionRate: number; // percentage, e.g., 40
  permissions?: string[];
  loginEnabled?: boolean;
  tenantId?: string; // Multi-tenancy
  tenantName?: string; // Display name
  subscriptionStatus?: 'active' | 'inactive' | 'past_due';
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
  chips: number; // Novo: Quantidade de fichas para rateio de assinatura
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number; // For profit calculation
  stock: number;
  minStock: number; // Alert threshold
  category: string;
  image: string;
  description?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  features: string[]; // Lista de benefícios (ex: "Cortes Ilimitados")
  active: boolean;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  validityDays: number; // Validade em dias para usar o pacote
  features: string[]; // Itens inclusos
  active: boolean;
}

export interface Reward {
  id: string;
  title: string;
  pointsCost: number;
  description?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: string; // Novo campo data de nascimento
  totalVisits: number;
  lastVisit?: string;
  avatar: string;
  loyaltyPoints: number; // Campo novo para Fidelidade
  // Campos de Assinatura
  subscriptionPlanId?: string; // ID do plano
  subscriptionStatus?: 'active' | 'inactive' | 'pending';
  subscriptionRenewsAt?: string; // Data da próxima cobrança
  // Campos de Acesso
  password?: string;
  mustChangePassword?: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  date: string; // ISO Date string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  price: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  method?: PaymentMethod;
}

// Comanda Types
export type ComandaStatus = 'open' | 'paid' | 'canceled';

export interface ComandaItem {
  id: string;
  type: 'service' | 'product';
  itemId: string; // ID of the service or product
  name: string;
  price: number;
  quantity: number; // usually 1 for services
  barberId?: string; // Required for services (for commission)
}

export interface Comanda {
  id: string;
  clientId: string;
  clientName: string; // Denormalized for easier display
  items: ComandaItem[];
  total: number;
  status: ComandaStatus;
  openDate: string; // ISO string
  closeDate?: string; // ISO string
  paymentMethod?: PaymentMethod; // Persist how it was paid
}

// Chat Interfaces
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'admin' | 'client';
  timestamp: string; // ISO string
  isRead: boolean;
}

export interface ChatSession {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  lastMessage: string;
  lastMessageAt: string; // ISO string
  unreadCount: number;
  messages: ChatMessage[];
  status: 'active' | 'archived';
}

// Stats for dashboard
export interface DailyStats {
  totalRevenue: number;
  totalAppointments: number;
  newClients: number;
  occupancyRate: number;
}

// Waitlist Types
export interface WaitlistEntry {
  id: string;
  clientId: string;
  barberId: string | 'any'; // Specific barber or any available
  serviceId: string;
  desiredDate: string; // YYYY-MM-DD
  requestTime: string; // ISO Timestamp of when they joined the list
  status: 'waiting' | 'notified' | 'accepted' | 'declined' | 'expired';
  notificationSentAt?: string;
  notes?: string;
}
