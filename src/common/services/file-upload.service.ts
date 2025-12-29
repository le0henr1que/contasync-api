import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileMetadata {
  receiptPath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

@Injectable()
export class FileUploadService {
  private readonly baseUploadDir = path.join(process.cwd(), 'uploads');
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Upload a receipt file to the specified subfolder
   * @param file - Multer file object
   * @param subfolder - Optional subfolder within financial/receipts (e.g., clientId)
   * @returns File metadata including path, name, mime type, and size
   */
  async uploadReceipt(
    file: Express.Multer.File,
    subfolder?: string,
  ): Promise<FileMetadata> {
    // Validate file
    this.validateFile(file);

    // Determine upload directory
    const uploadDir = subfolder
      ? path.join(this.baseUploadDir, 'financial', 'receipts', subfolder)
      : path.join(this.baseUploadDir, 'financial', 'receipts');

    // Ensure directory exists
    await this.ensureUploadDirectory(uploadDir);

    // Generate unique filename
    const filename = this.generateFilename(file.originalname);
    const absolutePath = path.join(uploadDir, filename);

    // Write file to disk
    await fs.writeFile(absolutePath, file.buffer);

    // Return relative path from uploads directory
    const relativePath = path.relative(this.baseUploadDir, absolutePath);

    return {
      receiptPath: relativePath,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  /**
   * Delete a receipt file from disk
   * @param receiptPath - Relative path from uploads directory
   */
  async deleteReceipt(receiptPath: string): Promise<void> {
    try {
      const absolutePath = path.join(this.baseUploadDir, receiptPath);

      // Check if file exists
      if (fsSync.existsSync(absolutePath)) {
        await fs.unlink(absolutePath);
      }
    } catch (error) {
      // Log error but don't throw - file may already be deleted
      console.error('Error deleting receipt:', error);
    }
  }

  /**
   * Get accessible URL for a receipt
   * @param receiptPath - Relative path from uploads directory
   * @returns Accessible URL (for CDN or direct serving)
   */
  getReceiptUrl(receiptPath: string): string {
    // In production, this could return a CDN URL
    // For now, return a relative URL that the API can serve
    return `/uploads/${receiptPath}`;
  }

  /**
   * Get absolute file path
   * @param receiptPath - Relative path from uploads directory
   * @returns Absolute file system path
   */
  getAbsolutePath(receiptPath: string): string {
    return path.join(this.baseUploadDir, receiptPath);
  }

  /**
   * Check if a receipt file exists
   * @param receiptPath - Relative path from uploads directory
   * @returns True if file exists, false otherwise
   */
  receiptExists(receiptPath: string): boolean {
    const absolutePath = this.getAbsolutePath(receiptPath);
    return fsSync.existsSync(absolutePath);
  }

  /**
   * Validate file type and size
   * @param file - Multer file object
   * @throws BadRequestException if validation fails
   */
  private validateFile(file: Express.Multer.File): void {
    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Apenas PDF, JPG, PNG são permitidos.',
      );
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        'Arquivo muito grande. Tamanho máximo: 10MB.',
      );
    }

    // Check if file has content
    if (file.size === 0) {
      throw new BadRequestException('Arquivo vazio não é permitido.');
    }
  }

  /**
   * Ensure upload directory exists, create if not
   * @param directory - Directory path to create
   */
  private async ensureUploadDirectory(directory: string): Promise<void> {
    if (!fsSync.existsSync(directory)) {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  /**
   * Generate unique and sanitized filename
   * @param originalName - Original filename from upload
   * @returns Sanitized unique filename
   */
  private generateFilename(originalName: string): string {
    // Extract extension
    const ext = path.extname(originalName);

    // Sanitize base name (remove special characters)
    const baseName = path.basename(originalName, ext);
    const sanitized = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    // Generate unique identifier
    const uuid = uuidv4().split('-')[0]; // Use first part of UUID for brevity
    const timestamp = Date.now();

    // Construct filename: timestamp_uuid_sanitizedname.ext
    return `${timestamp}_${uuid}_${sanitized}${ext}`;
  }
}
