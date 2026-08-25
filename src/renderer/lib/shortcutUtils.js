/**
 * Helper to format an Electron accelerator string into readable key tokens
 */
export function formatAccelerator(accelerator, isMac = false) {
  if (!accelerator) return [];
  
  const parts = accelerator.split('+').map(p => p.trim());
  return parts.map(part => {
    const lower = part.toLowerCase();
    if (lower === 'commandorcontrol' || lower === 'cmdorctrl') {
      return isMac ? '⌘ Cmd' : 'Ctrl';
    }
    if (lower === 'command' || lower === 'cmd') {
      return isMac ? '⌘ Cmd' : 'Win';
    }
    if (lower === 'control' || lower === 'ctrl') {
      return isMac ? '⌃ Ctrl' : 'Ctrl';
    }
    if (lower === 'alt' || lower === 'option') {
      return isMac ? '⌥ Option' : 'Alt';
    }
    if (lower === 'shift') {
      return isMac ? '⇧ Shift' : 'Shift';
    }
    if (lower === 'space' || lower === 'spacebar' || lower === 'espaço') {
      return isMac ? 'Space' : 'Espaço';
    }
    if (lower === 'enter' || lower === 'return') {
      return 'Enter';
    }
    if (lower === 'escape' || lower === 'esc') {
      return 'Esc';
    }
    if (lower === 'tab') {
      return 'Tab';
    }
    return part.toUpperCase();
  });
}
