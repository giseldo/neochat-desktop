import React from 'react';
import { cn } from '../../lib/utils';
import './settings.css';

// Settings-only primitives keep dense forms distinct from cards in the chat UI.
export function Card({ className, layout, ...props }) {
  return <section className={cn('settings-section', layout === 'row' && 'settings-section-row', className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cn('settings-section-header', className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cn('settings-section-title', className)} {...props} />;
}
export function CardDescription({ className, ...props }) {
  return <p className={cn('settings-section-description', className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn('settings-section-content', className)} {...props} />;
}
export function SettingsRow({ label, children }) {
  return <div className="settings-option-row"><span className="text-sm font-medium">{label}</span><div className="min-w-0">{children}</div></div>;
}
export function SettingsChoices({ value, onChange, options }) {
  return <div className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
    {options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)} className={cn('px-3 py-2 text-xs rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50', value === option.id ? 'bg-background text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}>{option.name}</button>)}
  </div>;
}
export function SettingsSelect({ label, value, onChange, options }) {
  return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="w-full sm:min-w-[220px] rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
  </select>;
}
