
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
  weeklyGoal?: number; // Nova: Meta semanal de faturamento
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // Renomeado de durationMinutes para duration
  description: string;
  chips: number; // Novo: Quantidade de fichas para rateio de assinatura
  hidden?: boolean; // Novo: Serviço oculto para clientes (interno)
  priceVaries?: boolean; // Novo: Indica "A partir de"
  loyaltyPoints?: number; // Novo: Pontos de fidelidade customizados
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
  features: string[];
  active: boolean;
  tenant_id: string;
  gateway_plan_id?: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  features: string[];
  active: boolean;
  tenant_id: string;
}

export interface ClientSubscription {
  id: string;
  clientId: string;
  planId: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'pending';
  renewsAt: string;
  gatewaySubscriptionId?: string;
  tenantId: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  packageId: string;
  purchasedAt: string;
  expiresAt: string;
  remainingUses: Record<string, number>;
  status: 'active' | 'used' | 'expired';
  tenantId: string;
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
  birthDate?: string;
  totalVisits: number;
  lastVisit?: string;
  avatar: string;
  loyaltyPoints: number;
  subscriptionPlanId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'pending';
  subscriptionRenewsAt?: string;
  tenant_id: string;
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
  discountAmount?: number; // Valor do desconto em R$
  discountReason?: string; // Justificativa do desconto
  discountAppliedBy?: string; // ID do usuário que aplicou
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

export interface ScheduleBlock {
  id: string;
  tenant_id: string;
  barber_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  reason: string;
  created_at?: string;
}
