import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService, Reserva, Servicio } from '../../services/booking-config.service';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);

@Component({
  selector: 'app-booking-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-user.component.html',
  styleUrls: ['./booking-user.component.scss']
})
export class BookingUserComponent implements OnInit {
  private readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/;
  emailError: string | null = null;
  emailTouched = false;
  
  serviceTypes: string[] = ['cita', 'consulta', 'servicio'];
  serviciosDisponibles: Servicio[] = [];
  selectedService: string = '';
  selectedType: string = 'cita';
  selectedDate: string = '';
  selectedTime: string = '';
  availableTimes: string[] = [
    '09:00', '10:00', '11:00',
    '12:00', '13:00', '16:00',
    '17:00', '18:00'
  ];
  negocioNombre: string = "";
  reservas: Reserva[] = [];

  userData = {
    nombre: '',
    email: '',
    telefono: ''
  };
  today: string = new Date().toISOString().split('T')[0];
  maxDate: string = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

  constructor(private bookingService: BookingConfigService) {}

  ngOnInit(): void {
    this.loadServices();
    this.loadBusinessName();
    this.loadReservas();
  }

  private loadServices(): void {
    this.serviciosDisponibles = this.bookingService.getServicios();
    if (this.serviciosDisponibles.length > 0) {
      this.selectedService = this.serviciosDisponibles[0].id;
    }
  }

  validateEmail(email: string, forceValidation = false): void {
    if (!this.emailTouched && !forceValidation) return;
  
    this.emailError = null;
    
    if (!email) {
      this.emailError = 'El email es requerido';
    } else if (!this.EMAIL_REGEX.test(email)) {
      this.emailError = 'Ingrese un email válido (ejemplo@dominio.com)';
    }
    // Elimina esta línea: this.cdr.detectChanges();
  }



  onServiceTypeChange(): void {
    this.selectedDate = '';
    this.selectedTime = '';
  }

  onDateChange(): void {
    this.selectedTime = '';
  }

  private loadBusinessName(): void {
    this.bookingService.config$.subscribe(config => {
      this.negocioNombre = config.nombre || 'Sistema de Reservas';
    });
  }

  private loadReservas(): void {
    this.bookingService.getReservas().subscribe({
      next: (reservas) => {
        this.reservas = reservas.sort((a, b) => 
          new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
        );
      },
      error: (err) => console.error('Error cargando reservas', err)
    });
  }

  esHoraDisponible(hora: string): boolean {
    if (!this.selectedDate) return true;
    
    const reservasEnHora = this.reservas.filter(r => 
      r.fechaInicio?.includes(this.selectedDate) && 
      r.fechaInicio?.includes(hora)
    ).length;
    
    return reservasEnHora < (this.bookingService.getConfig().maxReservasPorSlot || 1);
  }

  isFormValid(): boolean {
    const hasRequiredFields = !!this.userData.nombre?.trim() && 
                            !!this.selectedDate && 
                            !!this.selectedTime &&
                            !!this.selectedService;
  
    const emailIsValidOrUntouched = !this.emailTouched || 
                                  (!!this.userData.email && this.isEmailValid(this.userData.email));
  
    return hasRequiredFields && emailIsValidOrUntouched;
  }
  
  private isEmailValid(email: string): boolean {
    if (!this.EMAIL_REGEX.test(email)) {
      this.emailError = 'Ingrese un email válido';
      return false;
    }
    this.emailError = null;
    return true;
  }

  onEmailBlur(): void {
    this.emailTouched = true;
    // La validación se realizará automáticamente en isFormValid()
  }



  confirmarReserva(): void {
    if (!this.isFormValid()) {
      alert('Complete todos los campos correctamente');
      return;
    }
  
    const fechaISO = new Date(`${this.selectedDate}T${this.selectedTime}:00`).toISOString();
  
    this.bookingService.addReserva({
      usuario: this.userData,
      fechaInicio: fechaISO,
      servicio: this.selectedService
    }).subscribe({
      next: () => {
        alert('Reserva confirmada!');
        this.resetForm();
        this.loadReservas();
      },
      error: (err) => {
        console.error('Error en reserva:', err);
        alert(`Error: ${this.getFriendlyError(err.message)}`);
      }
    });
  }

  private getFriendlyError(error: string): string {
    const errors: Record<string, string> = {
      'Email inválido': 'Por favor ingrese un email válido',
      'Nombre debe tener al menos 3 caracteres': 'El nombre es demasiado corto',
      'Validación fallida': 'El horario no está disponible o hay un error en los datos'
    };
    return errors[error] || 'Ocurrió un error al procesar la reserva';
  }

  cancelarReserva(id: string): void {
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
      this.bookingService.deleteReserva(id).subscribe({
        next: () => {
          this.loadReservas();
          alert('Reserva cancelada');
        },
        error: (err) => alert('Error al cancelar: ' + err.message)
      });
    }
  }

  private resetForm(): void {
    this.userData = { nombre: '', email: '', telefono: '' };
    this.selectedDate = '';
    this.selectedTime = '';
    this.emailError = null;
    this.emailTouched = false;
  }
}