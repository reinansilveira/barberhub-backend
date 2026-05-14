import { Controller, Post, Get, Param, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';

@ApiTags('Reviews')
@ApiBearerAuth() 
@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Get()
    findAll() {
        return this.reviewsService.findAll();
    }

    @Post()
    create(@Body() dto: CreateReviewDto) {
        return this.reviewsService.create(dto);
    }

    @Patch(':id/response')
    respond(@Param('id') id: string, @Body() dto: RespondReviewDto) {
        return this.reviewsService.respond(id, dto);
    }
}