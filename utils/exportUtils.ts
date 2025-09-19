// Since we are loading these from a CDN, we need to declare them for TypeScript
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
 * Converts an HTML element to a PDF and triggers a browser download.
 * @param element The HTML element to capture.
 * @param fileName The desired name for the downloaded PDF file.
 */
export const exportAsPdf = async (element: HTMLElement | null, fileName: string = 'deepdive-report.pdf'): Promise<void> => {
    if (!element) {
        console.error("Export failed: Target element not found.");
        return;
    }

    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        console.error("Export failed: html2canvas or jspdf library not loaded.");
        alert("PDF export libraries are not available. Please check your internet connection and try again.");
        return;
    }
    
    try {
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

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while generating the PDF. Please check the console for details.");
    }
};