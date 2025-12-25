import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_DEFAULT_REGION');
    const endpoint = this.configService.get<string>('AWS_ENDPOINT_URL');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !region || !endpoint || !this.bucketName) {
      this.logger.error('Missing S3 configuration. Please check your environment variables.');
      throw new Error('S3 configuration is incomplete');
    }

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for Railway S3-compatible storage
    });

    this.logger.log(`S3 Storage initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file to S3
   * @param key - The unique key/path for the file in S3
   * @param buffer - The file buffer to upload
   * @param mimeType - The MIME type of the file
   * @returns The S3 key of the uploaded file
   */
  async uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    console.log('🚀 ========== S3 UPLOAD STARTED ==========');
    console.log('📦 Bucket:', this.bucketName);
    console.log('🔑 S3 Key:', key);
    console.log('📄 MIME Type:', mimeType);
    console.log('💾 Buffer Size:', buffer.length, 'bytes');
    console.log('🌐 Endpoint:', this.configService.get('AWS_ENDPOINT_URL'));

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      console.log('⏳ Sending file to S3...');
      const response = await this.s3Client.send(command);

      console.log('✅ S3 UPLOAD SUCCESS!');
      console.log('📊 Response:', JSON.stringify(response, null, 2));
      console.log('🎉 File uploaded to S3:', key);
      console.log('========== S3 UPLOAD COMPLETED ==========\n');

      this.logger.log(`File uploaded successfully to S3: ${key}`);
      return key;
    } catch (error) {
      console.error('❌ ========== S3 UPLOAD FAILED ==========');
      console.error('🔴 Error:', error.message);
      console.error('📋 Error Stack:', error.stack);
      console.error('🔧 Error Code:', error.code);
      console.error('📝 Full Error:', JSON.stringify(error, null, 2));
      console.error('========== S3 UPLOAD ERROR END ==========\n');

      this.logger.error(`Failed to upload file to S3: ${key}`, error.stack);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Download a file from S3
   * @param key - The S3 key of the file
   * @returns A readable stream of the file
   */
  async downloadFile(key: string): Promise<Readable> {
    console.log('📥 ========== S3 DOWNLOAD STARTED ==========');
    console.log('📦 Bucket:', this.bucketName);
    console.log('🔑 S3 Key:', key);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      console.log('⏳ Fetching file from S3...');
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        console.error('❌ File body is empty!');
        throw new Error('File body is empty');
      }

      console.log('✅ S3 DOWNLOAD SUCCESS!');
      console.log('📊 Content-Type:', response.ContentType);
      console.log('💾 Content-Length:', response.ContentLength);
      console.log('========== S3 DOWNLOAD COMPLETED ==========\n');

      return response.Body as Readable;
    } catch (error) {
      console.error('❌ ========== S3 DOWNLOAD FAILED ==========');
      console.error('🔴 Error:', error.message);
      console.error('📋 Error Stack:', error.stack);
      console.error('========== S3 DOWNLOAD ERROR END ==========\n');

      this.logger.error(`Failed to download file from S3: ${key}`, error.stack);
      throw new Error(`Failed to download file from S3: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   * @param key - The S3 key of the file to delete
   */
  async deleteFile(key: string): Promise<void> {
    console.log('🗑️  ========== S3 DELETE STARTED ==========');
    console.log('📦 Bucket:', this.bucketName);
    console.log('🔑 S3 Key:', key);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      console.log('⏳ Deleting file from S3...');
      await this.s3Client.send(command);

      console.log('✅ S3 DELETE SUCCESS!');
      console.log('========== S3 DELETE COMPLETED ==========\n');

      this.logger.log(`File deleted successfully from S3: ${key}`);
    } catch (error) {
      console.error('❌ ========== S3 DELETE FAILED ==========');
      console.error('🔴 Error:', error.message);
      console.error('========== S3 DELETE ERROR END ==========\n');

      this.logger.error(`Failed to delete file from S3: ${key}`, error.stack);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in S3
   * @param key - The S3 key of the file
   * @returns True if the file exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      this.logger.error(`Failed to check file existence: ${key}`, error.stack);
      throw new Error(`Failed to check file existence in S3: ${error.message}`);
    }
  }

  /**
   * Generate a unique S3 key for a file
   * @param clientId - The client ID
   * @param originalFileName - The original file name
   * @returns A unique S3 key
   */
  generateFileKey(clientId: string, originalFileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `documents/${clientId}/${timestamp}-${sanitizedFileName}`;
  }
}
