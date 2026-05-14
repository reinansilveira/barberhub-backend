import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private resend = new Resend(process.env.RESEND_API_KEY);

    async sendResetCode(to: string, code: string) {
        await this.resend.emails.send({
            from: 'Barberhub <onboarding@resend.dev>',
            to,
            subject: 'Código de redefinição de senha',
            html: `
                <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
                    <h2>Redefinição de senha</h2>
                    <p>Use o código abaixo para redefinir sua senha. Ele expira em 15 minutos.</p>
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f4f4f4; border-radius: 8px;">
                        ${code}
                    </div>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">Se não foi você, ignore este email.</p>
                </div>
            `,
        });
    }
}