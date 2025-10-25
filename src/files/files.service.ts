import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class FilesService {
  // Return full URL path for the uploaded file
  getFileUrl(fileName: string): string {
    return `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${fileName}`;
  }

  // Delete a file if needed (for re-uploads or cleanup)
  deleteFile(fileName: string): void {
    const filePath = join(__dirname, '../../uploads', fileName);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    } else {
      throw new NotFoundException('File not found');
    }
  }
}
