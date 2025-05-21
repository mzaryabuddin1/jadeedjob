import { Controller, Post, Body, UseGuards, Req, UsePipes, BadRequestException } from '@nestjs/common';
import { FilterService } from './filter.service';
import { JoiValidationPipe } from 'src/common/pipes/joi-validation.pipe';
import Joi from 'joi';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { toSentenceCase } from 'src/common/utils/utils.util';
import { Filter } from 'src/filter/filter.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@UseGuards(JwtAuthGuard) // Auth-protected
@Controller('filters')
export class FilterController {
  constructor(private readonly filterService: FilterService,
    @InjectModel(Filter.name) private filterModel: Model<Filter>,
  ) {}

  @Post()
  @UsePipes(
    new JoiValidationPipe(
      Joi.object({
        name: Joi.string().required(),
        status: Joi.string().valid('active', 'inactive').default('active'),
      }),
    ),
  )
  async createFilter(@Body() body: any, @Req() req: any) {
    body.name = toSentenceCase(body.name)

    const existing = await this.filterModel.findOne({
      name: { $regex: `^${body.name}$`, $options: 'i' }, // Case-insensitive match
    });

    if (existing) {
      throw new BadRequestException('Filter with this name already exists');
    }

    const createdFilter = await this.filterService.createFilter({
      ...body,
      approvalStatus: 'pending',
      rejectionReason: null,
      createdBy: req.user.id, // From JWT
    });

    return {
      message: 'Filter submitted for review',
      filter: createdFilter,
    };
  }
}
