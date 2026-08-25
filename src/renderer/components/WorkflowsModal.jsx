import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Play, Plus, Save, Trash2, Workflow, X } from 'lucide-react';
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
  const [schedules, setSchedules] = useState([]);
  const [schedule, setSchedule] = useState({ type: 'daily', time: '09:00', intervalMinutes: 60 });

  const refresh = useCallback(async () => {
    setItems(await window.electron.workflows.list());
    setSchedules(await window.electron.schedules.list());
  }, []);
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
  const saveSchedule = async () => {
    if (!editing) return setError(t('workflows.saveBeforeSchedule'));
    const result = await window.electron.schedules.save({ ...schedule, workflowId: editing });
    if (!result.success) return setError(result.error);
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
                {schedules.filter(scheduleItem => scheduleItem.workflowId === item.id).map(scheduleItem => (
                  <div key={scheduleItem.id} className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded px-2 py-1">
                    <span><CalendarClock className="inline w-3 h-3 mr-1" />{scheduleItem.type === 'daily' ? scheduleItem.time : t('workflows.everyMinutes', { count: scheduleItem.intervalMinutes })}</span>
                    <button onClick={async () => { await window.electron.schedules.delete(scheduleItem.id); await refresh(); }}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="p-5 overflow-y-auto space-y-4">
            <Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder={t('workflows.name')} />
            <Textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder={t('workflows.description')} rows={2} />
            <Textarea value={form.steps} onChange={event => setForm({ ...form, steps: event.target.value })} placeholder={t('workflows.stepsPlaceholder')} rows={14} className="font-mono text-sm" />
            <p className="text-xs text-muted-foreground">{t('workflows.stepsHelp')}</p>
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4" />{t('workflows.schedule')}</h3>
              <div className="flex flex-wrap gap-2">
                <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={schedule.type} onChange={event => setSchedule({ ...schedule, type: event.target.value })}>
                  <option value="daily">{t('workflows.daily')}</option>
                  <option value="interval">{t('workflows.interval')}</option>
                </select>
                {schedule.type === 'daily' ? <Input className="w-32" type="time" value={schedule.time} onChange={event => setSchedule({ ...schedule, time: event.target.value })} /> : <Input className="w-40" type="number" min="1" value={schedule.intervalMinutes} onChange={event => setSchedule({ ...schedule, intervalMinutes: Number(event.target.value) })} />}
                <Button variant="outline" onClick={saveSchedule}>{t('workflows.addSchedule')}</Button>
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={save}><Save className="w-4 h-4 mr-2" />{t('common.save')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
