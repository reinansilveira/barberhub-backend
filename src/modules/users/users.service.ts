import {
    Injectable,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmailService } from '../../shared/email/email.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
    ) { }

    findAll(active?: string) {
        return this.prisma.user.findMany({
            where: { active: active === 'false' ? false : true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new BadRequestException('Usuário não encontrado');
        return user;
    }

    async create(data: CreateUserDto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (exists) throw new ConflictException('Email já cadastrado');

        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.create({
            data: { ...data, password: hashedPassword },
        });
    }

    async update(id: string, data: CreateUserDto) {
        await this.findById(id);
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.prisma.user.update({
            where: { id },
            data: { ...data, password: hashedPassword },
        });
    }

    deactivate(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { active: false },
        });
    }

    async updatePassword(id: string, { currentPassword, newPassword }: UpdatePasswordDto) {
        const user = await this.findById(id);

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) throw new BadRequestException('Senha atual incorreta.');

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
    }

    async forgotPassword({ email }: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            throw new BadRequestException('E-mail não encontrado');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await this.prisma.user.update({
            where: { email },
            data: {
                resetCode: code,
                resetCodeExpires: expires,
            },
        });

        await this.email.sendResetCode(email, code);

        return { message: 'E-mail enviado' };
    }

    async verifyCode({ email, code }: VerifyCodeDto) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user || user.resetCode !== code) {
            throw new BadRequestException('Código inválido.');
        }

        if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
            throw new BadRequestException('Código expirado. Solicite um novo.');
        }

        return { message: 'Código válido.' };
    }

    async resetPassword({ email, code, newPassword }: ResetPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user || user.resetCode !== code) {
            throw new BadRequestException('Código inválido.');
        }

        if (!user.resetCodeExpires || user.resetCodeExpires < new Date()) {
            throw new BadRequestException('Código expirado. Solicite um novo.');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                resetCode: null,
                resetCodeExpires: null,
            },
        });

        return { message: 'Senha redefinida com sucesso.' };
    }
}