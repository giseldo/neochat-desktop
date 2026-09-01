import { useEffect, useState } from 'react';

export function useCompanionPanels(setIsCommandPaletteOpen) {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isTasksMaximized, setIsTasksMaximized] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isBrowserMaximized, setIsBrowserMaximized] = useState(false);
  const [runningTasksCount, setRunningTasksCount] = useState(0);

  useEffect(() => {
    const fetchTasksCount = async () => {
      if (!window.electron?.tasks?.list) return;
      try {
        const list = await window.electron.tasks.list();
        setRunningTasksCount((list || []).filter(task => task.status === 'running').length);
      } catch (_error) {
        // The panel remains usable even when task status cannot be loaded.
      }
    };
    fetchTasksCount();
    if (window.electron?.tasks?.onUpdate) {
      return window.electron.tasks.onUpdate((payload) => {
        fetchTasksCount();
        if (payload?.event === 'task:started') {
          setIsTasksOpen(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleGlobalShortcuts = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(value => !value);
      } else if (event.key === '`') {
        event.preventDefault();
        setIsTerminalOpen(value => !value);
      } else if (event.shiftKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setIsBrowserOpen(value => !value);
      } else if (event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault();
        setIsTasksOpen(value => !value);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [setIsCommandPaletteOpen]);

  return {
    isTerminalOpen, setIsTerminalOpen, isTerminalMaximized, setIsTerminalMaximized,
    isTasksOpen, setIsTasksOpen, isTasksMaximized, setIsTasksMaximized,
    isBrowserOpen, setIsBrowserOpen, isBrowserMaximized, setIsBrowserMaximized,
    runningTasksCount
  };
}
