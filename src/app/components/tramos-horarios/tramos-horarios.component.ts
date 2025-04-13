import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BusinessConfig } from '../../services/booking-config.service';

@Component({
  selector: 'app-tramos-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card mb-3">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Configuración de Tramos Horarios</h5>
        <div>
          <button class="btn btn-sm btn-outline-primary me-2" (click)="addTimeSlot()">
            <i class="bi bi-plus"></i> Añadir tramo
          </button>
          <button class="btn btn-sm btn-outline-danger" (click)="resetToDefault()">
            <i class="bi bi-arrow-counterclockwise"></i> Restablecer
          </button>
        </div>
      </div>
      <div class="card-body">
        <div *ngIf="config.tramosHorarios.length === 0" class="alert alert-warning">
          No hay tramos horarios configurados
        </div>
        
        <div class="row">
          <div class="col-md-6" *ngFor="let tramo of config.tramosHorarios; let i = index">
            <div class="d-flex align-items-center mb-3">
              <div class="form-check form-switch me-3">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  id="tramo-{{i}}"
                  [(ngModel)]="tramo.activo"
                >
                <label class="form-check-label" for="tramo-{{i}}"></label>
              </div>
              <div class="flex-grow-1">
                <input
                  type="time"
                  class="form-control"
                  [(ngModel)]="tramo.hora"
                  step="1800"
                  [disabled]="!tramo.activo"
                >
              </div>
              <button 
                class="btn btn-sm btn-outline-danger ms-2" 
                (click)="removeTimeSlot(i)"
                title="Eliminar tramo"
              >
                <i class="bi bi-trash">Eliminar</i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-switch .form-check-input {
      width: 2.5em;
      height: 1.5em;
    }
    .form-control[type="time"] {
      max-width: 120px;
    }
  `]
})
export class TramosHorariosComponent {
  @Input() config!: BusinessConfig;
  
  addTimeSlot() {
    const newTime = this.calculateNextTimeSlot();
    this.config.tramosHorarios.push({ 
      hora: newTime, 
      activo: true 
    });
  }

  removeTimeSlot(index: number) {
    this.config.tramosHorarios.splice(index, 1);
  }

  resetToDefault() {
    const defaultStart = this.config.horarioLaboral.horaInicio || '09:00';
    const defaultEnd = this.config.horarioLaboral.horaFin || '18:00';
    this.config.tramosHorarios = this.generateTimeSlots(defaultStart, defaultEnd);
  }

  private calculateNextTimeSlot(): string {
    if (this.config.tramosHorarios.length === 0) {
      return this.config.horarioLaboral.horaInicio || '09:00';
    }

    const lastHour = this.config.tramosHorarios[this.config.tramosHorarios.length - 1].hora;
    const [hours, mins] = lastHour.split(':').map(Number);
    let newHours = hours;
    let newMins = mins + 30;
    
    if (newMins >= 60) {
      newHours += 1;
      newMins = 0;
    }
    
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  private generateTimeSlots(start: string, end: string): { hora: string; activo: boolean }[] {
    const slots: { hora: string; activo: boolean }[] = [];
    let current = this.timeToMinutes(start);
    const endTime = this.timeToMinutes(end);
    
    while (current <= endTime) {
      const hours = Math.floor(current / 60);
      const mins = current % 60;
      slots.push({
        hora: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
        activo: true
      });
      current += 30;
    }
    
    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  }
}