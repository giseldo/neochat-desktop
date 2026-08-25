import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Monitor, 
  AppWindow, 
  X, 
  Check, 
  Loader2, 
  Sparkles, 
  RefreshCw, 
  Crop 
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export function SnipModal({ isOpen, onClose, onCaptureComplete }) {
  const { t } = useLanguage();
  const [sources, setSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'screen' | 'window'

  const loadSources = async () => {
    if (!window.electron?.screenCapture?.getSources) return;
    setIsLoading(true);
    try {
      const list = await window.electron.screenCapture.getSources();
      setSources(list || []);
      if (list && list.length > 0) {
        setSelectedSource(list[0]);
      }
    } catch (error) {
      console.error('Failed to load screen sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickCaptureFullscreen = async () => {
    if (!window.electron?.screenCapture?.captureFullscreen) return;
    setIsCapturing(true);
    try {
      const res = await window.electron.screenCapture.captureFullscreen();
      if (res && res.success && res.dataUrl) {
        onCaptureComplete({
          name: res.name || 'fullscreen-capture.png',
          base64: res.dataUrl,
          fileType: 'image',
          type: 'image/png'
        });
        onClose();
      }
    } catch (error) {
      console.error('Quick fullscreen capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirmSource = () => {
    if (!selectedSource || !selectedSource.thumbnail) return;
    onCaptureComplete({
      name: `${selectedSource.name.replace(/[^a-z0-9_-]/gi, '_')}.png`,
      base64: selectedSource.thumbnail,
      fileType: 'image',
      type: 'image/png'
    });
    onClose();
  };

  const filteredSources = sources.filter(s => {
    if (filterType === 'screen') return s.isScreen;
    if (filterType === 'window') return !s.isScreen;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {t('snip.title')}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t('snip.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Fullscreen Bar */}
        <div className="px-5 py-3 bg-muted/20 border-b border-border/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('snip.instantCapture')}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadSources}
              disabled={isLoading}
              className="h-7 text-xs px-2 text-muted-foreground"
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
              <span>{t('snip.refresh')}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleQuickCaptureFullscreen}
              disabled={isCapturing}
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs flex items-center gap-1.5"
            >
              {isCapturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Monitor className="w-3 h-3" />}
              <span>{t('snip.captureFullscreen')}</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-2 border-b border-border/40 flex items-center gap-1.5 text-xs bg-muted/10">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium",
              filterType === 'all' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t('snip.all', { count: sources.length })}
          </button>
          <button
            type="button"
            onClick={() => setFilterType('screen')}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1",
              filterType === 'screen' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="w-3 h-3" />
            <span>{t('snip.screens', { count: sources.filter(s => s.isScreen).length })}</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('window')}
            className={cn(
              "px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1",
              filterType === 'window' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AppWindow className="w-3 h-3" />
            <span>{t('snip.windows', { count: sources.filter(s => !s.isScreen).length })}</span>
          </button>
        </div>

        {/* Source Grid */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {isLoading ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>{t('snip.loadingSources')}</span>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2 text-xs">
              <span>{t('snip.noSources')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredSources.map((source) => {
                const isSelected = selectedSource?.id === source.id;
                return (
                  <div
                    key={source.id}
                    onClick={() => setSelectedSource(source)}
                    onDoubleClick={handleConfirmSource}
                    className={cn(
                      "group relative rounded-xl border p-2 flex flex-col gap-1.5 cursor-pointer transition-all hover:scale-[1.02]",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-md"
                        : "border-border/70 bg-card hover:border-border hover:bg-muted/30"
                    )}
                  >
                    {/* Thumbnail preview */}
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black/10 dark:bg-black/40 flex items-center justify-center relative">
                      {source.thumbnail ? (
                        <img 
                          src={source.thumbnail} 
                          alt={source.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Monitor className="w-8 h-8 opacity-30" />
                      )}

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Source label */}
                    <div className="flex items-center gap-1.5 min-w-0 pt-0.5">
                      {source.isScreen ? (
                        <Monitor className="w-3 h-3 text-muted-foreground shrink-0" />
                      ) : (
                        <AppWindow className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-[11px] font-medium text-foreground truncate" title={source.name}>
                        {source.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground truncate">
            {selectedSource ? t('snip.selected', { name: selectedSource.name }) : t('snip.noSelection')}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSource}
              disabled={!selectedSource}
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('snip.attachImage')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SnipModal;
