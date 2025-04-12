import { Component, OnInit } from '@angular/core';
import { BookingConfigService } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './booking-calendar.component.html',
  styleUrls: ['./booking-calendar.component.scss'],
})
export class BookingCalendarComponent implements OnInit {
  calendarOptions: any = {}; // Opciones iniciales del calendario
  monthViewDay: { date: Date; color: string; isToday: boolean }[] = []; // Datos para la vista mensual

  constructor(private configService: BookingConfigService) {}

  ngOnInit(): void {
    this.setupCalendar();
    this.generateMonthViewDays();
  }

  private setupCalendar(): void {
    const reservas = this.configService.loadReservas();

    const eventos = reservas.map((reserva) => ({
      title: `Reserva a las ${reserva.hora}`,
      date: reserva.fecha,
      backgroundColor: this.getReservaColor(reserva.fecha),
    }));

    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      events: eventos,
      dateClick: (info: any) => {
        this.handleDateClick(info.dateStr);
      },
    };
  }

  private handleDateClick(date: string): void {
    alert(`Has seleccionado la fecha: ${date}`);
  }

  private getReservaColor(fecha: string): string {
    const reservas = this.configService.loadReservas();
    const reservasPorDia = reservas.filter((r) => r.fecha === fecha).length;

    const maxCitasPorDia = this.configService.getMaxCitasPorDia();
    if (reservasPorDia >= maxCitasPorDia) return 'red';
    if (reservasPorDia > Math.floor(maxCitasPorDia / 2)) return 'yellow';
    return 'green';
  }

  private generateMonthViewDays(): void {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    this.monthViewDay = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
      const dateString = date.toISOString().split('T')[0];
      return {
        date,
        color: this.getReservaColor(dateString),
        isToday: date.toDateString() === today.toDateString(),
      };
    });
  }
}
