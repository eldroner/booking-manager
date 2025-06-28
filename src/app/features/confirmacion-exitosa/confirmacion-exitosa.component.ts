import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-confirmacion-exitosa',
  template: `
    <div class="container text-center mt-5">
      <div class="alert alert-success">
        <h2><i class="bi bi-check-circle-fill"></i> ¡Reserva confirmada!</h2>
        <p *ngIf="reservaId">ID de reserva: {{ reservaId }}</p>
        <a routerLink="/" class="btn btn-primary mt-3">Volver al inicio</a>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; }
  `]
})
export class ConfirmacionExitosaComponent {
  reservaId: string | null;

  constructor(private route: ActivatedRoute) {
    this.reservaId = this.route.snapshot.queryParamMap.get('reservaId');
  }
}
