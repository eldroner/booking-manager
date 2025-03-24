import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService } from '../../services/booking-config.service'; 

@Component({
  selector: 'app-booking-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-admin.component.html',
  styleUrls: ['./booking-admin.component.scss']
})

export class BookingAdminComponent {
  // Datos de configuración del negocio
  configNegocio = {
    nombre: 'Mi negocio',
    maxCitasPorHora: 1
  };

  constructor(private configService: BookingConfigService) {}

  // Lista de reservas simuladas
  reservas: { fecha: string; hora: string }[] = [
    { fecha: '2025-03-25', hora: '09:00' },
    { fecha: '2025-03-25', hora: '10:00' },
    { fecha: '2025-03-25', hora: '10:00' }
  ];

  // Contador de reservas por hora (reconstruido al iniciar)
  getReservasPorHora(): { [fecha: string]: { [hora: string]: number } } {
    const contador: { [fecha: string]: { [hora: string]: number } } = {};
    this.reservas.forEach(res => {
      if (!contador[res.fecha]) contador[res.fecha] = {};
      if (!contador[res.fecha][res.hora]) contador[res.fecha][res.hora] = 0;
      contador[res.fecha][res.hora]++;
    });
    return contador;
  }

  guardarConfiguracion(): void {
    this.configService.updateConfig(this.configNegocio);
    alert('Configuración guardada (simulada)');
  }
}
