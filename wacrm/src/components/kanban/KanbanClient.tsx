// src/components/kanban/KanbanClient.tsx
'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { KanbanStageType, ContactType } from '@/types';
import Link from 'next/link';

interface StageWithContacts extends KanbanStageType {
  contacts: ContactType[];
}

interface Props {
  stages: StageWithContacts[];
}

// Helper functions for financial calculations
function calculateStageTotal(contacts: ContactType[]): number {
  return contacts.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
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

export default function KanbanClient({ stages: initialStages }: Props) {
  const [stages, setStages] = useState<StageWithContacts[]>(initialStages);
  const [dragging, setDragging] = useState<{ contactId: string; fromStageId: string } | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  function onDragStart(contactId: string, fromStageId: string) {
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

    // Optimistic update
    setStages((prev) => {
      let movedContact: ContactType | undefined;
      const updated = prev.map((stage) => {
        if (stage.id === fromStageId) {
          movedContact = stage.contacts.find((c) => c.id === contactId);
          return { ...stage, contacts: stage.contacts.filter((c) => c.id !== contactId) };
        }
        return stage;
      });
      return updated.map((stage) => {
        if (stage.id === toStageId && movedContact) {
          return {
            ...stage,
            contacts: [{ ...movedContact, kanbanStageId: toStageId }, ...stage.contacts],
          };
        }
        return stage;
      });
    });

    try {
      const res = await fetch('/api/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, stageId: toStageId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Contact moved');
    } catch {
      toast.error('Failed to move contact');
      // Revert - reload page
      window.location.reload();
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
            <div className="text-lg font-bold text-gray-900">₦{pipelineTotal.toLocaleString()}</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-xs text-gray-500 font-medium">Active deals</div>
            <div className="text-lg font-bold text-gray-900">{activeDeals}</div>
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div>
            <div className="text-xs text-gray-500 font-medium">Avg deal</div>
            <div className="text-lg font-bold text-gray-900">₦{avgDeal.toLocaleString()}</div>
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
                  <div className="text-xs text-gray-500 pl-0">
                    ₦{calculateStageTotal(stage.contacts).toLocaleString()} in pipeline
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
                    draggable
                    onDragStart={() => onDragStart(contact.id, stage.id)}
                    className="kanban-card relative"
                  >
                    {/* Estimated value badge - top right */}
                    {contact.estimatedValue && (
                      <div className="absolute -top-1 -right-1 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                        ₦{contact.estimatedValue.toLocaleString()}
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

                    {/* Interest or message preview */}
                    {contact.interest ? (
                      <p className="text-xs text-gray-600 italic mt-2 line-clamp-1 leading-relaxed">
                        {contact.interest}
                      </p>
                    ) : contact.messages?.[0] ? (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-1 leading-relaxed">
                        {(contact.messages[0] as any).content}
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
                      <span className="text-[11px] text-gray-400">
                        {contact.lastMessageAt
                          ? format(new Date(contact.lastMessageAt), 'dd MMM')
                          : 'No messages'}
                      </span>
                      <Link
                        href="/dashboard/inbox"
                        className="text-[11px] text-forest-600 font-medium hover:underline"
                      >
                        Open chat →
                      </Link>
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
