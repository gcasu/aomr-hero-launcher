import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  autohide: boolean;
  delay: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  constructor() { }

  showToast(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info'): void {
    const toast: Toast = {
      id: Date.now() + Math.random(), // Ensure unique ID
      message,
      type,
      autohide: true,
      delay: type === 'success' ? 3000 : 5000
    };
    
    const currentToasts = this.toastsSubject.value;
    const updatedToasts = [...currentToasts, toast];
    this.toastsSubject.next(updatedToasts);
    
    // Auto-remove toast after delay
    setTimeout(() => {
      this.removeToast(toast.id);
    }, toast.delay);
  }

  removeToast(id: number): void {
    const currentToasts = this.toastsSubject.value;
    const updatedToasts = currentToasts.filter(toast => toast.id !== id);
    this.toastsSubject.next(updatedToasts);
  }

  // Convenience methods for different toast types
  showSuccess(message: string): void {
    this.showToast(message, 'success');
  }

  showError(message: string): void {
    this.showToast(message, 'danger');
  }

  showWarning(message: string): void {
    this.showToast(message, 'warning');
  }

  showInfo(message: string): void {
    this.showToast(message, 'info');
  }

  // Clear all toasts
  clearAll(): void {
    this.toastsSubject.next([]);
  }
}
