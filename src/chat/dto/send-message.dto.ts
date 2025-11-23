// src/chat/dto/send-message.dto.ts
import { IsInt, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  jobApplicationId: number;

  @IsString()
  @MaxLength(1000)
  content: string;
}
