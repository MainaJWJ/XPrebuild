// PDF Viewer JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const pdfPlaceholder = document.getElementById('pdf-placeholder');
    const pdfContent = document.querySelector('.pdf-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const fitWidthBtn = document.getElementById('fit-width-btn');
    const fitPageBtn = document.getElementById('fit-page-btn');

    // State variables
    let currentPdfFile = null; // folder.html에서 전달된 현재 PDF 파일 경로
    let currentZoom = 1; // Default zoom level

    // Log when the script is loaded to verify it's running
    console.log('PDF viewer script.js loaded and message listener registered');

    // Listen for messages from parent window (folder.html via index.html)
    window.addEventListener('message', function(event) {
        console.log('Received message in PDF viewer:', event.data); // Debug log
        if (event.data.type === 'openPdfFile') {
            currentPdfFile = event.data.filePath;
            console.log('Received openPdfFile message with path:', currentPdfFile); // Debug log

            // Convert VFS path to actual PDF path
            const actualPdfPath = convertVfsPathToActual(currentPdfFile);
            
            if (actualPdfPath) {
                // Load the PDF using browser's built-in PDF viewer (iframe)
                loadPdf(actualPdfPath);
            } else {
                console.log('Path conversion failed for:', currentPdfFile);
                // Show error message in the placeholder
                pdfPlaceholder.innerHTML = '<p>Could not load PDF: Path conversion failed</p>';
            }
        }
    });

    // Convert VFS path from folder.html to actual PDF path
    function convertVfsPathToActual(vfsPath) {
        // Extract file name from the VFS path
        const fileName = extractFileName(vfsPath);
        console.log('Converting VFS path:', vfsPath, 'File name:', fileName); // Debug log

        // For PDF files, we need to map to actual files in our image folder or PDF folder
        // Since there's no specific PDF folder, we'll look for default PDF files in a dedicated folder
        // or create a mapping for example PDF files
        
        // Define name mappings between VFS names and actual PDF files
        const nameMappings = {
            'sample.pdf': './docs/sample.pdf',
            'guide.pdf': './docs/guide.pdf',
            '말할수없는비밀OST - 백건.pdf': './docs/말할수없는비밀OST - 백건.pdf',
            '물의희롱.pdf': './docs/물의희롱.pdf',
            '비창.pdf': './docs/비창.pdf',
            '젓가락행진곡 재즈버전.pdf': './docs/젓가락행진곡 재즈버전.pdf',
            '프렐류드 op.28.pdf': './docs/프렐류드 op.28.pdf'
        };

        // Check if there's a direct name mapping
        if (nameMappings[fileName.toLowerCase()]) {
            console.log('Found direct mapping for:', fileName, '->', nameMappings[fileName.toLowerCase()]); // Debug log
            return nameMappings[fileName.toLowerCase()];
        }

        // If no specific mapping, try to construct a path assuming file exists in a PDF docs folder
        // Check if it's a PDF file based on extension
        if (fileName.toLowerCase().endsWith('.pdf')) {
            // Try to locate the PDF in a docs subdirectory
            const pdfPath = './docs/' + fileName;
            console.log('Using constructed PDF path:', pdfPath); // Debug log
            return pdfPath;
        }

        console.log('No mapping found for:', fileName); // Debug log
        // Return null if no mapping could be found
        return null;
    }

    // Extract file name from path
    function extractFileName(path) {
        const lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            return path.substring(lastSlashIndex + 1);
        }
        return path;
    }

    // Load a PDF by creating an iframe with the PDF viewer
    function loadPdf(pdfUrl) {
        console.log('Attempting to load PDF:', pdfUrl); // Debug log
        
        // Remove the placeholder content
        pdfPlaceholder.style.display = 'none';
        
        // Create iframe for the PDF
        const iframe = document.createElement('iframe');
        iframe.src = pdfUrl;
        iframe.className = 'pdf-viewer';
        iframe.title = 'PDF Viewer';
        iframe.type = 'application/pdf';
        
        // Add the iframe to the content area
        pdfContent.appendChild(iframe);
        
        console.log('Successfully loaded PDF:', pdfUrl); // Debug log
    }

    // Zoom functions
    function zoomIn() {
        currentZoom += 0.2;
        adjustZoom();
    }

    function zoomOut() {
        if (currentZoom > 0.2) {
            currentZoom -= 0.2;
            adjustZoom();
        }
    }
    
    function fitWidth() {
        // Browser PDF viewers typically handle this automatically
        // For this implementation, we'll just reset to default
        currentZoom = 1;
        adjustZoom();
    }
    
    function fitPage() {
        // Browser PDF viewers typically handle this automatically
        // For this implementation, we'll just reset to default
        currentZoom = 1;
        adjustZoom();
    }

    // Apply zoom adjustment
    function adjustZoom() {
        // For browser PDF viewers, zoom is typically handled by the browser
        // We'll log the zoom level for now
        console.log('Zoom level:', currentZoom);
    }

    // Add event listeners to toolbar buttons
    prevBtn.addEventListener('click', function() {
        // Note: Previous/Next functionality would require more complex PDF handling
        // For now, we'll just log the action
        console.log('Previous page requested');
    });
    
    nextBtn.addEventListener('click', function() {
        console.log('Next page requested');
    });
    
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    fitWidthBtn.addEventListener('click', fitWidth);
    fitPageBtn.addEventListener('click', fitPage);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        switch(e.key) {
            case '+':
            case '=':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                fitPage();
                break;
        }
    });
});