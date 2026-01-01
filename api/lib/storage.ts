import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

export class AssetUploader {
    private storage: Storage;
    private bucketName: string;

    constructor(bucketName: string, credentials?: any) {
        // Assumes GOOGLE_APPLICATION_CREDENTIALS is set in environment if credentials not provided
        this.storage = new Storage(credentials ? { credentials } : undefined);
        this.bucketName = bucketName;
    }

    /**
     * Uploads a file to GCS and returns the public URL.
     * @param filePath Absolute path to the local file
     * @param destinationPath Path in the bucket (e.g., 'sites/my-site/image.png')
     */
    async uploadFile(filePath: string, destinationPath: string): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const file = bucket.file(destinationPath);

            // Upload the file
            await bucket.upload(filePath, {
                destination: destinationPath,
                metadata: {
                    cacheControl: 'public, max-age=31536000', // Cache for 1 year
                },
            });

            // Construct public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destinationPath}`;
            console.log(`[Upload] Success: ${filePath} -> ${publicUrl}`);
            return publicUrl;
        } catch (error) {
            console.error(`[Upload] Error uploading ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Uploads a buffer to GCS and returns the public URL.
     * @param buffer The file content as a Buffer
     * @param destinationPath Path in the bucket
     * @param projectName Optional project name for organization
     */
    async uploadBuffer(buffer: Buffer, destinationPath: string, projectName?: string): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucketName);
            const finalPath = projectName ? `${projectName}/${destinationPath}` : destinationPath;
            const file = bucket.file(finalPath);

            await file.save(buffer, {
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
                resumable: false
            });

            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${finalPath}`;
            console.log(`[Upload Buffer] Success: ${finalPath} -> ${publicUrl}`);
            return publicUrl;
        } catch (error) {
            console.error(`[Upload Buffer] Error:`, error);
            throw error;
        }
    }

    /**
     * Uploads all images in a directory recursively.
     * Returns a map of local filename -> public URL.
     */
    async uploadDirectoryImages(dirPath: string, uploadPrefix: string): Promise<Map<string, string>> {
        const urlMap = new Map<string, string>();
        const files = this.getAllFiles(dirPath);

        for (const file of files) {
            if (this.isImage(file)) {
                const relativePath = path.relative(dirPath, file);
                // Normalize path separators for GCS
                const gcsPath = path.join(uploadPrefix, relativePath).replace(/\\/g, '/');

                const url = await this.uploadFile(file, gcsPath);
                urlMap.set(relativePath, url);
            }
        }

        return urlMap;
    }

    private getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = this.getAllFiles(dirPath + "/" + file, arrayOfFiles);
            } else {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        });

        return arrayOfFiles;
    }

    private isImage(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext);
    }
}
