import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent {
  serviceTypes: string[] = ['cita', 'alojamiento', 'turno'];
  selectedType: string = 'cita';

  selectedDate: string = '';
  selectedTime: string = '';
  availableTimes: string[] = [
    '09:00', '10:00', '11:00',
    '12:00', '13:00', '16:00',
    '17:00', '18:00'
  ];

  // Config del negocio (esto luego será configurable desde admin)
  maxReservasPorHora: number = 1;

  reservas: { fecha: string; hora: string }[] = [];
  reservasPorHora: { [fecha: string]: { [hora: string]: number } } = {};

  onServiceTypeChange(type: string): void {
    this.selectedType = type;
    this.selectedDate = '';
    this.selectedTime = '';
  }

  esHoraDisponible(hora: string): boolean {
    if (!this.selectedDate) return true;
    const reservas = this.reservasPorHora[this.selectedDate]?.[hora] || 0;
    return reservas < this.maxReservasPorHora;
  }

  confirmarReserva(): void {
    if (this.selectedDate && this.selectedTime) {
      if (!this.reservasPorHora[this.selectedDate]) {
        this.reservasPorHora[this.selectedDate] = {};
      }

      if (!this.reservasPorHora[this.selectedDate][this.selectedTime]) {
        this.reservasPorHora[this.selectedDate][this.selectedTime] = 0;
      }

      const reservasActuales = this.reservasPorHora[this.selectedDate][this.selectedTime];

      if (reservasActuales < this.maxReservasPorHora) {
        this.reservasPorHora[this.selectedDate][this.selectedTime]++;
        this.reservas.push({
          fecha: this.selectedDate,
          hora: this.selectedTime
        });

        this.selectedDate = '';
        this.selectedTime = '';
      } else {
        alert('Lo sentimos, esa hora ya está llena.');
      }
    }
  }
}
