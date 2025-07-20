import { Component, OnInit, Input, OnDestroy, HostListener } from '@angular/core';
import { BookingConfigService, BookingStatus, Reserva } from '../../services/booking-config.service';
import { CommonModule } from '@angular/common';
import { FullCalendarModule } from '@fullcalendar/angular';
import { Subscription } from 'rxjs';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { CalendarOptions, EventContentArg, DayCellMountArg } from '@fullcalendar/core';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './booking-calendar.component.html',
  styleUrls: ['./booking-calendar.component.scss']
})
export class BookingCalendarComponent implements OnInit, OnDestroy {
  @Input() fechasBloqueadas: string[] = [];

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    firstDay: 1,
    locales: [esLocale],
    locale: 'es',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día'
    },
    dayHeaderFormat: { weekday: 'short' },
    fixedWeekCount: false,
    height: 'auto',
    contentHeight: 'auto',
    dayMaxEvents: 3,
    eventDisplay: 'list-item',
    eventColor: '#4a6baf',
    eventBackgroundColor: '#e8f4ff',
    eventBorderColor: '#4a6baf',
    eventTextColor: '#fff',
    eventContent: (arg: EventContentArg) => {
      return {
        domNodes: [
          this.createEventDiv(arg.event.title, arg.event.backgroundColor, arg.event.textColor)
        ]
      };
    },
    eventClick: (info: any) => {
      const reserva = info.event.extendedProps;
      alert(`Reserva de ${reserva.usuario.nombre}\nServicio: ${reserva.servicio}`);
    },
    dateClick: (info: any) => {
      this.handleDateClick(info.dateStr);
    },
    eventClassNames: 'evento-calendario',
    dayCellClassNames: 'dia-calendario',
    selectAllow: (selectInfo: any) => {
      const selectedDate = selectInfo.startStr.split('T')[0];
      return !this.fechasBloqueadas.includes(selectedDate);
    },
    dayCellDidMount: (arg: DayCellMountArg) => {
      const dateStr = arg.date.toISOString().split('T')[0];
      if (this.fechasBloqueadas.includes(dateStr)) {
        arg.el.classList.add('fecha-bloqueada');
      }
    },
    events: []
  };

  private reservasSubscription: Subscription = new Subscription();

  constructor(private bookingService: BookingConfigService) { }

  ngOnInit(): void {
    this.loadConfirmedReservas();
    this.updateTitleFormat(); // Establecer el formato inicial
  }

  ngOnDestroy(): void {
    if (this.reservasSubscription) {
      this.reservasSubscription.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateTitleFormat();
  }

  private updateTitleFormat(): void {
    if (window.innerWidth < 768) { // Considera 768px como el breakpoint para móvil
      this.calendarOptions.titleFormat = { month: 'long' }; // Solo mes
    } else {
      this.calendarOptions.titleFormat = { year: 'numeric', month: 'long' }; // Mes y año
    }
  }

  private loadConfirmedReservas(): void {
    this.reservasSubscription = this.bookingService.getReservas(BookingStatus.CONFIRMADA).subscribe((reservas) => {
      this.updateCalendarEvents(reservas);
    });
  }

  private updateCalendarEvents(reservas: Reserva[]): void {
    const eventos = reservas.map((reserva) => {
      const ahora = new Date();
      const fechaEvento = new Date(reserva.fechaInicio);
      const esPasado = fechaEvento < ahora;

      return {
        title: `${reserva.usuario.nombre} (${this.formatHora(reserva.fechaInicio)})`,
        start: reserva.fechaInicio,
        end: reserva.fechaFin,
        backgroundColor: esPasado ? '#f0f4f8' : '#4a6baf',
        borderColor: esPasado ? '#d1d9e6' : '#3a5690',
        textColor: esPasado ? '#64748b' : '#ffffff',
        extendedProps: {
          ...reserva,
          esPasado
        }
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: eventos
    };
  }

  private handleDateClick(date: string): void {
    // Lógica para manejar el clic en una fecha
  }

  private createEventDiv(title: string, bgColor: string, textColor: string): HTMLElement {
    const div = document.createElement('div');
    div.className = 'fc-event-main';
    div.style.backgroundColor = bgColor;
    div.style.color = textColor;
    div.style.padding = '2px 5px';
    div.style.borderRadius = '4px';
    div.textContent = title;
    return div;
  }

  private formatHora(fechaString: string): string {
    const fecha = new Date(fechaString);
    return fecha.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
