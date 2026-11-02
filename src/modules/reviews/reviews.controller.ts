import { Controller, Post, Get, Param, Body, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { AdminOrProfessionalAuthGuard } from '../auth/guards/admin-or-professional-auth.guard';
import { AuthPrincipal } from '../auth/types/auth-principal.type';

@ApiTags('Reviews')
@ApiBearerAuth() 
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get()
    @Public()
    findAll() {
        return this.reviewsService.findAll();
    }

    @Post()
    @UseGuards(ClientAuthGuard)
    create(@Body() dto: CreateReviewDto, @Req() request: Request) {
        return this.reviewsService.create(
            dto,
            (request['user'] as AuthPrincipal).sub,
        );
    }

    @Patch(':id/response')
    @UseGuards(AdminOrProfessionalAuthGuard)
    respond(
        @Param('id') id: string,
        @Body() dto: RespondReviewDto,
        @Req() request: Request,
    ) {
        return this.reviewsService.respond(
            id,
            dto,
            request['user'] as AuthPrincipal,
        );
    }
}
