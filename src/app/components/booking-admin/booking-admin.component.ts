import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, BusinessConfig, Reserva, BusinessType } from '../../services/booking-config.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-booking-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, BookingCalendarComponent],
  templateUrl: './booking-admin.component.html',
  styleUrls: ['./booking-admin.component.scss'],
})
export class BookingAdminComponent implements OnInit, OnDestroy {
  configNegocio: Partial<BusinessConfig> = {
    nombre: '',
    maxReservasPorSlot: 1,
    tipoNegocio: BusinessType.GENERAL
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

    // Método para refrescar el calendario
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
          this.configNegocio = { ...config };
          this.updateServicesDropdown();
        },
        error: (err) => console.error('Error cargando configuración:', err)
      })
    );
  }

  private updateSummary(): void {
    this.reservasPorDia = {};
    this.reservas.forEach(reserva => {
      const fecha = new Date(reserva.fechaInicio).toISOString().split('T')[0];
      this.reservasPorDia[fecha] = (this.reservasPorDia[fecha] || 0) + 1;
    });
  }

  private updateServicesDropdown(): void {
    // Si necesitas actualizar algo relacionado con los servicios
    // cuando cambia la configuración
  }

  saveConfiguration(): void {
    if (this.isFormValid()) {
      this.bookingService.updateConfig({
        nombre: this.configNegocio.nombre,
        maxReservasPorSlot: this.configNegocio.maxReservasPorSlot,
        tipoNegocio: this.configNegocio.tipoNegocio
      });
      alert('Configuración guardada correctamente');
    } else {
      alert('Por favor complete todos los campos requeridos');
    }
  }

  private isFormValid(): boolean {
    return !!this.configNegocio.nombre && 
           !!this.configNegocio.maxReservasPorSlot &&
           !!this.configNegocio.tipoNegocio;
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