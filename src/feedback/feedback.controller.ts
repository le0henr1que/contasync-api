import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() req) {
    console.log('\n🎯 POST /feedback - Creating feedback');
    console.log('User:', req.user.email);
    console.log('Feedback Type:', createFeedbackDto.tipo);

    const userId = req.user.id;
    const result = await this.feedbackService.create(createFeedbackDto, userId);

    console.log('Feedback created with ID:', result.id);
    return result;
  }

  @Get()
  @Roles(Role.ACCOUNTANT)
  async findAll(@Query() query: QueryFeedbackDto) {
    console.log('\n🎯 GET /feedback - Fetching all feedbacks');
    console.log('Query params:', query);

    const result = await this.feedbackService.findAll(query);

    console.log('Returning', result.length, 'feedbacks');
    return result;
  }

  @Get('me')
  async findMyFeedbacks(@Request() req) {
    console.log('\n🎯 GET /feedback/me - Fetching user feedbacks');
    console.log('User:', req.user.email);

    const userId = req.user.id;
    const result = await this.feedbackService.findByUser(userId);

    console.log('Returning', result.length, 'feedbacks');
    return result;
  }

  @Patch(':id/status')
  @Roles(Role.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateFeedbackStatusDto,
  ) {
    console.log('\n🎯 PATCH /feedback/:id/status - Updating feedback status');
    console.log('Feedback ID:', id);
    console.log('New Status:', updateStatusDto.status);

    const result = await this.feedbackService.updateStatus(id, updateStatusDto);

    console.log('Status updated successfully');
    return result;
  }
}
