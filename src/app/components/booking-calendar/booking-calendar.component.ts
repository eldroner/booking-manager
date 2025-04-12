import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BookingConfigService } from '../../services/booking-config.service';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './booking-calendar.component.html',
  styleUrls: ['./booking-calendar.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]  // Añadir el esquema de elementos personalizados
})
export class BookingCalendarComponent implements OnInit {
  calendarOptions: any;

  constructor(private configService: BookingConfigService) {}

  ngOnInit(): void {
    const reservas = this.configService.loadReservas();
    const eventos = reservas.map(reserva => ({
      title: `${reserva.fecha} ${reserva.hora}`,
      date: reserva.fecha,
      backgroundColor: this.getReservaColor(reserva),
    }));

    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      events: eventos,
      dateClick: (info: any) => {
        alert('Fecha clickeada: ' + info.dateStr);
      }
    };
  }

  private getReservaColor(reserva: { fecha: string, hora: string }): string {
    const reservasPorDia = this.configService.loadReservas().filter(r => r.fecha === reserva.fecha);
    if (reservasPorDia.length >= 5) return 'red';
    if (reservasPorDia.length > 2) return 'yellow';
    return 'green';
  }
}
