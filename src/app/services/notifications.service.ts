import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private toastr: ToastrService) {}

    showInfo(message: string): void {
    this.toastr.info(message, 'Información'); 
  }

  showSuccess(message: string): void {
    this.toastr.success(message, 'Éxito');
  }

  showError(message: string): void {
    this.toastr.error(message, 'Error');
  }

  showWarning(message: string): void {
    this.toastr.warning(message, 'Advertencia');
  }
}
