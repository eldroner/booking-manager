import { Injectable } from '@angular/core';
import { BookingConfigService } from './booking-config.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface MonthlyBookings {
  month: string;
  count: number;
}

export interface ServiceDistribution {
  serviceName: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  constructor(private bookingConfigService: BookingConfigService) { }

  getMonthlyBookings(): Observable<MonthlyBookings[]> {
    return this.bookingConfigService.getReservas().pipe(
      map(reservas => {
        const monthlyData: { [key: string]: number } = {};
        reservas.forEach(reserva => {
          const month = new Date(reserva.fechaInicio).toLocaleString('default', { month: 'long', year: 'numeric' });
          if (!monthlyData[month]) {
            monthlyData[month] = 0;
          }
          monthlyData[month]++;
        });
        return Object.keys(monthlyData).map(month => ({ month, count: monthlyData[month] }));
      })
    );
  }

  getServiceDistribution(): Observable<ServiceDistribution[]> {
    return this.bookingConfigService.getReservas().pipe(
      map(reservas => {
        const serviceData: { [key: string]: number } = {};
        const services = this.bookingConfigService.getConfig().servicios || [];
        reservas.forEach(reserva => {
          const service = services.find(s => s.id === reserva.servicio);
          const serviceName = service ? service.nombre : 'Servicio Desconocido';
          if (!serviceData[serviceName]) {
            serviceData[serviceName] = 0;
          }
          serviceData[serviceName]++;
        });
        return Object.keys(serviceData).map(serviceName => ({ serviceName, count: serviceData[serviceName] }));
      })
    );
  }
}
