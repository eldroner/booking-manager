import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailService {
  constructor() {
    emailjs.init(environment.emailjs.userId);
  }

  async sendBookingConfirmation(
    userEmail: string,
    userName: string,
    bookingDetails: { 
      fecha: string; 
      servicio: string;
      token: string; // Añadir token
    }
  ): Promise<void> {
    try {
      await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templateId,
        {
          to_email: userEmail,
          user_name: userName,
          service_name: bookingDetails.servicio,
          booking_date: bookingDetails.fecha,
          booking_link: `${window.location.origin}/confirmar?token=${bookingDetails.token}`
        }
      );
    } catch (error) {
      console.error('Error al enviar email:', error);
      throw error; // Propagar el error
    }
  }
}