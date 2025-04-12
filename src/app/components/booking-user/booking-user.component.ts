import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService } from '../../services/booking-config.service';

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

  negocioNombre: string = '';
  maxReservasPorHora: number = 1;

  reservas: { fecha: string; hora: string; id: string }[] = [];  // Añadir id al tipo de reserva
  reservasPorHora: { [fecha: string]: { [hora: string]: number } } = {};

  constructor(private configService: BookingConfigService) {
    this.configService.reservas$.subscribe(reservas => {
      this.reservas = reservas;
      this.recalcularReservasPorHora();
    });
  }

  cargarReservas(): void {
    this.reservas = this.configService.loadReservas();
    this.reservasPorHora = {};

    for (const reserva of this.reservas) {
      if (!this.reservasPorHora[reserva.fecha]) {
        this.reservasPorHora[reserva.fecha] = {};
      }
      if (!this.reservasPorHora[reserva.fecha][reserva.hora]) {
        this.reservasPorHora[reserva.fecha][reserva.hora] = 0;
      }
      this.reservasPorHora[reserva.fecha][reserva.hora]++;
    }
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

        // Añadir la propiedad id a cada nueva reserva
        const nuevaReserva = {
          fecha: this.selectedDate,
          hora: this.selectedTime,
          id: this.generateId() // Generar un id único
        };

        this.reservas.push(nuevaReserva);

        // Guardar reservas en localStorage
        this.configService.saveReservas(this.reservas);

        this.selectedDate = '';
        this.selectedTime = '';
      } else {
        alert('Lo sentimos, esa hora ya está llena.');
      }
    }
  }

  // Método para generar un id único para cada reserva
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Método para eliminar una reserva
  eliminarReserva(id: string): void {
    // Eliminar la reserva por id
    this.reservas = this.reservas.filter(reserva => reserva.id !== id);
    
    // Actualizar las reservas en localStorage
    this.configService.saveReservas(this.reservas);

    // Actualizar el objeto reservasPorHora
    this.recalcularReservasPorHora();
  }

  // Recalcular las reservas por hora
  private recalcularReservasPorHora(): void {
    this.reservasPorHora = {};
    this.reservas.forEach(reserva => {
      if (!this.reservasPorHora[reserva.fecha]) {
        this.reservasPorHora[reserva.fecha] = {};
      }
      if (!this.reservasPorHora[reserva.fecha][reserva.hora]) {
        this.reservasPorHora[reserva.fecha][reserva.hora] = 0;
      }
      this.reservasPorHora[reserva.fecha][reserva.hora]++;
    });
  }
}
