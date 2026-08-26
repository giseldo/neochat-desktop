import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  ArrowRight,
  BarChart3, 
  BookOpen, 
  Bug, 
  CalendarClock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  FileCode2, 
  FlaskConical, 
  HelpCircle, 
  Layers, 
  Lightbulb, 
  ListChecks, 
  Newspaper, 
  PenTool, 
  Play, 
  Plus, 
  Save, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  Workflow, 
  X 
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedWorkflowTemplates } from '../lib/defaultWorkflows';

const ICON_MAP = {
  ShieldCheck,
  Newspaper,
  PenTool,
  Bug,
  BarChart3,
  FlaskConical,
  ListChecks,
  Sparkles,
  Workflow,
};

function DynamicIcon({ name, className = 'w-4 h-4' }) {
  const Comp = ICON_MAP[name] || Workflow;
  return <Comp className={className} />;
}

export default function WorkflowsModal({ isOpen, onClose, onRun }) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'templates'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', steps: '' });
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [schedule, setSchedule] = useState({ type: 'daily', time: '09:00', intervalMinutes: 60 });
  const [showHelp, setShowHelp] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const templates = useMemo(() => getLocalizedWorkflowTemplates(language), [language]);

  const refresh = useCallback(async () => {
    try {
      const list = await window.electron.workflows.list();
      const scheds = await window.electron.schedules.list();
      setItems(Array.isArray(list) ? list : []);
      setSchedules(Array.isArray(scheds) ? scheds : []);
    } catch (err) {
      console.error('Error refreshing workflows:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setError('');
      setSuccess('');
    }
  }, [isOpen, refresh]);

  const parsedSteps = useMemo(() => {
    if (!form.steps) return [];
    return form.steps
      .split(/^---$/m)
      .map(step => step.trim())
      .filter(Boolean);
  }, [form.steps]);

  const detectedVariables = useMemo(() => {
    if (!form.steps) return [];
    const found = new Set();
    const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    let match;
    while ((match = regex.exec(form.steps)) !== null) {
      found.add(match[1]);
    }
    return Array.from(found);
  }, [form.steps]);

  if (!isOpen) return null;

  const edit = (workflow) => {
    setActiveTab('my');
    setSelectedTemplate(null);
    setEditing(workflow?.id || null);
    setForm(workflow ? {
      name: workflow.name,
      description: workflow.description || '',
      steps: Array.isArray(workflow.steps) ? workflow.steps.join('\n---\n') : ''
    } : {
      name: '',
      description: '',
      steps: ''
    });
    setError('');
    setSuccess('');
  };

  const loadTemplate = (tpl) => {
    setEditing(null);
    setForm({
      name: tpl.name,
      description: tpl.description || '',
      steps: Array.isArray(tpl.steps) ? tpl.steps.join('\n---\n') : ''
    });
    if (tpl.suggestedSchedule) {
      setSchedule({
        type: tpl.suggestedSchedule.type,
        time: tpl.suggestedSchedule.time || '09:00',
        intervalMinutes: tpl.suggestedSchedule.intervalMinutes || 60
      });
    }
    setActiveTab('my');
    setSelectedTemplate(null);
    setError('');
    setSuccess(t('workflows.templateLoaded'));
    setTimeout(() => setSuccess(''), 3500);
  };

  const handleRunTemplateDirectly = async (tpl) => {
    try {
      const result = await window.electron.workflows.save({
        name: tpl.name,
        description: tpl.description,
        steps: tpl.steps
      });
      if (result?.success && result?.workflow) {
        await refresh();
        onRun(result.workflow);
      }
    } catch (err) {
      console.error('Error running template:', err);
    }
  };

  const save = async () => {
    const rawSteps = form.steps.split(/^---$/m).map(step => step.trim()).filter(Boolean);
    if (!form.name.trim()) {
      return setError(t('workflows.name') + ' é obrigatório');
    }
    if (rawSteps.length === 0) {
      return setError('Adicione pelo menos 1 etapa separada por ---');
    }

    const result = await window.electron.workflows.save({
      id: editing || undefined,
      name: form.name,
      description: form.description,
      steps: rawSteps
    });
    if (!result.success) return setError(result.error);
    
    setSuccess(t('workflows.saveSuccess'));
    setTimeout(() => setSuccess(''), 3000);
    edit(null);
    await refresh();
  };

  const saveSchedule = async () => {
    if (!editing) return setError(t('workflows.saveBeforeSchedule'));
    const result = await window.electron.schedules.save({ ...schedule, workflowId: editing });
    if (!result.success) return setError(result.error);
    await refresh();
    setSuccess('Agendamento adicionado!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" 
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Workflow className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base leading-tight">{t('workflows.title')}</h2>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Agente</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Automação de tarefas sequenciais & agendamentos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHelp(prev => !prev)}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">{t('workflows.howItWorks')}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Informative / Help Banner */}
        {showHelp && (
          <div className="bg-primary/5 border-b border-primary/20 px-5 py-3 text-xs space-y-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                {t('workflows.howItWorksSubtitle')}
              </span>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-[11.5px] text-muted-foreground">
              <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 space-y-1">
                <strong className="text-foreground flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">1</span>
                  Etapas Sequenciais
                </strong>
                <p>Use <code className="bg-muted px-1 rounded text-primary font-mono">---</code> em uma linha separada para dividir tarefas. O agente executa cada uma em ordem.</p>
              </div>

              <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 space-y-1">
                <strong className="text-foreground flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">2</span>
                  Variáveis Dinâmicas
                </strong>
                <p>Use <code className="bg-muted px-1 rounded text-primary font-mono">{'{{nome}}'}</code> para campos customizáveis ou parâmetros dinâmicos.</p>
              </div>

              <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 space-y-1">
                <strong className="text-foreground flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">3</span>
                  Execução Agente
                </strong>
                <p>O assistente ativa automaticamente o modo agente, validando cada etapa antes de avançar para a próxima.</p>
              </div>

              <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 space-y-1">
                <strong className="text-foreground flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">4</span>
                  Agendamento
                </strong>
                <p>Configure execuções automáticas diárias (ex: 08:30) ou por intervalos de minutos em segundo plano.</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid Content */}
        <div className="grid md:grid-cols-[1fr_1.3fr] flex-1 min-h-0 overflow-hidden">
          
          {/* Left Column: Navigation & List */}
          <div className="p-4 border-r border-border overflow-y-auto flex flex-col space-y-3 bg-muted/5">
            
            {/* Tab switchers */}
            <div className="flex p-1 bg-muted rounded-xl gap-1">
              <button 
                onClick={() => { setActiveTab('my'); setSelectedTemplate(null); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'my' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                {t('workflows.myWorkflows')}
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15 font-bold">
                  {items.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('templates')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'templates' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {t('workflows.templates')}
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                  {templates.length}
                </span>
              </button>
            </div>

            {/* If tab is 'my' */}
            {activeTab === 'my' && (
              <>
                <Button 
                  className="w-full justify-center h-9 text-xs font-medium shadow-sm" 
                  variant="outline" 
                  onClick={() => edit(null)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {t('workflows.new')}
                </Button>

                {items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center border border-dashed border-border/80 rounded-xl space-y-3 my-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="text-xs font-semibold">{t('workflows.emptyTitle')}</strong>
                      <p className="text-[11px] text-muted-foreground max-w-[220px]">
                        {t('workflows.emptyDesc')}
                      </p>
                    </div>

                    <div className="w-full space-y-1.5 pt-2">
                      {templates.slice(0, 3).map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => loadTemplate(tpl)}
                          className="w-full text-left p-2 rounded-lg border border-border/60 bg-card hover:border-primary/50 hover:bg-accent/40 transition-all text-xs flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <DynamicIcon name={tpl.icon} className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-medium truncate text-[11.5px]">{tpl.name}</span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>

                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setActiveTab('templates')}
                      className="text-xs text-primary h-auto p-0 pt-1 font-normal"
                    >
                      Ver todos os {templates.length} modelos prontos →
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto">
                    {items.map(item => {
                      const isSelected = editing === item.id;
                      const itemSchedules = schedules.filter(s => s.workflowId === item.id);
                      return (
                        <div 
                          key={item.id} 
                          className={`border rounded-xl p-3 space-y-2 transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                              : 'border-border bg-card hover:border-border/80'
                          }`}
                        >
                          <button className="text-left w-full" onClick={() => edit(item)}>
                            <div className="flex items-center justify-between">
                              <strong className="text-xs font-semibold">{item.name}</strong>
                              <Badge variant="secondary" className="text-[10px] font-normal py-0">
                                {t('workflows.stepsCount', { count: item.steps?.length || 0 })}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </button>

                          <div className="flex items-center justify-between pt-1 border-t border-border/50">
                            <div className="flex items-center gap-1">
                              {itemSchedules.map(scheduleItem => (
                                <div key={scheduleItem.id} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                                  <CalendarClock className="w-2.5 h-2.5 text-primary" />
                                  <span>{scheduleItem.type === 'daily' ? scheduleItem.time : `${scheduleItem.intervalMinutes}m`}</span>
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      await window.electron.schedules.delete(scheduleItem.id); 
                                      await refresh(); 
                                    }}
                                    className="hover:text-destructive ml-0.5"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2 text-xs font-medium text-primary hover:bg-primary/10" 
                                onClick={() => onRun(item)}
                              >
                                <Play className="w-3 h-3 mr-1 fill-current" />
                                {t('workflows.run')}
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                                onClick={async () => { 
                                  await window.electron.workflows.delete(item.id); 
                                  if (editing === item.id) edit(null);
                                  await refresh(); 
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* If tab is 'templates' */}
            {activeTab === 'templates' && (
              <div className="space-y-2 overflow-y-auto">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11.5px] text-amber-700 dark:text-amber-300">
                  💡 Clique em qualquer modelo abaixo para ver os detalhes, testar diretamente ou carregar no editor.
                </div>
                {templates.map(tpl => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`w-full text-left p-3 rounded-xl border transition-all space-y-1.5 ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-xs">
                          <DynamicIcon name={tpl.icon} className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{tpl.name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 font-normal">
                          {tpl.steps.length} etapas
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {tpl.description}
                      </p>
                      {tpl.variables?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {tpl.variables.map(v => (
                            <span key={v} className="text-[9.5px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Editor OR Template Detail View */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex flex-col justify-between">
            
            {/* If user is inspecting a template from the templates tab */}
            {activeTab === 'templates' && selectedTemplate ? (
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="border border-border/80 rounded-xl p-4 bg-muted/10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <DynamicIcon name={selectedTemplate.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{selectedTemplate.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedTemplate.description}</p>
                      </div>
                    </div>
                  </div>

                  {selectedTemplate.variables?.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs">
                      <span className="text-muted-foreground">{t('workflows.variablesDetected')}:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.variables.map(v => (
                          <Badge key={v} variant="secondary" className="font-mono text-[11px]">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{t('workflows.previewSteps')} ({selectedTemplate.steps.length})</span>
                  </div>
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {selectedTemplate.steps.map((step, idx) => (
                      <div key={idx} className="border border-border/70 rounded-xl p-3 bg-card text-xs space-y-1.5">
                        <span className="font-semibold text-primary flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          Etapa {idx + 1}
                        </span>
                        <p className="text-muted-foreground text-[11.5px] leading-relaxed whitespace-pre-wrap pl-5">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex flex-wrap gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => loadTemplate(selectedTemplate)}
                    className="text-xs gap-1.5"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Personalizar no Editor
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleRunTemplateDirectly(selectedTemplate)}
                    className="text-xs gap-1.5 font-medium"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Executar este Modelo
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal Editor Form */
              <div className="space-y-3.5 flex-1 flex flex-col">
                
                {/* Quick template loader selector */}
                <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/60 gap-2">
                  <span className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground whitespace-nowrap">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {t('workflows.loadTemplate')}
                  </span>
                  <select 
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs max-w-[280px] truncate focus:outline-none focus:ring-1 focus:ring-primary"
                    defaultValue=""
                    onChange={(e) => {
                      const found = templates.find(t => t.id === e.target.value);
                      if (found) loadTemplate(found);
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>{t('workflows.selectTemplate')}</option>
                    {templates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                {/* Form fields */}
                <div className="space-y-3">
                  <Input 
                    value={form.name} 
                    onChange={event => setForm({ ...form, name: event.target.value })} 
                    placeholder={t('workflows.name')} 
                    className="text-sm font-medium h-9"
                  />

                  <Textarea 
                    value={form.description} 
                    onChange={event => setForm({ ...form, description: event.target.value })} 
                    placeholder={t('workflows.description')} 
                    rows={2} 
                    className="text-xs resize-none"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5" />
                        Etapas do Workflow
                      </span>
                      {parsedSteps.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-primary font-medium">
                            {t('workflows.stepsDetected', { count: parsedSteps.length })}
                          </span>
                          <button 
                            onClick={() => setShowPreview(prev => !prev)}
                            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                          >
                            {showPreview ? t('workflows.hidePreview') : t('workflows.showPreview')}
                            {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>

                    <Textarea 
                      value={form.steps} 
                      onChange={event => setForm({ ...form, steps: event.target.value })} 
                      placeholder={t('workflows.stepsPlaceholder')} 
                      rows={showPreview && parsedSteps.length > 0 ? 6 : 9} 
                      className="font-mono text-xs leading-relaxed" 
                    />

                    <p className="text-[11px] text-muted-foreground">
                      {t('workflows.stepsHelp')}
                    </p>
                  </div>
                </div>

                {/* Live Step Preview & Variables */}
                {showPreview && parsedSteps.length > 0 && (
                  <div className="space-y-2 border border-border/70 rounded-xl p-3 bg-muted/20 text-xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                        {t('workflows.previewSteps')} ({parsedSteps.length})
                      </span>
                      {detectedVariables.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-muted-foreground font-medium">Variáveis:</span>
                          {detectedVariables.map(v => (
                            <Badge key={v} variant="secondary" className="font-mono text-[10px] px-1 py-0">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                      {parsedSteps.map((step, idx) => (
                        <div key={idx} className="bg-card border border-border/60 rounded-lg p-2 text-[11px] flex gap-2">
                          <span className="font-bold text-primary shrink-0">{idx + 1}.</span>
                          <span className="text-foreground line-clamp-2">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduling Section */}
                <div className="border-t border-border pt-3 space-y-2.5">
                  <h3 className="text-xs font-semibold flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-primary" />
                    {t('workflows.schedule')}
                  </h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select 
                      className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" 
                      value={schedule.type} 
                      onChange={event => setSchedule({ ...schedule, type: event.target.value })}
                    >
                      <option value="daily">{t('workflows.daily')}</option>
                      <option value="interval">{t('workflows.interval')}</option>
                    </select>

                    {schedule.type === 'daily' ? (
                      <Input 
                        className="w-28 h-8 text-xs" 
                        type="time" 
                        value={schedule.time} 
                        onChange={event => setSchedule({ ...schedule, time: event.target.value })} 
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input 
                          className="w-24 h-8 text-xs" 
                          type="number" 
                          min="1" 
                          value={schedule.intervalMinutes} 
                          onChange={event => setSchedule({ ...schedule, intervalMinutes: Number(event.target.value) })} 
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={saveSchedule} 
                      className="h-8 text-xs font-medium"
                      disabled={!editing}
                      title={!editing ? t('workflows.saveBeforeSchedule') : ''}
                    >
                      {t('workflows.addSchedule')}
                    </Button>
                  </div>
                </div>

                {/* Status messages */}
                {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">{error}</p>}
                {success && <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-lg flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{success}</p>}

                {/* Save button */}
                <div className="pt-2 flex justify-end">
                  <Button onClick={save} className="h-8 text-xs font-medium px-4">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {t('common.save')}
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
