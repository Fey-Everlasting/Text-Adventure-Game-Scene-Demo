let originalImage = null;

document.getElementById('upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            updateCanvas();
        }
        img.src = event.target.result;
    }

    reader.readAsDataURL(file);
});

document.getElementById('threshold').addEventListener('input', function() {
    document.getElementById('thresholdValue').textContent = this.value;
    updateCanvas();
});

document.getElementById('ditherLevel').addEventListener('input', function() {
    document.getElementById('ditherValue').textContent = this.value;
    updateCanvas();
});

document.getElementById('pixelSize').addEventListener('input', function() {
    document.getElementById('pixelSizeValue').textContent = this.value;
    updateCanvas();
});

function updateCanvas() {
    if (!originalImage) return;

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const threshold = parseInt(document.getElementById('threshold').value);
    const ditherLevel = parseInt(document.getElementById('ditherLevel').value);
    const pixelSize = parseInt(document.getElementById('pixelSize').value);

    const width = originalImage.width;
    const height = originalImage.height;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(originalImage, 0, 0, width, height);
    applyDithering(ctx, width, height, threshold, ditherLevel, pixelSize);
}

function applyDithering(ctx, width, height, threshold, ditherLevel, pixelSize) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const ditherMatrix = createDitherMatrix(ditherLevel);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const oldPixel = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]; // 使用加权平均值计算灰度
            const newPixel = oldPixel < threshold ? 0 : 255;
            data[index] = data[index + 1] = data[index + 2] = newPixel;
            const quantError = oldPixel - newPixel;

            for (let i = 0; i < ditherMatrix.length; i++) {
                const dx = ditherMatrix[i][0];
                const dy = ditherMatrix[i][1];
                const weight = ditherMatrix[i][2];
                if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
                    const newIndex = ((y + dy) * width + (x + dx)) * 4;
                    data[newIndex] = clampColor(data[newIndex] + quantError * weight);
                    data[newIndex + 1] = clampColor(data[newIndex + 1] + quantError * weight);
                    data[newIndex + 2] = clampColor(data[newIndex + 2] + quantError * weight);
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // 再次确保所有颜色都是纯黑或纯白
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
            const finalPixel = gray < threshold ? 0 : 255;
            data[index] = data[index + 1] = data[index + 2] = finalPixel;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    if (pixelSize > 1) {
        const scaledCanvas = document.createElement('canvas');
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCanvas.width = width;
        scaledCanvas.height = height;
        scaledCtx.putImageData(imageData, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(scaledCanvas, 0, 0, width / pixelSize, height / pixelSize, 0, 0, width, height);
    }
}

function clampColor(value) {
    return Math.max(0, Math.min(255, value));
}

function createDitherMatrix(level) {
    switch (level) {
        case 1:
            return [[1, 0, 1 / 2]];
        case 2:
            return [[1, 0, 1 / 3], [0, 1, 1 / 3], [1, 1, 1 / 3]];
        case 4:
            return [[1, 0, 1 / 4], [0, 1, 1 / 4], [1, 1, 1 / 4], [-1, 1, 1 / 4]];
        case 8:
            return [[1, 0, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [-1, 1, 1 / 8], [1, -1, 1 / 8], [-1, -1, 1 / 8], [2, 0, 1 / 8], [0, 2, 1 / 8]];
        default:
            return [[1, 0, 1 / 16], [0, 1, 1 / 16], [1, 1, 1 / 16], [-1, 1, 1 / 16], [1, -1, 1 / 16], [-1, -1, 1 / 16], [2, 0, 1 / 16], [0, 2, 1 / 16], [-2, 0, 1 / 16], [0, -2, 1 / 16], [2, 2, 1 / 16], [-2, 2, 1 / 16], [2, -2, 1 / 16], [-2, -2, 1 / 16]];
    }
}
