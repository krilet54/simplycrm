// src/types/index.ts
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
export type SenderType = 'AGENT' | 'CUSTOMER' | 'SYSTEM';
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'TEMPLATE';
export type AgentRole = 'OWNER' | 'ADMIN' | 'AGENT';
export type Plan = 'STARTER' | 'PRO' | 'TRIAL';
export type ContactSource = 'WHATSAPP' | 'WALK_IN' | 'PHONE_CALL' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'EVENT' | 'OTHER';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type ActivityType =
  | 'CONTACT_CREATED'
  | 'CONTACT_UPDATED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'NOTE_ADDED'
  | 'INVOICE_CREATED'
  | 'INVOICE_SENT'
  | 'INVOICE_PAID'
  | 'STAGE_CHANGED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'EMAIL_SENT'
  | 'CALL_LOGGED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'SNOOZED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskType = 'MANUAL' | 'AUTO_PAYMENT_DUE' | 'AUTO_NO_REPLY_24H' | 'AUTO_INVOICE_SENT' | 'AUTO_INVOICE_OVERDUE';
export type EmailStatus = 'DRAFT' | 'SENT' | 'BOUNCED' | 'FAILED';

export interface WorkspaceType {
  id: string;
  businessName: string;
  whatsappPhoneNumberId?: string | null;
  plan: Plan;
  createdAt: Date;
  metaOAuthToken?: MetaOAuthTokenType | null;
}

export interface UserType {
  id: string;
  workspaceId: string;
  supabaseId: string;
  name: string;
  email: string;
  role: AgentRole;
  avatarUrl?: string | null;
  isOnline: boolean;
}

export interface ContactType {
  id: string;
  workspaceId: string;
  phoneNumber: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  kanbanStageId?: string | null;
  kanbanStage?: KanbanStageType | null;
  isBlocked: boolean;
  source?: ContactSource;
  sourceNote?: string | null;
  interest?: string | null;
  estimatedValue?: number | null;
  lastMessageAt?: Date | null;
  contactTags: ContactTagType[];
  messages?: Array<{ content: string; timestamp: Date; senderType: string; isRead: boolean }>;
  _count?: { messages: number };
}

export interface MessageType2 {
  id: string;
  contactId: string;
  agentId?: string | null;
  agent?: UserType | null;
  wamid?: string | null;
  senderType: SenderType;
  type: MessageType;
  content: string;
  mediaUrl?: string | null;
  status: MessageStatus;
  isRead: boolean;
  timestamp: Date;
}

export interface NoteType {
  id: string;
  contactId: string;
  authorId: string;
  author: UserType;
  content: string;
  createdAt: Date;
}

export interface KanbanStageType {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
}

export interface TagType {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
}

export interface ContactTagType {
  tagId: string;
  tag: TagType;
}

export interface QuickReplyType {
  id: string;
  workspaceId: string;
  shortcut: string;
  title: string;
  content: string;
}

export interface InvoiceItemType {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: Date;
}

export interface InvoiceType {
  id: string;
  workspaceId: string;
  contactId: string;
  contact?: ContactType;
  invoiceNumber: string;
  description?: string | null;
  amount: number;
  status: InvoiceStatus;
  dueDate?: Date | null;
  sentAt?: Date | null;
  paidAt?: Date | null;
  items?: InvoiceItemType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaOAuthTokenType {
  id: string;
  workspaceId: string;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string | null;
  expiresAt?: Date | null;
  refreshToken?: string | null;
  connectedAt: Date;
  updatedAt: Date;
}

export interface ActivityType2 {
  id: string;
  workspaceId: string;
  contactId: string;
  activityType: ActivityType;
  actorId: string;
  actor?: UserType;
  contact?: ContactType;
  title: string;
  description?: string | null;
  metadata?: Record<string, any> | null;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskType2 {
  id: string;
  workspaceId: string;
  contactId: string;
  createdBy: string;
  creator?: { id: string; name: string; avatarUrl?: string | null };
  contact?: { id: string; name: string | null; phoneNumber: string };
  title: string;
  description?: string | null;
  dueDate: Date;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  reminderSent: boolean;
  completedAt?: Date | null;
  snoozedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailType2 {
  id: string;
  workspaceId: string;
  contactId: string;
  contact?: ContactType;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: EmailStatus;
  sentAt?: Date | null;
  openedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
