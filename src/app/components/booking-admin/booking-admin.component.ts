import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, BusinessConfig, Reserva, BusinessType, HorarioEspecial, Servicio, BookingStatus } from '../../services/booking-config.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';
import { Subscription, take } from 'rxjs';
import { NotificationsService } from '../../services/notifications.service';
import { HorarioNormal } from '../../services/booking-config.service';
import { Router } from '@angular/router';
import { saveAs } from 'file-saver';
import { BookingUserComponent } from "../booking-user/booking-user.component";
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-booking-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, BookingCalendarComponent, BookingUserComponent],
  providers: [DatePipe],
  templateUrl: './booking-admin.component.html',
  styleUrls: ['./booking-admin.component.scss']
})
export class BookingAdminComponent implements OnInit, OnDestroy {
  searchText = '';
  statusFilter = 'all';
  dateFilter = '';
  filteredReservas: any[] = [];
  reservasFiltradasVisibles: any[] = [];
  mostrarReservasPasadas = false;
  isServiciosOpen = false;
  selectedReserva: any = null;
  today = new Date();
  showReservaManual = false;
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

  originalConfigNegocio!: BusinessConfig; // Para detectar cambios reales
  originalServicios: Servicio[] = []; // Para detectar cambios en servicios individuales
  originalHorariosNormales: HorarioNormal[] = []; // Para detectar cambios en horarios normales

  showCurrentBookings: boolean = false;  // Puedes cambiar a true si prefieres que inicie abierto
  showSummaryByDate: boolean = false;    // Puedes cambiar a true si prefieres que inicie abierto

  businessTypes = [
    { value: BusinessType.PELUQUERIA, label: 'Peluquería' },
    { value: BusinessType.HOTEL, label: 'Hotel' },
    { value: BusinessType.CONSULTA, label: 'Consulta Médica' },
    { value: BusinessType.GENERAL, label: 'General' }
  ];

  diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 0, nombre: 'Domingo' }
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
  showBlockedDates = false; // Nueva propiedad para el acordeón de fechas bloqueadas
  iconosCargados: boolean = false;
  showServicesEditor = false;

  modalTitle = '';
  modalContent = '';

  calendarVisible = true;
  reservas: Reserva[] = [];
  reservasPorDia: { [fecha: string]: number } = {};
  fechasBloqueadas: string[] = [];
  nuevaFechaBloqueada: string = '';
  private subscriptions: Subscription = new Subscription();

  constructor(
    public bookingService: BookingConfigService,
    private notifications: NotificationsService,
    private router: Router,
    private adminAuthService: AdminAuthService,
    private datePipe: DatePipe
  ) {
    this.configNegocio = this.getDefaultConfig();
  }

  logout(): void {
    this.adminAuthService.logout();
  }

  ngOnInit(): void {
    this.loadData();
    this.loadReservas();
    this.loadFechasBloqueadas();
    this.checkIconsLoaded();
  }

  goToUser() {
    this.router.navigate(['/']);
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

  scrollAndExpandReserva(): void {
  // 1. Abre el acordeón
  const accordionButton = document.querySelector('[data-bs-target="#panel-reservas"]') as HTMLElement;
  if (accordionButton?.classList.contains('collapsed')) {
    accordionButton.click();
  }

  // 2. Scroll suave hasta el formulario
  setTimeout(() => {
    const reservaSection = document.getElementById('panel-reservas');
    reservaSection?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'nearest'
    });
  }, 300); // Pequeño delay para esperar la animación del acordeón
}


  actualizarVisibilidadReservas(): void {
    const ahora = new Date();
    console.log('actualizarVisibilidadReservas: mostrarReservasPasadas =', this.mostrarReservasPasadas);
    console.log('actualizarVisibilidadReservas: Fecha y hora actuales =', ahora);

    this.reservasFiltradasVisibles = this.filteredReservas.filter(r => {
      const fechaReserva = new Date(r.fechaInicio);
      const esPasada = fechaReserva < ahora;
      const debeMostrar = this.mostrarReservasPasadas || !esPasada;

      console.log(`Reserva: ${r.usuario?.nombre} - Fecha: ${fechaReserva.toLocaleString()} - Es pasada: ${esPasada} - Debe mostrar: ${debeMostrar}`);
      return debeMostrar;
    });
    console.log('actualizarVisibilidadReservas: Total de reservas visibles =', this.reservasFiltradasVisibles.length);
  }

  filterReservations() {
    this.filteredReservas = this.reservas.filter(r => {
      const matchesSearch = this.searchText === '' ||
        r.usuario.nombre.toLowerCase().includes(this.searchText.toLowerCase()) ||
        r.usuario.email.toLowerCase().includes(this.searchText.toLowerCase()) ||
        (r.usuario.telefono && r.usuario.telefono.includes(this.searchText));

      const matchesStatus = this.statusFilter === 'all' ||
        r.estado === this.statusFilter;

      const matchesDate = !this.dateFilter ||
        new Date(r.fechaInicio).toDateString() === new Date(this.dateFilter).toDateString();

      return matchesSearch && matchesStatus && matchesDate;
    });
    this.actualizarVisibilidadReservas();
  }

  resetFilters(): void {
    this.searchText = '';
    this.statusFilter = 'all';
    this.dateFilter = '';
    this.applyFilters();
  }


  exportToCSV(): void {
    // 1. Preparar cabeceras
    const headers = [
      'Cliente',
      'Email',
      'Teléfono',
      'Servicio',
      'Fecha Inicio',
      'Fecha Fin',
      'Estado'
    ];

    // 2. Mapear datos
    const csvRows = this.filteredReservas.map(reserva => {
      return [
        reserva.usuario?.nombre || 'Sin nombre',
        reserva.usuario?.email || '',
        reserva.usuario?.telefono || '',
        reserva.servicio,
        this.formatDateForExport(reserva.fechaInicio),
        reserva.fechaFin ? this.formatDateForExport(reserva.fechaFin) : '',
        reserva.estado
      ].map(field => `"${field}"`); // Escapar comillas
    });

    // 3. Crear contenido CSV
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // 4. Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `reservas_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private formatDateForExport(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().replace('T', ' ').slice(0, 16);
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

  toggleServicios() {
  this.isServiciosOpen = !this.isServiciosOpen;
}


  addService(): void {
    const newId = Date.now().toString();
    const newService = {
      id: newId,
      nombre: 'Nombre del servicio',
      duracion: 30,
      precio: 0              
    };
    this.configNegocio.servicios.push(newService);
    this.originalServicios.push(JSON.parse(JSON.stringify(newService))); // Añadir también al original
    //this.isServiciosOpen = true;
  }

  private updateServices(): void {
    // Filtra servicios inválidos
    const serviciosValidos = this.configNegocio.servicios.filter(
      s => s.nombre?.trim() && s.duracion >= 5
    );

    this.bookingService.updateConfig({ servicios: serviciosValidos })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.notifications.showSuccess('Servicios actualizados');
          this.originalServicios = JSON.parse(JSON.stringify(this.configNegocio.servicios)); // Actualizar copia original de servicios
        },
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
      this.originalServicios = this.originalServicios.filter(s => s.id !== id); // Eliminar también del original
      this.updateServices(); // Reemplaza el código antiguo
    }
  }



  eliminarHorarioEspecial(index: number): void {
    if (confirm('¿Eliminar este horario especial?')) {
      this.configNegocio.horariosEspeciales.splice(index, 1);
    }
  }

  

  onToggleHorarioEspecialActivo(): void {
    this.bookingService.updateConfig({
      horariosEspeciales: this.configNegocio.horariosEspeciales
    }).pipe(take(1)).subscribe({
      next: () => {
        this.notifications.showSuccess('Estado de horario especial actualizado');
        this.refreshCalendar();
      },
      error: (err) => {
        console.error('Error al actualizar estado de horario especial:', err);
        this.notifications.showError('No se pudo actualizar el estado del horario especial');
      }
    });
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
          this.originalConfigNegocio = JSON.parse(JSON.stringify(this.configNegocio)); // Guardar copia original
          this.originalServicios = JSON.parse(JSON.stringify(this.configNegocio.servicios)); // Guardar copia original de servicios
          this.originalHorariosNormales = JSON.parse(JSON.stringify(this.configNegocio.horariosNormales)); // Guardar copia original de horarios normales
        },
        error: (err) => console.error('Error cargando configuración:', err)
      })
    );
  }

  hasChanges(): boolean {
    // Solo verificar cambios en nombre y maxReservasPorSlot para el botón principal
    return this.configNegocio.nombre !== this.originalConfigNegocio.nombre ||
           this.configNegocio.maxReservasPorSlot !== this.originalConfigNegocio.maxReservasPorSlot;
  }

  public hasServiceChanges(service: Servicio): boolean {
    const originalService = this.originalServicios.find(s => s.id === service.id);
    if (!originalService) return true; // Si no hay original, es un servicio nuevo o algo salió mal, consideramos que tiene cambios
    return JSON.stringify(service) !== JSON.stringify(originalService);
  }

  public hasHorarioNormalChanges(diaId: number, tramo: { horaInicio: string; horaFin: string }): boolean {
    const originalDia = this.originalHorariosNormales.find(d => d.dia === diaId);
    if (!originalDia) return true; // Si no hay original, es un día nuevo o algo salió mal

    const originalTramo = originalDia.tramos.find(t => t.horaInicio === tramo.horaInicio && t.horaFin === tramo.horaFin);
    // Si no encontramos el tramo original, significa que es un tramo nuevo o modificado
    if (!originalTramo) return true;

    return JSON.stringify(tramo) !== JSON.stringify(originalTramo);
  }

  public hasAnyHorarioNormalChanges(diaId: number): boolean {
    const currentDia = this.configNegocio.horariosNormales.find(d => d.dia === diaId);
    const originalDia = this.originalHorariosNormales.find(d => d.dia === diaId);

    if (!currentDia && !originalDia) return false; // Ambos vacíos, no hay cambios
    if (!currentDia || !originalDia) return true; // Uno existe y el otro no, hay cambios

    // Comparar longitud de tramos
    if (currentDia.tramos.length !== originalDia.tramos.length) return true;

    // Comparar cada tramo
    for (let i = 0; i < currentDia.tramos.length; i++) {
      if (JSON.stringify(currentDia.tramos[i]) !== JSON.stringify(originalDia.tramos[i])) {
        return true;
      }
    }
    return false;
  }

  private loadReservas(): void {
    this.subscriptions.add(
      this.bookingService.getReservas(this.statusFilter === 'all' ? undefined : this.statusFilter as BookingStatus).subscribe({
        next: (reservas) => {
          this.reservas = reservas.sort((a, b) =>
            new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
          );
          this.filteredReservas = [...this.reservas]; // Inicializa filtradas
          this.actualizarVisibilidadReservas(); // Llama a la nueva función
          this.updateSummary();
          this.refreshCalendar(); // Asegura que el calendario se actualice
        },
        error: (err) => {
          console.error('Error cargando reservas', err);
          this.reservas = [];
          this.filteredReservas = [];
          this.reservasPorDia = {};
          this.refreshCalendar(); // Asegura que el calendario se actualice incluso en caso de error
        }
      })
    );
  }

  applyFilters(): void {
    console.log('Aplicando filtros...', {
      searchText: this.searchText,
      statusFilter: this.statusFilter,
      dateFilter: this.dateFilter
    });

    this.filteredReservas = this.reservas.filter(r => {
      if (!r || !r.usuario) {
        console.warn('Reserva inválida:', r);
        return false;
      }

      const matchesSearch = this.searchText === '' ||
        (r.usuario.nombre && r.usuario.nombre.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (r.usuario.email && r.usuario.email.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (r.usuario.telefono && r.usuario.telefono.includes(this.searchText));

      const matchesStatus = this.statusFilter === 'all' ||
        r.estado === this.statusFilter;

      let matchesDate = true;
      if (this.dateFilter) {
        try {
          matchesDate = new Date(r.fechaInicio).toDateString() === new Date(this.dateFilter).toDateString();
        } catch (e) {
          console.error('Error procesando fecha:', r.fechaInicio, e);
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    console.log('Reservas filtradas:', this.filteredReservas);
    this.updateSummary();
    this.actualizarVisibilidadReservas();
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
          this.notifications.showSuccess('Guardado ok');
          this.originalConfigNegocio = JSON.parse(JSON.stringify(this.configNegocio)); // Actualizar copia original
          this.originalHorariosNormales = JSON.parse(JSON.stringify(this.configNegocio.horariosNormales)); // Actualizar copia original de horarios normales
          this.refreshCalendar();
        },
        error: (err) => {
          this.notifications.showError('Error al guardar: ' + err.message);
        }
      });
  }

  confirmReservation(id: string): void {
    if (confirm('¿Está seguro que desea confirmar esta reserva?')) {
      this.subscriptions.add(
        this.bookingService.confirmReservationByAdmin(id).subscribe({
          next: () => {
            this.notifications.showSuccess('Reserva confirmada correctamente');
            this.loadReservas(); // Recargar reservas para actualizar el estado
          },
          error: (err) => this.notifications.showError('Error al confirmar reserva: ' + err.message)
        })
      );
    }
  }

  cancelReservation(id: string): void {
    if (confirm('¿Está seguro que desea cancelar esta reserva?')) {
      this.subscriptions.add(
        this.bookingService.cancelReservation(id).subscribe({
          next: () => {
            this.notifications.showSuccess('Reserva cancelada');
            this.loadReservas(); // Recargar reservas para actualizar el estado
          },
          error: (err) => this.notifications.showError('Error al cancelar reserva: ' + err.message)
        })
      );
    }
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

    // Cambiamos this.reservas por this.filteredReservas
    this.filteredReservas.forEach(reserva => {
      try {
        const fecha = new Date(reserva.fechaInicio).toISOString().split('T')[0];
        if (fecha) {
          this.reservasPorDia[fecha] = (this.reservasPorDia[fecha] || 0) + 1;
        }
      } catch (e) {
        console.error('Fecha inválida:', reserva.fechaInicio);
      }
    });

    // Si necesitas también el total sin filtrar para algún otro uso
    //this.totalReservasSinFiltrar = this.reservas.length; 
  }

  refreshCalendar(): void {
    this.calendarVisible = true;
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
      minute: '2-digit',
    });
  }

  getServiceName(serviceId: string): string {
    const config = this.bookingService.getConfig();
    return config.servicios?.find(s => s.id === serviceId)?.nombre || serviceId;
  }

  // Métodos para fechas bloqueadas
  loadFechasBloqueadas(): void {
    this.bookingService.getFechasBloqueadas().subscribe(fechas => {
      console.log('Fechas recibidas del servicio:', fechas); // Nuevo log
      this.fechasBloqueadas = [...fechas]; // Crear nueva referencia de array
      console.log('Fechas bloqueadas cargadas en el componente:', this.fechasBloqueadas);
    });
  }

  addFechaBloqueada(): void {
    if (this.nuevaFechaBloqueada) {
      this.bookingService.addFechaBloqueada(this.nuevaFechaBloqueada).subscribe(() => {
        this.loadFechasBloqueadas();
        this.nuevaFechaBloqueada = '';
        this.notifications.showSuccess('Fecha bloqueada correctamente');
        this.refreshCalendar();
      });
    }
  }

  deleteFechaBloqueada(fecha: string): void {
    if (confirm('¿Desbloquear esta fecha?')) {
      this.bookingService.deleteFechaBloqueada(fecha).subscribe({
        next: () => {
          this.loadFechasBloqueadas();
          this.notifications.showSuccess('Fecha desbloqueada correctamente');
          console.log('Fecha desbloqueada y lista actualizada.');
          this.refreshCalendar(); // Añadido para forzar la actualización del calendario y la lista
        },
        error: (err) => {
          this.notifications.showError('Error al desbloquear fecha: ' + err.message);
          console.error('Error al desbloquear fecha:', err);
        }
      });
    }
  }

  showDetailsModal(title: string, content: string): void {
    this.modalTitle = title;
    this.modalContent = content;
  }

  formatDateForModal(date: any, format: string): string {
    return this.datePipe.transform(date, format) || '';
  }
}
