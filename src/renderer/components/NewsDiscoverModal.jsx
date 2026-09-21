import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Compass,
  X,
  Search,
  RefreshCw,
  Heart,
  Share2,
  ChevronDown,
  ArrowLeft,
  Clock,
  Sparkles,
  ExternalLink,
  Send,
  Copy,
  Check,
  Bot,
  User,
  SlidersHorizontal,
  Bookmark,
  Layers,
  MoreHorizontal,
  ChevronRight,
  Newspaper
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const TOPICS = [
  { id: 'all', label: 'Todos os Tópicos' },
  { id: 'ai', label: 'Inteligência Artificial' },
  { id: 'tech', label: 'Tecnologia' },
  { id: 'science', label: 'Ciência' },
  { id: 'business', label: 'Negócios & Mercado' }
];

export function NewsDiscoverModal({
  isOpen,
  onClose,
  onSendToChat
}) {
  const [activeTab, setActiveTab] = useState('for-you'); // 'for-you' | 'top' | 'topic'
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Follow-up Q&A State
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const topicDropdownRef = useRef(null);
  const chatBottomRef = useRef(null);

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Fetch news feed
  const fetchFeed = async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (window.electron?.news) {
        const category = activeTab === 'top' ? 'top' : (activeTab === 'topic' ? selectedTopic : 'for-you');
        const data = forceRefresh && window.electron.news.refresh
          ? await window.electron.news.refresh({ category })
          : await window.electron.news.getFeed({
              category,
              search: searchQuery,
              refresh: forceRefresh
            });

        if (data && typeof data === 'object' && Array.isArray(data.items)) {
          setNewsItems(data.items);
          if (data.lastUpdated) {
            setLastUpdated(data.lastUpdated);
          }
        } else if (Array.isArray(data)) {
          setNewsItems(data);
          setLastUpdated(new Date().toISOString());
        }
      }
    } catch (err) {
      console.error('Failed to load news feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeed(false);
    }
  }, [isOpen, activeTab, selectedTopic, searchQuery]);

  // Close topic dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(e.target)) {
        setIsTopicDropdownOpen(false);
      }
    };
    if (isTopicDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isTopicDropdownOpen]);

  // Toggle favorite
  const handleToggleFavorite = async (e, articleId) => {
    e.stopPropagation();
    try {
      if (window.electron?.news?.toggleFavorite) {
        const res = await window.electron.news.toggleFavorite(articleId);
        setNewsItems(prev => prev.map(item => 
          item.id === articleId ? { ...item, isFavorite: res.isFavorite } : item
        ));
        if (selectedArticle && selectedArticle.id === articleId) {
          setSelectedArticle(prev => ({ ...prev, isFavorite: res.isFavorite }));
        }
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Open Article Detail
  const handleOpenArticle = async (article) => {
    setSelectedArticle(article);
    setFollowUpHistory([]);
    setFollowUpQuestion('');
    // Scroll to top
    const contentEl = document.getElementById('news-content-scroll');
    if (contentEl) contentEl.scrollTop = 0;
  };

  // Handle Follow-up Question
  const handleSendFollowUp = async (customPrompt) => {
    const q = (customPrompt || followUpQuestion).trim();
    if (!q || !selectedArticle || followUpLoading) return;

    const userMsg = { role: 'user', content: q, id: `user-${Date.now()}` };
    const updatedHistory = [...followUpHistory, userMsg];
    setFollowUpHistory(updatedHistory);
    setFollowUpQuestion('');
    setFollowUpLoading(true);

    try {
      if (window.electron?.news?.askFollowUp) {
        const res = await window.electron.news.askFollowUp({
          articleId: selectedArticle.id,
          question: q,
          chatHistory: updatedHistory.map(m => ({ role: m.role, content: m.content }))
        });

        setFollowUpHistory(prev => [
          ...prev,
          { role: 'assistant', content: res.answer, id: `ai-${Date.now()}` }
        ]);
      }
    } catch (err) {
      console.error('Failed to ask news follow-up:', err);
      setFollowUpHistory(prev => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, ocorreu um erro ao consultar o modelo de IA.', id: `ai-${Date.now()}` }
      ]);
    } finally {
      setFollowUpLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Handle Copy Article Link or Summary
  const handleCopyArticle = () => {
    if (!selectedArticle) return;
    const text = `${selectedArticle.title}\n\n${selectedArticle.lead}\n\nFontes: ${selectedArticle.sources.map(s => s.name).join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Filtered items
  const displayedItems = useMemo(() => {
    if (onlyFavorites) {
      return newsItems.filter(item => item.isFavorite);
    }
    return newsItems;
  }, [newsItems, onlyFavorites]);

  const heroItem = displayedItems[0] || null;
  const gridItems = displayedItems.slice(1, 4);
  const secondaryHeroItem = displayedItems[4] || null;
  const remainingItems = displayedItems.slice(5);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-6xl max-h-[92vh] mx-4 bg-background border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground">
        
        {/* ================= TOP NAVBAR ================= */}
        <header className="px-6 py-3.5 border-b border-border/60 flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0">
          
          {/* Left: Brand / Return to Discover */}
          <div className="flex items-center gap-3">
            {selectedArticle ? (
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 hover:bg-accent/60 text-xs font-medium text-foreground transition-all duration-150 shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para Descobrir</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight leading-none text-foreground">
                      Descoberta & Notícias IA
                    </h2>
                    {lastUpdated && (
                      <span 
                        className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50"
                        title={`Última sincronização em tempo real: ${new Date(lastUpdated).toLocaleString('pt-BR')}`}
                      >
                        <Clock className="w-2.5 h-2.5 text-sky-500" />
                        <span>Atualizado: {formatDateTime(lastUpdated)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Síntese multi-fonte em tempo real
                    </p>
                    {lastUpdated && (
                      <span className="sm:hidden text-[10px] text-muted-foreground">
                        • Atualizado: {formatDateTime(lastUpdated)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Center: Tabs (Para Você, Top, Tópicos) - Shown when not inside single article */}
          {!selectedArticle && (
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => { setActiveTab('for-you'); setSelectedTopic('all'); }}
                className={cn(
                  "relative py-1 text-sm font-medium transition-colors",
                  activeTab === 'for-you'
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Para Você
                {activeTab === 'for-you' && (
                  <span className="absolute bottom-[-14px] left-0 right-0 h-[2px] bg-foreground rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('top'); setSelectedTopic('all'); }}
                className={cn(
                  "relative py-1 text-sm font-medium transition-colors",
                  activeTab === 'top'
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Top
                {activeTab === 'top' && (
                  <span className="absolute bottom-[-14px] left-0 right-0 h-[2px] bg-foreground rounded-full" />
                )}
              </button>

              {/* Tópicos Dropdown */}
              <div className="relative" ref={topicDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                  className={cn(
                    "flex items-center gap-1.5 py-1 text-sm font-medium transition-colors",
                    activeTab === 'topic'
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{activeTab === 'topic' ? TOPICS.find(t => t.id === selectedTopic)?.label : 'Tópicos'}</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isTopicDropdownOpen && "rotate-180")} />
                  {activeTab === 'topic' && (
                    <span className="absolute bottom-[-14px] left-0 right-0 h-[2px] bg-foreground rounded-full" />
                  )}
                </button>

                {isTopicDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 py-1.5 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    {TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          setSelectedTopic(topic.id);
                          setActiveTab('topic');
                          setIsTopicDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-3.5 py-1.5 text-xs transition-colors flex items-center justify-between",
                          selectedTopic === topic.id
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <span>{topic.label}</span>
                        {selectedTopic === topic.id && <Check className="w-3.5 h-3.5 text-sky-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {!selectedArticle && (
              <>
                {/* Search input */}
                <div className="relative w-44 hidden md:block">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar notícias..."
                    className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-muted/60 border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Favorites filter button */}
                <Button
                  variant={onlyFavorites ? "default" : "ghost"}
                  size="icon"
                  className={cn("h-8 w-8 rounded-lg", onlyFavorites && "bg-rose-500/20 text-rose-500 border border-rose-500/30 hover:bg-rose-500/30")}
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  title={onlyFavorites ? "Ver todas as notícias" : "Ver apenas favoritas"}
                >
                  <Heart className={cn("w-4 h-4", onlyFavorites ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
                </Button>

                {/* Refresh */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                  onClick={fetchFeed}
                  disabled={loading}
                  title="Atualizar feed"
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-sky-500")} />
                </Button>
              </>
            )}

            {/* Close modal */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* ================= MAIN SCROLLABLE CONTENT ================= */}
        <div id="news-content-scroll" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
          
          {/* ================= VIEW 1: FEED VIEW ================= */}
          {!selectedArticle && (
            <div className="max-w-5xl mx-auto space-y-12">
              
              {/* --- HERO STORY (Lead Story - Top Banner) --- */}
              {heroItem && (
                <div 
                  onClick={() => handleOpenArticle(heroItem)}
                  className="group grid grid-cols-1 lg:grid-cols-12 gap-8 items-center cursor-pointer transition-all duration-200"
                >
                  {/* Left Column: Headlines & Summary */}
                  <div className="lg:col-span-7 space-y-3.5">
                    <h1 className="font-serif text-2xl lg:text-3xl font-bold tracking-tight text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors leading-[1.25]">
                      {heroItem.title}
                    </h1>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{heroItem.relativeTime}</span>
                    </div>

                    <p className="font-serif text-sm lg:text-[15px] text-muted-foreground/90 leading-relaxed line-clamp-3">
                      {heroItem.lead}
                    </p>

                    {/* Sources & Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2.5">
                        {/* Stacked Source Favicons */}
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {heroItem.sources.slice(0, 3).map((source, i) => (
                            <div 
                              key={i} 
                              className="inline-block h-5 w-5 rounded-full ring-2 ring-background bg-card border border-border flex items-center justify-center text-[10px] shadow-xs"
                              title={source.name}
                            >
                              {source.icon || '🌐'}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {heroItem.sourcesCount} fontes
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, heroItem.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                        >
                          <Heart className={cn("w-4 h-4", heroItem.isFavorite && "fill-rose-500 text-rose-500")} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleOpenArticle(heroItem); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Hero Image */}
                  <div className="lg:col-span-5">
                    <div className="overflow-hidden rounded-2xl border border-border/60 shadow-md aspect-[16/10] bg-muted/40 relative">
                      <img
                        src={heroItem.imageUrl}
                        alt={heroItem.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                      {heroItem.imageCredit && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white/90 font-mono">
                          {heroItem.imageCredit}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- 3-COLUMN CARDS ROW --- */}
              {gridItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/40">
                  {gridItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenArticle(item)}
                      className="group flex flex-col justify-between cursor-pointer space-y-3 p-1 rounded-xl transition-all"
                    >
                      {/* Card Image */}
                      <div className="overflow-hidden rounded-xl border border-border/60 shadow-xs aspect-[16/10] bg-muted/40 relative">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                          loading="lazy"
                        />
                      </div>

                      {/* Card Title */}
                      <h3 className="font-serif text-[15px] font-bold tracking-tight text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors leading-snug line-clamp-3">
                        {item.title}
                      </h3>

                      {/* Source badge & Actions */}
                      <div className="flex items-center justify-between pt-1 mt-auto">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1 overflow-hidden">
                            {item.sources.slice(0, 3).map((source, i) => (
                              <div 
                                key={i} 
                                className="inline-block h-4 w-4 rounded-full ring-1 ring-background bg-card border border-border flex items-center justify-center text-[9px]"
                                title={source.name}
                              >
                                {source.icon || '🌐'}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {item.sourcesCount} fontes
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                          >
                            <Heart className={cn("w-3.5 h-3.5", item.isFavorite && "fill-rose-500 text-rose-500")} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenArticle(item); }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- SECONDARY HERO STORY (Image Left / Text Right) --- */}
              {secondaryHeroItem && (
                <div 
                  onClick={() => handleOpenArticle(secondaryHeroItem)}
                  className="group grid grid-cols-1 lg:grid-cols-12 gap-8 items-center cursor-pointer pt-6 border-t border-border/40 transition-all duration-200"
                >
                  {/* Left Column: Image */}
                  <div className="lg:col-span-5 order-2 lg:order-1">
                    <div className="overflow-hidden rounded-2xl border border-border/60 shadow-md aspect-[16/10] bg-muted/40 relative">
                      <img
                        src={secondaryHeroItem.imageUrl}
                        alt={secondaryHeroItem.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Right Column: Title & Lead */}
                  <div className="lg:col-span-7 order-1 lg:order-2 space-y-3.5">
                    <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors leading-[1.25]">
                      {secondaryHeroItem.title}
                    </h2>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{secondaryHeroItem.relativeTime}</span>
                    </div>

                    <p className="font-serif text-sm lg:text-[15px] text-muted-foreground/90 leading-relaxed line-clamp-3">
                      {secondaryHeroItem.lead}
                    </p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {secondaryHeroItem.sources.slice(0, 3).map((source, i) => (
                            <div 
                              key={i} 
                              className="inline-block h-5 w-5 rounded-full ring-2 ring-background bg-card border border-border flex items-center justify-center text-[10px]"
                              title={source.name}
                            >
                              {source.icon || '🌐'}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {secondaryHeroItem.sourcesCount} fontes
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, secondaryHeroItem.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition-colors"
                        >
                          <Heart className={cn("w-4 h-4", secondaryHeroItem.isFavorite && "fill-rose-500 text-rose-500")} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fallback empty state */}
              {displayedItems.length === 0 && !loading && (
                <div className="text-center py-20 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Newspaper className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Nenhuma notícia encontrada</p>
                  <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou selecione uma categoria diferente.</p>
                </div>
              )}
            </div>
          )}

          {/* ================= VIEW 2: ARTICLE READER VIEW (Screenshot 2) ================= */}
          {selectedArticle && (
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              
              {/* Article Top Headline */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0.2">
                    {selectedArticle.category}
                  </Badge>
                  <span>•</span>
                  <span>{selectedArticle.relativeTime}</span>
                  <span>•</span>
                  <span>{selectedArticle.readTime} de leitura</span>
                </div>

                <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
                  {selectedArticle.title}
                </h1>
              </div>

              {/* Main High-Res Cover Image */}
              <div className="overflow-hidden rounded-2xl border border-border/60 shadow-lg aspect-[16/9] bg-muted/40 relative">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
                {selectedArticle.imageCredit && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-black/70 backdrop-blur-xs text-xs text-white/90 font-mono shadow-xs">
                    {selectedArticle.imageCredit}
                  </div>
                )}
              </div>

              {/* Article Lead Introduction */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <p className="font-serif text-base text-foreground/90 leading-relaxed font-medium italic">
                  &ldquo;{selectedArticle.lead}&rdquo;
                </p>
              </div>

              {/* Synthesized Editorial Sections with Inline Citations */}
              <div className="space-y-8 font-serif text-[15px] leading-relaxed text-foreground/90">
                {selectedArticle.sections.map((section, idx) => (
                  <section key={idx} className="space-y-3">
                    <h2 className="text-lg font-bold text-foreground tracking-tight font-serif">
                      {section.heading}
                    </h2>
                    <p className="leading-relaxed">
                      {section.content}
                    </p>

                    {/* Inline citation pill */}
                    {section.citation && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/80 hover:bg-muted text-[11px] font-sans font-medium text-muted-foreground border border-border/60 cursor-pointer transition-colors shadow-2xs">
                          <Compass className="w-3 h-3 text-sky-500" />
                          <span>{section.citation.label}</span>
                        </span>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {/* Key Takeaways Box */}
              {selectedArticle.keyTakeaways && selectedArticle.keyTakeaways.length > 0 && (
                <div className="p-5 rounded-2xl bg-sky-500/5 border border-sky-500/20 space-y-3 font-sans">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Pontos Principais Sintetizados</span>
                  </div>
                  <ul className="space-y-2 text-xs text-foreground/85">
                    {selectedArticle.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-sky-500 font-bold">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sources & Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/70 border border-border text-xs font-medium text-foreground">
                    <div className="flex -space-x-1 overflow-hidden">
                      {selectedArticle.sources.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-xs">{s.icon || '🌐'}</span>
                      ))}
                    </div>
                    <span className="ml-1">{selectedArticle.sourcesCount || selectedArticle.sources.length} fontes</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyArticle}
                    className="p-2 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Copiar resumo do artigo"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, selectedArticle.id)}
                    className="p-2 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors"
                    title="Favoritar notícia"
                  >
                    <Heart className={cn("w-4 h-4", selectedArticle.isFavorite && "fill-rose-500 text-rose-500")} />
                  </button>
                </div>

                {onSendToChat && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onSendToChat(`Analise a notícia: "${selectedArticle.title}"\nResumo: ${selectedArticle.lead}`);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Bot className="w-3.5 h-3.5 text-purple-500" />
                    <span>Discutir no Chat Principal</span>
                  </Button>
                )}
              </div>

              {/* Follow-up Q&A Thread */}
              {followUpHistory.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-border/60 font-sans">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Perguntas de Seguimento (Q&A)</span>
                  </div>

                  <div className="space-y-3">
                    {followUpHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-3.5 rounded-xl text-xs leading-relaxed",
                          msg.role === 'user'
                            ? "bg-accent text-accent-foreground ml-8 font-medium"
                            : "bg-muted/60 border border-border/60 mr-8 text-foreground/90 whitespace-pre-line"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                          {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3 text-sky-500" />}
                          <span>{msg.role === 'user' ? 'Você' : 'Neo AI'}</span>
                        </div>
                        {msg.content}
                      </div>
                    ))}
                    {followUpLoading && (
                      <div className="p-3 rounded-xl bg-muted/60 border border-border/60 mr-8 text-xs text-muted-foreground flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin text-sky-500" />
                        <span>Sintetizando resposta sobre o artigo...</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ================= FLOATING DOCK: FOLLOW-UP CHAT INPUT ================= */}
        {selectedArticle && (
          <div className="absolute bottom-4 left-0 right-0 px-6 z-20 pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-2 flex flex-col gap-2">
              
              {/* Quick suggestion chips */}
              {followUpHistory.length === 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 custom-scrollbar">
                  {[
                    'Quais são os principais riscos citados?',
                    'Como isso afeta a segurança de IA?',
                    'O que dizem os especialistas contra essa visão?'
                  ].map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendFollowUp(chip)}
                      className="px-2.5 py-1 rounded-full bg-muted/80 hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors border border-border/50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendFollowUp();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="Pergunte um seguimento..."
                  disabled={followUpLoading}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!followUpQuestion.trim() || followUpLoading}
                  className="h-7 w-7 rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}

export default NewsDiscoverModal;
