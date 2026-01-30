/**
 * Binary Pulse Encoder - Name to Signal Converter
 * Converts text to binary and visualizes various digital encoding schemes
 */

// ===================================
// DOM Elements
// ===================================
const nameInput = document.getElementById('nameInput');
const charCount = document.getElementById('charCount');
const convertBtn = document.getElementById('convertBtn');
const resultsSection = document.getElementById('resultsSection');
const binaryDisplay = document.getElementById('binaryDisplay');
const charBreakdown = document.getElementById('charBreakdown');
const waveformCanvas = document.getElementById('waveformCanvas');
const encodingTitle = document.getElementById('encodingTitle');
const encodingRuleName = document.getElementById('encodingRuleName');
const encodingRules = document.getElementById('encodingRules');
const guideSteps = document.getElementById('guideSteps');
const copyBinaryBtn = document.getElementById('copyBinaryBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const downloadBtn = document.getElementById('downloadBtn');

// ===================================
// State
// ===================================
let currentBinary = '';
let currentZoom = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

// ===================================
// Encoding Definitions
// ===================================
const encodingInfo = {
    nrz: {
        title: 'NRZ-L (Non-Return to Zero Level)',
        shortTitle: 'NRZ-L',
        rules: [
            '<strong>Bit 1:</strong> Signal stays at +V (high) for the entire bit duration',
            '<strong>Bit 0:</strong> Signal stays at 0V (low) for the entire bit duration',
            '<strong>Transitions:</strong> Only occur when the bit value changes (0→1 or 1→0)',
            '<strong>No return to zero:</strong> Signal maintains level for full bit period'
        ],
        steps: [
            'Draw 2 horizontal dotted lines: +V at top, 0 at bottom',
            'Mark vertical gridlines - each bit occupies <strong>1 full cell width</strong>',
            'Write the binary bits above the graph (0 1 0 0 1 0 0 0...)',
            'For each 1: draw a horizontal line at +V level',
            'For each 0: draw a horizontal line at 0V level',
            'Connect bits with vertical lines only when value changes'
        ]
    },
    rz: {
        title: 'RZ (Return to Zero)',
        shortTitle: 'RZ',
        rules: [
            '<strong>Bit 1:</strong> Signal goes +V for first half, then returns to 0V for second half',
            '<strong>Bit 0:</strong> Signal goes -V for first half, then returns to 0V for second half',
            '<strong>Always returns:</strong> Every bit period ends at 0V (ground)',
            '<strong>Self-clocking:</strong> Easy to detect bit boundaries'
        ],
        steps: [
            'Draw 3 horizontal dotted lines: +V at top, 0 in middle, -V at bottom',
            'Divide each bit cell into <strong>2 equal halves</strong> with a faint vertical line',
            'Write the binary bits above the graph',
            'For each 1: draw +V for first half, then drop to 0V for second half',
            'For each 0: draw -V for first half, then rise to 0V for second half',
            'Each bit always ends at the 0V line'
        ]
    },
    manchester: {
        title: 'Manchester Encoding',
        shortTitle: 'Manchester',
        rules: [
            '<strong>Bit 1:</strong> Transition from LOW to HIGH at the middle of the bit (↑)',
            '<strong>Bit 0:</strong> Transition from HIGH to LOW at the middle of the bit (↓)',
            '<strong>Mid-bit transition:</strong> ALWAYS occurs at the center of each bit',
            '<strong>Self-clocking:</strong> The transition provides clock information'
        ],
        steps: [
            'Draw 2 horizontal dotted lines: +V at top, -V at bottom',
            'Divide each bit cell into <strong>2 equal halves</strong> with a center mark',
            'Write the binary bits above the graph',
            'For each 1: start at -V, transition UP to +V at the middle',
            'For each 0: start at +V, transition DOWN to -V at the middle',
            'Remember: the middle transition is the key feature!'
        ]
    },
    ami: {
        title: 'Bipolar AMI (Alternate Mark Inversion)',
        shortTitle: 'Bipolar AMI',
        rules: [
            '<strong>Bit 0:</strong> Signal stays at 0V (zero level) for entire bit duration',
            '<strong>Bit 1:</strong> Alternates between +V and -V for consecutive 1s',
            '<strong>First 1:</strong> Could be +V, then next 1 is -V, then +V, and so on...',
            '<strong>Alternating:</strong> Prevents DC buildup in the signal'
        ],
        steps: [
            'Draw 3 horizontal dotted lines: +V at top, 0 in middle, -V at bottom',
            'Mark vertical gridlines for each bit',
            'Write the binary bits above the graph',
            'For each 0: draw a flat line at 0V',
            'For the first 1: draw at +V level',
            'For the next 1: draw at -V level (alternate each time)',
            'Keep alternating +V/-V for every subsequent 1'
        ]
    },
    cmi: {
        title: 'CMI (Coded Mark Inversion)',
        shortTitle: 'CMI',
        rules: [
            '<strong>Bit 0:</strong> Transition from 0V to +V at the middle of bit (always)',
            '<strong>Bit 1:</strong> Alternates between staying at +V and staying at 0V',
            '<strong>First 1:</strong> Full bit at 0V, next 1 is full bit at +V, etc.',
            '<strong>0 always transitions:</strong> Every 0 has a mid-bit transition from 0V to +V'
        ],
        steps: [
            'Draw 2 horizontal dotted lines: +V at top, 0 at bottom',
            'Divide each bit cell into 2 halves for 0-bits',
            'Write the binary bits above the graph',
            'For first 1: draw flat line at 0V for entire bit',
            'For next 1: draw flat line at +V for entire bit (alternate)',
            'For each 0: draw 0V for first half, then +V for second half',
            'Track which level the next "1" should use!'
        ]
    }
};

// ===================================
// Utility Functions
// ===================================

/**
 * Convert a character to its 8-bit binary representation
 */
function charToBinary(char) {
    const code = char.charCodeAt(0);
    return code.toString(2).padStart(8, '0');
}

/**
 * Convert a string to binary
 */
function stringToBinary(str) {
    return Array.from(str).map(char => charToBinary(char)).join('');
}

/**
 * Show a toast notification
 */
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
}

/**
 * Get selected encoding type
 */
function getSelectedEncoding() {
    return document.querySelector('input[name="encoding"]:checked').value;
}

// ===================================
// Drawing Functions
// ===================================

/**
 * Draw the waveform on canvas with graph paper background
 */
function drawWaveform(binary, encoding) {
    const ctx = waveformCanvas.getContext('2d');

    // Configuration
    const bitWidth = 40 * currentZoom;
    const cellSize = 20 * currentZoom;
    const padding = 80;
    const topPadding = 60;
    const bottomPadding = 40;

    // Canvas dimensions
    const canvasWidth = Math.max(800, binary.length * bitWidth + padding * 2);
    const canvasHeight = 280 * currentZoom;

    waveformCanvas.width = canvasWidth;
    waveformCanvas.height = canvasHeight;

    // Voltage levels
    const voltageHigh = topPadding + cellSize;
    const voltageZero = topPadding + cellSize * 3;
    const voltageLow = topPadding + cellSize * 5;

    // Clear and draw graph paper background
    ctx.fillStyle = '#fefce8';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw minor grid lines
    ctx.strokeStyle = '#e5e5e5';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= canvasWidth; x += cellSize / 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    for (let y = 0; y <= canvasHeight; y += cellSize / 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    // Draw major grid lines
    ctx.strokeStyle = '#a3a3a3';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvasWidth; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    for (let y = 0; y <= canvasHeight; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    // Draw voltage level lines (dashed)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1;

    [voltageHigh, voltageZero, voltageLow].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(padding - 20, y);
        ctx.lineTo(canvasWidth - padding + 20, y);
        ctx.stroke();
    });

    ctx.setLineDash([]);

    // Draw voltage labels
    ctx.fillStyle = '#374151';
    ctx.font = `bold ${14 * currentZoom}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    ctx.fillText('+V', padding - 25, voltageHigh);
    ctx.fillText('0', padding - 25, voltageZero);
    ctx.fillText('-V', padding - 25, voltageLow);

    // Draw bit labels above
    ctx.textAlign = 'center';
    ctx.font = `bold ${12 * currentZoom}px "JetBrains Mono", monospace`;

    for (let i = 0; i < binary.length; i++) {
        const x = padding + i * bitWidth + bitWidth / 2;
        ctx.fillStyle = binary[i] === '1' ? '#059669' : '#dc2626';
        ctx.fillText(binary[i], x, topPadding - 15);
    }

    // Draw bit position markers
    ctx.fillStyle = '#6b7280';
    ctx.font = `${10 * currentZoom}px "JetBrains Mono", monospace`;

    for (let i = 0; i < binary.length; i++) {
        const x = padding + i * bitWidth + bitWidth / 2;
        // Show position every 8 bits (1 character)
        if (i % 8 === 0) {
            ctx.fillText(`${i}`, x, canvasHeight - 15);
        }
    }

    // Draw the signal waveform
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 3 * currentZoom;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    ctx.beginPath();

    let lastY = voltageZero;
    let amiPolarity = 1; // For AMI: alternates between +1 and -1
    let cmiPolarity = -1; // For CMI: Starts Low (0V) to match teacher's example

    for (let i = 0; i < binary.length; i++) {
        const x = padding + i * bitWidth;
        const bit = binary[i];

        switch (encoding) {
            case 'nrz':
                drawNRZ(ctx, x, bitWidth, bit, voltageHigh, voltageZero, lastY, i);
                lastY = bit === '1' ? voltageHigh : voltageZero;
                break;

            case 'rz':
                drawRZ(ctx, x, bitWidth, bit, voltageHigh, voltageZero, voltageLow, lastY, i);
                lastY = voltageZero;
                break;

            case 'manchester':
                drawManchester(ctx, x, bitWidth, bit, voltageHigh, voltageLow, lastY, i);
                lastY = bit === '1' ? voltageHigh : voltageLow;
                break;

            case 'ami':
                const amiResult = drawAMI(ctx, x, bitWidth, bit, voltageHigh, voltageZero, voltageLow, lastY, i, amiPolarity);
                lastY = amiResult.lastY;
                amiPolarity = amiResult.polarity;
                break;

            case 'cmi':
                // CMI uses voltageHigh and voltageZero (passed as 'low' parameter)
                const cmiResult = drawCMI(ctx, x, bitWidth, bit, voltageHigh, voltageZero, lastY, i, cmiPolarity);
                lastY = cmiResult.lastY;
                cmiPolarity = cmiResult.polarity;
                break;
        }
    }

    ctx.stroke();

    // Draw bit separators
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= binary.length; i++) {
        const x = padding + i * bitWidth;
        ctx.beginPath();
        ctx.moveTo(x, topPadding);
        ctx.lineTo(x, voltageLow + 20);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

// Individual encoding drawing functions
function drawNRZ(ctx, x, width, bit, high, low, lastY, index) {
    const y = bit === '1' ? high : low;

    if (index === 0) {
        ctx.moveTo(x, y);
    } else if (lastY !== y) {
        ctx.lineTo(x, lastY);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(x + width, y);
}

function drawRZ(ctx, x, width, bit, high, zero, low, lastY, index) {
    if (bit === '1') {
        // Bit 1: +V for first half, then 0V for second half
        if (index === 0) {
            ctx.moveTo(x, high);
        } else {
            ctx.lineTo(x, lastY);
            if (lastY !== high) ctx.lineTo(x, high);
        }
        ctx.lineTo(x + width / 2, high);
        ctx.lineTo(x + width / 2, zero);
        ctx.lineTo(x + width, zero);
    } else {
        // Bit 0: -V for first half, then 0V for second half
        if (index === 0) {
            ctx.moveTo(x, low);
        } else {
            ctx.lineTo(x, lastY);
            if (lastY !== low) ctx.lineTo(x, low);
        }
        ctx.lineTo(x + width / 2, low);
        ctx.lineTo(x + width / 2, zero);
        ctx.lineTo(x + width, zero);
    }
}

function drawManchester(ctx, x, width, bit, high, low, lastY, index) {
    if (bit === '1') {
        // 1 = Low to High transition at middle
        if (index === 0) {
            ctx.moveTo(x, low);
        } else if (lastY !== low) {
            ctx.lineTo(x, lastY);
            ctx.lineTo(x, low);
        }
        ctx.lineTo(x + width / 2, low);
        ctx.lineTo(x + width / 2, high);
        ctx.lineTo(x + width, high);
    } else {
        // 0 = High to Low transition at middle
        if (index === 0) {
            ctx.moveTo(x, high);
        } else if (lastY !== high) {
            ctx.lineTo(x, lastY);
            ctx.lineTo(x, high);
        }
        ctx.lineTo(x + width / 2, high);
        ctx.lineTo(x + width / 2, low);
        ctx.lineTo(x + width, low);
    }
}

function drawAMI(ctx, x, width, bit, high, zero, low, lastY, index, polarity) {
    let newY, newPolarity = polarity;

    if (bit === '0') {
        newY = zero;
    } else {
        newY = polarity === 1 ? high : low;
        newPolarity = -polarity;
    }

    if (index === 0) {
        ctx.moveTo(x, newY);
    } else {
        ctx.lineTo(x, lastY);
        if (lastY !== newY) ctx.lineTo(x, newY);
    }
    ctx.lineTo(x + width, newY);

    return { lastY: newY, polarity: newPolarity };
}

function drawCMI(ctx, x, width, bit, high, low, lastY, index, polarity) {
    let newPolarity = polarity;

    if (bit === '1') {
        // 1 = alternating full bit at +V or -V
        const y = polarity === 1 ? high : low;
        newPolarity = -polarity;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, lastY);
            if (lastY !== y) ctx.lineTo(x, y);
        }
        ctx.lineTo(x + width, y);

        return { lastY: y, polarity: newPolarity };
    } else {
        // 0 = -V to +V transition at middle
        if (index === 0) {
            ctx.moveTo(x, low);
        } else {
            ctx.lineTo(x, lastY);
            if (lastY !== low) ctx.lineTo(x, low);
        }
        ctx.lineTo(x + width / 2, low);
        ctx.lineTo(x + width / 2, high);
        ctx.lineTo(x + width, high);

        return { lastY: high, polarity: polarity };
    }
}

// ===================================
// UI Update Functions
// ===================================

function updateBinaryDisplay(name, binary) {
    // Display binary with colored bits
    binaryDisplay.innerHTML = binary.split('').map(bit =>
        `<span class="bit-${bit}">${bit}</span>`
    ).join('');

    // Character breakdown
    charBreakdown.innerHTML = '';

    for (let i = 0; i < name.length; i++) {
        const char = name[i];
        const charBin = charToBinary(char);
        const displayChar = char === ' ' ? '(space)' : char;

        const item = document.createElement('div');
        item.className = 'char-item';
        item.innerHTML = `
            <span class="char-label">'${displayChar}'</span>
            <span class="char-binary">${charBin}</span>
        `;
        charBreakdown.appendChild(item);
    }
}

function updateEncodingGuide(encoding) {
    const info = encodingInfo[encoding];

    encodingTitle.textContent = info.shortTitle;
    encodingRuleName.textContent = info.shortTitle;

    encodingRules.innerHTML = info.rules.map(rule => `<li>${rule}</li>`).join('');
    guideSteps.innerHTML = info.steps.map(step => `<li>${step}</li>`).join('');
}

// ===================================
// Event Handlers
// ===================================

// Character count
nameInput.addEventListener('input', () => {
    charCount.textContent = nameInput.value.length;
});

// Convert button
convertBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();

    if (!name) {
        showToast('Please enter a name first!');
        nameInput.focus();
        return;
    }

    const encoding = getSelectedEncoding();
    currentBinary = stringToBinary(name);

    // Update UI
    updateBinaryDisplay(name, currentBinary);
    updateEncodingGuide(encoding);
    drawWaveform(currentBinary, encoding);

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Encoding change
document.querySelectorAll('input[name="encoding"]').forEach(radio => {
    radio.addEventListener('change', () => {
        if (currentBinary) {
            const encoding = getSelectedEncoding();
            updateEncodingGuide(encoding);
            drawWaveform(currentBinary, encoding);
        }
    });
});

// Copy binary
copyBinaryBtn.addEventListener('click', () => {
    if (currentBinary) {
        navigator.clipboard.writeText(currentBinary).then(() => {
            showToast('Binary copied to clipboard!');
        });
    }
});

// Zoom controls
zoomInBtn.addEventListener('click', () => {
    if (currentZoom < MAX_ZOOM) {
        currentZoom = Math.min(MAX_ZOOM, currentZoom + 0.25);
        if (currentBinary) {
            drawWaveform(currentBinary, getSelectedEncoding());
        }
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (currentZoom > MIN_ZOOM) {
        currentZoom = Math.max(MIN_ZOOM, currentZoom - 0.25);
        if (currentBinary) {
            drawWaveform(currentBinary, getSelectedEncoding());
        }
    }
});

// Download canvas as image
downloadBtn.addEventListener('click', () => {
    if (!currentBinary) {
        showToast('Generate a waveform first!');
        return;
    }

    const link = document.createElement('a');
    link.download = `signal-waveform-${getSelectedEncoding()}.png`;
    link.href = waveformCanvas.toDataURL('image/png');
    link.click();

    showToast('Image downloaded!');
});

// Enter key to convert
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        convertBtn.click();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateEncodingGuide('nrz');
    nameInput.focus();
});
