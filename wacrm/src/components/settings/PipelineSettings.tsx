'use client';

import { useState, useEffect } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface KanbanStage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface PipelineSettingsProps {
  initialStages: KanbanStage[];
}

export default function PipelineSettings({ initialStages }: PipelineSettingsProps) {
  const [stages, setStages] = useState(initialStages);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');
  const [isAdding, setIsAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, stageId: string) => {
    setDraggedId(stageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, droppedOnId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || draggedId === droppedOnId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = stages.findIndex(s => s.id === draggedId);
    const droppedIndex = stages.findIndex(s => s.id === droppedOnId);

    if (draggedIndex === -1 || droppedIndex === -1) return;

    // Reorder locally first (optimistic update)
    const newStages = [...stages];
    const [removed] = newStages.splice(draggedIndex, 1);
    newStages.splice(droppedIndex, 0, removed);
    setStages(newStages);
    setDraggedId(null);

    // Send to server
    setSavingId(draggedId);
    try {
      const res = await fetch('/api/kanban/stages/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: draggedId,
          newPosition: droppedIndex,
        }),
      });

      if (!res.ok) throw new Error('Failed to reorder stages');
      toast.success('Pipeline stages reordered');
    } catch (error) {
      // Revert on error
      setStages(initialStages);
      toast.error('Failed to reorder stages');
    } finally {
      setSavingId(null);
    }
  };

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      toast.error('Stage name is required');
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch('/api/kanban/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStageName,
          color: newStageColor,
        }),
      });

      if (!res.ok) throw new Error('Failed to create stage');
      const data = await res.json();
      
      setStages([...stages, data.stage]);
      setNewStageName('');
      setNewStageColor('#6366f1');
      toast.success('Stage created');
    } catch (error) {
      toast.error('Failed to create stage');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    if (!confirm(`Delete "${stageName}" stage? Contacts will not be deleted.`)) return;

    try {
      const res = await fetch(`/api/kanban/stages/${stageId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete stage');
      
      setStages(stages.filter(s => s.id !== stageId));
      toast.success('Stage deleted');
    } catch (error) {
      toast.error('Failed to delete stage');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Stages</h3>
        <p className="text-sm text-gray-600 mb-6">Drag stages to reorder them. Colors help your team quickly identify pipeline status.</p>
      </div>

      {/* Add Stage Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Add New Stage</h4>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Stage name (e.g., Proposal Sent)"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            className="flex-1 min-w-xs input"
            disabled={isAdding}
          />
          <div className="flex gap-2">
            <input
              type="color"
              value={newStageColor}
              onChange={(e) => setNewStageColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
              disabled={isAdding}
            />
            <button
              onClick={handleAddStage}
              disabled={isAdding}
              className="btn-primary px-4 py-2 flex items-center gap-2"
            >
              <Plus size={16} /> Add Stage
            </button>
          </div>
        </div>
      </div>

      {/* Stages List */}
      <div className="space-y-2">
        {stages.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 text-center border-2 border-dashed border-gray-200 rounded">
            No pipeline stages yet
          </p>
        ) : (
          stages.map((stage) => (
            <div
              key={stage.id}
              draggable
              onDragStart={(e) => handleDragStart(e, stage.id)}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex items-center gap-3 p-3 bg-white rounded-lg border-2 transition-all ${
                dragOverId === stage.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              } ${savingId === stage.id ? 'opacity-50' : ''} cursor-move hover:border-gray-300`}
            >
              <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="flex-1 font-medium text-gray-900">{stage.name}</span>
              <button
                onClick={() => handleDeleteStage(stage.id, stage.name)}
                className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                title="Delete stage"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500">
        💡 Drag stages to reorder them. The order will be reflected in your Kanban board immediately.
      </p>
    </div>
  );
}
