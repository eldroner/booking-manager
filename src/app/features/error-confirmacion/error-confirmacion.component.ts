import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-error-confirmacion',
  template: `
    <div class="container text-center mt-5">
      <div class="alert alert-danger">
        <h2><i class="bi bi-exclamation-triangle-fill"></i> Error al confirmar</h2>
        <p *ngIf="mensajeError">{{ mensajeError }}</p>
        <p *ngIf="!mensajeError">Ocurrió un error desconocido al confirmar tu reserva.</p>
        <a routerLink="/" class="btn btn-outline-danger mt-3">Volver al inicio</a>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; }
  `]
})
export class ErrorConfirmacionComponent {
  mensajeError: string | null;

  constructor(private route: ActivatedRoute) {
    this.mensajeError = this.route.snapshot.queryParamMap.get('error');
  }
}