// Since we are loading these dynamically, we need to declare them for TypeScript
// to avoid compilation errors, as they will be globally available at runtime.
declare const html2canvas: any;
declare const jspdf: any;

/**
 * Triggers a browser download for the report content as a Markdown file.
 * @param markdownContent The report string in Markdown format.
 * @param fileName The desired name for the downloaded file.
 */
export const exportAsMarkdown = (markdownContent: string, fileName: string = 'deepdive-report.md'): void => {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.href) {
    URL.revokeObjectURL(link.href);
  }
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Ensures that PDF libraries (html2canvas and jspdf) are loaded.
 * Attempts to load them dynamically if not already available.
 * @returns Promise that resolves when libraries are loaded or rejects if loading fails
 */
const ensurePdfLibrariesLoaded = async (): Promise<void> => {
    // Check if libraries are already loaded
    if (typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined') {
        return Promise.resolve();
    }
    
    const loadScript = (url: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.body.appendChild(script);
        });
    };
    
    try {
        // Primary CDNs
        const html2canvasUrl = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        const jspdfUrl = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        
        // Try loading from primary CDN
        await Promise.all([
            loadScript(html2canvasUrl),
            loadScript(jspdfUrl)
        ]);
        
        // Wait a moment to ensure scripts are initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if libraries are now available
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            // If primary CDN failed, try backup CDNs
            const backupHtml2canvasUrl = 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js';
            const backupJspdfUrl = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
            
            await Promise.all([
                loadScript(backupHtml2canvasUrl),
                loadScript(backupJspdfUrl)
            ]);
            
            // Wait again to ensure scripts are initialized
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Final check
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            throw new Error('Failed to load PDF libraries');
        }
        
        console.log('PDF export libraries loaded successfully');
    } catch (error) {
        console.error('Failed to load PDF export libraries:', error);
        throw error;
    }
};

/**
 * Converts an HTML element to a PDF and triggers a browser download.
 * @param element The HTML element to capture.
 * @param fileName The desired name for the downloaded PDF file.
 */
export const exportAsPdf = async (element: HTMLElement | null, fileName: string = 'deepdive-report.pdf'): Promise<void> => {
    if (!element) {
        console.error("Export failed: Target element not found.");
        return;
    }

    try {
        // Ensure libraries are loaded
        await ensurePdfLibrariesLoaded();
        
        // Check if libraries are available after loading attempt
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            console.error("Export failed: html2canvas or jspdf library not loaded.");
            alert("PDF export libraries are not available. Please check your internet connection and try again.");
            return;
        }
        
        const { jsPDF } = jspdf;
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            backgroundColor: '#18181b', // Match app's dark background for consistency
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Create a PDF with dimensions matching the captured canvas
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(fileName);
        console.log("PDF generated successfully");

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF. Please check the console for details.");
    }
};