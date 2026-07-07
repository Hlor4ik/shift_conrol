import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '@shiftcontrol/shared';

@Injectable()
export class FilesService {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: this.config.get('S3_ENDPOINT'),
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
    this.bucket = this.config.getOrThrow('S3_BUCKET');
    this.publicUrl = this.config.get('S3_PUBLIC_URL') ?? this.config.getOrThrow('S3_ENDPOINT');
  }

  validateFile(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large');
    }
  }

  async upload(file: Express.Multer.File, folder: string, options?: { allowAny?: boolean }) {
    if (!options?.allowAny) {
      this.validateFile(file);
    }
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const key = `${folder}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    return { url, key };
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getPresignedUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn });
  }
}
