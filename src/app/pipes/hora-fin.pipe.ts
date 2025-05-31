import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horaFin',
  standalone: true
})
export class HoraFinPipe implements PipeTransform {
  transform(fecha: string, horaInicio: string, duracionMin: number): string {
    if (!fecha || !horaInicio || !duracionMin) return '';

    const [horas, minutos] = horaInicio.split(':').map(Number);
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(horas, minutos);

    const fechaFin = new Date(fechaInicio.getTime() + duracionMin * 60000);
    return fechaFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}