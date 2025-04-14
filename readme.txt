DOCUMENTACIÓN DEL SISTEMA DE GESTIÓN DE RESERVAS
===============================================

1. ARQUITECTURA GENERAL
-----------------------
• Tecnología: Angular 16+ (Standalone Components)
• Gestión de estado: RxJS (BehaviorSubject)
• Persistencia: LocalStorage (simula backend)
• Calendario: FullCalendar
• Validaciones: Formularios reactivos y template-driven
• UI: Bootstrap 5 + Acordeones para gestión de horarios

2. ESTRUCTURA DE ARCHIVOS
-------------------------
app
├───components
│   ├───booking-admin
│   ├───booking-calendar
│   ├───booking-page
│   ├───booking-user
│   ├───horarios-especiales
│   └───initial-setup
├───models
└───services

3. MODELOS DE DATOS
-------------------

3.1 BusinessConfig (Configuración del negocio)
----------------------------------------------
interface BusinessConfig {
  nombre: string;
  tipoNegocio: BusinessType;          # Peluquería, Hotel, Consulta Médica, etc.
  duracionBase: number;               # Duración mínima de slots (minutos)
  maxReservasPorSlot: number;         # Máximo de reservas por franja horaria
  servicios: Servicio[];              # Listado de servicios ofrecidos
  horariosNormales: HorarioNormal[];  # Horarios regulares por día
  horariosEspeciales: HorarioEspecial[]; # Horarios excepcionales
}

3.2 HorarioNormal
-----------------
interface HorarioNormal {
  dia: number;                        # 0 (Domingo) a 6 (Sábado)
  tramos: {
    horaInicio: string;               # Formato "HH:MM"
    horaFin: string;
  }[];
}

3.3 HorarioEspecial
-------------------
interface HorarioEspecial {
  fecha: string;                      # Formato "YYYY-MM-DD"
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

3.4 Servicio
------------
interface Servicio {
  id: string;
  nombre: string;
  duracion: number;                   # Duración en minutos
  precio?: number;                    # Opcional
}

3.5 Reserva
-----------
interface Reserva {
  id: string;
  usuario: UserData;
  fechaInicio: string;                # Fecha-hora ISO
  fechaFin?: string;                  # Opcional
  servicio: string;                   # ID del servicio
  estado: BookingStatus;              # Confirmada, Pendiente, Cancelada
  metadata?: any;                     # Datos adicionales
}

4. SERVICIO PRINCIPAL (BookingConfigService)
-------------------------------------------

4.1 Funcionalidades Clave
-------------------------
• Gestión centralizada de la configuración del negocio
• Administración de reservas (CRUD completo)
• Validación de horarios y disponibilidad
• Persistencia en localStorage
• Notificación de cambios (vía Observables)

4.2 Métodos Principales
-----------------------
• updateConfig(): Actualiza configuración global
• addReserva(): Crea nueva reserva con validación
• getReservas(): Obtiene todas las reservas
• validateHorarioEspecial(): Valida horarios excepcionales
• isHoraDisponible(): Verifica disponibilidad en tiempo real

5. COMPONENTES PRINCIPALES
--------------------------

5.1 BookingPageComponent
-----------------------
• Función: Componente contenedor principal
• Lógica: Alterna entre vistas Admin/User
• Template: Simple contenedor con switch de vistas

5.2 BookingAdminComponent (Actualizado con Acordeones)
------------------------------------------------------
• Funcionalidades:
  - Configuración completa del negocio
  - Gestión de horarios mediante acordeones plegables
  - Visualización de reservas
  - Administración de servicios

• Características UI:
  - Acordeón para Horarios Normales (plegable)
  - Acordeón para Horarios Especiales (plegable)
  - Iconos de flecha (chevron) indican estado
  - Secciones colapsables para ahorrar espacio

• Métodos clave:
  - saveConfiguration(): Guarda toda la configuración
  - agregarTramo(): Añade franja horaria a un día
  - agregarHorarioEspecial(): Crea horario excepcional
  - toggleAcordeon(): Controla visibilidad de secciones

5.3 BookingUserComponent
-----------------------
• Funcionalidades:
  - Interfaz para reservas de clientes
  - Selección de servicio/fecha/hora
  - Validación de disponibilidad en tiempo real
  - Formulario de datos personales

• Métodos clave:
  - confirmarReserva(): Procesa nueva reserva
  - updateAvailableTimes(): Actualiza horarios disponibles
  - isTimeAvailable(): Verifica si un slot está libre

5.4 BookingCalendarComponent
---------------------------
• Integración con FullCalendar
• Visualización gráfica de reservas
• Color coding por disponibilidad
• Interacción para ver detalles

6. FLUJO DE TRABAJO
-------------------

6.1 Configuración Inicial (Admin)
--------------------------------
1. Establecer nombre y tipo de negocio
2. Definir horarios normales (usando acordeón plegable)
3. Configurar servicios disponibles
4. Establecer máximo de reservas por slot
5. Añadir horarios especiales cuando sea necesario (mediante acordeón)

6.2 Proceso de Reserva (User)
-----------------------------
1. Usuario selecciona servicio
2. Elige fecha (con restricciones de horario)
3. Selecciona hora disponible
4. Completa datos personales
5. Confirma reserva (con validación)

6.3 Gestión Diaria (Admin)
--------------------------
1. Ver calendario con reservas
2. Usar acordeones para gestionar horarios
3. Cancelar/modificar reservas existentes
4. Monitorizar disponibilidad

7. VALIDACIONES
---------------

7.1 Reglas de Validación
------------------------
• Email: Formato válido (regex estricto)
• Nombre: Mínimo 3 caracteres
• Horarios: No solapamiento de franjas
• Disponibilidad: Respetar máximo por slot
• Fechas: No permitir reservas pasadas

8. MEJORAS FUTURAS
------------------
• Integración con backend real (Firebase/API REST)
• Notificaciones por email/SMS
• Pasarela de pago integrada
• Sistema de fidelización
• Dashboard de analytics
• Multi-idioma
• Persistencia del estado de los acordeones

9. DEPENDENCIAS
---------------
• @angular/core: ^16.0.0
• @fullcalendar/angular: ^6.1.8
• rxjs: ^7.8.0
• uuid: ^9.0.0
• bootstrap-icons: ^1.10.0 (para iconos de acordeones)

10. CONFIGURACIÓN TÉCNICA
-------------------------
• Estrategia: Standalone Components
• Change Detection: OnPush
• LocalStorage: Persistencia automática
• Responsive: Diseño adaptable a móviles
• Internacionalización: Preparado para i18n
• UI: Acordeones implementados con *ngIf y propiedades de estado

ANEXO A: EJEMPLOS DE USO
-------------------------

A.1 Crear nueva reserva:
const reservaData = {
  usuario: {
    nombre: "Juan Pérez",
    email: "juan@example.com",
    telefono: "600123456"
  },
  fechaInicio: "2023-11-15T10:00:00",
  servicio: "corte-pelo"
};

this.bookingService.addReserva(reservaData).subscribe(
  res => console.log("Reserva confirmada:", res),
  err => console.error("Error:", err)
);

A.2 Uso de acordeones en Admin:
// En el template:
<div class="card">
  <div class="card-header" (click)="toggleSection('horarios')">
    Horarios 
    <i class="bi" [class.bi-chevron-down]="!showHorarios" [class.bi-chevron-up]="showHorarios"></i>
  </div>
  <div class="card-body" *ngIf="showHorarios">
    <!-- Contenido de horarios -->
  </div>
</div>

// En el componente:
showHorarios = false;
toggleSection(section: string) {
  this[`show${section}`] = !this[`show${section}`];
}

ANEXO B: DIAGRAMA DE FLUJO
--------------------------
[Reserva exitosa]
Usuario → Selecciona servicio → Elige fecha → Selecciona hora → 
→ Completa datos → Validación → Confirmación → Reserva creada

[Gestión de Horarios]
Admin → Abre acordeón → Edita horarios → Guarda cambios → 
→ Cambios se reflejan en calendario

FIN DE DOCUMENTACIÓN