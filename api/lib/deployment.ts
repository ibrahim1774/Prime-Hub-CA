import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class VercelDeployer {
    private token: string;
    private teamId?: string;

    constructor(token: string, teamId?: string) {
        this.token = token;
        this.teamId = teamId;
    }

    /**
     * Deploys a directory to Vercel.
     * @param dirPath Directory to deploy
     * @param projectName Name of the project in Vercel
     */
    async deploy(dirPath: string, projectName: string): Promise<string> {
        console.log(`[Deploy] Preparing deployment for ${projectName}...`);

        const files = this.getAllFiles(dirPath);
        const deploymentFiles = files.map(file => {
            const relativePath = path.relative(dirPath, file).replace(/\\/g, '/');
            return {
                file: relativePath,
                data: fs.readFileSync(file, 'utf-8')
            };
        });

        // Filter out images and ensure we only deploy text-based files to avoid encoding issues with Vercel API
        // The Vercel API 'files' array expects string data. For binary, we'd need more complex handling.
        // Since we are offloading assets, we only need HTML, CSS, JS, etc.
        const safeExtensions = ['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg'];

        const lightweightFiles = deploymentFiles.filter(f => {
            const ext = path.extname(f.file).toLowerCase();
            return safeExtensions.includes(ext);
        });

        try {
            const response = await axios.post(
                'https://api.vercel.com/v13/deployments',
                {
                    name: projectName,
                    files: lightweightFiles,
                    projectSettings: {
                        framework: null,
                    },
                    target: 'production', // or undefined for preview
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params: this.teamId ? { teamId: this.teamId } : {},
                }
            );

            const deploymentUrl = response.data.url;
            const aliases = response.data.alias || [];
            const nameFromVercel = response.data.name;

            // Prioritize aliases, then try to construct the project domain, then fallback to deployment URL
            let finalUrl = deploymentUrl;

            if (aliases.length > 0) {
                finalUrl = aliases[0];
            } else {
                // Fallback to project-name.vercel.app
                const effectiveProjectName = nameFromVercel || projectName;
                if (effectiveProjectName) {
                    finalUrl = `${effectiveProjectName}.vercel.app`;
                }
            }

            console.log(`[Deploy] Success! Deployment URL: https://${deploymentUrl}`);
            console.log(`[Deploy] Returning clean URL: https://${finalUrl}`);

            return `https://${finalUrl}`;
        } catch (error: any) {
            console.error('[Deploy] Error deploying to Vercel:', error.response?.data || error.message);
            throw error;
        }
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
