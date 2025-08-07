import confetti from 'canvas-confetti';

const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const colorPicker = document.getElementById('color-picker');
const brushSizeInput = document.getElementById('brush-size-input');
const brushSizeUpBtn = document.getElementById('brush-size-up');
const brushSizeDownBtn = document.getElementById('brush-size-down');
const downloadBtn = document.getElementById('download-btn');
const promptInput = document.getElementById('prompt-input');
const layersBtn = document.getElementById('layers-btn');
const addLayerBtn = document.getElementById('add-layer-btn');
const layersPanel = document.getElementById('layers-panel');
const layersListEl = document.getElementById('layers-list');

const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const referenceImage = document.getElementById('reference-image');
const loadingIndicator = document.getElementById('loading-indicator');
const canvasContainer = document.getElementById('canvas-container');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Layer management
let layers = [];
let activeLayerId = null;
let layerCounter = 1;

function createLayer() {
    const id = Date.now();
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.lineCap = 'round';
    offscreenCtx.lineJoin = 'round';

    const newLayer = {
        id,
        name: `Layer ${layerCounter++}`,
        canvas: offscreenCanvas,
        ctx: offscreenCtx,
        isVisible: true,
    };

    layers.push(newLayer);
    setActiveLayer(id);
    updateLayersList();
    return newLayer;
}

function setActiveLayer(id) {
    activeLayerId = id;
    updateLayersList();
}

function getActiveLayer() {
    return layers.find(l => l.id === activeLayerId);
}

function deleteLayer(id) {
    if (layers.length <= 1) {
        alert("You cannot delete the last layer.");
        return;
    }
    const layerIndex = layers.findIndex(l => l.id === id);
    if (layerIndex > -1) {
        layers.splice(layerIndex, 1);
        if (activeLayerId === id) {
            const newActiveIndex = Math.max(0, layerIndex - 1);
            setActiveLayer(layers[newActiveIndex].id);
        }
        updateLayersList();
        renderAllLayers();
    }
}

function toggleLayerVisibility(id) {
    const layer = layers.find(l => l.id === id);
    if (layer) {
        layer.isVisible = !layer.isVisible;
        updateLayersList();
        renderAllLayers();
    }
}

function updateLayersList() {
    layersListEl.innerHTML = '';
    [...layers].reverse().forEach(layer => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.classList.toggle('active', layer.id === activeLayerId);
        item.dataset.id = layer.id;

        const eyeIconSrc = layer.isVisible ? 'eye-open-icon.png' : 'eye-closed-icon.png';

        item.innerHTML = `
            <button class="layer-visibility" title="Toggle Visibility"><img src="${eyeIconSrc}" alt="visibility"></button>
            <span class="layer-name">${layer.name}</span>
            <button class="layer-delete" title="Delete Layer"><img src="trash-can.png" alt="delete"></button>
        `;
        
        item.addEventListener('click', (e) => {
             if (!e.target.closest('.layer-visibility') && !e.target.closest('.layer-delete')) {
                setActiveLayer(layer.id);
            }
        });
        
        item.querySelector('.layer-visibility').addEventListener('click', () => toggleLayerVisibility(layer.id));
        item.querySelector('.layer-delete').addEventListener('click', () => deleteLayer(layer.id));
        
        layersListEl.appendChild(item);
    });
}

function renderAllLayers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    layers.forEach(layer => {
        if (layer.isVisible) {
            ctx.drawImage(layer.canvas, 0, 0);
        }
    });
}

function resizeCanvas() {
    const { width, height } = canvasContainer.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;
    
    layers.forEach(layer => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layer.canvas.width;
        tempCanvas.height = layer.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(layer.canvas, 0, 0);

        layer.canvas.width = width;
        layer.canvas.height = height;
        layer.ctx.lineCap = 'round';
        layer.ctx.lineJoin = 'round';
        layer.ctx.drawImage(tempCanvas, 0, 0);
    });

    renderAllLayers();
    updateBrush();
}

function updateBrush() {
    const activeLayer = getActiveLayer();
    if (!activeLayer) return;
    activeLayer.ctx.strokeStyle = colorPicker.value;
    activeLayer.ctx.lineWidth = brushSizeInput.value;
}

function changeBrushSize(amount) {
    let currentSize = parseInt(brushSizeInput.value, 10) || 1;
    let newSize = currentSize + amount;
    const min = parseInt(brushSizeInput.min, 10);
    const max = parseInt(brushSizeInput.max, 10);

    if (newSize < min) newSize = min;
    if (newSize > max) newSize = max;

    brushSizeInput.value = newSize;
    updateBrush();
}

function startDrawing(e) {
    if (!getActiveLayer()) return;
    isDrawing = true;
    [lastX, lastY] = getMousePos(e);
}

function draw(e) {
    if (!isDrawing) return;
    const activeLayer = getActiveLayer();
    if (!activeLayer) return;

    const [currentX, currentY] = getMousePos(e);
    
    const layerCtx = activeLayer.ctx;
    layerCtx.beginPath();
    layerCtx.moveTo(lastX, lastY);
    layerCtx.lineTo(currentX, currentY);
    layerCtx.stroke();
    
    [lastX, lastY] = [currentX, currentY];

    renderAllLayers();
}

function stopDrawing() {
    isDrawing = false;
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return [x, y];
}

function clearCanvas() {
    const activeLayer = getActiveLayer();
    if (activeLayer) {
        activeLayer.ctx.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        renderAllLayers();
    }
}

async function generateCharacter() {
    loadingIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    promptInput.disabled = true;

    try {
        let userPrompt = promptInput.value.trim();
        if (userPrompt === "") {
            userPrompt = "a cheerful magical girl with large expressive eyes"; // Default prompt
        }
        
        const result = await websim.imageGen({
            prompt: `full body portrait of: ${userPrompt}, professional manga art, clean line art, high contrast, black and white, on a pure white background`,
            width: 512,
            height: 512,
        });

        referenceImage.src = result.url;
        referenceImage.onload = () => {
            layers.forEach(layer => {
                layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            });
            renderAllLayers(); // Clear previous tracing from all layers
            loadingIndicator.classList.add('hidden');
            generateBtn.disabled = false;
            promptInput.disabled = false;
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        };
    } catch (error) {
        console.error("Failed to generate image:", error);
        loadingIndicator.classList.add('hidden');
        generateBtn.disabled = false;
        promptInput.disabled = false;
        alert("Sorry, the character couldn't be generated. Please try again!");
    }
}

function downloadImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw reference image first
    tempCtx.drawImage(referenceImage, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw visible layers on top
    layers.forEach(layer => {
        if (layer.isVisible) {
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
    });

    downloadBtn.href = tempCanvas.toDataURL('image/png');
}

// Event Listeners
generateBtn.addEventListener('click', generateCharacter);
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        generateCharacter();
    }
});
clearBtn.addEventListener('click', clearCanvas);
colorPicker.addEventListener('input', updateBrush);
brushSizeInput.addEventListener('input', updateBrush);
brushSizeInput.addEventListener('change', () => { // Clamp value if user types something out of range
    const min = parseInt(brushSizeInput.min, 10);
    const max = parseInt(brushSizeInput.max, 10);
    let value = parseInt(brushSizeInput.value, 10);
    if (isNaN(value) || value < min) brushSizeInput.value = min;
    if (value > max) brushSizeInput.value = max;
    updateBrush();
});
brushSizeUpBtn.addEventListener('click', () => changeBrushSize(1));
brushSizeDownBtn.addEventListener('click', () => changeBrushSize(-1));
downloadBtn.addEventListener('click', downloadImage);

layersBtn.addEventListener('click', () => {
    layersPanel.classList.toggle('hidden');
});
addLayerBtn.addEventListener('click', createLayer);

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Touch support
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

// Initial Setup
window.addEventListener('load', () => {
    resizeCanvas(); // This will also call updateBrush
    if (layers.length === 0) {
        createLayer();
    }
});
window.addEventListener('resize', resizeCanvas);