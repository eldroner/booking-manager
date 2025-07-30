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
      cancellationToken: string;
    }
  ): Promise<void> {
    try {
      if (!userEmail?.includes('@')) {
        throw new Error('Email no válido: ' + userEmail);
      }

      const templateParams = {
        user_email: userEmail,
        user_name: userName,
        verification_link: `${window.location.origin}/confirmar/${bookingDetails.token}`,
        cancellation_link: `${window.location.origin}/cancelar-reserva?token=${bookingDetails.cancellationToken}`,
        business_name: bookingDetails.businessName,
        service_name: bookingDetails.servicio,
        booking_date: bookingDetails.fecha,
        booking_time: bookingDetails.bookingTime
      };

      console.log('Enviando email de confirmación con params:', templateParams);

      await emailjs.send(
        environment.emailjs.serviceId,
        environment.emailjs.templateId,
        templateParams,
        environment.emailjs.userId
      );
    } catch (error) {
      console.error('Error completo:', error);
      throw error;
    }
  }

  async sendAdminNotification(
    userAdminEmail: string,
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
      if (!userAdminEmail?.includes('@')) {
        throw new Error('Email de administrador no válido: ' + userAdminEmail);
      }

      const templateParams = {
        user_admin: userAdminEmail,
        user_name: userName,
        business_name: bookingDetails.businessName,
        service_name: bookingDetails.servicio,
        booking_date: bookingDetails.fecha,
        booking_time: bookingDetails.bookingTime
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

  async sendBookingCancellation(
    userEmail: string,
    userName: string,
    bookingDetails: {
      fecha: string;
      servicio: string;
      businessName: string;
      bookingTime: string;
    }
  ): Promise<void> {
    try {
      if (!userEmail?.includes('@')) {
        throw new Error('Email no válido: ' + userEmail);
      }

      const templateParams = {
        user_email: userEmail,
        user_name: userName,
        business_name: bookingDetails.businessName,
        service_name: bookingDetails.servicio,
        booking_date: bookingDetails.fecha,
        booking_time: bookingDetails.bookingTime
      };

      console.log('Enviando email de cancelación con params:', templateParams);

      await emailjs.send(
        environment.emailjs.serviceId,
        'YOUR_CANCELLATION_TEMPLATE_ID', // <-- ¡IMPORTANTE! Reemplaza esto con el ID de tu plantilla de cancelación
        templateParams,
        environment.emailjs.userId
      );
    } catch (error) {
      console.error('Error al enviar email de cancelación:', error);
      throw error;
    }
  }
}
