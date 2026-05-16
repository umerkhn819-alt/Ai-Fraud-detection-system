import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Copy, Check, Trash2, Plus } from 'lucide-react';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

export default function APIKeys() {
  const qc = useQueryClient();
  const [copiedKey, setCopiedKey] = useState(null);
  const [newKeyData, setNewKeyData] = useState(null);
  const [keyName, setKeyName] = useState('');

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const r = await api.get('/api-keys/');
      return r.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name) => {
      const r = await api.post('/api-keys/', { name });
      return r.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyData(data);
      setKeyName('');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api-keys/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    createMutation.mutate(keyName);
  };

  return (
    <div className="card p-5 space-y-4 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-1">
        <Key className="h-4 w-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">API Keys</h2>
      </div>
      <p className="text-xs text-[var(--text-muted)]">Manage your API keys for external integrations.</p>

      {newKeyData && (
        <div className="rounded-xl border border-success-500/30 bg-success-500/10 p-4 space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-2 bg-success-500"></div>
          <h3 className="text-sm font-bold text-success-600 dark:text-success-400">New API Key Generated</h3>
          <p className="text-xs text-[var(--text-secondary)]">Please copy your API key now. You won't be able to see it again!</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 p-2 rounded bg-black/10 dark:bg-black/30 font-mono text-sm text-[var(--text-primary)] break-all border border-success-500/20">
              {newKeyData.key}
            </code>
            <button 
              onClick={() => copyToClipboard(newKeyData.key, 'new')}
              className="p-2 rounded bg-success-500 text-white hover:bg-success-600 transition-colors"
            >
              {copiedKey === 'new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button 
            onClick={() => setNewKeyData(null)}
            className="text-xs font-semibold text-success-600 dark:text-success-400 hover:underline mt-2 inline-block"
          >
            I have saved it securely
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input 
          type="text" 
          value={keyName} 
          onChange={e => setKeyName(e.target.value)} 
          placeholder="New Key Name (e.g. Production Backend)"
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" 
        />
        <button 
          type="submit"
          disabled={createMutation.isPending || !keyName.trim()}
          className="flex items-center gap-1 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-all"
        >
          <Plus className="w-4 h-4" /> Create
        </button>
      </form>

      <div className="mt-4">
        {isLoading ? (
          <div className="animate-pulse h-20 bg-[var(--bg-secondary)] rounded-xl"></div>
        ) : keys?.length === 0 ? (
          <div className="text-center text-sm text-[var(--text-muted)] py-4 border border-dashed border-[var(--border)] rounded-xl">
            No API keys found.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)] rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Created</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {keys?.map(key => (
                  <tr key={key.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{key.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{formatDate(key.created_at)}</td>
                    <td className="px-4 py-3">
                      {key.is_active ? 
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-success-500/20 text-success-500">Active</span> : 
                        <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-full bg-red-500/20 text-red-500">Revoked</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {key.is_active && (
                        <button 
                          onClick={() => revokeMutation.mutate(key.id)}
                          disabled={revokeMutation.isPending}
                          className="text-red-500 hover:text-red-600 p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors inline-block"
                          title="Revoke Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
