import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  showSuccess(message: string): void {
    // Implementar con tu librería favorita (ej: Angular Material Snackbar)
    alert(`✅ ${message}`);
  }

  showError(message: string): void {
    alert(`❌ ${message}`);
  }

  // En tu notifications.service.ts añade:
showWarning(message: string) {
  console.warn(message);
  alert(`❌ ${message}`);
}
}
