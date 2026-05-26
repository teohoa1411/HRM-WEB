import { Directive, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Directive to auto-format money inputs with thousand separators.
 * Usage: add `appMoney` to any text input bound to a reactive form control.
 * The form control value stays as a plain number; only the display is formatted.
 *
 * Example: <input matInput type="text" formControlName="price" appMoney>
 */
@Directive({
  selector: '[appMoney]',
  standalone: true
})
export class MoneyDirective implements OnInit {
  private el = inject(ElementRef<HTMLInputElement>);
  private ngControl = inject(NgControl, { optional: true, self: true });

  ngOnInit() {
    // Format initial value (e.g. when dialog opens with existing data)
    setTimeout(() => {
      const val = this.ngControl?.control?.value;
      this.setDisplay(val);
    });

    // Format when the control value changes programmatically
    this.ngControl?.control?.valueChanges.subscribe(val => {
      // Only reformat if change didn't come from user typing (avoid cursor-jump)
      if (document.activeElement !== this.el.nativeElement) {
        this.setDisplay(val);
      }
    });
  }

  @HostListener('input')
  onInput() {
    const input = this.el.nativeElement;
    const cursorPos = input.selectionStart ?? 0;
    const oldLen = input.value.length;

    // Strip everything except digits
    const raw = input.value.replace(/[^0-9]/g, '');
    const num = raw === '' ? null : parseInt(raw, 10);

    // Format display with commas
    const formatted = raw === '' ? '' : num!.toLocaleString('en-US');
    input.value = formatted;

    // Restore cursor position (account for added/removed commas)
    const newLen = formatted.length;
    const newCursor = cursorPos + (newLen - oldLen);
    input.setSelectionRange(Math.max(0, newCursor), Math.max(0, newCursor));

    // Push numeric value to form control
    if (this.ngControl?.control) {
      this.ngControl.control.setValue(num, { emitModelToViewChange: false });
    }
  }

  @HostListener('blur')
  onBlur() {
    const val = this.ngControl?.control?.value;
    this.setDisplay(val);
  }

  @HostListener('focus')
  onFocus() {
    // On focus: keep formatted so user sees comma-separated value clearly
    // (do not strip — stripping makes it hard to edit large numbers)
  }

  private setDisplay(val: unknown) {
    if (val == null) {
      this.el.nativeElement.value = '';
      return;
    }
    const num = typeof val === 'string' ? parseInt(val, 10) : (val as number);
    this.el.nativeElement.value = isNaN(num) ? '' : num.toLocaleString('en-US');
  }
}
