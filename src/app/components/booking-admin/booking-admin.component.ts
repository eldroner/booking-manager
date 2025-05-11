import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, BusinessConfig, Reserva, BusinessType, HorarioEspecial } from '../../services/booking-config.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-booking-admin',
    standalone: true,
    imports: [CommonModule, FormsModule, FullCalendarModule, BookingCalendarComponent],
    templateUrl: './booking-admin.component.html',
    styleUrls: ['./booking-admin.component.scss']
})
export class BookingAdminComponent implements OnInit, OnDestroy {
  configNegocio: BusinessConfig = {
    nombre: '',
    tipoNegocio: BusinessType.PELUQUERIA,
    duracionBase: 30,
    maxReservasPorSlot: 1,
    servicios: [],
    horariosNormales: [
      {
        dia: 1, // Lunes
        tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }]
      },
      {
        dia: 2, // Martes
        tramos: [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }]
      },
    ],
    horariosEspeciales: []
  };
  
  showCurrentBookings: boolean = false;  // Puedes cambiar a true si prefieres que inicie abierto
  showSummaryByDate: boolean = false;    // Puedes cambiar a true si prefieres que inicie abierto

  businessTypes = [
    { value: BusinessType.PELUQUERIA, label: 'Peluquería' },
    { value: BusinessType.HOTEL, label: 'Hotel' },
    { value: BusinessType.CONSULTA, label: 'Consulta Médica' },
    { value: BusinessType.GENERAL, label: 'General' }
  ];

  diasSemana = [
    { id: 0, nombre: 'Domingo' },
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' }
  ];

  nuevoHorarioEspecial: Partial<HorarioEspecial> = {
    fecha: '',
    horaInicio: '09:00',
    horaFin: '14:00',
    activo: true
  };

  // Variables para controlar los acordeones
  loadingReservas = false;
  showNormalSchedules = false;
  showSpecialSchedules = false;
  iconosCargados: boolean = false;

  calendarVisible = true;
  reservas: Reserva[] = [];
  reservasPorDia: { [fecha: string]: number } = {};
  private subscriptions: Subscription = new Subscription();

  constructor(public bookingService: BookingConfigService) {
    this.configNegocio = this.getDefaultConfig();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadReservas();
    this.checkIconsLoaded();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  getResumenEntries(): { key: string, value: number }[] {
    return Object.keys(this.reservasPorDia).map(key => ({
      key,
      value: this.reservasPorDia[key]
    }));
  }

  get reservasPorDiaArray(): { key: string, value: number }[] {
    if (!this.reservasPorDia) return [];
    return Object.keys(this.reservasPorDia).map(key => ({
      key,
      value: this.reservasPorDia[key]
    }));
  }

  // Métodos para horarios normales
  getTramosDia(dia: number): { horaInicio: string; horaFin: string }[] {
    const horarioDia = this.configNegocio.horariosNormales.find(h => h.dia === dia);
    return horarioDia ? horarioDia.tramos : [];
  }

  agregarTramo(dia: number): void {
    let horarioDia = this.configNegocio.horariosNormales.find(h => h.dia === dia);

    if (!horarioDia) {
      horarioDia = { dia, tramos: [] };
      this.configNegocio.horariosNormales.push(horarioDia);
    }

    horarioDia.tramos.push({
      horaInicio: '09:00',
      horaFin: '13:00'
    });
  }

  private checkIconsLoaded() {
    const testIcon = document.createElement('i');
    testIcon.className = 'bi bi-chevron-down';
    document.body.appendChild(testIcon);

    setTimeout(() => {
      this.iconosCargados = window.getComputedStyle(testIcon).fontFamily.includes('bootstrap-icons');
      document.body.removeChild(testIcon);
    }, 100);
  }

  verReservasDia(fecha: string): void {
    // Opcional: Implementar lógica para filtrar reservas por fecha
    console.log('Mostrar reservas del día:', fecha);
    // Ejemplo: this.reservasDelDia = this.reservas.filter(r => r.fechaInicio.startsWith(fecha));
  }

  eliminarTramo(dia: number, index: number): void {
    const horarioDia = this.configNegocio.horariosNormales.find(h => h.dia === dia);
    if (horarioDia && horarioDia.tramos.length > index) {
      horarioDia.tramos.splice(index, 1);
    }
  }

  // Métodos para horarios especiales
  agregarHorarioEspecial(): void {
    if (!this.nuevoHorarioEspecial.fecha) {
      alert('Por favor seleccione una fecha');
      return;
    }

    const nuevoHorario: HorarioEspecial = {
      fecha: this.nuevoHorarioEspecial.fecha!,
      horaInicio: this.nuevoHorarioEspecial.horaInicio!,
      horaFin: this.nuevoHorarioEspecial.horaFin!,
      activo: this.nuevoHorarioEspecial.activo !== false
    };

    if (!this.bookingService.validateHorarioEspecial(nuevoHorario)) {
      alert('Por favor verifique los datos del horario');
      return;
    }

    if (this.bookingService.checkSolapamientoHorarios(nuevoHorario)) {
      alert('Este horario se solapa con otro ya existente para la misma fecha');
      return;
    }

    this.configNegocio.horariosEspeciales = [...this.configNegocio.horariosEspeciales, nuevoHorario];
    this.bookingService.updateHorariosEspeciales(this.configNegocio.horariosEspeciales);
    this.resetNuevoHorarioEspecial();
  }

  eliminarHorarioEspecial(index: number): void {
    if (confirm('¿Eliminar este horario especial?')) {
      this.configNegocio.horariosEspeciales.splice(index, 1);
    }
  }

  toggleActivoHorarioEspecial(index: number): void {
    this.configNegocio.horariosEspeciales[index].activo = !this.configNegocio.horariosEspeciales[index].activo;
  }

  // Métodos principales
  private loadData(): void {
    this.subscriptions.add(
      this.bookingService.config$.subscribe({
        next: (config) => {
          this.configNegocio = {
            ...this.getDefaultConfig(),
            ...config,
            horariosEspeciales: config.horariosEspeciales || []
          };
        },
        error: (err) => console.error('Error cargando configuración:', err)
      })
    );
  }

  private loadReservas(): void {
    this.subscriptions.add(
      this.bookingService.getReservas().subscribe({
        next: (reservas) => {
          this.reservas = reservas.sort((a, b) => 
            new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
          );
          this.updateSummary();
        },
        error: (err) => {
          console.error('Error cargando reservas', err);
          this.reservas = [];
          this.reservasPorDia = {};
        }
      })
    );
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

  deleteReservation(id: string): void {
    if (confirm('¿Está seguro que desea eliminar esta reserva?')) {
      this.subscriptions.add(
        this.bookingService.deleteReserva(id).subscribe({
          next: () => {
            this.reservas = this.reservas.filter(r => r.id !== id);
            this.updateSummary(); // <-- Asegurar que se actualice
            this.showSuccessToast('Reserva eliminada');
          },
          error: (err) => this.showErrorToast('Error al eliminar reserva: ' + err.message)
        })
      );
    }
  }

  private showSuccessToast(message: string): void {
    // Implementar con tu librería de notificaciones preferida
    console.log('Éxito:', message);
  }
  
  private showErrorToast(message: string): void {
    // Implementar con tu librería de notificaciones preferida
    console.error('Error:', message);
  }

  // Helpers
  private getDefaultConfig(): BusinessConfig {
    return {
      nombre: '',
      tipoNegocio: BusinessType.PELUQUERIA,
      duracionBase: 30,
      maxReservasPorSlot: 1,
      servicios: [],
      horariosNormales: this.diasSemana.map(dia => ({
        dia: dia.id,
        tramos: dia.id >= 1 && dia.id <= 5 ? // Lunes a Viernes
          [{ horaInicio: '09:00', horaFin: '13:00' }, { horaInicio: '15:00', horaFin: '19:00' }] :
          dia.id === 6 ? // Sábado
            [{ horaInicio: '10:00', horaFin: '14:00' }] :
            [] // Domingo - cerrado por defecto
      })),
      horariosEspeciales: []
    };
  }

  private resetNuevoHorarioEspecial(): void {
    this.nuevoHorarioEspecial = {
      fecha: '',
      horaInicio: '09:00',
      horaFin: '14:00',
      activo: true
    };
  }

  private updateSummary(): void {
    this.reservasPorDia = {};
    this.reservas.forEach(reserva => {
      try {
        const fecha = new Date(reserva.fechaInicio).toISOString().split('T')[0];
        if (fecha) {
          this.reservasPorDia[fecha] = (this.reservasPorDia[fecha] || 0) + 1;
        }
      } catch (e) {
        console.error('Fecha inválida:', reserva.fechaInicio);
      }
    });
  }

  refreshCalendar(): void {
    this.calendarVisible = false;
    setTimeout(() => this.calendarVisible = true, 100);
  }

  private isFormValid(): boolean {
    return !!this.configNegocio.nombre &&
      !!this.configNegocio.maxReservasPorSlot &&
      !!this.configNegocio.tipoNegocio &&
      this.configNegocio.horariosNormales.length > 0;
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