// src/types/index.ts
export type AgentRole = 'OWNER' | 'ADMIN' | 'AGENT';
export type Plan = 'STARTER' | 'PRO' | 'TRIAL';
export type ContactSource = 'WHATSAPP' | 'WALK_IN' | 'PHONE_CALL' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'EVENT' | 'OTHER';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type ActivityTypeEnum = 'NOTE' | 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP' | 'INVOICE_SENT' | 'STAGE_CHANGE' | 'CONTACT_ADDED' | 'OTHER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskType = 'MANUAL' | 'AUTO_PAYMENT_DUE' | 'AUTO_NO_REPLY_24H' | 'AUTO_INVOICE_SENT' | 'AUTO_INVOICE_OVERDUE';
export type EmailStatus = 'DRAFT' | 'SENT' | 'BOUNCED' | 'FAILED';
export type ConfidenceLevel = 'HIGH_INTENT' | 'EXPLORATORY' | 'NEGOTIATING' | 'DEMO_SCHEDULED';

// New types for restructured API
export type TaskStatusType = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriorityType = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WorkspaceType {
  id: string;
  businessName: string;
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
  confidenceLevel?: ConfidenceLevel | null;
  lastActivityAt?: Date | null;
  // Delegation fields
  assignedToId?: string | null;
  assignedById?: string | null;
  assignedTo?: UserType | null;
  assignedBy?: UserType | null;
  delegationNote?: string | null;
  assignmentStatus?: 'ACTIVE' | 'COMPLETED' | null;
  assignedAt?: Date | null;
  completedAt?: Date | null;
  contactTags: ContactTagType[];
  activities?: ActivityRecord[];
  _count?: { activities: number };
}

export interface ActivityRecord {
  id: string;
  workspaceId: string;
  contactId: string;
  authorId?: string | null;
  author?: { id: string; name: string; avatarUrl?: string | null } | null;
  type: ActivityTypeEnum;
  content: string;
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
  notes?: string | null;
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
  authorId?: string | null;
  author?: { id: string; name: string; avatarUrl?: string | null } | null;
  type: ActivityTypeEnum;
  content: string;
  timestamp: Date;
}

export interface TaskType2 {
  id: string;
  workspaceId: string;
  contactId: string | null;
  createdById: string;
  createdBy: { id: string; name: string };
  contact?: { id: string; name: string | null; phoneNumber: string } | null;
  title: string;
  description?: string | null;
  dueDate: Date | null;
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

// Task and FollowUp types for restructured pages
export interface TaskObjectType {
  id: string;
  workspaceId: string;
  contactId?: string | null;
  contact?: { id: string; name?: string | null; phoneNumber: string } | null;
  createdById: string;
  createdBy: { id: string; name: string };
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; avatarUrl?: string | null } | null;
  title: string;
  description?: string | null;
  status: TaskStatusType;
  priority: TaskPriorityType;
  dueDate?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpType {
  id: string;
  workspaceId: string;
  contactId: string;
  contact: {
    id: string;
    name?: string | null;
    phoneNumber: string;
    kanbanStage?: { name: string; color: string } | null;
  };
  createdById: string;
  note?: string | null;
  dueDate: Date;
  isDone: boolean;
  doneAt?: Date | null;
  createdAt: Date;
}
