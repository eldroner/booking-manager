import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, BusinessConfig, Reserva, BusinessType, HorarioEspecial, Servicio } from '../../services/booking-config.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';
import { Subscription, take } from 'rxjs';
import { NotificationsService } from '../../services/notifications.service';
import { HorarioNormal } from '../../services/booking-config.service';

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
  showServicesEditor = false;

  calendarVisible = true;
  reservas: Reserva[] = [];
  reservasPorDia: { [fecha: string]: number } = {};
  private subscriptions: Subscription = new Subscription();

  constructor(
    public bookingService: BookingConfigService,
    private notifications: NotificationsService
  ) {
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

  // En el componente booking-admin.ts (que no has compartido pero puedo inferir)

  agregarTramo(diaId: number): void {
    // Encuentra el día en la configuración
    const diaIndex = this.configNegocio.horariosNormales.findIndex(d => d.dia === diaId);

    if (diaIndex === -1) {
      // Si no existe el día, lo creamos
      this.configNegocio.horariosNormales.push({
        dia: diaId,
        tramos: [{ horaInicio: '09:00', horaFin: '13:00' }]
      });
    } else {
      // Si existe, añadimos un nuevo tramo por defecto
      this.configNegocio.horariosNormales[diaIndex].tramos.push({
        horaInicio: '09:00',
        horaFin: '13:00'
      });
    }
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

  eliminarTramo(dia: number, index: number, event?: Event): void {
    // Verificar y detener la propagación del evento si existe
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const confirmacion = confirm('¿Estás seguro de eliminar este tramo horario?');
    if (!confirmacion) {
      return;
    }

    // Copia profunda del estado actual
    const nuevosHorarios = JSON.parse(JSON.stringify(this.configNegocio.horariosNormales));

    const diaIndex = nuevosHorarios.findIndex((h: HorarioNormal) => h.dia === dia);
    if (diaIndex === -1) return;

    nuevosHorarios[diaIndex].tramos.splice(index, 1);

    if (nuevosHorarios[diaIndex].tramos.length === 0) {
      nuevosHorarios.splice(diaIndex, 1);
    }

    // Actualizar solo los horarios normales
    this.bookingService.updateConfig({ horariosNormales: nuevosHorarios })
      .pipe(take(1))
      .subscribe({
        next: (updatedConfig) => {
          this.configNegocio.horariosNormales = updatedConfig.horariosNormales;
          this.notifications.showSuccess('Tramo horario eliminado correctamente');
          this.refreshCalendar();
        },
        error: (err) => {
          console.error('Error al eliminar tramo:', err);
          this.notifications.showError('No se pudo eliminar el tramo horario');
        }
      });
  }

  // Métodos para horarios especiales
  agregarHorarioEspecial(): void {

    const nuevoHorario: HorarioEspecial = {
      fecha: this.nuevoHorarioEspecial.fecha!,
      horaInicio: this.nuevoHorarioEspecial.horaInicio!,
      horaFin: this.nuevoHorarioEspecial.horaFin!,
      activo: this.nuevoHorarioEspecial.activo !== false
    };

    if (!this.nuevoHorarioEspecial.fecha) {
      alert('Por favor seleccione una fecha');
      this.configNegocio.horariosEspeciales = [...this.configNegocio.horariosEspeciales, nuevoHorario];
      return;
    }

    if (!this.bookingService.validateHorarioEspecial(nuevoHorario)) {
      alert('Por favor verifique los datos del horario');
      return;
    }

    if (this.bookingService.checkSolapamientoHorarios(nuevoHorario)) {
      alert('Este horario se solapa con otro ya existente para la misma fecha');
      return;
    }

    this.configNegocio.horariosEspeciales = [...this.configNegocio.horariosEspeciales, nuevoHorario];

    this.bookingService.updateConfig({
      horariosEspeciales: this.configNegocio.horariosEspeciales
    }).subscribe({
      error: (err) => console.error('Error al agregar horario:', err)
    });

    this.resetNuevoHorarioEspecial();
  }


  addService(): void {
    const newId = Date.now().toString();
    this.configNegocio.servicios.push({
      id: newId,
      nombre: 'Nuevo Servicio', // Nombre por defecto (no vacío)
      duracion: 30,             // Duración por defecto (mínimo 5)
      precio: 0                 // Campo opcional si lo usas
    });

    // Guarda automáticamente
    //this.updateServices();
  }

  private updateServices(): void {
    // Filtra servicios inválidos
    const serviciosValidos = this.configNegocio.servicios.filter(
      s => s.nombre?.trim() && s.duracion >= 5
    );

    this.bookingService.updateConfig({ servicios: serviciosValidos })
      .pipe(take(1))
      .subscribe({
        next: () => this.notifications.showSuccess('Servicios actualizados'),
        error: (err) => {
          console.error('Error detallado:', err);
          this.notifications.showError('Error al guardar servicios: ' + err.error?.details || err.message);
        }
      });
  }

  updateService(servicio: Servicio): void {
    if (!servicio.nombre?.trim() || servicio.duracion < 5) {
      this.notifications.showError('Nombre y duración (mín. 5 min) son obligatorios');
      return;
    }
    this.updateServices(); // Reemplaza el código antiguo
  }

  deleteService(id: string): void {
    if (confirm('¿Eliminar este servicio?')) {
      this.configNegocio.servicios = this.configNegocio.servicios.filter(s => s.id !== id);
      this.updateServices(); // Reemplaza el código antiguo
    }
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
    if (!this.isFormValid()) {
      this.notifications.showError('Por favor complete todos los campos requeridos');
      return;
    }

    this.bookingService.updateConfig(this.configNegocio)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notifications.showSuccess('Configuración guardada correctamente');
          this.refreshCalendar();
        },
        error: (err) => {
          this.notifications.showError('Error al guardar: ' + err.message);
        }
      });
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