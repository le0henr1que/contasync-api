import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackStatusDto } from './dto/update-feedback-status.dto';
import { QueryFeedbackDto } from './dto/query-feedback.dto';
import { EmailService } from '../email/email.service';
import { FeedbackType } from '@prisma/client';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto, userId: string) {
    console.log('\n========== CREATING FEEDBACK ==========');
    console.log('User ID:', userId);
    console.log('Feedback Data:', createFeedbackDto);

    try {
      // Get user information
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: {
            include: {
              accountant: {
                include: {
                  user: true,
                },
              },
            },
          },
          accountant: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      console.log('User found:', { name: user.name, email: user.email, role: user.role });

      // Create feedback
      const feedback = await this.prisma.feedback.create({
        data: {
          userId,
          tipo: createFeedbackDto.tipo,
          titulo: createFeedbackDto.titulo,
          descricao: createFeedbackDto.descricao,
          avaliacao: createFeedbackDto.avaliacao,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      console.log('Feedback created successfully:', feedback.id);

      // Send email notification to accountant
      try {
        let accountantEmail: string | null = null;
        let accountantName: string | null = null;

        // If user is a client, send to their accountant
        if (user.client && user.client.accountant) {
          accountantEmail = user.client.accountant.user.email;
          accountantName = user.client.accountant.user.name;
        }
        // If user is an accountant, we could send to admin or skip
        // For now, we'll log it
        else if (user.accountant) {
          console.log('Feedback from accountant - no email notification sent');
        }

        if (accountantEmail) {
          console.log('Sending email notification to accountant:', accountantEmail);
          await this.emailService.sendFeedbackNotification(accountantEmail, {
            accountantName: accountantName || 'Contador',
            userName: user.name,
            userEmail: user.email,
            feedbackType: this.getFeedbackTypeLabel(createFeedbackDto.tipo),
            feedbackTitle: createFeedbackDto.titulo,
            feedbackDescription: createFeedbackDto.descricao,
            feedbackRating: createFeedbackDto.avaliacao?.toString() || 'N/A',
            feedbackId: feedback.id,
          });
          console.log('Email notification sent successfully');
        }
      } catch (emailError) {
        // Log error but don't fail the feedback creation
        console.error('Failed to send email notification:', emailError);
        this.logger.error('Failed to send feedback notification email', emailError);
      }

      console.log('========== FEEDBACK CREATION COMPLETED ==========\n');
      return feedback;
    } catch (error) {
      console.error('========== FEEDBACK CREATION FAILED ==========');
      console.error('Error:', error);
      console.error('========== FEEDBACK CREATION ERROR END ==========\n');
      throw error;
    }
  }

  async findAll(query: QueryFeedbackDto) {
    console.log('\n========== FETCHING ALL FEEDBACKS ==========');
    console.log('Query:', query);

    const where: any = {};

    if (query.tipo) {
      where.tipo = query.tipo;
    }

    if (query.status) {
      where.status = query.status;
    }

    const feedbacks = await this.prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Found', feedbacks.length, 'feedbacks');
    console.log('========== FETCHING FEEDBACKS COMPLETED ==========\n');

    return feedbacks;
  }

  async findByUser(userId: string) {
    console.log('\n========== FETCHING USER FEEDBACKS ==========');
    console.log('User ID:', userId);

    const feedbacks = await this.prisma.feedback.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Found', feedbacks.length, 'feedbacks for user');
    console.log('========== FETCHING USER FEEDBACKS COMPLETED ==========\n');

    return feedbacks;
  }

  async updateStatus(id: string, updateStatusDto: UpdateFeedbackStatusDto) {
    console.log('\n========== UPDATING FEEDBACK STATUS ==========');
    console.log('Feedback ID:', id);
    console.log('New Status:', updateStatusDto.status);

    // Check if feedback exists
    const existingFeedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!existingFeedback) {
      throw new NotFoundException('Feedback não encontrado');
    }

    const feedback = await this.prisma.feedback.update({
      where: { id },
      data: {
        status: updateStatusDto.status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    console.log('Feedback status updated successfully');
    console.log('========== FEEDBACK STATUS UPDATE COMPLETED ==========\n');

    return feedback;
  }

  private getFeedbackTypeLabel(type: FeedbackType): string {
    const labels = {
      DUVIDA: 'Dúvida',
      PROBLEMA: 'Problema',
      MELHORIA: 'Melhoria',
      AVALIACAO: 'Avaliação',
    };
    return labels[type] || type;
  }
}
