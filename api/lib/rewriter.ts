import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

export class HtmlRewriter {
    /**
     * Rewrites HTML and CSS files in a directory to use remote URLs for images.
     * @param dirPath Directory containing files
     * @param urlMap Map of local relative paths (e.g., 'assets/img.png') to remote URLs
     */
    async rewriteHtmlFiles(dirPath: string, urlMap: Map<string, string>): Promise<void> {
        const files = this.getAllFiles(dirPath);

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.html') {
                await this.rewriteHtmlFile(file, urlMap);
            } else if (ext === '.css') {
                await this.rewriteCssFile(file, urlMap);
            }
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

    private async rewriteHtmlFile(filePath: string, urlMap: Map<string, string>): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const $ = cheerio.load(content);
        let modified = false;

        // 1. Handle <img> tags
        $('img').each((_, element) => {
            const src = $(element).attr('src');
            if (src) {
                const newSrc = this.getReplacementUrl(src, urlMap);
                if (newSrc) {
                    $(element).attr('src', newSrc);
                    modified = true;
                    console.log(`[Rewrite] Replaced img src ${src} -> ${newSrc} in ${path.basename(filePath)}`);
                }
            }

            // Handle srcset
            const srcset = $(element).attr('srcset');
            if (srcset) {
                const newSrcset = srcset.split(',').map(entry => {
                    const [url, descriptor] = entry.trim().split(/\s+/);
                    const newUrl = this.getReplacementUrl(url, urlMap) || url;
                    return descriptor ? `${newUrl} ${descriptor}` : newUrl;
                }).join(', ');

                if (newSrcset !== srcset) {
                    $(element).attr('srcset', newSrcset);
                    modified = true;
                    console.log(`[Rewrite] Updated srcset in ${path.basename(filePath)}`);
                }
            }
        });

        // 2. Handle inline styles (style="...")
        $('[style]').each((_, element) => {
            const style = $(element).attr('style');
            if (style) {
                const newStyle = this.replaceCssUrls(style, urlMap);
                if (newStyle !== style) {
                    $(element).attr('style', newStyle);
                    modified = true;
                    console.log(`[Rewrite] Updated inline style in ${path.basename(filePath)}`);
                }
            }
        });

        // 3. Handle <style> blocks
        $('style').each((_, element) => {
            const css = $(element).html();
            if (css) {
                const newCss = this.replaceCssUrls(css, urlMap);
                if (newCss !== css) {
                    $(element).html(newCss);
                    modified = true;
                    console.log(`[Rewrite] Updated <style> block in ${path.basename(filePath)}`);
                }
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, $.html());
            console.log(`[Rewrite] Saved changes to ${filePath}`);
        }
    }

    private async rewriteCssFile(filePath: string, urlMap: Map<string, string>): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        const newContent = this.replaceCssUrls(content, urlMap);

        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent);
            console.log(`[Rewrite] Saved changes to ${filePath}`);
        }
    }

    private replaceCssUrls(css: string, urlMap: Map<string, string>): string {
        // Regex to match url('...') or url("...") or url(...)
        return css.replace(/url\((['"]?)(.*?)\1\)/g, (match, quote, url) => {
            const newUrl = this.getReplacementUrl(url, urlMap);
            if (newUrl) {
                return `url(${quote}${newUrl}${quote})`;
            }
            return match;
        });
    }

    private getReplacementUrl(src: string, urlMap: Map<string, string>): string | null {
        // Normalize src to match the keys in our map (remove leading ./ or / if present)
        const normalizedSrc = src.replace(/^\.?\//, '').replace(/\\/g, '/');

        // Try exact match first
        if (urlMap.has(normalizedSrc)) {
            return urlMap.get(normalizedSrc)!;
        }

        // Fallback: iterate map to find if any key ends with this src
        for (const [localPath, remoteUrl] of urlMap.entries()) {
            if (localPath.endsWith(normalizedSrc) || localPath.replace(/\\/g, '/') === normalizedSrc) {
                return remoteUrl;
            }
        }

        return null;
    }
}
