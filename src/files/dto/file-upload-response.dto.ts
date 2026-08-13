import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({ example: 'File uploaded successfully' })
  message: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ format: 'uri' })
  fileUrl: string;

  @ApiProperty({ format: 'uuid' })
  assetId: string;

  @ApiProperty()
  contentType: string;

  @ApiProperty()
  sizeBytes: number;
}
