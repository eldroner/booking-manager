import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BookingPageComponent } from "./components/booking-page/booking-page.component";

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, BookingPageComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'booking-manager';
}
