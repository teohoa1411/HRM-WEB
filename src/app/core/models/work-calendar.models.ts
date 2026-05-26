export type DayType = 'FULL_DAY' | 'MORNING' | 'AFTERNOON' | 'WEEKEND' | 'HOLIDAY';

export const DAY_TYPE_WORKDAYS: Record<DayType, number> = {
  FULL_DAY: 1.0,
  MORNING: 0.5,
  AFTERNOON: 0.5,
  WEEKEND: 0,
  HOLIDAY: 0,
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  FULL_DAY: 'Làm cả ngày',
  MORNING: 'Làm buổi sáng',
  AFTERNOON: 'Làm buổi chiều',
  WEEKEND: 'Nghỉ cuối tuần',
  HOLIDAY: 'Nghỉ lễ',
};

export interface WorkCalendarDetail {
  id: number;
  workDate: string;
  dayType: DayType;
  note: string;
}

export interface WorkCalendar {
  id: number;
  companyId: number;
  yearMonth: string;
  totalWorkdays: number;
  description: string;
  isDefault: boolean;
  createdAt: string;
  details: WorkCalendarDetail[];
}

export interface CalendarDetailRequest {
  workDate: string;
  dayType: DayType;
  note?: string;
}

export interface CreateWorkCalendarRequest {
  yearMonth: string;
  totalWorkdays: number;   // auto-calculated: sum of DAY_TYPE_WORKDAYS per detail
  description?: string;
  isDefault?: boolean;
  details: CalendarDetailRequest[];
}
