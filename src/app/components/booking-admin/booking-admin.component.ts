import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, BusinessConfig, Reserva, BusinessType } from '../../services/booking-config.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';
import { Subscription } from 'rxjs';
import { TramosHorariosComponent } from "../tramos-horarios/tramos-horarios.component";

@Component({
  selector: 'app-booking-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, BookingCalendarComponent, TramosHorariosComponent],
  templateUrl: './booking-admin.component.html',
  styleUrls: ['./booking-admin.component.scss'],
})
export class BookingAdminComponent implements OnInit, OnDestroy {
  configNegocio: BusinessConfig = {
    nombre: '',
    tipoNegocio: BusinessType.PELUQUERIA,
    duracionBase: 30,
    maxReservasPorSlot: 1,
    horarioLaboral: {
      diasLaborables: [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
      horaInicio: '09:00',
      horaFin: '18:00'
    },
    tramosHorarios: [],
    servicios: []
  };

  businessTypes = [
    { value: BusinessType.PELUQUERIA, label: 'Peluquería' },
    { value: BusinessType.HOTEL, label: 'Hotel' },
    { value: BusinessType.CONSULTA, label: 'Consulta Médica' },
    { value: BusinessType.GENERAL, label: 'General' }
  ];

  calendarVisible = true;
  reservas: Reserva[] = [];
  reservasPorDia: { [fecha: string]: number } = {};
  private subscriptions: Subscription = new Subscription();

  constructor(public bookingService: BookingConfigService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  refreshCalendar(): void {
    this.calendarVisible = false;
    setTimeout(() => this.calendarVisible = true, 100);
  }

  private loadData(): void {
    this.subscriptions.add(
      this.bookingService.getReservas().subscribe({
        next: (reservas) => {
          this.reservas = reservas;
          this.updateSummary();
        },
        error: (err) => console.error('Error cargando reservas:', err)
      })
    );

    this.subscriptions.add(
      this.bookingService.config$.subscribe({
        next: (config) => {
          // Asegurarnos de que todos los campos estén inicializados
          this.configNegocio = { 
            ...this.configNegocio, // Valores por defecto
            ...config,             // Valores guardados
            horarioLaboral: {
              ...this.configNegocio.horarioLaboral,
              ...(config.horarioLaboral || {})
            },
            tramosHorarios: config.tramosHorarios || this.generateDefaultTimeSlots()
          };
        },
        error: (err) => console.error('Error cargando configuración:', err)
      })
    );
  }

  private generateDefaultTimeSlots(): { hora: string; activo: boolean }[] {
    const slots: { hora: string; activo: boolean }[] = [];
    let currentHour = 9;
    let currentMinute = 0;
    
    while (currentHour < 18 || (currentHour === 18 && currentMinute === 0)) {
      slots.push({
        hora: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        activo: true
      });
      
      // Añadir 30 minutos
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    
    return slots;
  }

  private updateSummary(): void {
    this.reservasPorDia = {};
    this.reservas.forEach(reserva => {
      const fecha = new Date(reserva.fechaInicio).toISOString().split('T')[0];
      this.reservasPorDia[fecha] = (this.reservasPorDia[fecha] || 0) + 1;
    });
  }

  saveConfiguration(): void {
    if (this.isFormValid()) {
      this.bookingService.updateConfig(this.configNegocio);
      alert('Configuración guardada correctamente');
      this.refreshCalendar();
    } else {
      alert('Por favor complete todos los campos requeridos');
    }
  }

  private isFormValid(): boolean {
    return !!this.configNegocio.nombre && 
           !!this.configNegocio.maxReservasPorSlot &&
           !!this.configNegocio.tipoNegocio &&
           !!this.configNegocio.horarioLaboral?.horaInicio &&
           !!this.configNegocio.horarioLaboral?.horaFin &&
           !!this.configNegocio.horarioLaboral?.diasLaborables &&
           this.configNegocio.horarioLaboral.diasLaborables.length > 0;
  }

  deleteReservation(id: string): void {
    if (confirm('¿Está seguro que desea eliminar esta reserva?')) {
      this.subscriptions.add(
        this.bookingService.deleteReserva(id).subscribe({
          next: () => {
            this.reservas = this.reservas.filter(r => r.id !== id);
            this.updateSummary();
          },
          error: (err) => alert('Error al eliminar reserva: ' + err.message)
        })
      );
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getServiceName(serviceId: string): string {
    const config = this.bookingService.getConfig();
    return config.servicios?.find(s => s.id === serviceId)?.nombre || serviceId;
  }
}