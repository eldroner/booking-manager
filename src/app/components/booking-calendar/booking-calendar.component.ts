import { Component, OnInit, OnDestroy } from '@angular/core';
import { BookingConfigService } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './booking-calendar.component.html',
  styleUrls: ['./booking-calendar.component.scss'],
})
export class BookingCalendarComponent implements OnInit, OnDestroy {
  calendarOptions: any = {}; // Opciones iniciales del calendario
  monthViewDay: { date: Date; color: string; isToday: boolean }[] = []; // Datos para la vista mensual
  reservas: { fecha: string; hora: string; id: string }[] = [];
  private reservasSubscription: Subscription = new Subscription(); // Propiedad para gestionar suscripciones

  constructor(private configService: BookingConfigService) {}

  ngOnInit(): void {
    this.reservasSubscription = this.configService.reservas$.subscribe((reservas) => {
      this.reservas = reservas;
      this.setupCalendar(); // Refrescar el calendario cuando las reservas cambian
      this.generateMonthViewDays();
    });
  }

  ngOnDestroy(): void {
    // Cancelar suscripción para evitar memory leaks
    if (this.reservasSubscription) {
      this.reservasSubscription.unsubscribe();
    }
  }

  eliminarReserva(id: string): void {
    console.log('ID recibido para eliminar:', id); // Log para verificar que el ID llega correctamente
    this.configService.deleteReserva(id); // Eliminar del almacenamiento
    console.log('Reservas después de eliminar (en el componente):', this.reservas); // Log para verificar el estado
  }
  
  private setupCalendar(): void {
    const eventos = this.reservas.map((reserva) => ({
      title: `Reserva a las ${reserva.hora}`,
      date: reserva.fecha,
      backgroundColor: this.getReservaColor(reserva.fecha),
      extendedProps: { fecha: reserva.fecha, hora: reserva.hora }, // Información adicional para popups
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
    const reservasPorDia = this.reservas.filter((r) => r.fecha === fecha).length;

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
