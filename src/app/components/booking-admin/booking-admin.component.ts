import { Component, OnInit } from '@angular/core';
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
export class BookingAdminComponent implements OnInit {
  configNegocio = {
    nombre: '',
    maxCitasPorHora: 1
  };

  reservas: { id: string; fecha: string; hora: string }[] = [];
  reservasPorHora: { [fecha: string]: { [hora: string]: number } } = {};

  constructor(private configService: BookingConfigService) {}

  ngOnInit(): void {
    this.configService.config$.subscribe(config => {
      this.configNegocio = { ...config }; // Actualizar la configuración cada vez que cambie
    });
    this.cargarReservas();
  }

  private cargarReservas(): void {
    this.reservas = this.configService.loadReservas().map(reserva => ({
      ...reserva,
      id: this.generateId() // Asignar un id único a cada reserva
    }));
    this.recalcularReservasPorHora();
  }

  private recalcularReservasPorHora(): void {
    this.reservasPorHora = {};
    this.reservas.forEach(reserva => {
      if (!this.reservasPorHora[reserva.fecha]) {
        this.reservasPorHora[reserva.fecha] = {};
      }
      if (!this.reservasPorHora[reserva.fecha][reserva.hora]) {
        this.reservasPorHora[reserva.fecha][reserva.hora] = 0;
      }
      this.reservasPorHora[reserva.fecha][reserva.hora]++;
    });
  }

  guardarConfiguracion(): void {
    this.configService.updateConfig(this.configNegocio);
    alert('Configuración guardada');
  }

  // Método para generar un ID único para cada reserva
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
