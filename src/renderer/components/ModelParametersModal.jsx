import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X, Check, RotateCcw, Cpu, Sparkles, Zap, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useLanguage } from '../context/LanguageContext';

const CONTEXT_PRESETS = [
  { label: '8k', value: 8192 },
  { label: '16k', value: 16384 },
  { label: '32k', value: 32768 },
  { label: '64k', value: 64000 },
  { label: '128k', value: 128000 },
  { label: '256k', value: 256000 },
  { label: '1M', value: 1000000 }
];

export function ModelParametersModal({
  isOpen,
  onClose,
  selectedModel,
  modelConfigs = {},
  onModelConfigUpdated
}) {
  const { t } = useLanguage();

  const [contextSize, setContextSize] = useState(64000);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.95);
  const [reasoningEffort, setReasoningEffort] = useState('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(null);

  // Load current parameters when modal opens or model changes
  useEffect(() => {
    if (!isOpen) {
      setSaveSuccess(false);
      return;
    }

    const loadParams = async () => {
      try {
        const settings = await window.electron.getSettings();
        setCurrentSettings(settings);

        const customConfig = settings.customModels?.[selectedModel];
        const apiConfig = modelConfigs[selectedModel];
        const effectiveContext = customConfig?.context || apiConfig?.context || 64000;

        setContextSize(effectiveContext);
        setTemperature(settings.temperature ?? 0.7);
        setTopP(settings.top_p ?? 0.95);
        setReasoningEffort(settings.reasoning_effort || 'medium');
        setSaveSuccess(false);
      } catch (err) {
        console.error('[ModelParametersModal] Error loading settings:', err);
      }
    };

    loadParams();
  }, [isOpen, selectedModel, modelConfigs]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = currentSettings || await window.electron.getSettings();
      const existingCustom = settings.customModels?.[selectedModel] || {};
      const apiConfig = modelConfigs[selectedModel] || {};

      const updatedCustomModels = {
        ...(settings.customModels || {}),
        [selectedModel]: {
          ...existingCustom,
          context: Number(contextSize) || 64000,
          displayName: existingCustom.displayName || apiConfig.displayName || selectedModel,
          vision_supported: existingCustom.vision_supported ?? apiConfig.vision_supported ?? false,
          builtin_tools_supported: existingCustom.builtin_tools_supported ?? apiConfig.builtin_tools_supported ?? false,
          isCustom: true
        }
      };

      const updatedSettings = {
        ...settings,
        temperature: Number(temperature),
        top_p: Number(topP),
        reasoning_effort: reasoningEffort,
        customModels: updatedCustomModels
      };

      await window.electron.saveSettings(updatedSettings);
      setCurrentSettings(updatedSettings);

      if (onModelConfigUpdated) {
        onModelConfigUpdated(selectedModel, updatedCustomModels[selectedModel], updatedSettings);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('[ModelParametersModal] Error saving parameters:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    const apiConfig = modelConfigs[selectedModel];
    const defaultContext = apiConfig?.context || (selectedModel?.toLowerCase().includes('deepseek') ? 64000 : 8192);
    setContextSize(defaultContext);
    setTemperature(0.7);
    setTopP(0.95);
    setReasoningEffort('medium');
  };

  const pruningThreshold = Math.floor((Number(contextSize) || 64000) * 0.5);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-card text-card-foreground border border-border/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight flex items-center gap-2">
                {t('chat.modelParameters') || 'Parâmetros do Modelo'}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[280px]">
                {selectedModel}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Active Model Info Badge */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/60 text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{selectedModel}</span>
            </div>
            <Badge variant="secondary" className="font-mono">
              {(Number(contextSize) || 0).toLocaleString()} tokens
            </Badge>
          </div>

          {/* Context Window Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" />
                {t('chat.contextWindow') || 'Janela de Contexto (Tokens)'}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="4096"
                  max="2000000"
                  step="1024"
                  value={contextSize}
                  onChange={(e) => setContextSize(Number(e.target.value) || 0)}
                  className="w-28 h-8 text-right font-mono text-sm"
                />
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="4096"
              max="256000"
              step="1024"
              value={Math.min(256000, Number(contextSize) || 64000)}
              onChange={(e) => setContextSize(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                {t('chat.contextPresets') || 'Predefinições rápidas:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CONTEXT_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant={contextSize === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-md font-mono"
                    onClick={() => setContextSize(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Pruning info alert */}
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {t('chat.contextWindowHelp', { count: pruningThreshold.toLocaleString() }) ||
                  `Poda automática configurada para 50%: ativada quando o histórico atingir ~${pruningThreshold.toLocaleString()} tokens.`}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            {/* Temperature Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t('chat.temperature') || 'Temperatura'}
                </Label>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-muted rounded">
                  {temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('chat.temperatureHelp') || 'Controla a criatividade (0.0 determinístico, 1.0+ criativo).'}
              </p>
            </div>

            {/* Top P Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t('chat.topP') || 'Top-P'}
                </Label>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-muted rounded">
                  {topP}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('chat.resetDefault') || 'Restaurar Padrão'}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4 text-green-400" />
                  <span>{t('chat.parametersSaved') || 'Salvo!'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{isSaving ? (t('common.loading') || 'Salvando...') : (t('chat.saveParameters') || 'Salvar')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ModelParametersModal;
