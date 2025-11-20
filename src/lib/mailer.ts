import { Resend } from "resend"; // Correcta importación de Resend

const resend = new Resend(process.env.re_aJL2kNhR_LSCQMrpyEYtK7CAeLnENCwzT); // Usar la API Key de Resend

export const sendVerificationEmail = async (to: string, code: string) => {
  const fromEmail = process.env.EMAIL_USER;

  // Verifica si el correo de "from" está presente
  if (!fromEmail) {
    throw new Error("EMAIL_USER is not defined in .env");
  }

  try {
    // Enviar correo usando Resend
    const response = await resend.emails.send({
      from: fromEmail, // El correo verificado en Resend
      to,
      subject: "Código de Verificación de UniPost",
      html: `
        <p>Tu código de verificación es: <strong>${code}</strong></p>
        <p>Este código es válido por 10 minutos.</p>
      `,
    });

    return response; // Si todo está bien, devuelve la respuesta de Resend
  } catch (error) {
    console.error("Error enviando el correo:", error);
    throw new Error("Error enviando el correo de verificación");
  }
};
