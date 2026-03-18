setTimeout(function() {

// ─── STORAGE ────────────────────────────────────────────────────────────────
function saveData(key, value) {
    try { localStorage.setItem('dt_' + key, JSON.stringify(value)); } catch(e) {}
}
function loadData(key) {
    try {
        var v = localStorage.getItem('dt_' + key);
        return v !== null ? JSON.parse(v) : null;
    } catch(e) { return null; }
}

// ─── AUDIO ──────────────────────────────────────────────────────────────────
var audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
}
function playTone(freq, duration, type, vol, delay) {
    if (!audioCtx) return;
    var osc  = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type || 'sine';
    var t = audioCtx.currentTime + (delay || 0);
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
}
function playClick() {
    if (!audioCtx) return;
    playTone(1040, 0.055, 'sine', 0.08);
    playTone(780,  0.07,  'sine', 0.04, 0.025);
}
function playError() {
    if (!audioCtx) return;
    var osc  = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
}
function playWin() {
    if (!audioCtx) return;
    [523, 659, 784, 1047].forEach(function(f, i) {
        playTone(f, 0.18, 'sine', 0.1, i * 0.08);
    });
}

// ─── CANVAS COLORS ───────────────────────────────────────────────────────────
var DEFAULT_THEME = {
    bg: '#0a0a14',
    panel: '#12101f',
    accent: '#c84bff',
    score: '#e040fb',
    boardTile: '#ffffff',
    ice: '#64b5f6',
    danger: '#ff4444',
    grid: '#b450ff',
    crosshair: '#00f0ff'
};

function isValidHexColor(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeHex(value, fallback) {
    return isValidHexColor(value) ? value.toLowerCase() : fallback;
}

function normalizeTheme(theme) {
    theme = theme || {};
    return {
        bg: normalizeHex(theme.bg, DEFAULT_THEME.bg),
        panel: normalizeHex(theme.panel, DEFAULT_THEME.panel),
        accent: normalizeHex(theme.accent, DEFAULT_THEME.accent),
        score: normalizeHex(theme.score, DEFAULT_THEME.score),
        boardTile: normalizeHex(theme.boardTile, DEFAULT_THEME.boardTile),
        ice: normalizeHex(theme.ice, DEFAULT_THEME.ice),
        danger: normalizeHex(theme.danger, DEFAULT_THEME.danger),
        grid: normalizeHex(theme.grid, DEFAULT_THEME.grid),
        crosshair: normalizeHex(theme.crosshair, DEFAULT_THEME.crosshair)
    };
}

function hexToRgb(hex) {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
    };
}

function rgbaFromHex(hex, alpha) {
    var rgb = hexToRgb(hex);
    return 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + alpha + ')';
}

var THEME = normalizeTheme(loadData('theme'));
var TILE_COLOR      = THEME.boardTile;
var TILE_GLOW       = rgbaFromHex(THEME.boardTile, 0.85);
var GRID_COLOR      = rgbaFromHex(THEME.grid, 0.45);
var ERROR_COLOR     = THEME.danger;
var CROSSHAIR_COLOR = THEME.crosshair;

// ─── STATE ───────────────────────────────────────────────────────────────────
var PatRec  = loadData('recordsP')    || [];
var FreRec  = loadData('records')     || [];
var SoloRec = loadData('recordsSolo') || [];
var GRID_SIZE = loadData('gridSize') || 4;
var WHITE_COUNT_DEFAULTS = { 3: 1, 4: 3, 5: 5, 6: 8 };
var GRID_WHITE_COUNTS = loadData('gridWhiteCounts') || {};

var key;
var timerGO   = null;
var Bonus     = 0;
var TimeL     = 0;
var waitingStart = true;
var sc = 0, B5;
var Time     = document.createElement("div");
var PressKey = document.createElement("div");
var Score    = document.createElement("div");
var Errr     = 0;
var timerWent = true;
var cx, cy, CoX, CoY;
var horT, verT, n = 0;
var OtherTiles = [];
var good = 1;
var cXX, cYY;
var horiAr = [];
var vertAr = [];
var canvasB  = document.createElement('canvas');
var canvas   = document.createElement('canvas');
var context;
var ZoomI, wOLD, cXXo, cYYo;
var slider = document.createElement('input');
var div    = document.createElement('div');
var zom    = document.createElement('div');
var themeToggle = document.createElement("BUTTON");
var themePanel  = document.createElement("div");
var whiteCountB = document.createElement("BUTTON");
var sqsizeD = Math.round(window.innerHeight * 0.108);
var sqsize;
var button  = document.createElement("BUTTON");
var Patt;
var w, x0, x1, y1;

// Solo mode state
var soloX = 0, soloY = 0;

var storedZoom = loadData('zoom');
var ZoomN      = storedZoom !== null ? parseInt(storedZoom, 10) : 100;
var storedPatt = loadData('patt');

function applyTheme(theme) {
    var root = document.documentElement.style;
    THEME = normalizeTheme(theme);
    TILE_COLOR      = THEME.boardTile;
    TILE_GLOW       = rgbaFromHex(THEME.boardTile, 0.85);
    GRID_COLOR      = rgbaFromHex(THEME.grid, 0.45);
    ERROR_COLOR     = THEME.danger;
    CROSSHAIR_COLOR = THEME.crosshair;

    root.setProperty('--bg', THEME.bg);
    root.setProperty('--bg-aura-1', rgbaFromHex(THEME.accent, 0.2));
    root.setProperty('--bg-aura-2', rgbaFromHex(THEME.ice, 0.12));
    root.setProperty('--panel-solid', THEME.panel);
    root.setProperty('--purple', THEME.accent);
    root.setProperty('--purple-dim', rgbaFromHex(THEME.accent, 0.12));
    root.setProperty('--purple-border', rgbaFromHex(THEME.accent, 0.32));
    root.setProperty('--purple-glow', rgbaFromHex(THEME.accent, 0.45));
    root.setProperty('--ice', THEME.ice);
    root.setProperty('--tile', THEME.score);
    root.setProperty('--board-tile', THEME.boardTile);
    root.setProperty('--danger', THEME.danger);
    root.setProperty('--text-muted', rgbaFromHex(THEME.ice, 0.5));
    root.setProperty('--score-glow', rgbaFromHex(THEME.score, 0.35));
    root.setProperty('--ice-glow', rgbaFromHex(THEME.ice, 0.35));
    root.setProperty('--ice-soft', rgbaFromHex(THEME.ice, 0.55));
    root.setProperty('--accent-soft', rgbaFromHex(THEME.accent, 0.35));
    root.setProperty('--hint-color', rgbaFromHex(THEME.accent, 0.4));
    root.setProperty('--patr-color', rgbaFromHex(THEME.accent, 0.25));
    root.setProperty('--timer-soft', rgbaFromHex('#ffffff', 0.2));
    root.setProperty('--danger-soft', rgbaFromHex(THEME.danger, 0.65));
    root.setProperty('--danger-glow', rgbaFromHex(THEME.danger, 0.3));

    if (div && div.style) {
        div.style.backgroundColor = THEME.panel;
        div.style.boxShadow = '0 0 40px ' + rgbaFromHex(THEME.accent, 0.12);
    }
    if (context && canvas && canvas.width) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        CanvasLines();
    }
    if (typeof CanvasBlack === 'function' &&
        typeof contextB !== 'undefined' &&
        contextB &&
        canvasB &&
        canvasB.width) {
        CanvasBlack();
    }
}

function saveTheme() {
    saveData('theme', THEME);
}

function isInteractiveThemeTarget(target) {
    if (!target || !target.classList || !target.closest) { return false; }
    return target === themeToggle ||
           target === themePanel ||
           target.id === 'themeReset' ||
           target.classList.contains('theme-color') ||
           target.closest('#themePanel');
}

function clampWhiteCount(gridSize, count) {
    var maxTiles = Math.max(1, gridSize * gridSize - 1);
    var parsed = parseInt(count, 10);
    if (isNaN(parsed)) { parsed = WHITE_COUNT_DEFAULTS[gridSize] || 1; }
    return Math.max(1, Math.min(maxTiles, parsed));
}

function getWhiteTileCount(gridSize) {
    var size = gridSize || GRID_SIZE;
    var saved = GRID_WHITE_COUNTS[size];
    var count = clampWhiteCount(size, saved);
    GRID_WHITE_COUNTS[size] = count;
    return count;
}

function saveWhiteCounts() {
    saveData('gridWhiteCounts', GRID_WHITE_COUNTS);
}

function syncWhiteCountButton() {
    if (!whiteCountB) { return; }
    whiteCountB.innerHTML = 'WHITES ' + getWhiteTileCount();
}

function buildUniqueTileSet(count) {
    var used = {};
    var xs = [];
    var ys = [];
    while (xs.length < count) {
        var x = rnd();
        var y = rnd();
        var key = x + ',' + y;
        if (!used[key]) {
            used[key] = true;
            xs.push(x);
            ys.push(y);
        }
    }
    return { xs: xs, ys: ys };
}

function resetCurrentModePreview() {
    if (Patt === 0) { Refresh(1); }
    else if (Patt === 1) { RefrePP(1); }
    else { RefreshSolo(1); }
}

// ─── ZOOM / GRID SETUP ───────────────────────────────────────────────────────
function SetCzoom() {
    var baseCell = Math.round(sqsizeD * ZoomN / 100);
    w      = Math.round(baseCell * 4);
    sqsize = Math.round(w / GRID_SIZE);
    x0     = Math.round(window.innerWidth / 2 - w / 2);
    x1     = w;
    y1     = w;
}

if (storedZoom !== null) {
    SetCzoom();
    zom.innerHTML = "-" + ZoomN + "+";
} else {
    w      = Math.round(sqsizeD * 4);
    sqsize = Math.round(w / GRID_SIZE);
    x0     = Math.round(window.innerWidth / 2 - w / 2);
    x1     = w;
    y1     = w;
    zom.innerHTML = "-Zoom+";
}

// ─── MAIN BOARD DIV ──────────────────────────────────────────────────────────
div.id                    = "basis";
div.style.display         = "block";
div.style.position        = 'absolute';
div.style.cursor          = 'crosshair';
div.style.width           = w + 'px';
div.style.height          = Math.round(w * 1.5) + 'px';
div.style.left            = x0 + "px";
div.style.top             = "0px";
div.style.backgroundColor = '#12101f';
div.style.boxShadow       = '0 0 40px rgba(140, 0, 220, 0.12)';
div.style.pointerEvents   = 'none';
document.body.appendChild(div);
applyTheme(THEME);

// ─── ZOOM LABEL ──────────────────────────────────────────────────────────────
zom.id              = "zom";
zom.style.display   = "block";
zom.style.width     = "185px";
zom.style.position  = "absolute";
zom.style.top       = "18px";
zom.style.left      = "20px";
zom.style.zIndex    = "30";
zom.style.pointerEvents = 'none';
zom.style.textAlign = "center";
document.body.appendChild(zom);

// ─── ZOOM SLIDER ─────────────────────────────────────────────────────────────
slider.id    = "slider";
slider.type  = 'range';
slider.min   = 10;
slider.max   = 200;
slider.value = ZoomN;
slider.step  = 2;
slider.style.position = 'absolute';
slider.style.top      = '44px';
slider.style.left     = '20px';
slider.style.zIndex   = '30';
document.body.appendChild(slider);
slider.addEventListener("input", Zoom);

// ─── GRID SIZE BUTTONS ───────────────────────────────────────────────────────
var gridBtns = document.createElement('div');
gridBtns.id = 'gridBtns';
gridBtns.style.position = 'absolute';
gridBtns.style.top      = '88px';
gridBtns.style.left     = '20px';
gridBtns.style.zIndex   = '30';
document.body.appendChild(gridBtns);

[3, 4, 5, 6].forEach(function(sz) {
    var b = document.createElement('button');
    b.textContent = sz + '\xD7' + sz;
    b.className   = 'grid-btn' + (GRID_SIZE === sz ? ' active' : '');
    b.setAttribute('data-size', sz);
    b.addEventListener('click', function() { setGridSize(sz); b.blur(); });
    gridBtns.appendChild(b);
});

whiteCountB.id = "whiteCount";
whiteCountB.style.position = 'absolute';
whiteCountB.style.top      = '228px';
whiteCountB.style.left     = '20px';
whiteCountB.style.zIndex   = '35';
document.body.appendChild(whiteCountB);
syncWhiteCountButton();
whiteCountB.addEventListener('click', function() {
    var maxTiles = Math.max(1, GRID_SIZE * GRID_SIZE - 1);
    GRID_WHITE_COUNTS[GRID_SIZE] = getWhiteTileCount() + 1;
    if (GRID_WHITE_COUNTS[GRID_SIZE] > maxTiles) {
        GRID_WHITE_COUNTS[GRID_SIZE] = 1;
    }
    GRID_WHITE_COUNTS[GRID_SIZE] = clampWhiteCount(GRID_SIZE, GRID_WHITE_COUNTS[GRID_SIZE]);
    saveWhiteCounts();
    syncWhiteCountButton();
    resetCurrentModePreview();
    whiteCountB.blur();
});

function setGridSize(sz) {
    GRID_SIZE = sz;
    saveData('gridSize', sz);
    sqsize = Math.round(w / GRID_SIZE);
    document.querySelectorAll('.grid-btn').forEach(function(b) {
        b.classList.toggle('active', Number(b.getAttribute('data-size')) === sz);
    });
    syncWhiteCountButton();
    context.clearRect(0, 0, canvas.width, canvas.height);
    CanvasLines();
    resetCurrentModePreview();
}

// ─── MODE BUTTON ─────────────────────────────────────────────────────────────
button.innerHTML      = "PATTERNS";
document.body.appendChild(button);
button.id             = "switch";
button.style.display  = "block";
button.style.position = 'absolute';
button.style.top      = '132px';
button.style.left     = '20px';
button.style.zIndex   = '35';

// ─── PATREON LINK ────────────────────────────────────────────────────────────
var patr = document.createElement("a");
patr.innerHTML = '<a id="patr" title="Patreon support" target="_blank" rel="noopener noreferrer" href="https://www.patreon.com/ultrachess" style="display:block;position:absolute;top:95%;left:20px;">Patreon support</a>';
document.body.appendChild(patr);

// ─── RECORDS BUTTON ──────────────────────────────────────────────────────────
var recordsB = document.createElement("BUTTON");
recordsB.innerHTML      = "RECORDS";
document.body.appendChild(recordsB);
recordsB.id             = "records";
recordsB.style.display  = "block";
recordsB.style.position = 'absolute';
recordsB.style.top      = '180px';
recordsB.style.left     = '20px';
recordsB.style.zIndex   = '35';

var Rec   = document.createElement("div");
var RecSh = 1;
var recData = loadData('rec');
if (recData !== null) { RecSh = parseInt(recData, 10); }
if (RecSh === 1) { Rec.style.display = "block"; } else { Rec.style.display = "none"; }
recordsB.addEventListener("click", function() {
    if (RecSh === 1) { Rec.style.display = "none";  RecSh = 0; saveData('rec', 0); }
    else             { Rec.style.display = "block"; RecSh = 1; saveData('rec', 1); }
});

Rec.id                  = "listR";
Rec.style.position      = 'absolute';
Rec.style.top           = "35px";
Rec.style.left          = "0px";
Rec.style.zIndex        = 11;
Rec.style.width         = '185px';
Rec.style.pointerEvents = 'none';
recordsB.appendChild(Rec);

themeToggle.innerHTML      = "COLORS";
themeToggle.id             = "themeToggle";
themeToggle.style.top      = '20px';
themeToggle.style.right    = '20px';
themeToggle.style.zIndex   = '35';
document.body.appendChild(themeToggle);

themePanel.id           = "themePanel";
themePanel.style.top    = '68px';
themePanel.style.right  = '20px';
themePanel.style.zIndex = '45';
document.body.appendChild(themePanel);

var THEME_FIELDS = [
    { key: 'bg', label: 'Background' },
    { key: 'panel', label: 'Panel' },
    { key: 'accent', label: 'Accent' },
    { key: 'score', label: 'Score' },
    { key: 'boardTile', label: 'Tiles' },
    { key: 'ice', label: 'Hi-score' },
    { key: 'danger', label: 'Danger' },
    { key: 'grid', label: 'Grid' },
    { key: 'crosshair', label: 'Crosshair' }
];

var THEME_PRESETS = [
    {
        id: 'neon',
        label: 'Neon',
        theme: {
            bg: '#0a0a14',
            panel: '#12101f',
            accent: '#c84bff',
            score: '#e040fb',
            boardTile: '#ffffff',
            ice: '#64b5f6',
            danger: '#ff4444',
            grid: '#b450ff',
            crosshair: '#00f0ff'
        }
    },
    {
        id: 'sunset',
        label: 'Sunset',
        theme: {
            bg: '#161018',
            panel: '#261826',
            accent: '#ff7a59',
            score: '#ffb347',
            boardTile: '#fff3e8',
            ice: '#ffd166',
            danger: '#ff4d6d',
            grid: '#ff8c42',
            crosshair: '#ffe29a'
        }
    },
    {
        id: 'royal',
        label: 'Royal',
        theme: {
            bg: '#0d1020',
            panel: '#181d37',
            accent: '#7c5cff',
            score: '#b08cff',
            boardTile: '#f6f2ff',
            ice: '#70b8ff',
            danger: '#ff5d73',
            grid: '#8f6bff',
            crosshair: '#d0c2ff'
        }
    },
    {
        id: 'lava',
        label: 'Lava',
        theme: {
            bg: '#160b08',
            panel: '#261310',
            accent: '#ff7b00',
            score: '#ffb000',
            boardTile: '#fff4d6',
            ice: '#ffd166',
            danger: '#ff3b30',
            grid: '#ff6a00',
            crosshair: '#ffe066'
        }
    },
    {
        id: 'ice',
        label: 'Ice',
        theme: {
            bg: '#07131d',
            panel: '#0f2433',
            accent: '#62d0ff',
            score: '#8af5ff',
            boardTile: '#f4feff',
            ice: '#79a8ff',
            danger: '#ff5f7a',
            grid: '#4fc3f7',
            crosshair: '#b8ffff'
        }
    },
    {
        id: 'mint',
        label: 'Mint',
        theme: {
            bg: '#091411',
            panel: '#11211d',
            accent: '#4dd4ac',
            score: '#8ef6cf',
            boardTile: '#f3fff9',
            ice: '#89e3ff',
            danger: '#ff6b6b',
            grid: '#42c99a',
            crosshair: '#d7fff0'
        }
    },
    {
        id: 'rose',
        label: 'Rose',
        theme: {
            bg: '#170d14',
            panel: '#271421',
            accent: '#ff6fae',
            score: '#ff9cc6',
            boardTile: '#fff4fa',
            ice: '#ffd0e2',
            danger: '#ff4f6d',
            grid: '#ff77b4',
            crosshair: '#ffe2f0'
        }
    },
    {
        id: 'matrix',
        label: 'Matrix',
        theme: {
            bg: '#040b05',
            panel: '#0c1610',
            accent: '#33ff88',
            score: '#72ffb4',
            boardTile: '#ecfff5',
            ice: '#9fffcf',
            danger: '#ff4d6d',
            grid: '#1ed760',
            crosshair: '#d4ffe5'
        }
    },
    {
        id: 'amber',
        label: 'Amber',
        theme: {
            bg: '#171105',
            panel: '#281d0b',
            accent: '#ffbf3f',
            score: '#ffd86b',
            boardTile: '#fff8e6',
            ice: '#ffe39a',
            danger: '#ff6f3c',
            grid: '#f7b733',
            crosshair: '#fff0ba'
        }
    },
    {
        id: 'ocean',
        label: 'Ocean',
        theme: {
            bg: '#08131b',
            panel: '#102432',
            accent: '#2ec4ff',
            score: '#78e3ff',
            boardTile: '#f1fbff',
            ice: '#8db8ff',
            danger: '#ff6474',
            grid: '#3ba7d8',
            crosshair: '#c6f3ff'
        }
    },
    {
        id: 'violet',
        label: 'Violet',
        theme: {
            bg: '#120d1d',
            panel: '#201532',
            accent: '#a66cff',
            score: '#cf9cff',
            boardTile: '#faf5ff',
            ice: '#c1b5ff',
            danger: '#ff5c8a',
            grid: '#9b6dff',
            crosshair: '#eadbff'
        }
    },
    {
        id: 'carbon',
        label: 'Carbon',
        theme: {
            bg: '#0d0f12',
            panel: '#1a1f24',
            accent: '#8aa1b1',
            score: '#d4e4ef',
            boardTile: '#ffffff',
            ice: '#a9c4d5',
            danger: '#ff5a5f',
            grid: '#6f8798',
            crosshair: '#f0fbff'
        }
    }
];

function syncThemeInputs() {
    themePanel.querySelectorAll('.theme-color').forEach(function(input) {
        var themeKey = input.getAttribute('data-theme-key');
        input.value = THEME[themeKey];
    });
}

function setThemeAndPersist(theme) {
    THEME = normalizeTheme(theme);
    syncThemeInputs();
    applyTheme(THEME);
    saveTheme();
}

var themeMarkup = '<div class="theme-head">' +
    '<div class="theme-title">Theme Lab</div>' +
    '<button id="themeReset" type="button">RESET</button>' +
    '</div><div class="preset-wrap">';

for (var tp = 0; tp < THEME_PRESETS.length; tp++) {
    themeMarkup += '<button class="theme-preset" type="button" data-preset="' + THEME_PRESETS[tp].id + '">' + THEME_PRESETS[tp].label + '</button>';
}

themeMarkup += '</div><div class="theme-grid">';

for (var tf = 0; tf < THEME_FIELDS.length; tf++) {
    themeMarkup += '<div class="theme-row">' +
        '<label for="theme_' + THEME_FIELDS[tf].key + '">' + THEME_FIELDS[tf].label + '</label>' +
        '<input class="theme-color" id="theme_' + THEME_FIELDS[tf].key + '" data-theme-key="' + THEME_FIELDS[tf].key + '" type="color" value="' + THEME[THEME_FIELDS[tf].key] + '">' +
        '</div>';
}
themeMarkup += '</div>';
themePanel.innerHTML = themeMarkup;

themeToggle.addEventListener('click', function() {
    themePanel.classList.toggle('visible');
    themeToggle.blur();
});

themePanel.querySelectorAll('.theme-color').forEach(function(input) {
    input.addEventListener('input', function() {
        THEME[input.getAttribute('data-theme-key')] = input.value.toLowerCase();
        applyTheme(THEME);
        saveTheme();
    });
});

themePanel.querySelectorAll('.theme-preset').forEach(function(buttonEl) {
    buttonEl.addEventListener('click', function() {
        for (var i = 0; i < THEME_PRESETS.length; i++) {
            if (THEME_PRESETS[i].id === buttonEl.getAttribute('data-preset')) {
                setThemeAndPersist(THEME_PRESETS[i].theme);
                break;
            }
        }
    });
});

document.getElementById('themeReset').addEventListener('click', function() {
    setThemeAndPersist(DEFAULT_THEME);
});

// ─── RECORD LIST RENDERERS ───────────────────────────────────────────────────
function FreList() {
    Rec.innerHTML = "FRENZY:<br>";
    for (var z = 0; z < FreRec.length; z++) {
        Rec.innerHTML += FreRec[z].record + " \u2014 " + FreRec[z].date + "<br>";
    }
}
function PatList() {
    Rec.innerHTML = "PATTERNS:<br>";
    for (var i = 0; i < PatRec.length; i++) {
        Rec.innerHTML += PatRec[i].record + " \u2014 " + PatRec[i].date + "<br>";
    }
}
function SoloList() {
    Rec.innerHTML = "SOLO:<br>";
    for (var z = 0; z < SoloRec.length; z++) {
        Rec.innerHTML += SoloRec[z].record + " \u2014 " + SoloRec[z].date + "<br>";
    }
}

// ─── GAME-OVER OVERLAY ───────────────────────────────────────────────────────
var gameOverlay                    = document.createElement("div");
gameOverlay.id                     = "gameOverlay";
gameOverlay.style.position         = 'absolute';
gameOverlay.style.top              = '0';
gameOverlay.style.left             = '0';
gameOverlay.style.width            = '100%';
gameOverlay.style.height           = '100%';
gameOverlay.style.zIndex           = '50';
gameOverlay.style.display          = 'none';
gameOverlay.style.flexDirection    = 'column';
gameOverlay.style.alignItems       = 'center';
gameOverlay.style.justifyContent   = 'center';
gameOverlay.style.pointerEvents    = 'none';
div.appendChild(gameOverlay);

var overlayTimer = null;
function showGameOver(scoreText, label, isWin) {
    if (overlayTimer) { clearTimeout(overlayTimer); }
    var cls  = isWin ? 'go-title win' : 'go-title';
    var head = isWin ? 'COMPLETE'     : 'GAME OVER';
    gameOverlay.innerHTML =
        '<div class="' + cls  + '">' + head     + '</div>' +
        '<div class="go-score">'    + scoreText + '</div>' +
        '<div class="go-label">'    + label     + '</div>' +
        '<div class="go-hint">PRESS ANY KEY</div>';
    gameOverlay.style.display = 'flex';
    overlayTimer = setTimeout(function() {
        gameOverlay.style.display = 'none';
    }, 2200);
}
function hideOverlay() {
    if (overlayTimer) { clearTimeout(overlayTimer); overlayTimer = null; }
    gameOverlay.style.display = 'none';
}

// ─── MODE LABELS (next mode shown on button) ─────────────────────────────────
var MODE_NEXT_LABEL = ['PATTERNS', 'SOLO', 'FRENZY'];

// ─── MODE SWITCH BUTTON ──────────────────────────────────────────────────────
var PatAm  = 15;
var hopX   = [], hopY = [];
var Pround = 0;
var CPX, CPY, noErr = 0;

button.addEventListener("click", function() {
    horiAr = [];
    vertAr = [];
    hopX   = [];
    hopY   = [];
    canvas.removeEventListener("mousedown", ClickTile);
    canvas.removeEventListener("mousedown", ClickPattern);
    canvas.removeEventListener("mousedown", ClickSolo);
    Patt = (Patt + 1) % 3;
    saveData('patt', Patt);
    button.innerText = MODE_NEXT_LABEL[Patt];
    if (Patt === 0) {
        canvas.addEventListener("mousedown", ClickTile);
        Refresh(1);
        FreList();
    } else if (Patt === 1) {
        canvas.addEventListener("mousedown", ClickPattern);
        RefrePP(1);
        PatList();
    } else {
        canvas.addEventListener("mousedown", ClickSolo);
        RefreshSolo(1);
        SoloList();
    }
    button.blur();
});

// ─── PATTERN MODE ────────────────────────────────────────────────────────────
function ClickPattern(event) {
    if (isRestartPrompt()) {
        startCurrentMode('mouse');
        return;
    }
    cx = event.clientX;
    cy = event.clientY;
    if (PatAm > 0 && Errr === 0) {
        if (waitingStart) { waitingStart = false; }
        var shouldStartPatternTimer = !timerWenP;
        var patternHit = calculatePat();
        if (patternHit && shouldStartPatternTimer) { TimerPAT(); }
    }
}

function calculatePat() {
    CPX   = Math.floor((cx - x0) / sqsize);
    CPY   = Math.floor((cy - w / 4) / sqsize);
    noErr = 1;
    for (var i = 0; i < Pround; i++) {
        if (CPX === hopX[i] && CPY === hopY[i]) {
            Pround--;
            hopX.splice(i, 1);
            hopY.splice(i, 1);
            DrawBlackPat();
            playClick();
            noErr = 0;
            break;
        }
    }
    if (noErr === 1) {
        Errr = 1;
        cXX  = cx - x0;
        cYY  = cy - w / 4;
        CoX  = CPX;
        CoY  = CPY;
        DrawError();
        wOLD = w; cXXo = cXX; cYYo = cYY;
        playError();
        showGameOver(TimeP + 's', PatAm + ' LEFT', false);
    }
    if (Pround === 0) {
        PatAm--;
        if (PatAm === 0) {
            clearInterval(timerGP);
            PressKey.innerHTML = "Press a key to start";
            exactPat           = performance.now() - exactPat;
            Time.innerHTML     = Math.round(exactPat) / 1000;
            playWin();
            FreP();
            showGameOver(Math.round(exactPat) / 1000 + 's', 'ALL PATTERNS', true);
        } else {
            drawPAT();
            PressKey.innerHTML = PatAm;
        }
    }
    return noErr === 0;
}

var TimeP, timerWenP;
var timerGP  = null;
var exactPat;

function FreP() {
    var today = new Date();
    PatRec.push({ record: Math.round(exactPat) / 1000, date: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() });
    PatRec.sort(function(a, b) { return a.record > b.record ? 1 : -1; });
    if (PatRec.length > 10) { PatRec.length = 10; }
    saveData('recordsP', PatRec);
    PatList();
}

function RefrePP(p) {
    hideOverlay();
    good = 1; Errr = 0;
    waitingStart = true;
    Score.innerHTML = "&nbsp;";
    Best.innerHTML  = PatRec.length > 0 ? "HI-SCORE<br>" + PatRec[0].record : "HI-SCORE<br>-";
    Time.innerHTML  = "0";
    Time.classList.remove('urgent');
    clearInterval(timerGO);
    timerWent = true;
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    clearInterval(timerGP);
    timerWenP = false;
    TimeP = 0;
    PatAm = 15;
    drawPAT();
    PressKey.innerHTML = "Tap pattern to start";
}

function TimerPAT() {
    exactPat  = performance.now();
    timerWenP = true;
    timerGP   = setInterval(function() {
        TimeP          = Math.round((TimeP + 0.1) * 10) / 10;
        Time.innerHTML = TimeP;
        if (Errr === 1) {
            clearInterval(timerGP);
            PressKey.innerHTML = "Press a key to start";
            Time.innerHTML    += '(' + PatAm + ' left)';
        }
    }, 100);
}

function drawPAT() {
    var patternTiles = buildUniqueTileSet(getWhiteTileCount());
    hopX = patternTiles.xs;
    hopY = patternTiles.ys;
    Pround = hopX.length;
    DrawBlackPat();
}

function DrawBlackPat() {
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    contextB.shadowBlur  = 14;
    contextB.shadowColor = TILE_GLOW;
    contextB.fillStyle   = TILE_COLOR;
    contextB.beginPath();
    for (var i = 0; i < hopX.length; i++) {
        contextB.rect(hopX[i] * sqsize, hopY[i] * sqsize, sqsize, sqsize);
    }
    contextB.fill();
    contextB.closePath();
    contextB.shadowBlur = 0;
}

// ─── SOLO MODE ───────────────────────────────────────────────────────────────
function ClickSolo(event) {
    if (isRestartPrompt()) {
        startCurrentMode('mouse');
        return;
    }
    cx = event.clientX;
    cy = event.clientY;
    if (TimeL > 0 && Errr === 0) {
        if (waitingStart) { waitingStart = false; }
        var shouldStartSoloTimer = !timerWent;
        var soloHit = DrawSquaresSolo();
        if (soloHit && shouldStartSoloTimer) { Timer(); }
    }
}

function DrawSquaresSolo() {
    CoX = Math.floor((cx - x0) / sqsize);
    CoY = Math.floor((cy - w / 4) / sqsize);
    if (CoX === soloX && CoY === soloY) {
        var px = soloX, py = soloY;
        do { soloX = rnd(); soloY = rnd(); } while (soloX === px && soloY === py);
        DrawSolo();
        if (Bonus < 92) { Bonus += 8; } else { Bonus = 100; }
        playClick();
        CalculateScore();
        return true;
    } else {
        Errr = 1;
        cXX  = cx - x0;
        cYY  = cy - w / 4;
        DrawError();
        wOLD = w; cXXo = cXX; cYYo = cYY;
        playError();
        showGameOver(sc, 'SCORE', false);
        return false;
    }
}

function DrawSolo() {
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    contextB.shadowBlur  = 14;
    contextB.shadowColor = TILE_GLOW;
    contextB.fillStyle   = TILE_COLOR;
    contextB.fillRect(soloX * sqsize, soloY * sqsize, sqsize, sqsize);
    contextB.shadowBlur = 0;
}

function RefreshSolo(p) {
    hideOverlay();
    Bonus = 0;
    waitingStart = true;
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    sc = 0; good = 1; Errr = 0;
    Score.innerHTML = "0";
    Time.innerHTML  = "30";
    Time.classList.remove('urgent');
    Best.innerHTML  = SoloRec.length > 0 ? "HI-SCORE<br>" + SoloRec[0].record : "HI-SCORE<br>-";
    clearInterval(timerGP);
    clearInterval(timerGO);
    timerWent = false;
    TimeL = 30;
    soloX = rnd(); soloY = rnd();
    DrawSolo();
    PressKey.innerHTML = "Tap white to start";
}

function SoloR() {
    var today = new Date();
    SoloRec.push({ record: sc, date: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() });
    SoloRec.sort(function(a, b) { return a.record < b.record ? 1 : -1; });
    if (SoloRec.length > 10) { SoloRec.length = 10; }
    saveData('recordsSolo', SoloRec);
    SoloList();
}

// ─── HELPER ──────────────────────────────────────────────────────────────────
function rnd() { return Math.floor(Math.random() * GRID_SIZE); }

// ─── ZOOM HANDLER ────────────────────────────────────────────────────────────
document.documentElement.style.overflow = 'hidden';

function Zoom() {
    var sqsizeD = Math.round(window.innerHeight * 0.108);
    ZoomI      = slider.value;
    var baseCell = Math.round(sqsizeD * ZoomI / 100);
    w      = Math.round(baseCell * 4);
    sqsize = Math.round(w / GRID_SIZE);
    x0     = Math.round(window.innerWidth / 2 - w / 2);
    x1     = w; y1 = w;
    context.clearRect(0, 0, canvas.width, canvas.height);
    CanvasLines();
    CanvasBlack();
    div.style.width  = w + 'px';
    div.style.height = Math.round(w * 1.5) + 'px';
    div.style.left   = x0 + "px";
    div.style.top    = "0px";
    Score.style.top      = sqsize / 4 + "px";
    Score.style.fontSize = Math.round(sqsize / 1.4) + 'px';
    Time.style.padding   = sqsize / 8 + 'px';
    Time.style.top       = "0px";
    Time.style.fontSize  = Math.round(sqsize / 1.8) + 'px';
    if (Errr === 1) {
        cXX = cXXo / wOLD * w;
        cYY = cYYo / wOLD * w;
        DrawError();
    }
    PressKey.style.top      = w * 1.07 + "px";
    PressKey.style.fontSize = Math.round(sqsize / 3) + 'px';
    saveData('zoom', slider.value);
    if (x0 < 200) {
        slider.style.transform    = "rotate(90deg)";
        slider.style.marginTop    = "100px";
        slider.style.marginLeft   = "-80px";
        button.style.transform    = "rotate(90deg)";
        button.style.marginTop    = "200px";
        button.style.marginLeft   = "-80px";
        button.style.paddingRight = "20px";
        zom.style.marginLeft      = "-75px";
    } else {
        slider.style.transform = ""; slider.style.marginTop = ""; slider.style.marginLeft = "";
        button.style.transform = ""; button.style.marginTop = ""; button.style.marginLeft = "";
        button.style.paddingRight = ""; zom.style.marginLeft = "";
    }
    zom.innerHTML       = "-" + slider.value + "+";
    Best.style.left     = "75%";
    Best.style.top      = sqsize / 3.6 + "px";
    Best.style.fontSize = Math.round(sqsize / 5) + 'px';
}

window.addEventListener('resize', Zoom);

// ─── CANVAS A — GRID LINES ───────────────────────────────────────────────────
canvas.style.position = 'absolute';
canvas.style.zIndex   = 10;
canvas.style.cursor   = 'crosshair';
document.body.appendChild(canvas);
context = canvas.getContext('2d');

function CanvasLines() {
    canvas.width  = w;
    canvas.height = w;
    canvas.style.left = x0 + "px";
    canvas.style.top  = w / 4 + "px";
    context.lineWidth   = 1;
    context.strokeStyle = GRID_COLOR;
    context.beginPath();
    for (var i = 0; i <= GRID_SIZE; i++) {
        var p = i * sqsize - (i > 0 ? 0.5 : 0);
        context.moveTo(0, p); context.lineTo(w, p);
        context.moveTo(p, 0); context.lineTo(p, w);
    }
    context.stroke();
    context.closePath();
}

CanvasLines();

// ─── CANVAS B — TILES ────────────────────────────────────────────────────────
canvasB.style.position      = 'absolute';
canvasB.style.zIndex        = 9;
canvasB.style.pointerEvents = 'none';
document.body.appendChild(canvasB);
var contextB   = canvasB.getContext('2d');
canvasB.width  = w;
canvasB.height = w;
canvasB.style.left = x0 + "px";
canvasB.style.top  = w / 4 + "px";

function CanvasBlack() {
    canvasB.width  = w;
    canvasB.height = w;
    canvasB.style.left = x0 + "px";
    canvasB.style.top  = w / 4 + "px";
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    if      (Patt === 0) { DrawBlack(); }
    else if (Patt === 1) { DrawBlackPat(); }
    else                 { DrawSolo(); }
}

// ─── FRENZY MODE ─────────────────────────────────────────────────────────────
function Refresh(p) {
    hideOverlay();
    Bonus = 0;
    waitingStart = true;
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    sc = 0; good = 1; Errr = 0;
    Score.innerHTML = "0";
    Time.innerHTML  = "30";
    Time.classList.remove('urgent');
    Best.innerHTML  = FreRec.length > 0 ? "HI-SCORE<br>" + FreRec[0].record : "HI-SCORE<br>-";
    clearInterval(timerGP);
    clearInterval(timerGO);
    timerWent = false;
    TimeL = 30;
    var frenzyTiles = buildUniqueTileSet(getWhiteTileCount());
    horiAr = frenzyTiles.xs;
    vertAr = frenzyTiles.ys;
    DrawBlack();
    PressKey.innerHTML = "Tap white to start";
}

function DrawBlack() {
    contextB.clearRect(0, 0, canvasB.width, canvasB.height);
    contextB.shadowBlur  = 14;
    contextB.shadowColor = TILE_GLOW;
    contextB.fillStyle   = TILE_COLOR;
    contextB.beginPath();
    for (var i = 0; i < horiAr.length; i++) {
        contextB.rect(horiAr[i] * sqsize, vertAr[i] * sqsize, sqsize, sqsize);
    }
    contextB.fill();
    contextB.closePath();
    contextB.shadowBlur = 0;
}

function DrawSquares() {
    CoX = Math.floor((cx - x0) / sqsize);
    CoY = Math.floor((cy - w / 4) / sqsize);
    var hitTile = false;
    for (var i = 0; i < horiAr.length; i++) {
        if (horiAr[i] === CoX && vertAr[i] === CoY) {
            horT = horiAr[i]; verT = vertAr[i];
            do {
                horiAr[i] = rnd();
                vertAr[i] = rnd();
            } while (function() {
                for (var y = 0; y < horiAr.length; y++) {
                    if (i !== y && horiAr[i] === horiAr[y] && vertAr[i] === vertAr[y]) { return true; }
                }
                return horiAr[i] === horT && vertAr[i] === verT;
            }());
            DrawBlack();
            if (Bonus < 92) { Bonus += 8; } else { Bonus = 100; }
            playClick();
            CalculateScore();
            hitTile = true;
            break;
        }
    }
    if (!hitTile) {
        Errr = 1;
        cXX  = cx - x0;
        cYY  = cy - w / 4;
        DrawError();
        wOLD = w; cXXo = cXX; cYYo = cYY;
        playError();
        showGameOver(sc, 'SCORE', false);
    }
    return hitTile;
}

function DrawError() {
    contextB.shadowBlur  = 16;
    contextB.shadowColor = ERROR_COLOR;
    contextB.fillStyle   = ERROR_COLOR;
    contextB.fillRect(CoX * sqsize, CoY * sqsize, sqsize, sqsize);
    contextB.shadowBlur  = 0;
    contextB.lineWidth   = 1.5;
    contextB.strokeStyle = CROSSHAIR_COLOR;
    contextB.beginPath();
    contextB.moveTo(cXX - 6, cYY); contextB.lineTo(cXX + 6, cYY);
    contextB.moveTo(cXX, cYY - 6); contextB.lineTo(cXX, cYY + 6);
    contextB.stroke();
    contextB.closePath();
}

function FreR() {
    var today = new Date();
    FreRec.push({ record: sc, date: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() });
    FreRec.sort(function(a, b) { return a.record < b.record ? 1 : -1; });
    if (FreRec.length > 10) { FreRec.length = 10; }
    saveData('records', FreRec);
    FreList();
}

// ─── FRENZY CLICK HANDLER ────────────────────────────────────────────────────
function ClickTile(event) {
    if (isRestartPrompt()) {
        startCurrentMode('mouse');
        return;
    }
    cx = event.clientX;
    cy = event.clientY;
    if (TimeL > 0 && Errr === 0) {
        if (waitingStart) { waitingStart = false; }
        var shouldStartTimer = !timerWent;
        var hitTile = DrawSquares();
        if (hitTile && shouldStartTimer) { Timer(); }
    }
}

// ─── SCORE DISPLAY ───────────────────────────────────────────────────────────
Score.id                  = "score";
Score.innerHTML           = "0";
Score.style.top           = sqsize / 4 + "px";
Score.style.zIndex        = 11;
Score.style.pointerEvents = 'none';
Score.style.width         = '100%';
Score.style.textAlign     = "center";
Score.style.fontSize      = Math.round(sqsize / 1.4) + 'px';
div.appendChild(Score);

var Best = document.createElement("div");
Best.id                  = "best";
Best.innerHTML           = "HI-SCORE<br>-";
Best.style.position      = 'absolute';
Best.style.left          = "75%";
Best.style.top           = sqsize / 3.6 + "px";
Best.style.zIndex        = 11;
Best.style.marginTop     = "0px";
Best.style.pointerEvents = 'none';
Best.style.textAlign     = "center";
Best.style.fontSize      = Math.round(sqsize / 5) + 'px';
div.appendChild(Best);

PressKey.id                  = "PressKey";
PressKey.innerHTML           = "Press a key to start";
PressKey.style.position      = 'relative';
PressKey.style.top           = w * 1.07 + "px";
PressKey.style.zIndex        = 11;
PressKey.style.pointerEvents = 'none';
PressKey.style.width         = '100%';
PressKey.style.textAlign     = "center";
PressKey.style.fontSize      = Math.round(sqsize / 3) + 'px';
div.appendChild(PressKey);

Time.id                  = "time";
Time.innerHTML           = "30";
Time.style.position      = 'absolute';
Time.style.padding       = sqsize / 8 + 'px';
Time.style.top           = "0px";
Time.style.zIndex        = 11;
Time.style.pointerEvents = 'none';
Time.style.textAlign     = "left";
Time.style.fontSize      = Math.round(sqsize / 1.8) + 'px';
div.appendChild(Time);

// ─── SCORE CALCULATION ───────────────────────────────────────────────────────
function CalculateScore() {
    B5 = Math.ceil(Bonus / 20);
    sc = sc + B5;
    Score.innerHTML = sc;
    PressKey.innerHTML = B5;
    Score.classList.remove('score-pop');
    void Score.offsetWidth;
    Score.classList.add('score-pop');
}

// ─── FRENZY / SOLO TIMER ─────────────────────────────────────────────────────
function Timer() {
    timerWent = true;
    timerGO   = setInterval(function() {
        TimeL = parseFloat((TimeL - 0.1).toFixed(1));
        if (Bonus > 3) { Bonus = Math.round((Bonus - 3) * 10) / 10; } else { Bonus = 0.1; }
        PressKey.innerHTML = Math.ceil(Bonus / 20);
        Time.innerHTML     = TimeL;
        if (TimeL <= 5) { Time.classList.add('urgent'); }
        if (TimeL <= 0) {
            clearInterval(timerGO);
            Time.innerHTML = "0";
            Time.classList.remove('urgent');
            PressKey.innerHTML = "Press a key to start";
            playWin();
            if (Patt === 0) { FreR();  showGameOver(sc, 'SCORE', true); }
            else             { SoloR(); showGameOver(sc, 'SCORE', true); }
        }
        if (Errr === 1) {
            clearInterval(timerGO);
            Time.classList.remove('urgent');
            if (Patt === 0) { FreR(); } else { SoloR(); }
            PressKey.innerHTML = "Press a key to start";
        }
    }, 100);
}

// ─── KEYBOARD START ──────────────────────────────────────────────────────────
document.addEventListener("keydown", KeyPress);
function KeyPress(event) {
    initAudio();
    key = event.key;
    if      (Patt === 0) { Refresh(0); }
    else if (Patt === 1) { RefrePP(0); }
    else                 { RefreshSolo(0); }
}

function isWaitingToStart() {
    return waitingStart;
}

function isRestartPrompt() {
    return PressKey.innerHTML.indexOf('Press') !== -1;
}

function startCurrentMode(sourceKey) {
    if (!isRestartPrompt()) { return false; }
    initAudio();
    KeyPress({ key: sourceKey || 'start' });
    return true;
}

// ─── TOUCH SUPPORT ───────────────────────────────────────────────────────────
function getTouchPos(e) {
    var t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY };
}

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (isRestartPrompt() && startCurrentMode('touch')) { return; }
    initAudio();
    var pos = getTouchPos(e);
    cx = pos.clientX;
    cy = pos.clientY;
    if (Patt === 0) {
        if (TimeL > 0 && Errr === 0) {
            if (waitingStart) { waitingStart = false; }
            var frenzyShouldStartTimer = !timerWent;
            var frenzyHit = DrawSquares();
            if (frenzyHit && frenzyShouldStartTimer) { Timer(); }
        }
    } else if (Patt === 1) {
        if (PatAm > 0 && Errr === 0) {
            if (waitingStart) { waitingStart = false; }
            var patternShouldStartTimer = !timerWenP;
            var patternTouchHit = calculatePat();
            if (patternTouchHit && patternShouldStartTimer) { TimerPAT(); }
        }
    } else {
        if (TimeL > 0 && Errr === 0) {
            if (waitingStart) { waitingStart = false; }
            var soloShouldStartTimer = !timerWent;
            var soloTouchHit = DrawSquaresSolo();
            if (soloTouchHit && soloShouldStartTimer) { Timer(); }
        }
    }
}, { passive: false });

document.addEventListener('touchstart', function(e) {
    if (e.target !== canvas &&
        e.target !== button &&
        e.target !== recordsB &&
        e.target !== whiteCountB &&
        e.target !== slider &&
        !(e.target.classList && e.target.classList.contains('grid-btn')) &&
        !isInteractiveThemeTarget(e.target)) {
        startCurrentMode('touch');
    }
}, { passive: true });

// ─── MOUSE CLICK START ───────────────────────────────────────────────────────
// Clicking anywhere EXCEPT the canvas/buttons/slider starts the game
document.addEventListener("mousedown", function(e) {
    if (e.target === button ||
        e.target === recordsB ||
        e.target === whiteCountB ||
        e.target === slider ||
        e.target.classList.contains('grid-btn') ||
        isInteractiveThemeTarget(e.target)) return;
    startCurrentMode('mouse');
});

// ─── INITIAL MODE ────────────────────────────────────────────────────────────
if (storedPatt !== null) {
    // Cycle to stored mode: set Patt one step before so button.click() lands on it
    Patt = ((Number(storedPatt) - 1) + 3) % 3;
    button.click();
} else {
    Patt = 0;
    button.innerText = MODE_NEXT_LABEL[0];
    canvas.addEventListener("mousedown", ClickTile);
    Refresh(1);
    FreList();
}

}, 50);
