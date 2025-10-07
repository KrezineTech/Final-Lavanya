import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ 
  value, 
  onChange, 
  label, 
  disabled = false 
}) => {
  // Parse initial time value or use current time
  const parseTime = (timeString: string) => {
    if (!timeString) {
      const now = new Date();
      return {
        hours: now.getHours().toString().padStart(2, '0'),
        minutes: now.getMinutes().toString().padStart(2, '0')
      };
    }
    
    const [hours, minutes] = timeString.split(':');
    return {
      hours: hours?.padStart(2, '0') || '00',
      minutes: minutes?.padStart(2, '0') || '00'
    };
  };

  const { hours: initialHours, minutes: initialMinutes } = parseTime(value);
  const [hours, setHours] = useState(initialHours);
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    const timeString = `${hours}:${minutes}`;
    if (timeString !== value) {
      onChange(timeString);
    }
  }, [hours, minutes, onChange, value]);

  // Update local state when value prop changes
  useEffect(() => {
    const { hours: newHours, minutes: newMinutes } = parseTime(value);
    setHours(newHours);
    setMinutes(newMinutes);
  }, [value]);

  // Generate hour options (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0')
  }));

  // Generate minute options (0-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0')
  }));

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Select value={hours} onValueChange={setHours} disabled={disabled}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {hourOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-muted-foreground font-medium">:</span>
        
        <Select value={minutes} onValueChange={setMinutes} disabled={disabled}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {minuteOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="text-xs text-muted-foreground ml-2">
          {new Date(`2000-01-01T${hours}:${minutes}`).toLocaleTimeString([], { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })}
        </div>
      </div>
    </div>
  );
};
