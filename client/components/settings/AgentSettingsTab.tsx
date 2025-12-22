/**
 * Agent Smith - Modern chat interface for Claude Agent SDK
 * Copyright (C) 2025 KenKai
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Power, PowerOff, Loader2, Info, X } from 'lucide-react';
import { toast } from '../../utils/toast';

interface Agent {
  id: string;
  description: string;
  enabled: boolean;
  builtin: boolean;
}

export function AgentSettingsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgent, setNewAgent] = useState({
    id: '',
    description: '',
    prompt: '',
    tools: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${id}/toggle`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setAgents(agents.map(agent =>
          agent.id === id ? { ...agent, enabled: data.enabled } : agent
        ));
        toast.success(
          data.enabled ? 'Agent enabled' : 'Agent disabled',
          { description: id }
        );
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error);
      toast.error('Failed to toggle agent');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete the agent "${id}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setAgents(agents.filter(agent => agent.id !== id));
        toast.success('Agent deleted', { description: id });
      } else {
        toast.error('Failed to delete agent', { description: data.error });
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tools = newAgent.tools.trim()
        ? newAgent.tools.split(',').map(t => t.trim()).filter(Boolean)
        : undefined;

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newAgent.id,
          description: newAgent.description,
          prompt: newAgent.prompt,
          tools,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Agent added', { description: newAgent.id });
        setNewAgent({ id: '', description: '', prompt: '', tools: '' });
        setShowAddForm(false);
        await loadAgents();
      } else {
        toast.error('Failed to add agent', { description: data.error });
      }
    } catch (error) {
      console.error('Failed to add agent:', error);
      toast.error('Failed to add agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Info banner */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
        <Info size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-300 mb-1">About Agents</p>
          <p>
            Agents are specialized AI assistants with specific capabilities.
            Built-in agents can be enabled/disabled. You can also add custom agents
            by providing their configuration.
          </p>
        </div>
      </div>

      {/* Agent list */}
      <div className="space-y-2 mb-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/[0.07] transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-100">{agent.id}</span>
                {agent.builtin && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                    Built-in
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{agent.description}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Toggle button */}
              <button
                onClick={() => handleToggle(agent.id)}
                className={`p-2 rounded-lg transition-colors ${
                  agent.enabled
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                }`}
                title={agent.enabled ? 'Disable agent' : 'Enable agent'}
              >
                {agent.enabled ? (
                  <Power size={18} />
                ) : (
                  <PowerOff size={18} />
                )}
              </button>

              {/* Delete button (only for custom agents) */}
              {!agent.builtin && (
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Delete agent"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add agent section */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:text-gray-300 hover:border-white/30 transition-colors"
        >
          <Plus size={20} />
          <span>Add Custom Agent</span>
        </button>
      ) : (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-100">Add Custom Agent</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewAgent({ id: '', description: '', prompt: '', tools: '' });
              }}
              className="text-gray-400 hover:text-gray-300"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleAddAgent} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Agent ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newAgent.id}
                onChange={(e) => setNewAgent({ ...newAgent, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="my-custom-agent"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white/20"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and dashes only</p>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Description <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newAgent.description}
                onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                placeholder="Brief description of what this agent does"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                System Prompt <span className="text-red-400">*</span>
              </label>
              <textarea
                value={newAgent.prompt}
                onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
                placeholder="You are a specialized agent that..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white/20 min-h-[120px] resize-y"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">
                Tools (optional)
              </label>
              <input
                type="text"
                value={newAgent.tools}
                onChange={(e) => setNewAgent({ ...newAgent, tools: e.target.value })}
                placeholder="Read, Write, Grep (comma-separated)"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-white/20"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for all tools</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Agent
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
