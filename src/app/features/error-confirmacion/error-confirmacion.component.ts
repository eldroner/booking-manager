import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-error-confirmacion',
  templateUrl: './error-confirmacion.component.html',
  styleUrls: ['./error-confirmacion.component.scss']
})
export class ErrorConfirmacionComponent {
  mensajeError: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.mensajeError = this.route.snapshot.queryParamMap.get('error') || 
                       'Ocurrió un error desconocido al confirmar tu reserva.';
  }

  reintentar() {
    this.router.navigate(['/']);
  }
}