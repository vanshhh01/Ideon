import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle } from 'lucide-react';
import { updateSettings, fetchAvailableModels } from '../services/api';

const DEFAULT_MODELS = [
  { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B (Fast & High Accuracy • Recommended)" },
  { id: "groq/compound-mini", name: "Groq Compound Mini (Ultra Fast)" },
  { id: "groq/compound", name: "Groq Compound (Deep Reasoning)" },
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B (Large Foundation Model)" },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
];

export default function SettingsModal({ isOpen, onClose, currentStatus, onSettingsUpdated }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(currentStatus?.model || "qwen/qwen3.8-27b");
  const [modelList, setModelList] = useState(DEFAULT_MODELS);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableModels().then(liveModels => {
        if (liveModels && liveModels.length > 0) {
          const formatted = liveModels.map(m => ({ id: m, name: m }));
          setModelList(formatted);
          setModel(prev => (!prev || !liveModels.includes(prev) ? liveModels[0] : prev));
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payloadKey = apiKey.trim() ? apiKey.trim() : null;
      await updateSettings(payloadKey, model);
      setMessage({ type: "success", text: "Settings saved successfully for this session!" });
      if (onSettingsUpdated) {
        onSettingsUpdated();
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update settings" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#131211] border border-[var(--rule)] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[var(--fg-faint)] hover:text-[var(--fg)] rounded-full hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1a1917] text-[var(--fg)] border border-[var(--rule)] flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-[var(--fg)]">Model Credentials</h3>
            <p className="text-xs text-[var(--fg-faint)]">Configure Groq API key and inference model</p>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
          }`}>
            {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* API Key Input */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--fg-soft)] mb-1.5">
              Groq API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={currentStatus?.api_key_configured ? "•••••••••••• (Configured via .env)" : "gsk_..."}
              className="w-full px-3.5 py-2 rounded-xl bg-[#1a1917] border border-[var(--rule)] text-[var(--fg)] placeholder-[var(--fg-faint)] text-sm focus:outline-none focus:border-[var(--fg-soft)] font-mono"
            />
            <p className="text-[11px] text-[var(--fg-faint)] mt-1">
              Can also be specified via <code>GROQ_API_KEY</code> in <code>backend/.env</code>.
            </p>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-[var(--fg-soft)] mb-1.5">
              Groq LLM Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#1a1917] border border-[var(--rule)] text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--fg-soft)]"
            >
              {modelList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--rule-light)]">
            <button
              type="button"
              onClick={onClose}
              className="pill-secondary !h-9 !px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="pill !h-9 !px-5 text-xs"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
