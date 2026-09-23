import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Check, Download, RefreshCw, Search, Store, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

function MarketAssistantAvatar({ avatar, title }) {
  const [imageError, setImageError] = useState(false);
  const isUrl = typeof avatar === 'string' && (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image/'));

  if (isUrl && !imageError) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
        <img
          src={avatar}
          alt={title || ''}
          className="h-full w-full object-cover select-none"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-xl select-none">
      {avatar && !isUrl ? (
        <span className="leading-none">{avatar}</span>
      ) : (
        <Bot className="h-5 w-5 text-primary" />
      )}
    </div>
  );
}

export default function AssistantMarketModal({ isOpen, onClose, onInstall, installedIds = [] }) {
  const { language } = useLanguage();
  const [assistants, setAssistants] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 40;

  const load = async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const result = await window.electron.assistants.list(language, forceRefresh);
      setAssistants(result?.assistants || []);
      setStatus(result?.status || 'fresh');
      if (result?.error) setError(result.error);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(false); }, [isOpen, language]);
  useEffect(() => {
    if (!isOpen) return;
    const listener = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [isOpen, onClose]);

  const categories = useMemo(() => ['all', ...Array.from(new Set(assistants.map(item => item.meta.category).filter(Boolean))).sort()], [assistants]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assistants.filter(item => {
      const categoryMatches = category === 'all' || item.meta.category === category;
      const text = `${item.meta.title} ${item.meta.description} ${item.meta.tags.join(' ')} ${item.author}`.toLowerCase();
      return categoryMatches && (!query || text.includes(query));
    });
  }, [assistants, category, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, category]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const install = async assistant => {
    setInstallingId(assistant.identifier);
    setError('');
    try {
      const detail = await window.electron.assistants.detail(assistant.identifier, language);
      await onInstall(detail);
    } catch (installError) {
      setError(installError.message);
    } finally {
      setInstallingId(null);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;
  const installed = new Set(installedIds);

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Store className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold text-foreground">Marketplace de Assistants</h2>
              <p className="text-xs text-muted-foreground">Catálogo comunitário LobeHub · {assistants.length} assistants</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3 border-b border-border bg-muted/20 px-6 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar assistants, categorias ou tags…" className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-xs" />
            </div>
            <button onClick={() => load(true)} disabled={loading} className="flex items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold text-primary">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Atualizar
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {categories.map(item => <button key={item} onClick={() => setCategory(item)} className={cn('whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px]', category === item ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{item === 'all' ? 'Todos' : item}</button>)}
          </div>
          {(status || error) && <p className={cn('text-[11px]', error ? 'text-amber-600' : 'text-muted-foreground')}>Fonte: {status || 'erro'}{error ? ` · ${error}` : ''}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && assistants.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">Carregando catálogo…</div> : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {visible.map(assistant => {
                const isInstalled = installed.has(`market_${assistant.identifier}`);
                return <div key={assistant.identifier} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background p-4">
                  <div className="flex gap-3">
                    <MarketAssistantAvatar avatar={assistant.meta.avatar} title={assistant.meta.title} />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{assistant.meta.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{assistant.meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="truncate text-[10px] text-muted-foreground">{assistant.meta.category} · {assistant.author || 'LobeHub'}</span>
                    <button disabled={isInstalled || installingId === assistant.identifier} onClick={() => install(assistant)} className={cn('flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold', isInstalled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary text-primary-foreground')}>
                      {isInstalled ? <><Check className="h-3 w-3" /> Instalado</> : <><Download className="h-3 w-3" /> {installingId === assistant.identifier ? 'Instalando…' : 'Instalar'}</>}
                    </button>
                  </div>
                </div>;
              })}
            </div>
          )}
          {!loading && filtered.length > pageSize && (
            <div className="mt-5 flex items-center justify-center gap-3 text-xs">
              <button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Anterior</button>
              <span className="text-muted-foreground">Página {page} de {pageCount} · {filtered.length} resultados</span>
              <button disabled={page === pageCount} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Próxima</button>
            </div>
          )}
        </div>
      </div>
    </div>, document.body
  );
}
