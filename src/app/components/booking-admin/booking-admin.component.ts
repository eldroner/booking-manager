import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService } from '../../services/booking-config.service';
import { FullCalendarModule } from '@fullcalendar/angular';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';

@Component({
  selector: 'app-booking-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, BookingCalendarComponent],
  templateUrl: './booking-admin.component.html',
  styleUrls: ['./booking-admin.component.scss'],
})
export class BookingAdminComponent implements OnInit {
  configNegocio = {
    nombre: '',
    maxCitasPorHora: 1,
  };

  reservas: { id: string; fecha: string; hora: string }[] = [];
  reservasPorHora: { [fecha: string]: { [hora: string]: number } } = {};
  calendarOptions: any;

  constructor(private configService: BookingConfigService) {}

  ngOnInit(): void {
    this.cargarReservas();
    this.setupCalendar();
    this.configService.config$.subscribe(config => {
      this.configNegocio = { ...config };
    });
  }

  private cargarReservas(): void {
    this.reservas = this.configService.loadReservas().map(reserva => ({
      ...reserva,
      id: this.generateId(),
    }));
    this.recalcularReservasPorHora();
  }

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

  guardarConfiguracion(): void {
    this.configService.updateConfig(this.configNegocio);
    alert('Configuración guardada');
  }

  eliminarReserva(id: string): void {
    this.reservas = this.reservas.filter(reserva => reserva.id !== id);
    this.recalcularReservasPorHora();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private setupCalendar(): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      events: this.reservas.map(reserva => ({
        title: `Reserva a las ${reserva.hora}`,
        date: reserva.fecha,
        backgroundColor: this.getReservaColor(reserva.fecha), // Fondo dinámico
        textColor: 'black', // Texto legible
      })),
      dateClick: (info: any) => {
        alert('Fecha clickeada: ' + info.dateStr);
      },
    };
  }

  private getReservaColor(fecha: string): string {
    const reservasPorDia = this.reservas.filter(r => r.fecha === fecha).length;
    if (reservasPorDia >= 5) return 'red';
    if (reservasPorDia > 2) return 'yellow';
    return 'green';
  }
}
