// src/chat/dto/send-message.dto.ts
import {
  IsInt,
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @IsInt()
  jobApplicationId: number;

  // Content required ONLY for text messages
  @ValidateIf((o) => o.messageType === 'text')
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  content?: string;

  // Media URL required ONLY for non-text messages
  @ValidateIf((o) => o.messageType !== 'text')
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  mediaUrl?: string;

  @IsOptional()
  attachments?: Array<{
    assetId?: string;
    fileUrl?: string;
    fileName?: string;
    contentType?: string;
    sizeBytes?: number;
  }>;

  @IsEnum(['text', 'image', 'video', 'audio', 'file'])
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
}
