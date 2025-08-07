import confetti from 'canvas-confetti';

const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const colorPicker = document.getElementById('color-picker');
const brushSizeInput = document.getElementById('brush-size-input');
const brushSizeUpBtn = document.getElementById('brush-size-up');
const brushSizeDownBtn = document.getElementById('brush-size-down');
const downloadBtn = document.getElementById('download-btn');

const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const referenceImage = document.getElementById('reference-image');
const loadingIndicator = document.getElementById('loading-indicator');
const canvasContainer = document.getElementById('canvas-container');
const controls = document.querySelector('.controls');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function resizeAndPositionCanvas() {
    // Set a baseline for vertical gap
    const verticalGap = 20;

    // Calculate available dimensions for the canvas
    const availableWidth = window.innerWidth - 20; // 10px padding on each side
    const controlsRect = controls.getBoundingClientRect();
    const availableHeight = window.innerHeight - controlsRect.bottom - verticalGap - 10; // 10px bottom padding

    // Determine the size of the square canvas (max size that fits)
    const size = Math.floor(Math.min(availableWidth, availableHeight));

    // Apply the new size to the canvas container
    canvasContainer.style.width = `${size}px`;
    canvasContainer.style.height = `${size}px`;

    // Update the canvas rendering resolution
    canvas.width = size;
    canvas.height = size;

    // Redraw or re-apply styles as needed
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    updateBrush();
}

function updateBrush() {
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = brushSizeInput.value;
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
    isDrawing = true;
    [lastX, lastY] = getMousePos(e);
}

function draw(e) {
    if (!isDrawing) return;
    const [currentX, currentY] = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    [lastX, lastY] = [currentX, currentY];
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function generateCharacter() {
    loadingIndicator.classList.remove('hidden');
    generateBtn.disabled = true;

    try {
        const mangaPrompts = [
            "A cool manga hero with spiky hair, determined expression, black and white ink style",
            "A cheerful magical girl with large expressive eyes, detailed frilly dress, manga screen tones, black and white",
            "A stoic samurai warrior with a katana, traditional hakama, dynamic pose, bold ink lines, manga style",
            "A shy librarian girl with glasses, surrounded by books, gentle smile, fine line art, black and white manga",
            "A futuristic cyborg detective, intricate mechanical parts, trench coat, noir manga style, high contrast black and white",
            "A mischievous cat-girl (nekomimi) with a playful smirk, twin tails, anime school uniform, clean black and white lines",
            "A powerful ninja in mid-air, holding kunai, flowing scarf, speed lines, action manga style, black and white",
            "A friendly robot companion, smooth metallic body, glowing optic sensors, simple clean manga art, white background"
        ];
        
        const prompt = mangaPrompts[Math.floor(Math.random() * mangaPrompts.length)];

        const result = await websim.imageGen({
            prompt: `full body portrait of: ${prompt}, professional manga art, clean line art, high contrast, black and white, on a pure white background`,
            width: 512,
            height: 512,
        });

        referenceImage.src = result.url;
        referenceImage.onload = () => {
            clearCanvas(); // Clear previous tracing
            loadingIndicator.classList.add('hidden');
            generateBtn.disabled = false;
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
        alert("Sorry, the character couldn't be generated. Please try again!");
    }
}

function downloadImage() {
    downloadBtn.href = canvas.toDataURL('image/png');
}

// Event Listeners
generateBtn.addEventListener('click', generateCharacter);
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
    resizeAndPositionCanvas();
    updateBrush();
});
window.addEventListener('resize', resizeAndPositionCanvas);