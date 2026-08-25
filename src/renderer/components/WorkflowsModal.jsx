import { useCallback, useEffect, useState } from 'react';
import { Play, Plus, Save, Trash2, Workflow, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useLanguage } from '../context/LanguageContext';

export default function WorkflowsModal({ isOpen, onClose, onRun }) {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', steps: '' });
  const [error, setError] = useState('');

  const refresh = useCallback(async () => setItems(await window.electron.workflows.list()), []);
  useEffect(() => { if (isOpen) refresh(); }, [isOpen, refresh]);
  if (!isOpen) return null;

  const edit = (workflow) => {
    setEditing(workflow?.id || null);
    setForm(workflow ? { name: workflow.name, description: workflow.description, steps: workflow.steps.join('\n---\n') } : { name: '', description: '', steps: '' });
    setError('');
  };
  const save = async () => {
    const result = await window.electron.workflows.save({
      id: editing || undefined,
      name: form.name,
      description: form.description,
      steps: form.steps.split(/^---$/m).map(step => step.trim()).filter(Boolean)
    });
    if (!result.success) return setError(result.error);
    edit(null);
    await refresh();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Workflow className="w-5 h-5 text-primary" />{t('workflows.title')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="grid md:grid-cols-[1fr_1.2fr] min-h-0 overflow-hidden">
          <div className="p-4 border-r border-border overflow-y-auto space-y-3">
            <Button className="w-full" variant="outline" onClick={() => edit(null)}><Plus className="w-4 h-4 mr-2" />{t('workflows.new')}</Button>
            {items.map(item => (
              <div key={item.id} className="border border-border rounded-xl p-3 space-y-2">
                <button className="text-left w-full" onClick={() => edit(item)}><strong className="text-sm">{item.name}</strong><p className="text-xs text-muted-foreground mt-1">{item.description || t('workflows.stepsCount', { count: item.steps.length })}</p></button>
                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => onRun(item)}><Play className="w-3.5 h-3.5 mr-1" />{t('workflows.run')}</Button>
                  <Button size="icon" variant="ghost" onClick={async () => { await window.electron.workflows.delete(item.id); await refresh(); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-5 overflow-y-auto space-y-4">
            <Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder={t('workflows.name')} />
            <Textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder={t('workflows.description')} rows={2} />
            <Textarea value={form.steps} onChange={event => setForm({ ...form, steps: event.target.value })} placeholder={t('workflows.stepsPlaceholder')} rows={14} className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">{t('workflows.stepsHelp')}</p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={save}><Save className="w-4 h-4 mr-2" />{t('common.save')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
