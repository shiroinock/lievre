// DatePicker に広げられるかを見るための最小の試作。React Aria の DatePicker を和暦で出す。
// 和暦は locale の拡張（-u-ca-japanese）で切り替わり、値は CalendarDate（ISO の暦）のまま持てる。
import { useState } from 'react';
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  Label,
  Popover,
} from 'react-aria-components';
import {
  parseDate,
  toCalendar,
  JapaneseCalendar,
  type CalendarDate,
} from '@internationalized/date';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSurfaceContainer } from './shared';

export function AriaDatePicker({ wareki = false }: { wareki?: boolean }) {
  const [value, setValue] = useState<CalendarDate | null>(parseDate('2019-04-30'));
  const [container, portal] = useSurfaceContainer();
  return (
    <I18nProvider locale={wareki ? 'ja-JP-u-ca-japanese' : 'ja-JP'}>
      {portal}
      <DatePicker className="k-field" value={value} onChange={setValue}>
        <Label className="k-label">{wareki ? '生年月日（和暦）' : '生年月日'}</Label>
        <Group className="k-input k-datepicker">
          <DateInput className="k-datepicker-input">
            {(segment) => <DateSegment segment={segment} className="k-datepicker-segment" />}
          </DateInput>
          <Button className="k-combobox-button" aria-label="カレンダーを開く">
            <CalendarDays size={16} />
          </Button>
        </Group>
        <Popover className="k-combobox-popover" UNSTABLE_portalContainer={container ?? undefined}>
          <Dialog aria-label="カレンダー" className="k-calendar-dialog">
            <Calendar className="k-calendar">
              <header className="k-calendar-header">
                <Button slot="previous" className="k-icon-button" aria-label="前の月">
                  <ChevronLeft size={16} />
                </Button>
                <Heading className="k-calendar-heading" />
                <Button slot="next" className="k-icon-button" aria-label="次の月">
                  <ChevronRight size={16} />
                </Button>
              </header>
              <CalendarGrid className="k-calendar-grid">
                {(date) => <CalendarCell date={date} className="k-calendar-cell" />}
              </CalendarGrid>
            </Calendar>
          </Dialog>
        </Popover>
      </DatePicker>
      <output data-testid="date-value">
        {value?.toString()} /{' '}
        {value
          ? `${toCalendar(value, new JapaneseCalendar()).era} ${toCalendar(value, new JapaneseCalendar()).year}`
          : ''}
      </output>
    </I18nProvider>
  );
}
