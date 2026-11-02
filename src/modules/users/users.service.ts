import {
    Injectable,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmailService } from '../../shared/email/email.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password';
import { UpdateUserAvatarDto } from './dto/update-user-avatar.dto';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;

const userSafeSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    avatar: true,
    gender: true,
    role: true,
    active: true,
    emailVerified: true,
    twoFactorEnabled: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    roleAssignments: { select: { role: true } },
} as const;

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
            select: userSafeSelect,
        });
    }

    async findById(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: userSafeSelect,
        });
        if (!user) throw new BadRequestException('Usuário não encontrado');
        return user;
    }

    async create(data: CreateUserDto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (exists) throw new ConflictException('Email já cadastrado');

        if (data.phone) {
            const phoneExists = await this.prisma.user.findUnique({
                where: { phone: data.phone },
            });
            if (phoneExists) throw new ConflictException('Telefone já cadastrado');
        }

        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            return this.prisma.user.create({
                data: {
                    ...data,
                    password: hashedPassword,
                    roleAssignments: {
                        create: { role: data.role ?? UserRole.CLIENT },
                    },
                },
                select: userSafeSelect,
            });
        } catch (error) {
            this.handleUniqueConstraint(error);
        }
    }

    async update(id: string, data: CreateUserDto) {
        await this.findById(id);

        if (data.phone) {
            const phoneExists = await this.prisma.user.findFirst({
                where: {
                    phone: data.phone,
                    NOT: { id },
                },
            });
            if (phoneExists) throw new ConflictException('Telefone já cadastrado');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        try {
            return this.prisma.$transaction(async (tx) => {
                const user = await tx.user.update({
                    where: { id },
                    data: {
                        ...data,
                        password: hashedPassword,
                        passwordSetAt: new Date(),
                        sessionVersion: { increment: 1 },
                    },
                    select: userSafeSelect,
                });
                await tx.userRoleAssignment.upsert({
                    where: {
                        userId_role: {
                            userId: id,
                            role: data.role ?? user.role,
                        },
                    },
                    update: {},
                    create: { userId: id, role: data.role ?? user.role },
                });
                return user;
            });
        } catch (error) {
            this.handleUniqueConstraint(error);
        }
    }

    deactivate(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { active: false, sessionVersion: { increment: 1 } },
            select: userSafeSelect,
        });
    }

    async updatePassword(id: string, { currentPassword, newPassword }: UpdatePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, password: true },
        });

        if (!user) throw new BadRequestException('Usuário não encontrado');

        const isValid =
            Boolean(user.password) &&
            (await bcrypt.compare(currentPassword, user.password));
        if (!isValid) throw new BadRequestException('Senha atual incorreta.');

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return this.prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                passwordSetAt: new Date(),
                sessionVersion: { increment: 1 },
            },
            select: userSafeSelect,
        });
    }

    updateAvatar(id: string, { avatar }: UpdateUserAvatarDto) {
        return this.prisma.user.update({
            where: { id },
            data: { avatar },
            select: { id: true, avatar: true },
        });
    }

    async forgotPassword({ email }: ForgotPasswordDto) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });
        const response = {
            message: 'Se houver uma conta, enviaremos as instruções.',
        };

        if (!user || !user.active) {
            return response;
        }

        const code = crypto.randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);

        await this.prisma.$transaction(async (tx) => {
            await tx.passwordResetToken.updateMany({
                where: { userId: user.id, consumedAt: null },
                data: { consumedAt: new Date() },
            });
            await tx.passwordResetToken.create({
                data: {
                    userId: user.id,
                    codeHash: await bcrypt.hash(code, 10),
                    expiresAt,
                },
            });
        });

        await this.email.sendResetCode(normalizedEmail, code);

        return response;
    }

    async verifyCode({ email, code }: VerifyCodeDto) {
        await this.getValidResetToken(email, code);

        return { message: 'Código válido.' };
    }

    async resetPassword({ email, code, newPassword }: ResetPasswordDto) {
        const { user, token } = await this.getValidResetToken(email, code);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.prisma.$transaction(async (tx) => {
            const consumed = await tx.passwordResetToken.updateMany({
                where: { id: token.id, consumedAt: null },
                data: { consumedAt: new Date() },
            });

            if (consumed.count !== 1) {
                throw new BadRequestException('Código inválido ou expirado.');
            }

            await tx.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    passwordSetAt: new Date(),
                    mustChangePassword: false,
                    sessionVersion: { increment: 1 },
                    resetCode: null,
                    resetCodeExpires: null,
                },
            });
        });

        return { message: 'Senha redefinida com sucesso.' };
    }

    private async getValidResetToken(email: string, code: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user || !user.active) {
            throw new BadRequestException('Código inválido ou expirado.');
        }

        const token = await this.prisma.passwordResetToken.findFirst({
            where: {
                userId: user.id,
                consumedAt: null,
                expiresAt: { gt: new Date() },
                attempts: { lt: RESET_CODE_MAX_ATTEMPTS },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!token || !(await bcrypt.compare(code, token.codeHash))) {
            if (token) {
                await this.prisma.passwordResetToken.update({
                    where: { id: token.id },
                    data: { attempts: { increment: 1 } },
                });
            }
            throw new BadRequestException('Código inválido ou expirado.');
        }

        return { user, token };
    }

    private handleUniqueConstraint(error: unknown): never {
        if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            const target = error.meta?.target;
            if (Array.isArray(target) && target.includes('phone')) {
                throw new ConflictException('Telefone já cadastrado');
            }

            if (Array.isArray(target) && target.includes('email')) {
                throw new ConflictException('Email já cadastrado');
            }

            throw new ConflictException('Usuário já cadastrado');
        }

        throw error;
    }
}
