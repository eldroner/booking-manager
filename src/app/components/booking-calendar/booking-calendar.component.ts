import { Component, OnInit, OnDestroy } from '@angular/core';
import { BookingConfigService } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Subscription } from 'rxjs';
import { Reserva } from '../../services/booking-config.service';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './booking-calendar.component.html',
  styleUrls: ['./booking-calendar.component.scss'],
})
export class BookingCalendarComponent implements OnInit, OnDestroy {
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
      const hora = new Date(reserva.fechaInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        title: `Reserva ${hora} - ${reserva.usuario.nombre}`,
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