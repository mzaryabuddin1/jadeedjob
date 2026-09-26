import { Controller, Get, Param, Post, Body, Patch, Delete } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LanguageService } from './language.service';

@ApiTags('Languages')
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Get()
  @ApiOperation({ summary: 'List languages' })
  findAll() {
    return this.languageService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get language by id' })
  findOne(@Param('id') id: string) {
    return this.languageService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create language' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'name'],
      properties: {
        code: { type: 'string', example: 'ur' },
        name: { type: 'string', example: 'Urdu' },
      },
    },
  })
  create(@Body() body: any) {
    return this.languageService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update language' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'ur' },
        name: { type: 'string', example: 'Urdu' },
      },
    },
  })
  update(@Param('id') id: string, @Body() body: any) {
    return this.languageService.update(Number(id), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete language' })
  remove(@Param('id') id: string) {
    return this.languageService.delete(Number(id));
  }
}
