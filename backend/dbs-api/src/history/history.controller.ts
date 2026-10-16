import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/permissions';
import { HistoryService } from './history.service';

@ApiTags('history')
@Controller('history')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentification requise');
    }

    return this.historyService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter une entree d historique' })
  @ApiBody({
    schema: {
      example: {
        user_name: 'admin',
        action: 'Creation',
        entity: 'Produit',
        entity_id: 1,
        details: 'Creation du produit',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Entree historisee' })
  create(
    @Body()
    dto: {
      user_name: string;
      action: string;
      entity: string;
      entity_id?: string | number | null;
      details: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentification requise');
    }

    return this.historyService.create(dto);
  }
}
