// src/components/kanban/KanbanClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { KanbanStageType, ContactType } from '@/types';

interface StageWithContacts extends KanbanStageType {
  contacts: ContactType[];
}

interface Props {
  stages: StageWithContacts[];
  onContactSelect?: (contactId: string) => void;
}

// Helper functions for financial calculations
function calculateStageTotal(contacts: ContactType[]): number {
  return contacts.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
}

function isContactOverdue(contact: ContactType): boolean {
  if (!contact.lastActivityAt) return true;
  
  const lastActivity = new Date(contact.lastActivityAt);
  const now = new Date();
  const hoursSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
  
  // 48 hours = 2 days
  return hoursSinceActivity > 48;
}

function getOverdueTooltip(contact: ContactType): string {
  if (!contact.lastActivityAt) return 'No activity logged';
  
  const lastActivity = new Date(contact.lastActivityAt);
  const now = new Date();
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  return `No activity in ${daysSinceActivity} day${daysSinceActivity > 1 ? 's' : ''}`;
}

function calculatePipelineStats(stages: StageWithContacts[]) {
  let pipelineTotal = 0;
  let activeDeals = 0;

  stages.forEach((stage) => {
    // Exclude "Closed Lost" stage
    if (!stage.name.toLowerCase().includes('closed lost')) {
      stage.contacts.forEach((contact) => {
        if (contact.estimatedValue) {
          pipelineTotal += contact.estimatedValue;
          activeDeals += 1;
        }
      });
    }
  });

  const avgDeal = activeDeals > 0 ? Math.round(pipelineTotal / activeDeals / 100) * 100 : 0;
  return { pipelineTotal, activeDeals, avgDeal };
}

function moveContactBetweenStages(
  prev: StageWithContacts[],
  contactId: string,
  fromStageId: string,
  toStageId: string,
  patch?: Partial<Omit<ContactType, 'id'>>
): StageWithContacts[] {
  let movedContact: ContactType | undefined;

  const removedFromSource = prev.map((stage) => {
    if (stage.id === fromStageId) {
      movedContact = stage.contacts.find((c) => c.id === contactId);
      return { ...stage, contacts: stage.contacts.filter((c) => c.id !== contactId) };
    }
    return stage;
  });

  if (!movedContact) return prev;

  return removedFromSource.map((stage) => {
    if (stage.id === toStageId) {
      const updatedContact = { ...movedContact, ...patch, kanbanStageId: toStageId } as ContactType;
      return {
        ...stage,
        contacts: [updatedContact, ...stage.contacts.filter((c) => c.id !== contactId)],
      };
    }
    return stage;
  });
}

export default function KanbanClient({ stages: initialStages, onContactSelect }: Props) {
  const [stages, setStages] = useState<StageWithContacts[]>(initialStages);
  const [dragging, setDragging] = useState<{ contactId: string; fromStageId: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [pendingMoveIds, setPendingMoveIds] = useState<Set<string>>(new Set());

  // Sync state when initialStages prop changes (e.g., after navigation)
  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  function onDragStart(contactId: string, fromStageId: string) {
    if (pendingMoveIds.has(contactId)) return;
    setDragging({ contactId, fromStageId });
  }

  function onDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDragOverStage(stageId);
  }

  function onDragLeave() {
    setDragOverStage(null);
  }

  async function onDrop(e: React.DragEvent, toStageId: string) {
    e.preventDefault();
    setDragOverStage(null);
    if (!dragging || dragging.fromStageId === toStageId) {
      setDragging(null);
      return;
    }

    const { contactId, fromStageId } = dragging;
    setDragging(null);

    if (pendingMoveIds.has(contactId)) return;
    setPendingMoveIds((prev) => new Set(prev).add(contactId));

    // Optimistic update
    setStages((prev) => moveContactBetweenStages(prev, contactId, fromStageId, toStageId));

    try {
      const res = await fetch('/api/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, stageId: toStageId, fromStageId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409 && data.currentStageId) {
          setStages((prev) => moveContactBetweenStages(prev, contactId, toStageId, data.currentStageId));
        }
        throw new Error(data.error || 'Failed to move contact');
      }

      if (data.contact) {
        setStages((prev) =>
          prev.map((stage) => ({
            ...stage,
            contacts: stage.contacts.map((contact) =>
              contact.id === data.contact.id ? { ...contact, ...data.contact } : contact
            ),
          }))
        );
      }

      toast.success('Contact moved');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to move contact');
      // Revert optimistic update
      setStages((prev) => moveContactBetweenStages(prev, contactId, toStageId, fromStageId));
    } finally {
      setPendingMoveIds((prev) => {
        const next = new Set(prev);
        next.delete(contactId);
        return next;
      });
    }
  }

  async function addStage() {
    if (!newStageName.trim()) return;
    try {
      const res = await fetch('/api/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStageName.trim() }),
      });
      if (!res.ok) throw new Error();
      const { stage } = await res.json();
      setStages((prev) => [...prev, { ...stage, contacts: [] }]);
      setNewStageName('');
      setShowAddStage(false);
      toast.success('Stage created');
    } catch {
      toast.error('Failed to create stage');
    }
  }

  const totalContacts = stages.reduce((sum, s) => sum + s.contacts.length, 0);
  const { pipelineTotal, activeDeals, avgDeal } = calculatePipelineStats(stages);
  const hasValues = activeDeals > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            Sales Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalContacts} contacts across {stages.length} stages</p>
        </div>
        <button
          onClick={() => setShowAddStage(!showAddStage)}
          className="btn-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Stage
        </button>
      </div>

      {/* Pipeline Summary Bar */}
      {hasValues && (
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-start gap-8">
          <div>
            <div className="text-xs text-gray-500 font-medium">Total in pipeline</div>
            <div className="text-lg font-bold text-gray-900" suppressHydrationWarning>₹{pipelineTotal.toLocaleString('en-US')}</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-xs text-gray-500 font-medium">Active deals</div>
            <div className="text-lg font-bold text-gray-900">{activeDeals}</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-xs text-gray-500 font-medium">Avg deal</div>
            <div className="text-lg font-bold text-gray-900" suppressHydrationWarning>₹{avgDeal.toLocaleString('en-US')}</div>
          </div>
        </div>
      )}

      {/* Add stage inline form */}
      {showAddStage && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <input
            autoFocus
            className="input flex-1 max-w-xs"
            placeholder="Stage name e.g. Negotiating"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addStage(); if (e.key === 'Escape') setShowAddStage(false); }}
          />
          <button onClick={addStage} className="btn-primary py-2">Create</button>
          <button onClick={() => setShowAddStage(false)} className="btn-ghost py-2">Cancel</button>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full p-5 min-w-max">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`kanban-col transition-all duration-150 ${dragOverStage === stage.id ? 'ring-2 ring-offset-1 ring-forest-400 bg-forest-50' : ''}`}
              onDragOver={(e) => onDragOver(e, stage.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, stage.id)}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: stage.color }}
                  />
                  <h3 className="font-semibold text-gray-800 text-sm flex-1">{stage.name}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                    {stage.contacts.length}
                  </span>
                </div>
                {calculateStageTotal(stage.contacts) > 0 && (
                  <div className="text-xs text-gray-500 pl-0" suppressHydrationWarning>
                    ₹{calculateStageTotal(stage.contacts).toLocaleString('en-US')} in pipeline
                  </div>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {stage.contacts.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    Drop here
                  </div>
                )}

                {stage.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    draggable={!pendingMoveIds.has(contact.id)}
                    onDragStart={() => onDragStart(contact.id, stage.id)}
                    className={`kanban-card relative ${pendingMoveIds.has(contact.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {/* Intent badge - top left */}


                    {/* Overdue indicator - top right */}
                    {isContactOverdue(contact) && (
                      <div className="absolute top-1 right-1 group" title={getOverdueTooltip(contact)}>
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm cursor-help" />
                      </div>
                    )}

                    {/* Estimated value badge - only if no overdue indicator */}
                    {!isContactOverdue(contact) && contact.estimatedValue && (
                      <div className="absolute top-1 right-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm" suppressHydrationWarning>
                        ₹{contact.estimatedValue.toLocaleString('en-US')}
                      </div>
                    )}

                    {/* Confidence/Intent level - confidence level if exists */}
                    {contact.confidenceLevel && (
                      <div className="absolute top-1 left-1">
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${
                          contact.confidenceLevel === 'HIGH_INTENT' ? 'bg-red-100 text-red-700' :
                          contact.confidenceLevel === 'EXPLORATORY' ? 'bg-blue-100 text-blue-700' :
                          contact.confidenceLevel === 'NEGOTIATING' ? 'bg-purple-100 text-purple-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {contact.confidenceLevel === 'HIGH_INTENT' ? '🔥' :
                           contact.confidenceLevel === 'EXPLORATORY' ? '🔍' :
                           contact.confidenceLevel === 'NEGOTIATING' ? '💬' :
                           '📅'}
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(contact.name ?? contact.phoneNumber).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {contact.name ?? contact.phoneNumber}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{contact.phoneNumber}</p>
                      </div>
                    </div>

                    {/* Interest preview */}
                    {contact.interest ? (
                      <p className="text-xs text-gray-600 italic mt-2 line-clamp-1 leading-relaxed">
                        {contact.interest}
                      </p>
                    ) : null}

                    {/* Tags - max 2 + overflow */}
                    {contact.contactTags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.contactTags.slice(0, 2).map((ct) => (
                          <span
                            key={ct.tagId}
                            className="tag-pill text-[10px]"
                            style={{ background: `${ct.tag.color}20`, color: ct.tag.color }}
                          >
                            {ct.tag.name}
                          </span>
                        ))}
                        {contact.contactTags.length > 2 && (
                          <span className="tag-pill text-[10px] bg-gray-100 text-gray-600">
                            +{contact.contactTags.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
                      <span className="text-[11px] text-gray-400" suppressHydrationWarning>
                        {contact.lastActivityAt
                          ? format(new Date(contact.lastActivityAt), 'dd MMM')
                          : 'No messages'}
                      </span>
                      <button
                        onClick={() => onContactSelect?.(contact.id)}
                        className="text-[11px] text-forest-600 font-medium hover:underline"
                      >
                        View profile →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
