import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Vietnamese date adapter — parses DD/MM/YYYY text input
 * and displays dates in DD/MM/YYYY format.
 *
 * Supports typing: "14/11/1997", "14-11-1997", "14.11.1997"
 */
@Injectable()
export class ViDateAdapter extends NativeDateAdapter {

  /** Parse user-typed text into a Date object */
  override parse(value: string | number): Date | null {
    if (typeof value === 'number') {
      return new Date(value);
    }

    if (!value || typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) return null;

    // Try DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (match) {
      const day = +match[1];
      const month = +match[2] - 1; // JS months are 0-indexed
      const year = +match[3];

      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month, day);
        // Validate the date is real (e.g., not Feb 30)
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
          return date;
        }
      }
    }

    // Fallback to native parsing
    return super.parse(trimmed);
  }

  /** Format Date as DD/MM/YYYY for display in input field */
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'input') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}

/** Custom date formats for DD/MM/YYYY display */
export const VI_DATE_FORMATS = {
  parse: {
    dateInput: 'input'
  },
  display: {
    dateInput: 'input',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' }
  }
};
