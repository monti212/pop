import React from 'react';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const Slider: React.FC<SliderProps> = ({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onValueChange) {
      onValueChange([parseFloat(e.target.value)]);
    }
  };

  return (
    <input
      type="range"
      value={value[0]}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal ${className}`}
      {...props}
    />
  );
};
