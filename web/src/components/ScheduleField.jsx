import { CalendarDays, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { es } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Working hours and 15-minute steps keep the lists short; on phones each select opens the native wheel.
const HOURS = Array.from({ length: 16 }, (_, index) => index + 6);
const MINUTES = [0, 15, 30, 45];
const DEFAULT_HOUR = 8;

const dayFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function withTime(date, hours, minutes) {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Optional date (calendar) and time (hour and minute selects). `value` is a Date or null.
export default function ScheduleField({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 justify-start rounded-xl bg-card px-4 text-base font-normal"
            >
              <CalendarDays className="text-muted-foreground" />
              {value ? (
                <span className="first-letter:uppercase">{dayFormat.format(value)}</span>
              ) : (
                <span className="text-muted-foreground">Elegir fecha (opcional)</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={es}
              selected={value ?? undefined}
              disabled={{ before: startOfToday() }}
              onSelect={(day) => {
                if (!day) return;
                onChange(withTime(day, value?.getHours() ?? DEFAULT_HOUR, value?.getMinutes() ?? 0));
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {value && (
          <Button type="button" variant="ghost" size="icon-lg" className="size-12" onClick={() => onChange(null)} aria-label="Quitar fecha">
            <X />
          </Button>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" />
          <NativeSelect
            size="touch"
            aria-label="Hora"
            value={String(value.getHours())}
            onChange={(event) => onChange(withTime(value, Number(event.target.value), value.getMinutes()))}
            className="w-24"
          >
            {HOURS.map((hour) => (
              <NativeSelectOption key={hour} value={String(hour)}>
                {String(hour).padStart(2, '0')}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <span className="text-lg font-semibold">:</span>
          <NativeSelect
            size="touch"
            aria-label="Minutos"
            value={String(value.getMinutes())}
            onChange={(event) => onChange(withTime(value, value.getHours(), Number(event.target.value)))}
            className="w-24"
          >
            {MINUTES.map((minute) => (
              <NativeSelectOption key={minute} value={String(minute)}>
                {String(minute).padStart(2, '0')}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
    </div>
  );
}
