import { useEffect, useRef, useState } from 'react';

export function useToolsDropdown() {
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);
  const toolsDropdownRef = useRef(null);

  useEffect(() => {
    if (!isToolsDropdownOpen) return undefined;
    const handleClickOutside = (event) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target)) setIsToolsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isToolsDropdownOpen]);

  return { isToolsDropdownOpen, setIsToolsDropdownOpen, toolsDropdownRef };
}
