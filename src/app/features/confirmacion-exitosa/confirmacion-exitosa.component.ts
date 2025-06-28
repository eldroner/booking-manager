import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-confirmacion-exitosa',
  templateUrl: './confirmacion-exitosa.component.html',
  styleUrls: ['./confirmacion-exitosa.component.scss']
})
export class ConfirmacionExitosaComponent {
  reservaId: string | null;
  tiempoRedireccion = 5; // segundos

  ngOnInit() {
  interval(1000).pipe(
    take(this.tiempoRedireccion)
  ).subscribe({
    next: () => this.tiempoRedireccion--,
    complete: () => this.router.navigate(['/'])
  });
}

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.reservaId = this.route.snapshot.paramMap.get('token') || 
                   this.route.snapshot.queryParamMap.get('reservaId');
  }

  volverAInicio() {
    this.router.navigate(['/']);
  }
}
