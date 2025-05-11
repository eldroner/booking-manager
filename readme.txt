DOCUMENTACIÓN PROYECTO BOOKING MANAGER - ESTADO ACTUAL

1. ARQUITECTURA GENERAL
Tecnología: Angular 16+ (Standalone Components)

Gestión de estado: RxJS (BehaviorSubject + Observables)

Backend: En proceso de migración (HTTP Client)

UI: Bootstrap 5 + Bootstrap Icons

Validaciones: Reactivas + Template-driven

2. ESTRUCTURA DE ARCHIVOS
app/
├── components/
│ ├── booking-admin/
│ ├── booking-user/
│ ├── booking-calendar/
│ └── booking-page/
├── services/
│ └── booking-config.service.ts
├── models/
│ └── interfaces.ts (tipos exportados)
└── pipes/
└── not.pipe.ts

3. MODELOS DE DATOS (INTERFACES)
// booking-config.service.ts
export enum BusinessType { PELUQUERIA, HOTEL, CONSULTA, GENERAL }
export enum BookingStatus { PENDIENTE, CONFIRMADA, CANCELADA }

export interface UserData {
nombre: string;
email: string;
telefono?: string;
}

export interface Servicio {
id: string;
nombre: string;
duracion: number;
precio?: number;
}

export interface Reserva {
id: string;
usuario: UserData;
fechaInicio: string;
servicio: string;
estado: BookingStatus;
}

export interface BusinessConfig {
nombre: string;
tipoNegocio: BusinessType;
duracionBase: number;
maxReservasPorSlot: number;
servicios: Servicio[];
horariosNormales: HorarioNormal[];
horariosEspeciales: HorarioEspecial[];
}

4. SERVICIO PRINCIPAL (BookingConfigService)
Funcionalidades implementadas:

Gestión completa de reservas (CRUD vía HTTP)

Configuración del negocio

Validación de horarios

Gestión de disponibilidad

Métodos clave:

getConfig(): Obtiene configuración actual

addReserva(): Crea nueva reserva

deleteReserva(): Elimina reserva por ID

updateConfig(): Actualiza configuración global

validateHorarioEspecial(): Valida formato de horarios

Cambios recientes:

Eliminada toda lógica de localStorage

Migración completa a HTTP Client

Simplificación de métodos de validación

5. COMPONENTES PRINCIPALES
5.1 BookingUserComponent

Funcionalidad: Interfaz de usuario para reservas

Características:

Selección de servicio/fecha/hora

Validación en tiempo real

Formulario de datos personales

Listado de reservas existentes

5.2 BookingAdminComponent

Funcionalidad: Panel de administración

Características:

Gestión de horarios normales/especiales

Configuración de servicios

Visualización de reservas

Actualización de parámetros del negocio

5.3 BookingPageComponent

Funcionalidad: Contenedor principal

Lógica: Alternar entre vistas Admin/User

6. FLUJOS DE TRABAJO IMPLEMENTADOS
6.1 Reserva de usuario:

Selección de servicio

Elección de fecha/hora disponible

Validación de datos personales

Confirmación vía HTTP POST

6.2 Gestión de horarios (Admin):

Edición de tramos horarios

Añadir horarios especiales

Validación contra solapamientos

Guardado mediante HTTP PUT

7. VALIDACIONES IMPLEMENTADAS
Formato de email (regex estricto)

Solapamiento de horarios

Disponibilidad de slots

Integridad de datos en reservas

Formato correcto de fechas/horas

8. ESTADO ACTUAL DEL PROYECTO
Avances:

Migración completa del servicio a HTTP

Eliminación de dependencias de localStorage

Corrección de errores de tipos en templates

Optimización de flujos de datos

Problemas pendientes:

Integración completa con endpoints reales

Manejo de errores detallado

Loading states en UI

Persistencia de estado en acordeones

9. PRÓXIMOS PASOS
Implementar autenticación JWT

Crear servicio de notificaciones

Desarrollar módulo de reportes

Implementar cancelación de reservas

Crear sistema de recordatorios

ARCHIVOS CLAVE ACTUALIZADOS (ÚLTIMOS CAMBIOS):

// booking-config.service.ts (fragmento)
@Injectable({ providedIn: 'root' })
export class BookingConfigService {
private defaultConfig: BusinessConfig = { /.../ };

private configSubject = new BehaviorSubject<BusinessConfig>(this.defaultConfig);
private reservasSubject = new BehaviorSubject<Reserva[]>([]);

constructor(private http: HttpClient) {
this.initializeData();
}

private initializeData(): void {
forkJoin({
config: this.loadBackendConfig(),
reservas: this.loadBackendReservas()
}).pipe(
catchError(() => of({ config: this.defaultConfig, reservas: [] }))
).subscribe(/.../);
}

private loadBackendConfig(): Observable<BusinessConfig> {
return this.http.get<BusinessConfig>(${environment.apiUrl}/api/config);
}
}

// booking-user.component.html (fragmento corregido)
<span *ngIf="(isTimeAvailable(time) | async) === false"
class="badge bg-secondary ms-2">
No disponible
</span>

NOTAS PARA CONTINUAR:

Endpoints actuales: /api/config, /api/reservas, /api/disponibilidad

Variables de entorno: environment.apiUrl debe estar configurado

Próxima prioridad: Implementar carga de servicios desde backend

FIN DEL DOCUMENTO