// Picture Viewer JavaScript functionality with integrated bridge
document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const previewImage = document.getElementById('preview-image');
    const previewContainer = document.getElementById('preview-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const bestFitBtn = document.getElementById('best-fit-btn');
    const actualSizeBtn = document.getElementById('actual-size-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');

    // State variables
    let currentImageIndex = 0;
    let currentZoom = 'auto'; // 'auto', or a number
    let rotationAngle = 0;
    let originalImageSize = { width: 0, height: 0 };
    let imageList = []; // 이미지 목록 (folder.html에서 전달된 정보 기반)
    let currentImageFile = null; // folder.html에서 전달된 현재 이미지 파일 경로

    // Convert VFS path from folder.html to actual image path in imageviewer
    function convertVfsPathToActual(vfsPath) {
        // Extract file name from the VFS path
        const fileName = extractFileName(vfsPath);

        console.log('Converting VFS path:', vfsPath, 'File name:', fileName); // Debug log

        // Define name mappings between VFS names and actual image files
        // This maps common virtual file names to actual files in ./image/ folder
        const nameMappings = {
            // Common names that might appear in VFS to actual files
            // Add the specific files we added to VFS
            'screenshot.jpg': './image/수련.jpg',  // Default to 수련.jpg for screenshot
            // Direct mappings for all files in the image folder - using exact names
            '가을.jpg': './image/가을.jpg',
            '겨울.jpg': './image/겨울.jpg',
            '공간 이동.jpg': './image/공간 이동.jpg',
            '달과 붉은 사막.jpg': './image/달과 붉은 사막.jpg',
            '달과 산.jpg': './image/달과 산.jpg',
            '물고기.jpg': './image/물고기.jpg',
            '바람.jpg': './image/바람.jpg',
            '보라 꽃.jpg': './image/보라 꽃.jpg',
            '빨강 꽃.jpg': './image/빨강 꽃.jpg',
            '석상.jpg': './image/석상.jpg',
            '석양.jpg': './image/석양.jpg',
            '수련.jpg': './image/수련.jpg',
            '열대.jpg': './image/열대.jpg',
            '유연.jpg': './image/유연.jpg',
            '집.jpg': './image/집.jpg',
            '친구.jpg': './image/친구.jpg',
            '크리스탈.jpg': './image/크리스탈.jpg',
            '튜울립.jpg': './image/튜울립.jpg',
            '평화.jpg': './image/평화.jpg',
            '표면.jpg': './image/표면.jpg',
            '푸른 언덕.jpg': './image/푸른 언덕.jpg',
        };

        // Check if there's a direct name mapping
        if (nameMappings[fileName.toLowerCase()]) {
            console.log('Found direct mapping for:', fileName, '->', nameMappings[fileName.toLowerCase()]); // Debug log
            return nameMappings[fileName.toLowerCase()];
        }

        // For files that don't have a direct mapping, try to match by content
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.bmp'];
        const fileExt = getFileExtension(fileName).toLowerCase();

        if (supportedExtensions.includes(fileExt)) {
            // Remove extension to get base name
            const baseName = fileName.substring(0, fileName.lastIndexOf('.')).toLowerCase();

            console.log('Looking for base name match:', baseName); // Debug log

            // List of actual image files in the imageviewer image folder
            const actualImageFiles = [
                '가을.jpg', '겨울.jpg', '공간 이동.jpg', '달과 붉은 사막.jpg',
                '달과 산.jpg', '물고기.jpg', '바람.jpg', '보라 꽃.jpg',
                '빨강 꽃.jpg', '석상.jpg', '석양.jpg', '수련.jpg',
                '열대.jpg', '유연.jpg', '집.jpg', '친구.jpg',
                '크리스탈.jpg', '튜울립.jpg', '평화.jpg', '표면.jpg',
                '푸른 언덕.jpg'
            ];

            // Try to find a matching actual file
            for (const actualFile of actualImageFiles) {
                // Check if the base names are similar (case insensitive)
                const actualBaseName = actualFile.substring(0, actualFile.lastIndexOf('.'));
                if (actualBaseName.toLowerCase().includes(baseName) ||
                    baseName.includes(actualBaseName.toLowerCase())) {
                    console.log('Found similar name match:', actualFile); // Debug log
                    return `./image/${actualFile}`;
                }
            }

            // If no specific match found, return a default image based on extension
            if (fileExt === '.png') {
                console.log('Using default PNG image'); // Debug log
                return './image/튜울립.jpg';
            } else if (fileExt === '.bmp') {
                console.log('Using default BMP image'); // Debug log
                return './image/석상.jpg';
            } else {
                // Default to 수련.jpg for jpg/jpeg files
                console.log('Using default JPG image: 수련.jpg'); // Debug log
                return './image/수련.jpg';
            }
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

    // Get file extension
    function getFileExtension(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            return fileName.substring(lastDotIndex);
        }
        return '';
    }

    // Log when the script is loaded to verify it's running
    console.log('Image viewer script.js loaded and message listener registered');

    // Wait a bit to ensure all functions are defined before setting up the message listener
    // folder.html에서 전달된 이미지 정보 수신
    window.addEventListener('message', function (event) {
        console.log('Received message in imageviewer:', event.data); // Debug log
        if (event.data.type === 'openImageViewer') {
            currentImageFile = event.data.filePath;
            console.log('Received openImageViewer message with path:', currentImageFile); // Debug log

            // Use the integrated conversion function
            const actualImagePath = convertVfsPathToActual(currentImageFile);

            if (actualImagePath) {
                // Load the actual image if path conversion was successful
                console.log('Attempting to load actual image path:', actualImagePath); // Debug log
                loadImage(actualImagePath);

                // Build image list for navigation using actual paths
                imageList = [
                    './image/가을.jpg', './image/겨울.jpg', './image/공간 이동.jpg',
                    './image/달과 붉은 사막.jpg', './image/달과 산.jpg', './image/물고기.jpg',
                    './image/바람.jpg', './image/보라 꽃.jpg', './image/빨강 꽃.jpg',
                    './image/석상.jpg', './image/석양.jpg', './image/수련.jpg',
                    './image/열대.jpg', './image/유연.jpg', './image/집.jpg',
                    './image/친구.jpg', './image/크리스탈.jpg', './image/튜울립.jpg',
                    './image/평화.jpg', './image/표면.jpg', './image/푸른 언덕.jpg'
                ];

                // Find current image in the list
                currentImageIndex = imageList.indexOf(actualImagePath);
                if (currentImageIndex === -1) {
                    // If current image is not in the list, add it
                    imageList.push(actualImagePath);
                    currentImageIndex = imageList.length - 1;
                }
            } else {
                console.log('Path conversion failed, using fallback method'); // Debug log
                // If path conversion failed, use the old method as fallback
                // 현재 폴더의 이미지 목록을 구성 (folder.html의 vfs 구조 기반)
                imageList = [
                    './app/image viewer/image/sample.jpg',
                    './app/image viewer/image/photo.png'
                ];
                // 현재 이미지를 목록에 맞게 재정렬
                currentImageIndex = imageList.indexOf(currentImageFile);
                if (currentImageIndex === -1) {
                    // 현재 이미지가 목록에 없을 경우
                    imageList.push(currentImageFile);
                    currentImageIndex = imageList.length - 1;
                }
                // 이미지 로드
                if (imageList.length > 0) {
                    console.log('Loading fallback image:', imageList[currentImageIndex]); // Debug log
                    loadImage(imageList[currentImageIndex]);
                }
            }
        }
    });

    // Load an image by URL
    function loadImage(url) {
        console.log('Attempting to load image:', url); // Debug log
        const img = new Image();
        img.onload = function () {
            console.log('Successfully loaded image:', url); // Debug log
            previewImage.src = url;
            originalImageSize = { width: img.naturalWidth, height: img.naturalHeight };

            // Reset zoom and rotation when loading new image
            currentZoom = 'auto';
            rotationAngle = 0;
            updateImageDisplay();
        };
        img.onerror = function (e) {
            console.error('Failed to load image:', url, 'Error:', e); // More detailed error info
            // Check if the default image exists by trying to load it
            const defaultImg = new Image();
            defaultImg.onload = function () {
                console.log('Default image loaded successfully');
                previewImage.src = './image/수련.jpg';
            };
            defaultImg.onerror = function () {
                console.error('Even default image failed to load');
                // If even the default image fails, try with a different path
                // Maybe the imageviewer is loaded from a different context
                previewImage.src = '../app/imageviewer/image/수련.jpg'; // Alternative path
            };
            defaultImg.src = './image/수련.jpg';
        };
        // Ensure the URL is properly formatted
        if (url && url.trim() !== '') {
            img.src = url;
        } else {
            console.error('Image URL is empty or invalid:', url);
            // Load default image if URL is invalid
            previewImage.src = './image/수련.jpg';
        }
    }

    // Update the display based on current zoom and rotation
    function updateImageDisplay() {
        let width, height;

        if (currentZoom === 'auto') {
            // Auto-fit the image to the container
            width = 'auto';
            height = 'auto';
            previewImage.style.width = 'auto';
            previewImage.style.height = 'auto';
            previewImage.style.maxWidth = '100%';
            previewImage.style.maxHeight = '100%';
            previewContainer.style.overflow = 'auto';
        } else {
            // Set specific zoom level
            width = originalImageSize.width * currentZoom;
            height = originalImageSize.height * currentZoom;
            previewImage.style.width = width + 'px';
            previewImage.style.height = height + 'px';
            previewImage.style.maxWidth = 'none';
            previewImage.style.maxHeight = 'none';
            previewContainer.style.overflow = 'auto';
        }

        // Apply rotation
        previewImage.style.transform = `rotate(${rotationAngle}deg)`;
    }

    // Calculate best fit zoom for the current container size
    function calculateBestFitZoom() {
        const containerRect = previewContainer.getBoundingClientRect();
        const containerWidth = containerRect.width - 20; // Account for padding
        const containerHeight = containerRect.height - 20; // Account for padding

        const widthRatio = containerWidth / originalImageSize.width;
        const heightRatio = containerHeight / originalImageSize.height;

        return Math.min(1, widthRatio, heightRatio);
    }

    // Navigation functions
    function prevImage() {
        if (imageList.length > 1) {
            currentImageIndex = (currentImageIndex - 1 + imageList.length) % imageList.length;
            loadImage(imageList[currentImageIndex]);
        }
    }

    function nextImage() {
        if (imageList.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % imageList.length;
            loadImage(imageList[currentImageIndex]);
        }
    }

    // Zoom functions
    function setBestFit() {
        currentZoom = 'auto';
        updateImageDisplay();
    }

    function setActualSize() {
        currentZoom = 1; // 100% zoom
        updateImageDisplay();
    }

    function zoomIn() {
        if (currentZoom === 'auto') {
            // Calculate best fit and add 20% zoom
            currentZoom = Math.min(calculateBestFitZoom() + 0.2, 2);
        } else {
            currentZoom = Math.min(currentZoom + 0.2, 2);
        }
        updateImageDisplay();
    }

    function zoomOut() {
        if (currentZoom !== 'auto' && currentZoom > 0.2) {
            currentZoom = Math.max(currentZoom - 0.2, 0.2);
        } else {
            // If we're at auto zoom or near minimum, stay at minimum
            currentZoom = 0.2;
        }
        updateImageDisplay();
    }

    // Rotation functions
    function rotateCW() {
        rotationAngle += 90;
        updateImageDisplay();
    }

    function rotateCCW() {
        rotationAngle -= 90;
        updateImageDisplay();
    }

    // Handle mouse wheel for zooming
    function handleWheel(e) {
        e.preventDefault();

        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }

    // Handle keyboard shortcuts
    function handleKeyDown(e) {
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                nextImage();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'Backspace':
                e.preventDefault();
                prevImage();
                break;
            case 'b':
            case 'B':
                if (e.ctrlKey) {
                    e.preventDefault();
                    setBestFit();
                }
                break;
            case 'a':
            case 'A':
                if (e.ctrlKey) {
                    e.preventDefault();
                    setActualSize();
                }
                break;
            case '+':
            case '=':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case 'k':
            case 'K':
                if (e.ctrlKey) {
                    e.preventDefault();
                    rotateCW();
                }
                break;
            case 'l':
            case 'L':
                if (e.ctrlKey) {
                    e.preventDefault();
                    rotateCCW();
                }
                break;
        }
    }

    // Add event listeners
    prevBtn.addEventListener('click', prevImage);
    nextBtn.addEventListener('click', nextImage);
    bestFitBtn.addEventListener('click', setBestFit);
    actualSizeBtn.addEventListener('click', setActualSize);
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    rotateRightBtn.addEventListener('click', rotateCW);
    rotateLeftBtn.addEventListener('click', rotateCCW);

    // Add mouse wheel support for zooming
    previewContainer.addEventListener('wheel', handleWheel);

    // Add keyboard support
    document.addEventListener('keydown', handleKeyDown);
});