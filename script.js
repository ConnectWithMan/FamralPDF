const fileUpload = document.getElementById('file-upload');
const pagesContainer = document.getElementById('pages-container');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const drawBtn = document.getElementById('draw');
const textBtn = document.getElementById('text');
const clearBtn = document.getElementById('clear');
const fontFamilySelect = document.getElementById('font-family');
const fontSizeInput = document.getElementById('font-size');
const saveBtn = document.getElementById('save');
const pdfViewer = document.querySelector('.pdf-viewer');

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let scale = 1.5;
let drawingMode = false;
const drawings = {};
let pdfFile = null;
let fabricCanvases = [];
let activeCanvas = null;
let activePages = [];

const { PDFDocument } = PDFLib;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

const handleSelection = (e) => {
    if (e.target && e.target.type === 'i-text') {
        fontFamilySelect.value = e.target.fontFamily;
        fontSizeInput.value = e.target.fontSize;
    }
};

const renderAllPages = async () => {
    pdfViewer.innerHTML = '';
    fabricCanvases = [];

    for (let i = 0; i < activePages.length; i++) {
        const num = activePages[i];
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale });

        const wrapper = document.createElement('div');
        wrapper.className = 'canvas-wrapper';
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;

        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        
        const fabricCanvasEl = document.createElement('canvas');
        fabricCanvasEl.width = viewport.width;
        fabricCanvasEl.height = viewport.height;

        wrapper.appendChild(pdfCanvas);
        wrapper.appendChild(fabricCanvasEl);
        pdfViewer.appendChild(wrapper);

        const renderContext = {
            canvasContext: pdfCanvas.getContext('2d'),
            viewport
        };
        page.render(renderContext);

        const fCanvas = new fabric.Canvas(fabricCanvasEl, {
            width: viewport.width,
            height: viewport.height
        });

        fCanvas.on('mouse:down', () => {
            activeCanvas = fCanvas;
        });
        fCanvas.on('selection:created', handleSelection);
        fCanvas.on('selection:updated', handleSelection);

        fabricCanvases.push(fCanvas);
        if (i === 0) activeCanvas = fCanvas;

        // Restore drawings if any
        if (drawings[num]) {
            const { json, scale: savedScale } = drawings[num];
            fCanvas.loadFromJSON(json, () => {
                const factor = scale / savedScale;
                if (factor !== 1) {
                    fCanvas.getObjects().forEach(obj => {
                        obj.scaleX *= factor;
                        obj.scaleY *= factor;
                        obj.left *= factor;
                        obj.top *= factor;
                        obj.setCoords();
                    });
                }
                fCanvas.renderAll();
            });
        }
    }
    
    // Restore drawing mode state
    fabricCanvases.forEach(c => c.isDrawingMode = drawingMode);
};

const renderPagePreviews = () => {
    pagesContainer.innerHTML = '';
    for (let i = 0; i < activePages.length; i++) {
        const num = activePages[i];
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-wrapper';

        const canvas = document.createElement('canvas');
        canvas.id = `page-preview-${num}`;
        canvas.classList.add('page-preview');
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete Page';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePage(num);
        };

        wrapper.appendChild(canvas);
        wrapper.appendChild(deleteBtn);
        pagesContainer.appendChild(wrapper);

        pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale: 0.3 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport
            };
            page.render(renderContext);
        });

        canvas.addEventListener('click', () => {
            // Scroll to specific page
            const target = pdfViewer.children[num - 1];
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    }
};

const deletePage = (pageNumToDelete) => {
    activePages = activePages.filter(p => p !== pageNumToDelete);
    renderAllPages();
    renderPagePreviews();
};

const saveAllDrawings = () => {
    fabricCanvases.forEach((fc, index) => {
        const pageNum = activePages[index];
        drawings[pageNum] = {
            json: fc.toJSON(),
            scale: scale
        };
    });
};

const onZoomIn = () => {
    saveAllDrawings();
    scale += 0.1;
    renderAllPages();
};

const onZoomOut = () => {
    if (scale <= 0.1) {
        return;
    }
    saveAllDrawings();
    scale -= 0.1;
    renderAllPages();
};

const onDraw = () => {
    drawingMode = !drawingMode;
    fabricCanvases.forEach(fc => fc.isDrawingMode = drawingMode);
    drawBtn.classList.toggle('active', drawingMode);
};

const onText = () => {
    drawingMode = false;
    fabricCanvases.forEach(fc => fc.isDrawingMode = false);
    drawBtn.classList.remove('active');
    
    if (!activeCanvas) return;
    
    const fontSize = parseInt(fontSizeInput.value, 10) || 20;
    const fontFamily = fontFamilySelect.value;

    const text = new fabric.IText('Type here', {
        left: 100,
        top: 100,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fill: '#000000'
    });
    activeCanvas.add(text);
    activeCanvas.setActiveObject(text);
};

const onFontFamilyChange = () => {
    if (activeCanvas && activeCanvas.getActiveObject()) {
        const obj = activeCanvas.getActiveObject();
        if (obj.type === 'i-text') {
            obj.set('fontFamily', fontFamilySelect.value);
            activeCanvas.renderAll();
        }
    }
};

const onFontSizeChange = () => {
    if (activeCanvas && activeCanvas.getActiveObject()) {
        const obj = activeCanvas.getActiveObject();
        if (obj.type === 'i-text') {
            obj.set('fontSize', parseInt(fontSizeInput.value, 10));
            activeCanvas.renderAll();
        }
    }
};

const onClear = () => {
    if (activeCanvas) activeCanvas.clear();
};

const onSave = async () => {
    if (!pdfFile) {
        return;
    }

    saveAllDrawings();

    const sourcePdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
    const newPdfDoc = await PDFDocument.create();
    const copiedPages = await newPdfDoc.copyPages(sourcePdfDoc, activePages.map(p => p - 1));

    for (let i = 0; i < copiedPages.length; i++) {
        const page = copiedPages[i];
        newPdfDoc.addPage(page);
        const originalPageNum = activePages[i];

        if (drawings[originalPageNum]) {
            const { width, height } = page.getSize();
            const { json, scale: savedScale } = drawings[originalPageNum];
            
            // Create a temporary canvas to draw the fabric data
            const tempCanvas = document.createElement('canvas');
            const tempFabricCanvas = new fabric.Canvas(tempCanvas, {
                width,
                height,
            });
            
            await new Promise(resolve => {
                tempFabricCanvas.loadFromJSON(json, () => {
                    const factor = 1 / savedScale;
                    tempFabricCanvas.getObjects().forEach(obj => {
                        obj.scaleX *= factor;
                        obj.scaleY *= factor;
                        obj.left *= factor;
                        obj.top *= factor;
                        obj.setCoords();
                    });
                    tempFabricCanvas.renderAll();
                    resolve();
                });
            });

            const pngImage = tempFabricCanvas.toDataURL({
                format: 'png',
                quality: 1,
                multiplier: 3
            });
            
            const pngImageBytes = await fetch(pngImage).then(res => res.arrayBuffer());
            const embeddedImage = await newPdfDoc.embedPng(pngImageBytes);
            
            page.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: width,
                height: height,
            });
        }
    }

    const pdfBytes = await newPdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'edited.pdf';
    link.click();
};

fileUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error('Not a PDF file');
        return;
    }

    pdfFile = file;
    const fileReader = new FileReader();
    fileReader.onload = () => {
        const typedarray = new Uint8Array(fileReader.result);
        // Clear existing drawings
        for (const key in drawings) delete drawings[key];
        pdfjsLib.getDocument(typedarray).promise.then(pdfDoc_ => {
            pdfDoc = pdfDoc_;
            activePages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
            renderAllPages();
            renderPagePreviews();
        });
    };
    fileReader.readAsArrayBuffer(file);
});

zoomInBtn.addEventListener('click', onZoomIn);
zoomOutBtn.addEventListener('click', onZoomOut);
drawBtn.addEventListener('click', onDraw);
textBtn.addEventListener('click', onText);
fontFamilySelect.addEventListener('change', onFontFamilyChange);
fontSizeInput.addEventListener('change', onFontSizeChange);
clearBtn.addEventListener('click', onClear);
saveBtn.addEventListener('click', onSave);
