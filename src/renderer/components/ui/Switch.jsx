import React from 'react';

const Switch = ({ checked, onChange, onCheckedChange, id, size = 'default', disabled = false, 'aria-label': ariaLabel }) => {
  const sizeClasses = {
    sm: {
      track: 'w-8 h-4',
      circle: 'after:h-3 after:w-3',
      translate: 'peer-checked:after:translate-x-[15px]'
    },
    default: {
      track: 'w-11 h-6',
      circle: 'after:h-5 after:w-5',
      translate: 'peer-checked:after:translate-x-full'
    }
  };
  
  const sizeConfig = sizeClasses[size] || sizeClasses.default;
  
  const handleChange = (e) => {
    if (disabled) return;
    if (onChange) onChange(e);
    if (onCheckedChange) onCheckedChange(e.target.checked);
  };

  return (
    <label htmlFor={id} className={`inline-flex relative items-center cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        id={id}
        className="sr-only peer"
        checked={Boolean(checked)}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
      />
      <div
        className={`${sizeConfig.track} ${sizeConfig.circle} ${sizeConfig.translate} bg-muted-foreground/30 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary dark:bg-muted-foreground/30 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:transition-all dark:border-gray-600 peer-checked:bg-primary`}
      ></div>
    </label>
  );
};

export default Switch;
