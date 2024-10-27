function validateFile(event) {
    const fileInput = event.target;
    const filePath = fileInput.value;
    const allowedImageExtensions = /(\.jpg|\.jpeg|\.png)$/i;
    const allowedPdfExtensions = /(\.pdf)$/i;

    if (fileInput.files.length === 0) {
        return; // No file selected
    }

    const file = fileInput.files[0];

    if (fileInput.id === 'imageInput' && !allowedImageExtensions.exec(filePath)) {
        alert('Please upload a valid image file (JPG, PNG).');
        fileInput.value = ''; // Clear the input
        return;
    }

    if (fileInput.id === 'pdfInput' && !allowedPdfExtensions.exec(filePath)) {
        alert('Please upload a valid PDF file.');
        fileInput.value = ''; // Clear the input
        return;
    }

    // Clear other input when one is selected
    if (fileInput.id === 'imageInput') {
        document.getElementById('pdfInput').value = ''; // Clear PDF input
    } else if (fileInput.id === 'pdfInput') {
        document.getElementById('imageInput').value = ''; // Clear Image input
    }
}

function verifyDocumentContent(text) {
    // Simple verification logic for health-related content
    const healthKeywords = ['prescription', 'medication', 'doctor', 'pharmacy', 'diagnosis', 'treatment', 'medicine', 'refill'];

    // Check for the presence of health-related keywords
    return healthKeywords.some(keyword => text.toLowerCase().includes(keyword));
}

function extractTextFromImage() {
    const imageInput = document.getElementById('imageInput');
    const pdfInput = document.getElementById('pdfInput');
    const extractedTextArea = document.getElementById('extractedText');

    // Clear previous text
    extractedTextArea.value = '';

    if (!imageInput.files[0] && !pdfInput.files[0]) {
        alert('Please upload an image or PDF document first.');
        return;
    }

    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = 'Scanning prescription, please wait...';

    if (imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            Tesseract.recognize(
                e.target.result,
                'eng',
                {
                    logger: info => {
                        console.log(info);
                        // Update loading text based on progress
                        if (info.status === 'recognizing text') {
                            loadingText.textContent = `Scanning... ${Math.round(info.progress * 100)}% completed`;
                        }
                    }
                }
            ).then(({ data: { text } }) => {
                // Verify extracted text for health-related content
                if (verifyDocumentContent(text)) {
                    extractedTextArea.value = text;
                    alert('Text extraction completed successfully!');
                } else {
                    alert('The uploaded document does not contain valid health-related information. Please upload a valid prescription.');
                }
            }).catch(error => {
                console.error('Error during Tesseract recognition:', error);
                alert('Error extracting text: ' + error.message);
            }).finally(() => {
                loadingOverlay.style.display = 'none';
            });
        };
        reader.onerror = function() {
            alert('Error reading file. Please try another image.');
        };
        reader.readAsDataURL(imageInput.files[0]);

    } else if (pdfInput.files[0]) {
        const file = pdfInput.files[0];
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                const numPages = pdf.numPages;
                let extractedText = '';

                // Function to extract text from each page
                const extractTextFromPage = (pageNum) => {
                    return pdf.getPage(pageNum).then(page => {
                        return page.getTextContent().then(textContent => {
                            const textItems = textContent.items.map(item => item.str).join(' ');
                            extractedText += textItems + '\n'; // Append page text
                        });
                    });
                };

                // Loop through all pages and extract text
                const pagesPromises = [];
                for (let i = 1; i <= numPages; i++) {
                    pagesPromises.push(extractTextFromPage(i));
                }

                Promise.all(pagesPromises).then(() => {
                    // Verify extracted text for health-related content
                    if (verifyDocumentContent(extractedText)) {
                        extractedTextArea.value = extractedText;
                        alert('Text extraction completed successfully!');
                    } else {
                        alert('The uploaded document does not contain valid health-related information. Please upload a valid prescription.');
                    }
                }).catch(error => {
                    console.error('Error during PDF text extraction:', error);
                    alert('Error extracting text from PDF: ' + error.message);
                }).finally(() => {
                    loadingOverlay.style.display = 'none';
                });
            });
        };
        fileReader.readAsArrayBuffer(file);
    }
}

function copyText() {
    const textArea = document.getElementById('extractedText');
    if (textArea.value) {
        textArea.select();
        document.execCommand('copy');
        alert('Text copied to clipboard!');
    } else {
        alert('No text to copy. Please extract text first.');
    }
}
