export interface HorarioEspecial {
    dias: number[]; // 0=domingo, 1=lunes...
    horaInicio: string;
    horaFin: string;
    activo: boolean;
  }
  
  export interface BusinessConfig {
    nombre: string;
    horariosEspeciales: HorarioEspecial[];
    servicios: Array<{
      id: string;
      nombre: string;
      duracion: number; // en minutos
      precio?: number;
    }>;
    maxReservasPorSlot: number;
  }