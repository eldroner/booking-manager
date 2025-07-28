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
      token: string;
      businessName: string;
      bookingTime: string;
    }
  ): Promise<void> {
    try {
      // 1. Validación EXTRA del email
      if (!userEmail?.includes('@')) {
        throw new Error('Email no válido: ' + userEmail);
      }

      // 2. Objeto con estructura EXACTA que espera EmailJS
      const templateParams = {
        user_email: userEmail,
        user_name: userName,
        verification_link: `${window.location.origin}/confirmar/${bookingDetails.token}`,
        // Añade otras variables que uses en tu template:
        service_name: bookingDetails.servicio,
        business_name: bookingDetails.businessName,
        booking_date: bookingDetails.fecha,
        booking_time: bookingDetails.bookingTime
      };

      console.log('Enviando email con params:', templateParams); // 👈 ¡Depuración clave!

      // 3. Envío con parámetros corregidos
      await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templateId,
        templateParams,  // <-- Envía el objeto completo
        environment.emailjs.userId  // <-- Opcional: algunos planes lo requieren
      );
    } catch (error) {
      console.error('Error completo:', error);
      throw error;
    }
  }

  async sendAdminNotification(
    userAdminEmail: string,
    userName: string,
    idNegocio: string
  ): Promise<void> {
    try {
      if (!userAdminEmail?.includes('@')) {
        throw new Error('Email de administrador no válido: ' + userAdminEmail);
      }

      const templateParams = {
        user_admin: userAdminEmail,
        user_name: userName,
        id_negocio: idNegocio
      };

      console.log('Enviando notificación de administrador con params:', templateParams);

      await emailjs.send(
        environment.emailjs.serviceId,
        'template_5gi7hhb', // Nueva plantilla para el administrador
        templateParams,
        environment.emailjs.userId
      );
    } catch (error) {
      console.error('Error al enviar notificación al administrador:', error);
      throw error;
    }
  }
}
