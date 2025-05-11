import { Component, OnInit } from '@angular/core';
import { BookingConfigService } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Subscription } from 'rxjs';
import { Reserva } from '../../services/booking-config.service';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
    selector: 'app-booking-calendar',
    standalone: true, // <-- Añadir esto
    imports: [CommonModule, FullCalendarModule],
    templateUrl: './booking-calendar.component.html',
    styleUrls: ['./booking-calendar.component.scss']
})
export class BookingCalendarComponent implements OnInit {
  calendarOptions: any = {};
  reservas: Reserva[] = [];
  private reservasSubscription: Subscription = new Subscription();

  constructor(private bookingService: BookingConfigService) {}

  ngOnInit(): void {
    this.reservasSubscription = this.bookingService.getReservas().subscribe((reservas) => {
      this.reservas = reservas;
      this.setupCalendar();
    });
  }

  ngOnDestroy(): void {
    if (this.reservasSubscription) {
      this.reservasSubscription.unsubscribe();
    }
  }

  eliminarReserva(id: string): void {
    this.bookingService.deleteReserva(id).subscribe();
  }
  
  private setupCalendar(): void {
    const eventos = this.reservas.map((reserva) => {
      return {
        title: `Reserva - ${reserva.usuario.nombre}`, // ← Eliminamos la hora del título
        start: reserva.fechaInicio,
        end: reserva.fechaFin,
        backgroundColor: this.getReservaColor(reserva.fechaInicio),
        extendedProps: { 
          id: reserva.id,
          usuario: reserva.usuario,
          servicio: reserva.servicio
        },
      };
    });
  
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      events: eventos,
      // Añade estas configuraciones para controlar el formato:
      eventTimeFormat: { // Elimina la hora del evento
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        meridiem: false
      },
      dayHeaderFormat: { weekday: 'short', day: 'numeric' },
      eventDisplay: 'block', // Fuerza mostrar solo el título
      eventClick: (info: any) => {
        const reserva = info.event.extendedProps;
        alert(`Reserva de ${reserva.usuario.nombre}\nServicio: ${reserva.servicio}`);
      },
      dateClick: (info: any) => {
        this.handleDateClick(info.dateStr);
      },
    };
  }

  private handleDateClick(date: string): void {
    console.log('Fecha seleccionada:', date);
  }

  private getReservaColor(fecha: string): string {
    const fechaStr = new Date(fecha).toISOString().split('T')[0];
    const reservasPorDia = this.reservas.filter(r => 
      new Date(r.fechaInicio).toISOString().split('T')[0] === fechaStr
    ).length;
  
    const config = this.bookingService.getConfig();
    const maxCitas = config.maxReservasPorSlot * 8; // Cambiamos a maxReservasPorSlot
    
    if (reservasPorDia >= maxCitas) return 'red';
    if (reservasPorDia > maxCitas / 2) return 'orange';
    return 'green';
  }
}