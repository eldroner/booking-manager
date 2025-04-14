import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingConfigService } from '../../services/booking-config.service';
import { HorarioEspecial } from '../../services/booking-config.service';

@Component({
  selector: 'app-horarios-especiales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horarios-especiales.component.html',
  styleUrls: ['./horarios-especiales.component.css']
})
export class HorariosEspecialesComponent implements OnInit {
  horarios: HorarioEspecial[] = [];
  nuevoHorario: Partial<HorarioEspecial> = {
    fecha: '',
    horaInicio: '09:00',
    horaFin: '14:00',
    activo: true
  };

  constructor(private bookingConfig: BookingConfigService) {}

  ngOnInit(): void {
    this.loadHorarios();
  }

  private loadHorarios(): void {
    this.horarios = this.bookingConfig.getHorariosEspeciales().map(horario => ({
      fecha: horario.fecha,
      horaInicio: horario.horaInicio || '09:00',
      horaFin: horario.horaFin || '14:00',
      activo: horario.activo !== false
    }));
  }

  addHorario(): void {
    if (!this.nuevoHorario.fecha) {
      alert('Por favor selecciona una fecha');
      return;
    }

    if (!this.bookingConfig.validateHorarioEspecial(this.nuevoHorario)) {
      alert('Por favor verifica los datos del horario');
      return;
    }

    const nuevoHorarioCompleto: HorarioEspecial = {
      fecha: this.nuevoHorario.fecha!,
      horaInicio: this.nuevoHorario.horaInicio!,
      horaFin: this.nuevoHorario.horaFin!,
      activo: this.nuevoHorario.activo !== false
    };

    if (this.bookingConfig.checkSolapamientoHorarios(nuevoHorarioCompleto)) {
      alert('Este horario se solapa con otro ya existente');
      return;
    }

    this.horarios.push(nuevoHorarioCompleto);
    this.bookingConfig.updateHorariosEspeciales(this.horarios);
    this.resetNuevoHorario();
  }

  removeHorario(index: number): void {
    if (confirm('¿Estás seguro de eliminar este horario especial?')) {
      this.horarios.splice(index, 1);
      this.bookingConfig.updateHorariosEspeciales(this.horarios);
    }
  }

  toggleActivo(index: number): void {
    this.horarios[index].activo = !this.horarios[index].activo;
    this.bookingConfig.updateHorariosEspeciales(this.horarios);
  }

  saveHorarios(): void {
    if (!this.validateHorarios()) {
      alert('Por favor corrige los errores antes de guardar');
      return;
    }
    
    this.bookingConfig.updateHorariosEspeciales(this.horarios);
    alert('Horarios especiales actualizados correctamente');
  }

  private validateHorarios(): boolean {
    for (const horario of this.horarios) {
      if (!horario.fecha || !this.isValidDate(horario.fecha)) {
        alert(`Fecha inválida en el horario del ${horario.fecha}`);
        return false;
      }

      if (horario.horaInicio >= horario.horaFin) {
        alert(`La hora de inicio debe ser anterior a la hora de fin en el horario del ${horario.fecha}`);
        return false;
      }
    }

    if (this.checkOverlaps()) {
      return false;
    }

    return true;
  }

  private checkOverlaps(): boolean {
    for (let i = 0; i < this.horarios.length; i++) {
      for (let j = i + 1; j < this.horarios.length; j++) {
        if (this.horarios[i].fecha === this.horarios[j].fecha) {
          const startI = this.timeToMinutes(this.horarios[i].horaInicio);
          const endI = this.timeToMinutes(this.horarios[i].horaFin);
          const startJ = this.timeToMinutes(this.horarios[j].horaInicio);
          const endJ = this.timeToMinutes(this.horarios[j].horaFin);
          
          if (startI < endJ && endI > startJ) {
            alert(`Los horarios del ${this.horarios[i].fecha} se solapan`);
            return true;
          }
        }
      }
    }
    return false;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private isValidDate(date: string): boolean {
    return !isNaN(Date.parse(date));
  }

  private resetNuevoHorario(): void {
    this.nuevoHorario = {
      fecha: '',
      horaInicio: '09:00',
      horaFin: '14:00',
      activo: true
    };
  }
}