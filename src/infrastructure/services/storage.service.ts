import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';


export type StorageFolderType = 'logos' | 'products' | 'billing/xml' | 'billing/pdf' | 'billing/cdr' | 'users/profiles' | 'certificates';

export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicDomain: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID || 'dea82c2747c34a9ed94a71bd839927e0';

    this.s3Client = new S3Client({
      region: 'us-east-1', // 🛡️ Firma regional inmutable para Cloudflare R2
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      },
      forcePathStyle: true // Enruta los objetos de forma estructurada /bucket/key
    });

    this.bucketName = process.env.R2_BUCKET_NAME || 'erp-saas-storage';
    this.publicDomain = process.env.R2_PUBLIC_CUSTOM_DOMAIN || 'https://r2.dev';
  }

  async uploadFile(
    subscriptionId: number,
    companyId: number,
    folderType: StorageFolderType,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    
    const objectKey = `tenant_${subscriptionId}/companies/${companyId}/${folderType}/${fileName}`;
    console.log(`☁️ [NÚCLEO CLOUDFLARE R2] Despachando objeto a Cloudflare: [${objectKey}] | MIME: ${mimeType}`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType
      });

      await this.s3Client.send(command);
      
      const baseDomain = this.publicDomain.endsWith('/') ? this.publicDomain.slice(0, -1) : this.publicDomain;
      const publicUrl = `${baseDomain}/${objectKey}`;
      
      console.log(`✅ [R2 SUCCESS] Archivo consolidado en la red global de Cloudflare. URL: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      console.error('❌ [CRASH CRÍTICO EN SUBIDA CLOUDFLARE R2]:', error.message);
      throw new Error(`Error en el almacenamiento de infraestructura cloud: ${error.message}`);
    }
  }

  async deleteFile(
    subscriptionId: number,
    companyId: number,
    folderType: StorageFolderType,
    fileName: string
  ): Promise<boolean> {
    const objectKey = `tenant_${subscriptionId}/companies/${companyId}/${folderType}/${fileName}`;
    console.log(`☁️ [NÚCLEO CLOUDFLARE R2] Removiendo objeto del bucket: [${objectKey}]`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      console.error('❌ [CRASH EN BORRADO CLOUDFLARE R2]:', error.message);
      return false;
    }
  }
}