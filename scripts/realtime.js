// ============================================================
// Real-Time Wikipedia-to-Spatial-Audio
// ============================================================

// --- Global variables ---
let sceneEl, assetEl, sounds;
const d1 = 8;
const d2 = 8;
const dp = 6;
let x0 = 0, z = 0, z0 = 0;
let minX = 0, maxX = 0, minZ = 0;
const margin = 2;
const proxi = 2;
const announceProxi = 5;
let elCount = 0;
let checkCollide = false;
let collide = true;
let playing = true;
let started = false;
let welcomePlayed = false;
let lastUpTime = 0;
const doubleTapThreshold = 400;
let audioUnlocked = false;
let hit = false;

// --- TTS ---
let ttsMode = "webspeech";
let ttsVoice = null;
let ttsTotal = 0;
let ttsDone = 0;
var ttsTextMap = {};
var headingTextMap = {};
var lastAnnouncedId = null;
var lastAnnounceTime = 0;
var announceCooldown = 4000;

// Ambient audio
var ambientCtx = null;
var ambientGain = null;

// --- Feature 1: Footsteps ---
var footstepCtx = null;
var lastCamPos = { x: 0, z: 0 };
var footstepDistAccum = 0;
var footstepStepSize = 0.8;
var footstepBuffers = [];
var footstepGain = null;

// --- Feature 2: Section ambiences ---
var sectionAmbients = {};

// --- Feature 3: Distance filtering ---
// Volume scaling applied to TTS based on distance

// --- Feature 4: Where am I ---
// Tab key handler

// --- Feature 5: Dynamic clustering ---
var sectionWeights = {};

// --- Y level (all at same height for consistent audio) ---
var yLevel = 1.6;

// --- Home position (for Escape to return) ---
var homePos = { x: 0, y: 1.6, z: 0 };

// --- Feature 8: Breadcrumb ---
var visitedSpheres = {};
var breadcrumbClickBlob = null;

// --- Feature 10: Portals ---
var portalLinks = [];
var currentArticleData = null;

// --- Auto-advance: drift to next element when current finishes ---
var readingOrder = [];       // ordered array of sound elements in reading sequence
var currentReadingIndex = -1;
var autoAdvanceActive = false;
var autoAdvanceDrifting = false;
var autoAdvanceTarget = null;
var driftSpeed = 0.03;       // units per tick (~60 ticks/sec → ~1.8 units/sec)
var lastUserMoveTime = 0;
var lastAutoPlayedEl = null;  // prevent re-triggering on the element we just played

// --- Language ---
var currentLang = "en";

var i18n = {
  en: {
    label_url: "Wikipedia Article URL or Title",
    placeholder_url: "e.g. https://en.wikipedia.org/wiki/Solar_System or Solar System",
    toggle_elevenlabs: "Optional: Use ElevenLabs for higher-quality voices",
    label_apikey: "ElevenLabs API Key",
    placeholder_apikey: "Enter your ElevenLabs API key",
    note_elevenlabs: "ElevenLabs offers a free tier with 10,000 characters/month. Sign up at elevenlabs.io. Your key is stored only in this browser session and is never saved to disk.",
    btn_generate: "Generate Soundscape",
    error_empty: "Please enter a Wikipedia URL or article title.",
    progress_fetch: "Fetching Wikipedia article...",
    progress_fetched: "Article fetched. Generating speech...",
    progress_speech: "Generating speech: {done}/{total} sections...",
    progress_preparing: "Preparing speech: {done}/{total} sections...",
    progress_scene: "Building 3D scene...",
    progress_done: "Done!",
    overlay_title: "Screen-to-Soundscape",
    overlay_start: "Click anywhere or press any key to start",
    overlay_desktop: "Arrow keys: move. Space: play/pause. Double-tap Space: welcome. Shift: nearest sound. Tab: where am I. P: play all by distance. Enter: load portal. Escape: return to start.",
    overlay_mobile: "Use on-screen buttons to move, tilt to look around, center button to play/pause",
    aria_sphere_title: "Article title: {name}",
    aria_sphere_intro: "Introduction",
    aria_sphere_section: "Section: {name}",
    aria_sphere_subsection: "Subsection: {name}",
    aria_sphere_paragraph: "Paragraph for: {name}",
    aria_sphere_portal: "Portal to article: {name}",
    skip_sections: "See also|References|External links|Notes|Further reading|Bibliography|Sources",
    whereami: "You are near {section}. {left} sections to your left, {right} to your right, {ahead} ahead.",
    visited: "Already visited",
    portal_loading: "Loading linked article: {name}"
  },
  fr: {
    label_url: "URL ou titre de l'article Wikipédia",
    placeholder_url: "ex. https://fr.wikipedia.org/wiki/Système_solaire ou Système solaire",
    toggle_elevenlabs: "Optionnel : Utiliser ElevenLabs pour des voix de meilleure qualité",
    label_apikey: "Clé API ElevenLabs",
    placeholder_apikey: "Entrez votre clé API ElevenLabs",
    note_elevenlabs: "ElevenLabs offre un forfait gratuit de 10 000 caractères/mois. Inscrivez-vous sur elevenlabs.io. Votre clé est stockée uniquement dans cette session et jamais enregistrée sur le disque.",
    btn_generate: "Générer le paysage sonore",
    error_empty: "Veuillez entrer une URL Wikipédia ou un titre d'article.",
    progress_fetch: "Récupération de l'article Wikipédia...",
    progress_fetched: "Article récupéré. Génération de la parole...",
    progress_speech: "Génération de la parole : {done}/{total} sections...",
    progress_preparing: "Préparation de la parole : {done}/{total} sections...",
    progress_scene: "Construction de la scène 3D...",
    progress_done: "Terminé !",
    overlay_title: "Screen-to-Soundscape",
    overlay_start: "Cliquez n'importe où ou appuyez sur une touche pour commencer",
    overlay_desktop: "Flèches : se déplacer. Espace : pause. Double espace : accueil. Shift : son le plus proche. Tab : où suis-je. P : tout lire. Entrée : portail. Échap : retour au départ.",
    overlay_mobile: "Utilisez les boutons à l'écran pour vous déplacer, inclinez pour regarder, bouton central pour pause",
    aria_sphere_title: "Titre de l'article : {name}",
    aria_sphere_intro: "Introduction",
    aria_sphere_section: "Section : {name}",
    aria_sphere_subsection: "Sous-section : {name}",
    aria_sphere_paragraph: "Paragraphe pour : {name}",
    aria_sphere_portal: "Portail vers l'article : {name}",
    skip_sections: "Voir aussi|Références|Liens externes|Notes|Notes et références|Bibliographie|Sources|Articles connexes",
    whereami: "Vous êtes près de {section}. {left} sections à gauche, {right} à droite, {ahead} devant.",
    visited: "Déjà visité",
    portal_loading: "Chargement de l'article lié : {name}"
  }
};

function t(key, vars) {
  var str = (i18n[currentLang] && i18n[currentLang][key]) || i18n.en[key] || key;
  if (vars) {
    for (var k in vars) {
      str = str.replace("{" + k + "}", vars[k]);
    }
  }
  return str;
}

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.setAttribute("lang", lang);
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    var key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });
}

// ============================================================
// DOM READY
// ============================================================
window.addEventListener("DOMContentLoaded", function () {
  sceneEl = document.querySelector("a-scene");
  assetEl = document.querySelector("a-assets");

  var savedKey = sessionStorage.getItem("elevenlabs_key");
  if (savedKey) {
    document.getElementById("elevenlabs-key").value = savedKey;
  }

  var langSelect = document.getElementById("lang-select");
  var savedLang = sessionStorage.getItem("preferred_lang");
  if (savedLang) {
    langSelect.value = savedLang;
    applyLanguage(savedLang);
  }
  langSelect.addEventListener("change", function () {
    var lang = langSelect.value;
    sessionStorage.setItem("preferred_lang", lang);
    applyLanguage(lang);
  });

  var toggleBtn = document.getElementById("elevenlabs-toggle");
  var elSection = document.getElementById("elevenlabs-section");
  toggleBtn.addEventListener("click", function () {
    var isOpen = elSection.classList.toggle("open");
    toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    elSection.setAttribute("aria-hidden", isOpen ? "false" : "true");
  });

  document.getElementById("generate-btn").addEventListener("click", function () {
    startGeneration();
  });

  document.getElementById("wiki-url").addEventListener("keydown", function (e) {
    if (e.key === "Enter") startGeneration();
  });

  addMobileControls();
});

// ============================================================
// MAIN FLOW
// ============================================================
async function startGeneration() {
  var urlInput = document.getElementById("wiki-url").value.trim();
  if (!urlInput) {
    showError(t("error_empty"));
    return;
  }

  hideError();
  var btn = document.getElementById("generate-btn");
  btn.disabled = true;

  var elKey = document.getElementById("elevenlabs-key").value.trim();
  if (elKey) sessionStorage.setItem("elevenlabs_key", elKey);

  try {
    updateProgress(t("progress_fetch"), 5);

    var data = await fetchWikipedia(urlInput);
    currentArticleData = data;
    console.log("Parsed Wikipedia data:", data);
    console.log("Sections found:", Object.keys(data.Sections).length);
    console.log("Portal links found:", data._links ? data._links.length : 0);
    updateProgress(t("progress_fetched"), 15);

    await generateSpeech(data, elKey);
    updateProgress(t("progress_scene"), 90);

    await delay(200);

    createBeaconTones();
    createBreadcrumbClick();
    buildScene(data);
    updateProgress(t("progress_done"), 100);

    await delay(400);
    document.getElementById("input-screen").style.display = "none";
    document.querySelector("a-scene").setAttribute("aria-hidden", "false");
    showStartOverlay();
  } catch (err) {
    console.error(err);
    showError(err.message || "Something went wrong.");
    btn.disabled = false;
  }
}

// ============================================================
// BEACON TONE GENERATION
// ============================================================
var beaconFreqs = {
  title: 130,
  section: 220,
  subsection: 330,
  paragraph: 440
};

function createBeaconTones() {
  for (var level in beaconFreqs) {
    var blob = generateToneBlob(beaconFreqs[level], 2.0, 0.06);
    var url = URL.createObjectURL(blob);
    var audioEl = document.createElement("audio");
    audioEl.setAttribute("id", "beacon-" + level);
    audioEl.setAttribute("preload", "auto");
    audioEl.setAttribute("src", url);
    assetEl.appendChild(audioEl);
  }
}

function generateToneBlob(freq, duration, amplitude) {
  var sampleRate = 22050;
  var numSamples = Math.floor(sampleRate * duration);
  var dataLength = numSamples * 2;
  var totalLength = 44 + dataLength;
  var buf = new ArrayBuffer(totalLength);
  var view = new DataView(buf);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  var fadeLen = Math.floor(sampleRate * 0.05);
  var offset = 44;
  for (var i = 0; i < numSamples; i++) {
    var sample = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * amplitude;
    if (i < fadeLen) sample *= i / fadeLen;
    if (i > numSamples - fadeLen) sample *= (numSamples - i) / fadeLen;
    var val = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, val < 0 ? val * 0x8000 : val * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buf], { type: "audio/wav" });
}

function writeString(view, offset, str) {
  for (var i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ============================================================
// FEATURE 8: BREADCRUMB CLICK SOUND
// ============================================================
function createBreadcrumbClick() {
  var sampleRate = 22050;
  var duration = 0.08;
  var numSamples = Math.floor(sampleRate * duration);
  var dataLength = numSamples * 2;
  var totalLength = 44 + dataLength;
  var buf = new ArrayBuffer(totalLength);
  var view = new DataView(buf);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  var offset = 44;
  for (var i = 0; i < numSamples; i++) {
    var env = Math.exp(-i / (sampleRate * 0.015));
    var sample = Math.sin(2 * Math.PI * 1200 * (i / sampleRate)) * 0.15 * env;
    var val = Math.max(-1, Math.min(1, sample));
    view.setInt16(offset, val < 0 ? val * 0x8000 : val * 0x7FFF, true);
    offset += 2;
  }

  breadcrumbClickBlob = new Blob([buf], { type: "audio/wav" });
  var url = URL.createObjectURL(breadcrumbClickBlob);
  var audioEl = document.createElement("audio");
  audioEl.setAttribute("id", "breadcrumb-click");
  audioEl.setAttribute("preload", "auto");
  audioEl.setAttribute("src", url);
  assetEl.appendChild(audioEl);
}

// ============================================================
// AMBIENT BACKGROUND
// ============================================================
function startAmbient() {
  try {
    ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambientGain = ambientCtx.createGain();
    ambientGain.gain.value = 0.03;

    var freqs = [55, 82.5, 110];
    freqs.forEach(function (f) {
      var osc = ambientCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(ambientGain);
      osc.start();
    });

    var bufferSize = ambientCtx.sampleRate * 2;
    var noiseBuffer = ambientCtx.createBuffer(1, bufferSize, ambientCtx.sampleRate);
    var noiseData = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.5;
    }
    var noiseSource = ambientCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    var filter = ambientCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    filter.Q.value = 1;
    var noiseGain = ambientCtx.createGain();
    noiseGain.gain.value = 0.015;
    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ambientGain);
    noiseSource.start();

    ambientGain.connect(ambientCtx.destination);
  } catch (e) {
    console.warn("Ambient audio failed:", e);
  }
}

// ============================================================
// FEATURE 1: FOOTSTEP AUDIO
// ============================================================
function initFootsteps() {
  try {
    footstepCtx = ambientCtx || new (window.AudioContext || window.webkitAudioContext)();
    footstepGain = footstepCtx.createGain();
    footstepGain.gain.value = 0.12;
    footstepGain.connect(footstepCtx.destination);

    // Create two footstep buffer variants (short noise bursts with different filtering)
    var variants = [
      { freq: 300, q: 2, decay: 0.03 },
      { freq: 400, q: 3, decay: 0.025 }
    ];
    variants.forEach(function (v) {
      var sr = footstepCtx.sampleRate;
      var len = Math.floor(sr * 0.06);
      var buffer = footstepCtx.createBuffer(1, len, sr);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < len; i++) {
        var env = Math.exp(-i / (sr * v.decay));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      footstepBuffers.push(buffer);
    });
  } catch (e) {
    console.warn("Footstep init failed:", e);
  }
}

function playFootstep() {
  if (!footstepCtx || footstepBuffers.length === 0) return;
  try {
    if (footstepCtx.state === "suspended") footstepCtx.resume();
    var bufIdx = Math.floor(Math.random() * footstepBuffers.length);
    var source = footstepCtx.createBufferSource();
    source.buffer = footstepBuffers[bufIdx];

    // Vary pitch slightly for natural feel
    source.playbackRate.value = 0.9 + Math.random() * 0.2;

    // Apply surface-based filtering: near intro (z > -10) = softer, deeper (z < -20) = harder
    var camZ = 0;
    try { camZ = document.querySelector("[camera]").object3D.position.z; } catch (e) {}
    var biquad = footstepCtx.createBiquadFilter();
    biquad.type = "bandpass";
    if (camZ > -10) {
      biquad.frequency.value = 250; // soft/grass
      biquad.Q.value = 1;
    } else if (camZ < -25) {
      biquad.frequency.value = 600; // hard/stone
      biquad.Q.value = 3;
    } else {
      biquad.frequency.value = 400; // default
      biquad.Q.value = 2;
    }

    source.connect(biquad);
    biquad.connect(footstepGain);
    source.start();
  } catch (e) {}
}

function updateFootsteps() {
  if (!started || !footstepCtx) return;
  try {
    var cam = document.querySelector("[camera]");
    if (!cam) return;
    var cx = cam.object3D.position.x;
    var cz = cam.object3D.position.z;
    var dx = cx - lastCamPos.x;
    var dz = cz - lastCamPos.z;
    var moved = Math.sqrt(dx * dx + dz * dz);
    lastCamPos.x = cx;
    lastCamPos.z = cz;

    footstepDistAccum += moved;
    if (footstepDistAccum >= footstepStepSize) {
      footstepDistAccum -= footstepStepSize;
      playFootstep();
    }
  } catch (e) {}
}

// ============================================================
// FEATURE 2: SECTION AMBIENT TEXTURES
// ============================================================
function startSectionAmbients(data) {
  if (!ambientCtx) return;
  var sectionKeys = Object.keys(data.Sections);
  var textures = [
    { type: "sine", freq: 180, detune: 5 },
    { type: "triangle", freq: 200, detune: -3 },
    { type: "sine", freq: 160, detune: 7 },
    { type: "triangle", freq: 220, detune: -5 },
    { type: "sine", freq: 140, detune: 10 },
    { type: "triangle", freq: 190, detune: 3 },
    { type: "sine", freq: 170, detune: -7 },
    { type: "triangle", freq: 210, detune: 5 }
  ];

  sectionKeys.forEach(function (key, idx) {
    var tex = textures[idx % textures.length];
    try {
      var osc = ambientCtx.createOscillator();
      osc.type = tex.type;
      osc.frequency.value = tex.freq;
      osc.detune.value = tex.detune;

      var gain = ambientCtx.createGain();
      gain.gain.value = 0; // start silent, modulated by distance

      var filter = ambientCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      filter.Q.value = 0.5;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ambientCtx.destination);
      osc.start();

      sectionAmbients[key] = { gain: gain, osc: osc };
    } catch (e) {}
  });
}

function updateSectionAmbients() {
  if (!ambientCtx || Object.keys(sectionAmbients).length === 0) return;
  try {
    var cam = document.querySelector("[camera]");
    if (!cam) return;
    var cx = cam.object3D.position.x;
    var cz = cam.object3D.position.z;

    // Find spheres that are section headers and update their ambient volume
    document.querySelectorAll("a-sphere.header").forEach(function (el) {
      var worldpos = new THREE.Vector3();
      el.getObject3D("mesh").getWorldPosition(worldpos);
      var dist = distance(cx, cz, worldpos.x, worldpos.z);
      var sectionKey = el._sectionKey;
      if (sectionKey && sectionAmbients[sectionKey]) {
        // Volume inversely proportional to distance, max 0.02
        var vol = Math.max(0, Math.min(0.02, 0.02 * (1 - dist / 20)));
        sectionAmbients[sectionKey].gain.gain.setTargetAtTime(vol, ambientCtx.currentTime, 0.1);
      }
    });
  } catch (e) {}
}

// ============================================================
// WIKIPEDIA FETCH & PARSE
// ============================================================
async function fetchWikipedia(input) {
  var title = input;
  var wikiLang = currentLang;
  var match = input.match(/([a-z]{2,3})\.wikipedia\.org\/wiki\/([^#?]+)/);
  if (match) {
    wikiLang = match[1];
    title = decodeURIComponent(match[2]).replace(/_/g, " ");
  } else {
    var urlMatch = input.match(/wikipedia\.org\/wiki\/([^#?]+)/);
    if (urlMatch) {
      title = decodeURIComponent(urlMatch[1]).replace(/_/g, " ");
    }
  }

  var apiUrl =
    "https://" + wikiLang + ".wikipedia.org/w/api.php?action=parse&page=" +
    encodeURIComponent(title) +
    "&format=json&origin=*&prop=text|displaytitle|links";

  var resp = await fetch(apiUrl);
  if (!resp.ok) throw new Error("Wikipedia API error: " + resp.status);
  var json = await resp.json();
  if (json.error) throw new Error("Wikipedia: " + json.error.info);

  var html = json.parse.text["*"];
  var pageTitle = json.parse.title;

  // Feature 10: Extract internal links for portals
  var links = [];
  if (json.parse.links) {
    json.parse.links.forEach(function (link) {
      if (link.ns === 0 && link.exists !== undefined) {
        links.push({ title: link["*"], lang: wikiLang });
      }
    });
  }

  var data = parseWikipediaHTML(pageTitle, html);
  data._links = links.slice(0, 8); // Limit to 8 portal links
  data._lang = wikiLang;
  data._rawHTML = html;
  data._pageTitle = pageTitle;
  return data;
}

function parseWikipediaHTML(pageTitle, html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/html");

  // Extract image alt-text and captions before removing visual elements
  var imageDescriptions = [];
  doc.querySelectorAll(".thumb, figure, .infobox img, .mw-parser-output > img").forEach(function (el) {
    var img = el.tagName === "IMG" ? el : el.querySelector("img");
    var caption = el.querySelector(".thumbcaption, figcaption");
    var alt = img ? (img.getAttribute("alt") || "") : "";
    var capText = caption ? caption.textContent.trim() : "";
    var desc = capText || alt;
    if (desc && desc.length > 5) {
      imageDescriptions.push("Image: " + desc);
    }
  });

  // Extract table data as readable text before removing tables
  var tableDescriptions = [];
  doc.querySelectorAll("table:not(.infobox):not(.navbox):not(.sidebar)").forEach(function (tbl) {
    var caption = tbl.querySelector("caption");
    var capText = caption ? caption.textContent.trim() : "";
    // Read header row
    var headers = [];
    tbl.querySelectorAll("thead th, tr:first-child th").forEach(function (th) {
      var t = th.textContent.trim();
      if (t) headers.push(t);
    });
    // Read first few data rows
    var rows = [];
    var trs = tbl.querySelectorAll("tbody tr, tr");
    for (var ri = 0; ri < Math.min(trs.length, 5); ri++) {
      var cells = [];
      trs[ri].querySelectorAll("td").forEach(function (td) {
        var t = td.textContent.trim();
        if (t) cells.push(t);
      });
      if (cells.length > 0) rows.push(cells.join(", "));
    }
    if (capText || headers.length > 0 || rows.length > 0) {
      var desc = "Table";
      if (capText) desc += ": " + capText + ". ";
      if (headers.length > 0) desc += "Columns: " + headers.join(", ") + ". ";
      if (rows.length > 0) desc += "Data: " + rows.join("; ");
      tableDescriptions.push(truncateText(desc, 2000));
    }
  });

  doc.querySelectorAll(
    ".mw-editsection, .reference, .reflist, .navbox, .sistersitebox, " +
    ".mw-empty-elt, table, .infobox, .sidebar, .toc, .thumb, " +
    "style, script, .mw-references-wrap, .hatnote, .shortdescription, " +
    ".mw-ext-cite-error, figure, .gallery"
  ).forEach(function (el) { el.remove(); });

  var body = doc.querySelector(".mw-parser-output") || doc.body;
  var children = Array.from(body.children);

  function resolveChild(child) {
    var tag = child.tagName;
    if (tag === "DIV" && child.classList.contains("mw-heading")) {
      var inner = child.querySelector("h2, h3, h4, h5, h6");
      if (inner) return { tag: inner.tagName, el: inner };
    }
    return { tag: tag, el: child };
  }

  var introTexts = [];
  var sectionStart = -1;
  for (var i = 0; i < children.length; i++) {
    var resolved = resolveChild(children[i]);
    if (resolved.tag === "H2") { sectionStart = i; break; }
    if (resolved.tag === "P") {
      var txt = resolved.el.textContent.trim();
      if (txt) introTexts.push(txt);
    }
  }

  var introText = truncateText(introTexts.join(" "), 20000);
  var titleId = sanitizeId("Title_header");
  var introId = sanitizeId("Introduction_paragraph");

  var data = {
    Title: { text: pageTitle, audio_path: titleId + ".mp3", _id: titleId },
    Introduction: { text: introText, audio_path: introId + ".mp3", _id: introId },
    Sections: {}
  };

  if (sectionStart < 0) return data;

  var skipPattern = new RegExp("^(" + t("skip_sections") + ")$", "i");
  var currentH2 = null;
  var currentH3 = null;

  for (var j = sectionStart; j < children.length; j++) {
    var r = resolveChild(children[j]);
    var tag = r.tag;
    var el = r.el;

    if (tag === "H2") {
      var heading = getHeadingText(el);
      if (skipPattern.test(heading)) {
        currentH2 = null;
        currentH3 = null;
        continue;
      }
      var sectionKey = "H2: " + heading;
      var hId = sanitizeId("Sections_H2_" + heading + "_header2");
      data.Sections[sectionKey] = {
        text: heading,
        audio_path: hId + ".mp3",
        _id: hId,
        P: { text: "", audio_path: "", _id: "" }
      };
      currentH2 = sectionKey;
      currentH3 = null;
    } else if (tag === "H3" && currentH2) {
      var subHeading = getHeadingText(el);
      var subId = sanitizeId("Sections_H2_" + data.Sections[currentH2].text + "_Subsections_H3_" + subHeading + "_header3");
      if (!data.Sections[currentH2].Subsections) {
        data.Sections[currentH2].Subsections = {};
      }
      var subKey = "H3: " + subHeading;
      data.Sections[currentH2].Subsections[subKey] = {
        text: subHeading,
        audio_path: subId + ".mp3",
        _id: subId,
        P: { text: "", audio_path: "", _id: "" }
      };
      currentH3 = subKey;
    } else if (tag === "P") {
      var pText = el.textContent.trim();
      if (!pText) continue;

      if (currentH3 && currentH2 && data.Sections[currentH2] &&
          data.Sections[currentH2].Subsections && data.Sections[currentH2].Subsections[currentH3]) {
        var sub = data.Sections[currentH2].Subsections[currentH3];
        sub.P.text = truncateText((sub.P.text ? sub.P.text + " " : "") + pText, 20000);
        if (!sub.P._id) {
          var pSubId = sanitizeId("Sections_H2_" + data.Sections[currentH2].text + "_Subsections_H3_" + sub.text + "_paragraph");
          sub.P._id = pSubId;
          sub.P.audio_path = pSubId + ".mp3";
        }
      } else if (currentH2 && data.Sections[currentH2]) {
        var sec = data.Sections[currentH2];
        sec.P.text = truncateText((sec.P.text ? sec.P.text + " " : "") + pText, 20000);
        if (!sec.P._id) {
          var pSecId = sanitizeId("Sections_H2_" + sec.text + "_paragraph");
          sec.P._id = pSecId;
          sec.P.audio_path = pSecId + ".mp3";
        }
      }
    }
  }

  // Append image and table descriptions to the introduction
  if (imageDescriptions.length > 0 || tableDescriptions.length > 0) {
    var extra = "";
    if (imageDescriptions.length > 0) {
      extra += " " + imageDescriptions.join(". ");
    }
    if (tableDescriptions.length > 0) {
      extra += " " + tableDescriptions.join(". ");
    }
    data.Introduction.text = truncateText(data.Introduction.text + extra, 20000);
  }

  // Feature 5: Calculate section weights for dynamic clustering
  for (var sk in data.Sections) {
    var secData = data.Sections[sk];
    var weight = (secData.P && secData.P.text) ? secData.P.text.length : 0;
    if (secData.Subsections) {
      for (var ssk in secData.Subsections) {
        weight += secData.Subsections[ssk].P ? secData.Subsections[ssk].P.text.length : 0;
        weight += 100; // weight for having a subsection
      }
    }
    sectionWeights[sk] = Math.max(weight, 50);
  }

  return data;
}

function getHeadingText(el) {
  var clone = el.cloneNode(true);
  clone.querySelectorAll(".mw-editsection, span[id]").forEach(function (e) { e.remove(); });
  return clone.textContent.trim();
}

function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/_$/, "");
}

function truncateText(text, maxLen) {
  if (text.length <= maxLen) return text;
  var cut = text.substring(0, maxLen);
  var lastPeriod = cut.lastIndexOf(".");
  if (lastPeriod > maxLen * 0.5) return cut.substring(0, lastPeriod + 1);
  return cut + "...";
}

// ============================================================
// TEXT-TO-SPEECH
// ============================================================
async function generateSpeech(data, elevenLabsKey) {
  var blocks = [];
  blocks.push({ id: data.Title._id, text: data.Title.text, heading: data.Title.text });
  if (data.Introduction.text) {
    blocks.push({ id: data.Introduction._id, text: data.Introduction.text, heading: "Introduction" });
  }
  collectSectionBlocks(data.Sections, blocks);

  ttsTotal = blocks.length;
  ttsDone = 0;

  blocks.forEach(function (b) {
    if (b.heading) headingTextMap[b.id] = b.heading;
  });

  if (elevenLabsKey) {
    ttsMode = "elevenlabs";
    await generateElevenLabs(blocks, elevenLabsKey);
  } else {
    ttsMode = "webspeech";
    ttsVoice = await pickBestVoice();
    await generateWebSpeech(blocks);
  }
}

function collectSectionBlocks(sections, blocks) {
  for (var key in sections) {
    var sec = sections[key];
    blocks.push({ id: sec._id, text: sec.text, heading: sec.text });
    if (sec.P && sec.P.text && sec.P._id) {
      // Paragraph uses "Paragraph: <heading>" for auto-announce (not the heading itself)
      blocks.push({ id: sec.P._id, text: sec.P.text, heading: null });
    }
    if (sec.Subsections) {
      collectSectionBlocks(sec.Subsections, blocks);
    }
  }
}

async function generateWebSpeech(blocks) {
  var silentBlob = createSilentWavBlob();
  var silentUrl = URL.createObjectURL(silentBlob);

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    ttsTextMap[block.id] = block.text;
    addAudioElement(block.id, silentUrl);

    ttsDone++;
    updateProgress(
      t("progress_preparing", { done: ttsDone, total: ttsTotal }),
      15 + Math.round((ttsDone / ttsTotal) * 70)
    );
  }
}

function createSilentWavBlob() {
  var sampleRate = 8000;
  var numSamples = 800;
  var dataLength = numSamples * 2;
  var totalLength = 44 + dataLength;
  var buf = new ArrayBuffer(totalLength);
  var view = new DataView(buf);
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  return new Blob([buf], { type: "audio/wav" });
}

function pickBestVoice() {
  return new Promise(function (resolve) {
    function tryPick() {
      var voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        speechSynthesis.addEventListener("voiceschanged", function handler() {
          speechSynthesis.removeEventListener("voiceschanged", handler);
          resolve(doPickVoice(speechSynthesis.getVoices()));
        });
        return;
      }
      resolve(doPickVoice(voices));
    }
    tryPick();
  });
}

function doPickVoice(voices) {
  var langPrefix = currentLang;
  var langVoices = voices.filter(function (v) {
    return v.lang.substring(0, 2).toLowerCase() === langPrefix;
  });
  if (langVoices.length === 0) langVoices = voices;

  var premium = langVoices.filter(function (v) {
    return /enhanced|premium|natural/i.test(v.name);
  });
  if (premium.length > 0) return premium[0];

  var google = langVoices.filter(function (v) {
    return /google/i.test(v.name);
  });
  if (google.length > 0) return google[0];

  return langVoices[0] || voices[0] || null;
}

// --- ElevenLabs ---
async function generateElevenLabs(blocks, apiKey) {
  var voiceId = "21m00Tcm4TlvDq8ikWAM";
  if (currentLang === "fr") {
    voiceId = "pFZP5JQG7iQjIQuC4Bku";
  }
  var batchSize = 4;

  for (var i = 0; i < blocks.length; i += batchSize) {
    var batch = blocks.slice(i, i + batchSize);
    var promises = batch.map(function (block) {
      return ttsElevenLabs(block.text, block.id, apiKey, voiceId);
    });
    var results = await Promise.allSettled(promises);
    results.forEach(function (result, idx) {
      var block = batch[idx];
      if (result.status === "fulfilled") {
        addAudioElement(block.id, result.value);
      } else {
        console.warn("ElevenLabs TTS failed for", block.id, result.reason);
        ttsTextMap[block.id] = block.text;
        var silentUrl = URL.createObjectURL(createSilentWavBlob());
        addAudioElement(block.id, silentUrl);
      }
      ttsDone++;
      updateProgress(
        t("progress_speech", { done: ttsDone, total: ttsTotal }),
        15 + Math.round((ttsDone / ttsTotal) * 70)
      );
    });
  }
}

async function ttsElevenLabs(text, id, apiKey, voiceId) {
  var url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;
  var modelId = currentLang === "fr" ? "eleven_multilingual_v2" : "eleven_monolingual_v1";
  var resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: text,
      model_id: modelId
    })
  });

  if (!resp.ok) {
    var errText = await resp.text().catch(function () { return ""; });
    throw new Error("ElevenLabs " + resp.status + ": " + errText);
  }

  var blob = await resp.blob();
  return URL.createObjectURL(blob);
}

function addAudioElement(id, srcUrl) {
  var audioEl = document.createElement("audio");
  audioEl.setAttribute("id", id);
  audioEl.setAttribute("preload", "auto");
  audioEl.setAttribute("src", srcUrl);
  assetEl.appendChild(audioEl);
}

// ============================================================
// BUILD 3D SCENE
// ============================================================
function buildScene(data) {
  drawLayout(data);
  startSectionAmbients(data);
  createPortals(data);
  buildReadingOrder(data);
  renderBackdrop(data);
}

function drawLayout(data) {
  // --- Spiral Layout ---
  // Collect all elements in reading order: title, intro, then for each section:
  // header, paragraph, subsection headers + paragraphs
  var spiralItems = [];

  spiralItems.push({ type: "title", id: "title", audioId: data.Title._id, color: "#EF2D5E",
    level: "title", ariaLabel: t("aria_sphere_title", { name: data.Title.text }),
    text: data.Title.text, hierarchyLevel: "title" });

  spiralItems.push({ type: "intro", id: "intro", audioId: data.Introduction._id, color: "#EF2D5E",
    level: "title", ariaLabel: t("aria_sphere_intro"),
    text: data.Introduction.text, hierarchyLevel: "intro" });

  if (data.Sections) {
    Object.keys(data.Sections).forEach(function (key, i) {
      var sec = data.Sections[key];
      var level = key.startsWith("H3") ? "subsection" : "section";
      var ariaKey = key.startsWith("H3") ? "aria_sphere_subsection" : "aria_sphere_section";

      spiralItems.push({ type: "header", id: key + i, audioId: sec._id, color: "#00FFFF",
        level: level, ariaLabel: t(ariaKey, { name: sec.text }),
        text: sec.text, hierarchyLevel: level, sectionKey: key, sectionData: sec });

      if (sec.P && sec.P.text && sec.P._id) {
        spiralItems.push({ type: "p", id: key + i + "_p", audioId: sec.P._id, color: "#FFFF00",
          level: "paragraph", ariaLabel: t("aria_sphere_paragraph", { name: sec.text }),
          text: sec.P.text, hierarchyLevel: "paragraph", textLength: sec.P.text.length });
      }

      if (sec.Subsections) {
        Object.keys(sec.Subsections).forEach(function (subKey, j) {
          var sub = sec.Subsections[subKey];
          var subLevel = subKey.startsWith("H3") ? "subsection" : "section";
          var subAriaKey = subKey.startsWith("H3") ? "aria_sphere_subsection" : "aria_sphere_section";

          spiralItems.push({ type: "header", id: subKey + j, audioId: sub._id, color: "#00FFFF",
            level: subLevel, ariaLabel: t(subAriaKey, { name: sub.text }),
            text: sub.text, hierarchyLevel: subLevel, sectionKey: subKey, sectionData: sub });

          if (sub.P && sub.P.text && sub.P._id) {
            spiralItems.push({ type: "p", id: subKey + j + "_p", audioId: sub.P._id, color: "#FFFF00",
              level: "paragraph", ariaLabel: t("aria_sphere_paragraph", { name: sub.text }),
              text: sub.P.text, hierarchyLevel: "paragraph", textLength: sub.P.text.length });
          }
        });
      }
    });
  }

  // --- Meandering River Layout ---
  // Elements follow a sine-wave path going forward (-Z).
  // The river weaves left and right; paragraphs offset to the
  // outside of the current curve bend.
  var stepZ = 4;              // forward distance between elements
  var amplitude = 6;          // how far the river swings left/right
  var wavelength = 40;        // Z distance for one full wave cycle
  var paragraphOffset = 2.5;  // paragraph offset perpendicular to river

  // Track min/max for bounds
  minX = 0; maxX = 0; minZ = 0;
  var maxZ = 0;
  var currentZ = 0;

  for (var si = 0; si < spiralItems.length; si++) {
    var item = spiralItems[si];

    var pz = -currentZ; // negative Z = forward

    // River centerline: x = amplitude * sin(2π * z / wavelength)
    var riverX = amplitude * Math.sin(2 * Math.PI * currentZ / wavelength);

    // Direction of the curve at this point (derivative of sin = cos)
    var curveSlope = amplitude * (2 * Math.PI / wavelength) * Math.cos(2 * Math.PI * currentZ / wavelength);

    // Determine offset from river center based on element type
    var offset = 0;
    if (item.hierarchyLevel === "paragraph") {
      // Offset paragraph to the outside of the curve
      offset = curveSlope > 0 ? -paragraphOffset : paragraphOffset;
    } else if (item.hierarchyLevel === "subsection") {
      // Subsections slightly offset in the opposite direction
      offset = curveSlope > 0 ? paragraphOffset * 0.5 : -paragraphOffset * 0.5;
    }

    var px = riverX + offset;

    var el = createElement(sceneEl, px, yLevel, pz, item.color,
      item.type === "p" ? "p" : (item.type === "title" || item.type === "intro" ? item.type : "header"),
      item.id, item.audioId, true, item.level, item.ariaLabel, item.textLength);
    el._hierarchyLevel = item.hierarchyLevel;
    if (item.sectionKey) {
      el._sectionKey = item.sectionKey;
      el._sectionData = item.sectionData;
    }

    // Update bounds
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (pz < minZ) minZ = pz;
    if (pz > maxZ) maxZ = pz;

    currentZ += stepZ;
  }

  // Set z0 to max Z for boundary
  z0 = maxZ;

  createElement(sceneEl, minX - margin, yLevel, z0 + margin, "#F0FFFF", "sound-cues", "bound", "bound-cue", false, null, "Boundary");

  sounds = document.querySelectorAll("a-sphere, a-cylinder");
  console.log("Total spheres created:", sounds.length);

  document.querySelector("[camera]").setAttribute("play-proxi", "");

  document.addEventListener("keyup", function (event) {
    if (event.code === "Space") {
      checkCollide = false;
      checkAudio(sounds);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.code !== "Tab" && event.code !== "Enter" && event.code !== "Escape") {
      collide = true;
    }
    // Track user movement for auto-advance (arrow keys, WASD)
    var moveCodes = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"];
    if (moveCodes.indexOf(event.code) >= 0) {
      lastUserMoveTime = Date.now();
      cancelAutoDrift();
    }
  });

  document.querySelector("[camera]").setAttribute("hit-bounds", "");
  document.querySelector("[camera]").setAttribute("footstep-tracker", "");

  resumeAudio();
  setTimeout(resumeAudio, 500);
  setTimeout(resumeAudio, 1500);

  if (isMobile()) {
    document.addEventListener("touchstart", function mobileUnlock() {
      unlockAllAudio();
      document.removeEventListener("touchstart", mobileUnlock);
    }, { once: true });
    // Cancel auto-drift on any touch (user is navigating manually)
    document.addEventListener("touchstart", function () {
      lastUserMoveTime = Date.now();
      cancelAutoDrift();
    });
  }
}

// (Previous semicircular layout functions removed — now using spiral layout in drawLayout)

function createElement(parentEl, x, y, z, color, className, id, soundId, autoPlay, beaconLevel, ariaLabel, textLength) {
  // Paragraphs become horizontal cylinders whose length reflects text length
  var isParagraph = className === "p" && textLength && textLength > 0;
  var elTag = isParagraph ? "a-cylinder" : "a-sphere";
  var sphereEl = document.createElement(elTag);
  sphereEl.setAttribute("color", color);
  sphereEl.setAttribute("shader", "flat");

  if (isParagraph) {
    // Scale cylinder length: min 1 unit, max 6 units, based on text length (100-2000 chars)
    var minLen = 1, maxLen = 6;
    var clamped = Math.max(100, Math.min(2000, textLength));
    var cylLength = minLen + (maxLen - minLen) * ((clamped - 100) / (2000 - 100));
    sphereEl.setAttribute("radius", "0.35");
    sphereEl.setAttribute("height", String(cylLength.toFixed(2)));
    // Rotate 90° on Z-axis so the cylinder lies horizontally
    sphereEl.setAttribute("rotation", "0 0 90");
    sphereEl._cylLength = cylLength;
  } else {
    sphereEl.setAttribute("radius", "0.5");
  }

  sphereEl.setAttribute("position", x + " " + y + " " + z);
  sphereEl.setAttribute("class", className);
  sphereEl.setAttribute("id", id);

  if (ariaLabel) {
    sphereEl.setAttribute("aria-label", ariaLabel);
  }

  var soundSrc = "src:#" + soundId;
  sphereEl.setAttribute(
    "sound",
    autoPlay
      ? soundSrc + "; autoplay: false; loop: false; distanceModel: exponential; refDistance: 3; rolloffFactor: 3; poolSize: 1"
      : soundSrc + "; poolSize: 1"
  );

  if (beaconLevel && beaconFreqs[beaconLevel]) {
    sphereEl.setAttribute(
      "sound__beacon",
      "src: #beacon-" + beaconLevel +
      "; autoplay: true; loop: true; volume: 0.3" +
      "; distanceModel: exponential; refDistance: 2; rolloffFactor: 4; poolSize: 1"
    );
  }

  sphereEl._soundAudioId = soundId;
  sphereEl._originalColor = color;

  if (autoPlay) {
    sphereEl.setAttribute("world-pos", "");
    sphereEl.setAttribute("collide", "");
  }

  parentEl.appendChild(sphereEl);
  elCount++;
  return sphereEl;
}

// ============================================================
// FEATURE 10: PORTALS (Links to other articles)
// ============================================================
function createPortals(data) {
  if (!data._links || data._links.length === 0) return;

  portalLinks = data._links;
  var portalCount = portalLinks.length;

  // Place portals in a ring at the far edge of the scene
  var portalRadius = Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minZ)) + 5;
  if (portalRadius < 15) portalRadius = 15;

  portalLinks.forEach(function (link, i) {
    var angle = (i / portalCount) * Math.PI * 2;
    var px = portalRadius * Math.cos(angle);
    var pz = -portalRadius * Math.abs(Math.sin(angle)) - 5;

    // Create portal audio placeholder
    var portalId = sanitizeId("portal_" + link.title);
    ttsTextMap[portalId] = link.title;
    addAudioElement(portalId, URL.createObjectURL(createSilentWavBlob()));

    var portalEl = createElement(sceneEl, px, yLevel, pz, "#FF00FF", "portal", "portal-" + i, portalId, true, "section",
      t("aria_sphere_portal", { name: link.title }));
    portalEl._portalLink = link;
    portalEl._hierarchyLevel = "portal";

    // Make portal visually distinct — larger, with animation
    portalEl.setAttribute("radius", "0.8");
    portalEl.setAttribute("animation", "property: rotation; to: 0 360 0; loop: true; dur: 8000; easing: linear");
  });

  // Update sounds after adding portals
  sounds = document.querySelectorAll("a-sphere, a-cylinder");
}

// ============================================================
// FEATURE 4: WHERE AM I (Tab key)
// ============================================================
function speakWhereAmI() {
  var cam = document.querySelector("[camera]");
  if (!cam) return;
  var cx = cam.object3D.position.x;
  var cz = cam.object3D.position.z;

  // Find nearest section sphere
  var nearest = null;
  var nearestDist = Infinity;
  var leftCount = 0, rightCount = 0, aheadCount = 0;

  document.querySelectorAll("a-sphere.header, a-sphere.title, a-sphere.intro").forEach(function (el) {
    var wp = new THREE.Vector3();
    try {
      el.getObject3D("mesh").getWorldPosition(wp);
      var dist = distance(cx, cz, wp.x, wp.z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = el;
      }
      // Count sections in different directions
      if (wp.x < cx - 1) leftCount++;
      else if (wp.x > cx + 1) rightCount++;
      if (wp.z < cz - 1) aheadCount++;
    } catch (e) {}
  });

  var nearestName = "unknown";
  if (nearest) {
    var audioId = getAudioIdFromSound(nearest);
    nearestName = headingTextMap[audioId] || "unknown";
  }

  var text = t("whereami", {
    section: nearestName,
    left: leftCount,
    right: rightCount,
    ahead: aheadCount
  });

  speechSynthesis.cancel();
  setTimeout(function () {
    var utt = new SpeechSynthesisUtterance(text);
    if (ttsVoice) utt.voice = ttsVoice;
    utt.lang = currentLang;
    utt.rate = 1.1;
    speechSynthesis.speak(utt);
  }, 50);
}

// ============================================================
// FEATURE 8: BREADCRUMB — mark visited spheres
// ============================================================
function markVisited(sphereEl) {
  var audioId = getAudioIdFromSound(sphereEl);
  if (!audioId) return;

  if (visitedSpheres[audioId]) {
    // Already visited — play a quiet click to indicate
    playBreadcrumbClick();
    return;
  }

  visitedSpheres[audioId] = true;

  // Change color to a dimmer version to show it's been visited
  var origColor = sphereEl._originalColor || "#00FFFF";
  // Shift toward grey
  sphereEl.setAttribute("color", shiftToGrey(origColor));
  // Add a subtle opacity change
  sphereEl.setAttribute("opacity", "0.7");
}

function shiftToGrey(hexColor) {
  // Simple color shift: blend with grey
  try {
    var r = parseInt(hexColor.substring(1, 3), 16);
    var g = parseInt(hexColor.substring(3, 5), 16);
    var b = parseInt(hexColor.substring(5, 7), 16);
    r = Math.round(r * 0.5 + 128 * 0.5);
    g = Math.round(g * 0.5 + 128 * 0.5);
    b = Math.round(b * 0.5 + 128 * 0.5);
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  } catch (e) {
    return "#888888";
  }
}

function playBreadcrumbClick() {
  try {
    var clickEl = document.getElementById("breadcrumb-click");
    if (clickEl) {
      clickEl.currentTime = 0;
      clickEl.volume = 0.2;
      clickEl.play().catch(function () {});
    }
  } catch (e) {}
}

// ============================================================
// FEATURE 10: PORTAL NAVIGATION
// ============================================================
function findNearestPortal() {
  var cam = document.querySelector("[camera]");
  if (!cam) return null;
  var cx = cam.object3D.position.x;
  var cz = cam.object3D.position.z;
  var nearest = null;
  var nearestDist = Infinity;

  document.querySelectorAll("a-sphere.portal").forEach(function (el) {
    if (!el._portalLink) return;
    var wp = new THREE.Vector3();
    try {
      el.getObject3D("mesh").getWorldPosition(wp);
      var dist = distance(cx, cz, wp.x, wp.z);
      if (dist < nearestDist && dist < 5) {
        nearestDist = dist;
        nearest = el;
      }
    } catch (e) {}
  });
  return nearest;
}

async function activatePortal(portalEl) {
  if (!portalEl._portalLink) return;
  var link = portalEl._portalLink;

  // Announce loading
  speechSynthesis.cancel();
  var utt = new SpeechSynthesisUtterance(t("portal_loading", { name: link.title }));
  if (ttsVoice) utt.voice = ttsVoice;
  utt.lang = currentLang;
  speechSynthesis.speak(utt);

  // Show loading overlay
  var overlay = document.createElement("div");
  overlay.id = "portal-loading";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);" +
    "display:flex;align-items:center;justify-content:center;z-index:9999;color:white;" +
    "font-family:sans-serif;font-size:1.5rem;";
  overlay.textContent = t("portal_loading", { name: link.title });
  document.body.appendChild(overlay);

  try {
    // Clear existing scene
    clearScene();

    // Fetch new article
    var apiUrl =
      "https://" + link.lang + ".wikipedia.org/w/api.php?action=parse&page=" +
      encodeURIComponent(link.title) +
      "&format=json&origin=*&prop=text|displaytitle|links";

    var resp = await fetch(apiUrl);
    var json = await resp.json();
    if (json.error) throw new Error(json.error.info);

    var html = json.parse.text["*"];
    var pageTitle = json.parse.title;
    var data = parseWikipediaHTML(pageTitle, html);

    // Get new links
    var links = [];
    if (json.parse.links) {
      json.parse.links.forEach(function (l) {
        if (l.ns === 0 && l.exists !== undefined) {
          links.push({ title: l["*"], lang: link.lang });
        }
      });
    }
    data._links = links.slice(0, 8);
    data._lang = link.lang;
    currentArticleData = data;

    // Generate speech for new article
    var elKey = sessionStorage.getItem("elevenlabs_key") || "";
    await generateSpeech(data, elKey);

    // Rebuild scene
    createBeaconTones();
    createBreadcrumbClick();
    buildScene(data);

    overlay.remove();
    resumeAudio();
    startAmbient();
  } catch (err) {
    console.error("Portal navigation failed:", err);
    overlay.textContent = "Failed to load article: " + err.message;
    setTimeout(function () { overlay.remove(); }, 3000);
  }
}

function clearScene() {
  // Remove all spheres
  document.querySelectorAll("a-sphere").forEach(function (el) { el.remove(); });

  // Clear audio assets (except bound-cue)
  var assets = document.querySelector("a-assets");
  Array.from(assets.children).forEach(function (el) {
    if (el.id !== "bound-cue") el.remove();
  });

  // Reset globals
  sounds = null;
  ttsTextMap = {};
  headingTextMap = {};
  visitedSpheres = {};
  sectionWeights = {};
  sectionAmbients = {};
  portalLinks = [];
  elCount = 0;
  minX = 0; maxX = 0; minZ = 0;
  ttsTotal = 0;
  ttsDone = 0;

  // Stop section ambients
  for (var key in sectionAmbients) {
    try { sectionAmbients[key].osc.stop(); } catch (e) {}
  }
}

// ============================================================
// START OVERLAY
// ============================================================
function showStartOverlay() {
  var overlay = document.createElement("div");
  overlay.id = "start-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", t("overlay_title"));
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);" +
    "display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;";
  overlay.innerHTML =
    '<div style="color:white;font-family:sans-serif;text-align:center;max-width:600px;padding:20px;">' +
    '<h1 style="font-size:2rem;margin-bottom:1rem;">' + t("overlay_title") + '</h1>' +
    '<p style="font-size:1.2rem;">' + t("overlay_start") + '</p>' +
    '<p style="font-size:0.85rem;margin-top:1rem;opacity:0.7;line-height:1.5;">' +
    (isMobile() ? t("overlay_mobile") : t("overlay_desktop")) +
    "</p></div>";
  document.body.appendChild(overlay);

  function startApp() {
    if (started) return;
    started = true;
    overlay.remove();

    var doubletap = new Audio("./audio/doubletap.mp3");
    doubletap.play().catch(function (err) { console.warn("Doubletap audio:", err); });

    if (ttsMode === "webspeech") {
      var warmup = new SpeechSynthesisUtterance("");
      speechSynthesis.speak(warmup);
      speechSynthesis.cancel();
    }

    // Save home position for Escape key
    var cam = document.querySelector("[camera]");
    if (cam) {
      homePos.x = cam.object3D.position.x;
      homePos.y = cam.object3D.position.y;
      homePos.z = cam.object3D.position.z;
    }

    startAmbient();
    initFootsteps();
    resumeAudio();
  }

  overlay.addEventListener("click", startApp, { once: true });
  document.addEventListener("keydown", startApp, { once: true });
}

// ============================================================
// MOBILE DETECTION
// ============================================================
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}

// ============================================================
// AUDIO HELPERS
// ============================================================
function resumeAudio() {
  try {
    if (typeof THREE !== "undefined" && THREE.AudioContext) {
      var ctx = THREE.AudioContext.getContext();
      if (ctx.state === "suspended") ctx.resume();
    }
  } catch (e) {}

  try {
    var scene = document.querySelector("a-scene");
    if (scene && scene.audioListener && scene.audioListener.context) {
      if (scene.audioListener.context.state === "suspended") {
        scene.audioListener.context.resume();
      }
    }
  } catch (e) {}

  try {
    document.querySelectorAll("[sound]").forEach(function (el) {
      var soundComp = el.components && el.components.sound;
      if (soundComp && soundComp.pool && soundComp.pool.children) {
        soundComp.pool.children.forEach(function (audio) {
          if (audio.context && audio.context.state === "suspended") {
            audio.context.resume();
          }
        });
      }
    });
  } catch (e) {}

  try {
    if (ambientCtx && ambientCtx.state === "suspended") ambientCtx.resume();
  } catch (e) {}

  try {
    if (footstepCtx && footstepCtx.state === "suspended") footstepCtx.resume();
  } catch (e) {}
}

function isWebAudioWorking(el) {
  try {
    var soundComp = el.components && el.components.sound;
    if (soundComp && soundComp.pool && soundComp.pool.children.length > 0) {
      return soundComp.pool.children[0].context.state === "running";
    }
  } catch (e) {}
  return false;
}

function getAudioIdFromSound(el) {
  if (el._soundAudioId) return el._soundAudioId;
  try {
    var raw = el.getDOMAttribute("sound");
    if (raw && typeof raw === "string") {
      var match = raw.match(/src:#([^;]+)/);
      if (match) return match[1].trim();
    }
  } catch (e) {}
  return null;
}

function getAudioElFromSound(el) {
  var id = getAudioIdFromSound(el);
  if (id) return document.getElementById(id);
  return null;
}

// Feature 3: Distance-based volume scaling for TTS
function getDistanceVolume(sphereEl) {
  try {
    var cam = document.querySelector("[camera]");
    if (!cam) return 1.0;
    var wp = new THREE.Vector3();
    sphereEl.getObject3D("mesh").getWorldPosition(wp);
    var dist = distance(cam.object3D.position.x, cam.object3D.position.z, wp.x, wp.z);
    // Volume: full at distance 0, fading to 0.2 at distance 15+
    return Math.max(0.2, Math.min(1.0, 1.0 - (dist - 2) / 15));
  } catch (e) {
    return 1.0;
  }
}

function playSoundOnElement(el) {
  var audioId = getAudioIdFromSound(el);

  muteBeacon(el);
  markVisited(el); // Feature 8: breadcrumb
  highlightBackdropSection(audioId); // Highlight corresponding section on the backdrop

  if (audioId && ttsTextMap[audioId]) {
    var text = ttsTextMap[audioId];
    var vol = getDistanceVolume(el); // Feature 3: distance filtering

    setTimeout(function () {
      var utterance = new SpeechSynthesisUtterance(text);
      if (ttsVoice) utterance.voice = ttsVoice;
      utterance.lang = currentLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = vol;
      utterance.onend = function () { unmuteBeacon(el); onSpeechFinished(el); };
      utterance.onerror = function () { unmuteBeacon(el); };
      speechSynthesis.speak(utterance);
    }, 50);
    return;
  }

  if (isWebAudioWorking(el)) {
    el.components.sound.playSound();
  } else {
    var audioEl = getAudioElFromSound(el);
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(function () {});
    }
  }
}

function pauseSoundOnElement(el) {
  var audioId = getAudioIdFromSound(el);
  if (audioId && ttsTextMap[audioId]) {
    return;
  }

  if (isWebAudioWorking(el)) {
    el.components.sound.pauseSound();
  } else {
    var audioEl = getAudioElFromSound(el);
    if (audioEl) { audioEl.pause(); }
  }
}

function stopSoundOnElement(el) {
  var audioId = getAudioIdFromSound(el);
  if (audioId && ttsTextMap[audioId]) {
    speechSynthesis.cancel();
    return;
  }

  if (isWebAudioWorking(el)) {
    el.components.sound.stopSound();
  } else {
    var audioEl = getAudioElFromSound(el);
    if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
  }
}

function muteBeacon(el) {
  try {
    var beaconComp = el.components && el.components.sound__beacon;
    if (beaconComp) beaconComp.pauseSound();
  } catch (e) {}
}

function unmuteBeacon(el) {
  try {
    var beaconComp = el.components && el.components.sound__beacon;
    if (beaconComp) beaconComp.playSound();
  } catch (e) {}
}

function checkAudio(audioArray) {
  if (!playing) {
    if (ttsMode === "webspeech") speechSynthesis.resume();
    audioArray.forEach(function (s) { playSoundOnElement(s); });
    playing = true;
  } else {
    if (ttsMode === "webspeech") speechSynthesis.cancel();
    audioArray.forEach(function (s) { pauseSoundOnElement(s); });
    playing = false;
  }
}

function distance(x1, z1, x2, z2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2));
}

// ============================================================
// PLAY ALL WITH DISTANCE VOLUME (CapsLock)
// ============================================================
var playAllActive = false;
var playAllUtterances = [];

function playAllWithDistanceVolume() {
  if (playAllActive) {
    // Stop all
    playAllActive = false;
    speechSynthesis.cancel();
    playAllUtterances = [];
    return;
  }

  if (!sounds || sounds.length === 0) return;
  playAllActive = true;

  var cam = document.querySelector("[camera]");
  if (!cam) return;
  var cx = cam.object3D.position.x;
  var cz = cam.object3D.position.z;

  // Collect all spheres with text, sorted by distance (nearest first)
  var items = [];
  sounds.forEach(function (s) {
    var audioId = getAudioIdFromSound(s);
    if (!audioId || !ttsTextMap[audioId]) return;
    var wp = new THREE.Vector3();
    try {
      s.getObject3D("mesh").getWorldPosition(wp);
      var dist = distance(cx, cz, wp.x, wp.z);
      items.push({ el: s, audioId: audioId, text: ttsTextMap[audioId], dist: dist });
    } catch (e) {}
  });

  items.sort(function (a, b) { return a.dist - b.dist; });

  // Speak them sequentially with volume based on distance
  function speakNext(idx) {
    if (!playAllActive || idx >= items.length) {
      playAllActive = false;
      return;
    }
    var item = items[idx];
    // Volume: 1.0 at distance 0, down to 0.15 at distance 30+
    var vol = Math.max(0.15, Math.min(1.0, 1.0 - (item.dist / 35)));

    markVisited(item.el);

    var utt = new SpeechSynthesisUtterance(item.text);
    if (ttsVoice) utt.voice = ttsVoice;
    utt.lang = currentLang;
    utt.volume = vol;
    utt.rate = 1.0;
    utt.onend = function () { speakNext(idx + 1); };
    utt.onerror = function () { speakNext(idx + 1); };
    speechSynthesis.speak(utt);
  }

  speechSynthesis.cancel();
  setTimeout(function () { speakNext(0); }, 50);
}

// ============================================================
// AUTO-ADVANCE: drift to next element when current finishes
// ============================================================
function buildReadingOrder(data) {
  readingOrder = [];
  // Title
  var titleEl = document.getElementById("title");
  if (titleEl) readingOrder.push(titleEl);
  // Introduction
  var introEl = document.getElementById("intro");
  if (introEl) readingOrder.push(introEl);

  // Helper: add header then its paragraph, then recurse into subsections
  function addSectionToOrder(section, keyPrefix) {
    Object.keys(section).forEach(function (key, i) {
      var sec = section[key];
      // Header element
      var headerId = key + i;
      var headerEl = document.getElementById(headerId);
      if (headerEl) readingOrder.push(headerEl);
      // Paragraph element (immediately after its header)
      var pId = key + i + "_p";
      var pEl = document.getElementById(pId);
      if (pEl) readingOrder.push(pEl);
      // Subsections (depth-first: read subsection content before moving to next sibling)
      if (sec.Subsections) {
        addSectionToOrder(sec.Subsections, key + "_Sub_");
      }
    });
  }

  if (data.Sections) {
    addSectionToOrder(data.Sections, "Sections_");
  }

  console.log("Reading order built:", readingOrder.length, "elements");
  readingOrder.forEach(function (el, idx) {
    console.log("  [" + idx + "]", el.id, el.tagName, el._hierarchyLevel || "");
  });
}

function findInReadingOrder(el) {
  for (var i = 0; i < readingOrder.length; i++) {
    if (readingOrder[i] === el) return i;
  }
  return -1;
}

function onSpeechFinished(el) {
  if (playAllActive) return; // don't interfere with play-all mode
  var idx = findInReadingOrder(el);
  if (idx < 0 || idx >= readingOrder.length - 1) return;

  // Only auto-advance if user hasn't moved recently (2 seconds)
  var timeSinceMove = Date.now() - lastUserMoveTime;
  if (timeSinceMove < 2000) return;

  // Mark this element so collide won't re-trigger on it during drift
  lastAutoPlayedEl = el;
  currentReadingIndex = idx;
  var nextEl = readingOrder[idx + 1];
  if (!nextEl) return;

  // Start drifting toward the next element (no announcement — just move)
  autoAdvanceTarget = nextEl;
  autoAdvanceDrifting = true;
  autoAdvanceActive = true;
  // Disable general collision during drift — only the target triggers on arrival
  collide = false;
  checkCollide = false;
}

function updateAutoDrift() {
  if (!autoAdvanceDrifting || !autoAdvanceTarget) return;

  var cam = document.querySelector("[camera]");
  if (!cam) return;

  var wp = new THREE.Vector3();
  try {
    autoAdvanceTarget.getObject3D("mesh").getWorldPosition(wp);
  } catch (e) { autoAdvanceDrifting = false; return; }

  var cx = cam.object3D.position.x;
  var cz = cam.object3D.position.z;
  var dx = wp.x - cx;
  var dz = wp.z - cz;
  var dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < proxi) {
    // Arrived — stop drifting, play the target directly
    autoAdvanceDrifting = false;
    autoAdvanceActive = false;
    lastAutoPlayedEl = null;

    // Play the target element directly instead of relying on collide
    if (ttsMode === "webspeech") speechSynthesis.cancel();
    playSoundOnElement(autoAdvanceTarget);
    sounds.forEach(function (s) {
      if (s !== autoAdvanceTarget) pauseSoundOnElement(s);
    });
    // Set checkCollide so collision resets properly after leaving
    checkCollide = true;
    collide = false;
    return;
  }

  // Move camera toward target
  var nx = dx / dist;
  var nz = dz / dist;
  cam.object3D.position.x += nx * driftSpeed;
  cam.object3D.position.z += nz * driftSpeed;
}

function cancelAutoDrift() {
  autoAdvanceDrifting = false;
  autoAdvanceActive = false;
  autoAdvanceTarget = null;
  lastAutoPlayedEl = null;
  collide = true; // re-enable manual collision
}

// ============================================================
// BACKDROP: Wikipedia article rendered behind the 3D scene
// ============================================================
var backdropSectionMap = {}; // maps sphere audio ID → backdrop DOM element

function renderBackdrop(data) {
  var backdrop = document.getElementById("wiki-backdrop");
  if (!backdrop || !data._rawHTML) return;

  // Parse the raw HTML into a clean document
  var parser = new DOMParser();
  var doc = parser.parseFromString(data._rawHTML, "text/html");

  // Remove heavy/noisy elements but keep more than we do for TTS
  doc.querySelectorAll(
    ".mw-editsection, .navbox, .sistersitebox, style, script, " +
    ".mw-references-wrap, .shortdescription, .mw-ext-cite-error"
  ).forEach(function (el) { el.remove(); });

  var body = doc.querySelector(".mw-parser-output") || doc.body;

  // Add a title element
  var titleH1 = document.createElement("h1");
  titleH1.textContent = data._pageTitle || data.Title.text;
  titleH1.id = "backdrop-title";
  backdrop.appendChild(titleH1);

  // Map title sphere to backdrop title
  backdropSectionMap[data.Title._id] = titleH1;

  // Insert the Wikipedia content
  var contentDiv = document.createElement("div");
  contentDiv.innerHTML = body.innerHTML;
  backdrop.appendChild(contentDiv);

  // Now walk through the backdrop to tag headings with IDs matching our sphere data
  // Map introduction (all content before first H2)
  var introWrapper = document.createElement("div");
  introWrapper.id = "backdrop-intro";
  var firstH2 = contentDiv.querySelector("h2, .mw-heading.mw-heading2");
  var introNodes = [];
  var child = contentDiv.firstChild;
  while (child && child !== firstH2) {
    // Check if this child contains an H2 (mw-heading wrapper)
    if (child.nodeType === 1) {
      var innerH2 = child.querySelector ? child.querySelector("h2") : null;
      if (child.tagName === "H2" || (child.classList && child.classList.contains("mw-heading2")) || innerH2) break;
    }
    introNodes.push(child);
    child = child.nextSibling;
  }
  introNodes.forEach(function (n) { introWrapper.appendChild(n); });
  contentDiv.insertBefore(introWrapper, contentDiv.firstChild);
  backdropSectionMap[data.Introduction._id] = introWrapper;

  // Map each section heading
  if (data.Sections) {
    Object.keys(data.Sections).forEach(function (key) {
      var sec = data.Sections[key];
      var headingText = sec.text;

      // Find the matching heading in the backdrop
      // Modern Wikipedia wraps headings in <div class="mw-heading"><h2>...</h2></div>
      var allHeadings = contentDiv.querySelectorAll("h2, h3, h4");
      for (var i = 0; i < allHeadings.length; i++) {
        var h = allHeadings[i];
        var hText = h.textContent.replace(/\[edit\]/gi, "").replace(/\s+/g, " ").trim();
        if (hText === headingText || hText.indexOf(headingText) === 0) {
          // The wrapping element: either the mw-heading div parent or the heading itself
          var wrapEl = (h.parentNode && h.parentNode.classList &&
            h.parentNode.classList.contains("mw-heading")) ? h.parentNode : h;

          // Wrap heading + its content in a section div
          var sectionDiv = document.createElement("div");
          sectionDiv.id = "backdrop-" + sec._id;
          wrapEl.parentNode.insertBefore(sectionDiv, wrapEl);
          sectionDiv.appendChild(wrapEl);

          // Collect sibling elements until next same-level heading
          var hLevel = parseInt(h.tagName.charAt(1));
          var next = sectionDiv.nextSibling;
          while (next) {
            if (next.nodeType === 1) {
              var nextTag = next.tagName;
              // Check for mw-heading wrapper div
              if (next.classList && next.classList.contains("mw-heading")) {
                var innerH = next.querySelector("h2, h3, h4, h5, h6");
                if (innerH && parseInt(innerH.tagName.charAt(1)) <= hLevel) break;
              }
              if ((nextTag === "H2" || nextTag === "H3" || nextTag === "H4") &&
                  parseInt(nextTag.charAt(1)) <= hLevel) break;
            }
            var toMove = next;
            next = next.nextSibling;
            sectionDiv.appendChild(toMove);
          }

          // Map header sphere
          backdropSectionMap[sec._id] = sectionDiv;

          // Map paragraph sphere to same section
          if (sec.P && sec.P._id) {
            backdropSectionMap[sec.P._id] = sectionDiv;
          }
          break;
        }
      }

      // Also map subsections
      if (sec.Subsections) {
        Object.keys(sec.Subsections).forEach(function (subKey) {
          var sub = sec.Subsections[subKey];
          var subText = sub.text;
          // Look inside the parent sectionDiv for subsection headings
          var allH3 = sectionDiv.querySelectorAll("h3, h4");
          for (var j = 0; j < allH3.length; j++) {
            var sh = allH3[j];
            var shText = sh.textContent.replace(/\[edit\]/gi, "").replace(/\s+/g, " ").trim();
            if (shText === subText || shText.indexOf(subText) === 0) {
              // Use the parent section div for the highlight since subsection is within it
              var subWrap = (sh.parentNode && sh.parentNode.classList &&
                sh.parentNode.classList.contains("mw-heading")) ? sh.parentNode : sh;
              backdropSectionMap[sub._id] = subWrap;
              if (sub.P && sub.P._id) {
                backdropSectionMap[sub.P._id] = subWrap;
              }
              break;
            }
          }
        });
      }
    });
  }

  // Show the backdrop
  backdrop.classList.add("visible");

  console.log("Backdrop rendered with", Object.keys(backdropSectionMap).length, "section mappings");
}

var currentHighlight = null;

function highlightBackdropSection(audioId) {
  var backdrop = document.getElementById("wiki-backdrop");
  if (!backdrop || !backdrop.classList.contains("visible")) return;

  // Remove previous highlight
  if (currentHighlight) {
    currentHighlight.classList.remove("sts-highlight");
  }

  var target = backdropSectionMap[audioId];
  if (!target) return;

  target.classList.add("sts-highlight");
  currentHighlight = target;

  // Smooth scroll the backdrop to the highlighted section
  target.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ============================================================
// AUTO-ANNOUNCE
// ============================================================
function tryAutoAnnounce(sphereEl, dist) {
  if (dist > announceProxi || dist < proxi) return;
  var audioId = getAudioIdFromSound(sphereEl);
  if (!audioId || !headingTextMap[audioId]) return;

  var now = Date.now();
  if (audioId === lastAnnouncedId && now - lastAnnounceTime < announceCooldown) return;
  if (speechSynthesis.speaking) return;

  lastAnnouncedId = audioId;
  lastAnnounceTime = now;
  highlightBackdropSection(audioId);

  var heading = headingTextMap[audioId];
  var utterance = new SpeechSynthesisUtterance(heading);
  if (ttsVoice) utterance.voice = ttsVoice;
  utterance.lang = currentLang;
  utterance.rate = 1.1;
  utterance.pitch = 1.1;
  utterance.volume = 0.7;
  speechSynthesis.speak(utterance);
}

// ============================================================
// UNLOCK AUDIO (mobile)
// ============================================================
function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  resumeAudio();

  var allAudio = document.querySelectorAll("audio");
  allAudio.forEach(function (audioEl) {
    var origTime = audioEl.currentTime;
    audioEl.play().then(function () {
      audioEl.pause();
      audioEl.currentTime = origTime;
    }).catch(function () {});
  });
  console.log("Mobile audio unlocked: " + allAudio.length + " elements");
}

// ============================================================
// A-FRAME COMPONENTS
// ============================================================
AFRAME.registerComponent("world-pos", {
  init: function () {
    this.worldpos = new THREE.Vector3();
  },
  update: function () {
    this.el.getObject3D("mesh").getWorldPosition(this.worldpos);
    if (this.worldpos.x < 0) {
      if (this.worldpos.x < minX) minX = this.worldpos.x;
    } else {
      if (this.worldpos.x > maxX) maxX = this.worldpos.x;
    }
    if (this.worldpos.z < minZ) minZ = this.worldpos.z;
  }
});

AFRAME.registerComponent("hit-bounds", {
  init: function () {},
  tick: function () {
    var bound = document.querySelector("#bound");
    if (!bound) return;
    var elX = this.el.object3D.position.x;
    var elZ = this.el.object3D.position.z;

    if (this.el.object3D.position.z >= z0 + margin) {
      this.el.object3D.position.z = z0 + margin;
      bound.object3D.position.x = elX;
      bound.object3D.position.z = z0 + margin + 0.5;
      if (!hit) { hit = true; playSoundOnElement(bound); }
    }
    if (this.el.object3D.position.z <= minZ - margin) {
      this.el.object3D.position.z = minZ - margin;
      bound.object3D.position.x = elX;
      bound.object3D.position.z = minZ - margin - 0.5;
      if (!hit) { hit = true; playSoundOnElement(bound); }
    }
    if (this.el.object3D.position.x >= maxX + margin) {
      this.el.object3D.position.x = maxX + margin;
      bound.object3D.position.x = maxX + margin + 0.5;
      bound.object3D.position.z = elZ;
      if (!hit) { hit = true; playSoundOnElement(bound); }
    }
    if (this.el.object3D.position.x <= minX - margin) {
      this.el.object3D.position.x = minX - margin;
      bound.object3D.position.x = minX - margin - 0.5;
      bound.object3D.position.z = elZ;
      if (!hit) { hit = true; playSoundOnElement(bound); }
    }

    if (
      this.el.object3D.position.x > minX - margin &&
      this.el.object3D.position.x < maxX + margin &&
      this.el.object3D.position.z > minZ - margin &&
      this.el.object3D.position.z < z0 + margin
    ) {
      if (hit) stopSoundOnElement(bound);
      hit = false;
    }
  }
});

// Feature 1: Footstep tracker component
AFRAME.registerComponent("footstep-tracker", {
  tick: function () {
    updateFootsteps();
    updateSectionAmbients(); // Feature 2
    updateAutoDrift(); // Auto-advance drift
  }
});

AFRAME.registerComponent("collide", {
  init: function () {
    this.worldpos = new THREE.Vector3();
  },
  tick: function () {
    var cameraEl = document.querySelector("[camera]");
    var camX = cameraEl.object3D.position.x;
    var camZ = cameraEl.object3D.position.z;
    this.el.getObject3D("mesh").getWorldPosition(this.worldpos);
    var dist = distance(camX, camZ, this.worldpos.x, this.worldpos.z);

    tryAutoAnnounce(this.el, dist);

    if (collide && dist < proxi) {
      // Feature 10: Portal spheres just announce — user presses Enter to navigate
      if (this.el._portalLink) {
        collide = false;
        // Announce the portal link title via TTS
        var linkTitle = this.el._portalLink.title;
        if (ttsMode === "webspeech") speechSynthesis.cancel();
        setTimeout(function () {
          var utt = new SpeechSynthesisUtterance(
            t("aria_sphere_portal", { name: linkTitle }) + ". " +
            (currentLang === "fr" ? "Appuyez sur Entrée pour charger." : "Press Enter to load.")
          );
          if (ttsVoice) utt.voice = ttsVoice;
          utt.lang = currentLang;
          speechSynthesis.speak(utt);
        }, 50);
        return;
      }

      checkCollide = true;
      collide = false;
      if (ttsMode === "webspeech") speechSynthesis.cancel();
      playSoundOnElement(this.el);
      sounds.forEach(function (s) {
        if (s !== this.el) pauseSoundOnElement(s);
      }.bind(this));
    }
  }
});

AFRAME.registerComponent("check-collide", {
  init: function () {},
  tick: function () {
    if (checkCollide) {
      var worldpos = new THREE.Vector3();
      var elX = this.el.object3D.position.x;
      var elZ = this.el.object3D.position.z;
      var colStatus = false;
      sounds.forEach(function (s) {
        s.getObject3D("mesh").getWorldPosition(worldpos);
        if (distance(elX, elZ, worldpos.x, worldpos.z) < proxi) colStatus = true;
      });
      if (!colStatus) {
        checkCollide = false;
        collide = true;
      }
    }
  }
});

AFRAME.registerComponent("play-proxi", {
  init: function () {},
  tick: function () {
    var worldpos = new THREE.Vector3();
    var elX = this.el.object3D.position.x;
    var elZ = this.el.object3D.position.z;
    var proxiEl;
    var closeDist = 100;

    document.addEventListener("keyup", function (event) {
      if (event.code === "ShiftLeft") {
        checkCollide = false;
        sounds.forEach(function (s) {
          s.getObject3D("mesh").getWorldPosition(worldpos);
          if (distance(elX, elZ, worldpos.x, worldpos.z) < closeDist) {
            closeDist = distance(elX, elZ, worldpos.x, worldpos.z);
            proxiEl = s;
          }
        });
        if (ttsMode === "webspeech") speechSynthesis.cancel();
        sounds.forEach(function (s) {
          if (s !== proxiEl) pauseSoundOnElement(s);
        });
        playSoundOnElement(proxiEl);
      }
    });
  }
});

// ============================================================
// KEYBOARD HANDLERS
// ============================================================
// Double-tap spacebar for welcome
document.addEventListener("keydown", function (event) {
  if (welcomePlayed) return;
  if (event.code === "Space") {
    var now = Date.now();
    if (now - lastUpTime < doubleTapThreshold) {
      welcomePlayed = true;
      var welcome = new Audio("./audio/welcome.mp3");
      welcome.play().catch(function (err) { console.warn("Welcome audio:", err); });
    }
    lastUpTime = now;
  }
});

// Feature 4: Tab = "Where am I"
document.addEventListener("keydown", function (event) {
  if (!started) return;
  if (event.code === "Tab") {
    event.preventDefault();
    speakWhereAmI();
  }
});

// Enter = activate nearby portal
document.addEventListener("keydown", function (event) {
  if (!started) return;
  if (event.code === "Enter") {
    event.preventDefault();
    var nearPortal = findNearestPortal();
    if (nearPortal) {
      activatePortal(nearPortal);
    }
  }
});

// Escape = return to starting position
document.addEventListener("keydown", function (event) {
  if (!started) return;
  if (event.code === "Escape") {
    event.preventDefault();
    var cam = document.querySelector("[camera]");
    if (cam) {
      cam.object3D.position.set(homePos.x, homePos.y, homePos.z);
      speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance(
        currentLang === "fr" ? "Retour au point de départ" : "Returned to start"
      );
      if (ttsVoice) utt.voice = ttsVoice;
      utt.lang = currentLang;
      setTimeout(function () { speechSynthesis.speak(utt); }, 50);
    }
  }
});

// P = play all text elements sequentially with distance-based volume
document.addEventListener("keydown", function (event) {
  if (!started) return;
  if (event.code === "KeyP") {
    event.preventDefault();
    playAllWithDistanceVolume();
  }
});

document.addEventListener("click", resumeAudio);
document.addEventListener("keydown", resumeAudio);

// ============================================================
// MOBILE TOUCH CONTROLS
// ============================================================
function addMobileControls() {
  if (!isMobile()) return;

  var moveSpeed = 0.15;
  var moveInterval = null;
  var activeDir = null;

  var container = document.createElement("div");
  container.id = "mobile-controls";
  container.setAttribute("role", "toolbar");
  container.setAttribute("aria-label", "Navigation controls");
  container.style.cssText =
    "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9998;" +
    "display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;";

  var topRow = document.createElement("div");
  topRow.style.cssText = "display:flex;gap:6px;pointer-events:none;";
  var midRow = document.createElement("div");
  midRow.style.cssText = "display:flex;gap:6px;pointer-events:none;";
  var botRow = document.createElement("div");
  botRow.style.cssText = "display:flex;gap:6px;pointer-events:none;";

  function makeBtn(label, dir, ariaLabel) {
    var btn = document.createElement("button");
    btn.textContent = label;
    btn.setAttribute("aria-label", ariaLabel);
    btn.style.cssText =
      "width:60px;height:60px;font-size:24px;border:none;border-radius:50%;" +
      "background:rgba(255,255,255,0.5);color:#333;pointer-events:auto;" +
      "touch-action:none;user-select:none;-webkit-user-select:none;" +
      "display:flex;align-items:center;justify-content:center;";

    function startMove(e) {
      e.preventDefault();
      unlockAllAudio();
      activeDir = dir;
      collide = true;
      doMove();
      moveInterval = setInterval(doMove, 50);
    }
    function stopMove(e) {
      e.preventDefault();
      activeDir = null;
      if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
    }

    btn.addEventListener("touchstart", startMove, { passive: false });
    btn.addEventListener("touchend", stopMove, { passive: false });
    btn.addEventListener("touchcancel", stopMove, { passive: false });
    return btn;
  }

  function doMove() {
    if (!activeDir) return;
    var cameraEl = document.querySelector("a-camera");
    if (!cameraEl) return;
    var pos = cameraEl.object3D.position;
    var rot = cameraEl.object3D.rotation;
    var yaw = rot.y;
    var forwardX = -Math.sin(yaw);
    var forwardZ = -Math.cos(yaw);
    var rightX = Math.cos(yaw);
    var rightZ = -Math.sin(yaw);

    if (activeDir === "forward") {
      pos.x += forwardX * moveSpeed; pos.z += forwardZ * moveSpeed;
    } else if (activeDir === "backward") {
      pos.x -= forwardX * moveSpeed; pos.z -= forwardZ * moveSpeed;
    } else if (activeDir === "left") {
      pos.x -= rightX * moveSpeed; pos.z -= rightZ * moveSpeed;
    } else if (activeDir === "right") {
      pos.x += rightX * moveSpeed; pos.z += rightZ * moveSpeed;
    }
    collide = true;
  }

  function makeSpacer() {
    var sp = document.createElement("div");
    sp.style.cssText = "width:60px;height:60px;pointer-events:none;";
    return sp;
  }

  topRow.appendChild(makeSpacer());
  topRow.appendChild(makeBtn("\u25B2", "forward", "Move forward"));
  topRow.appendChild(makeSpacer());

  midRow.appendChild(makeBtn("\u25C0", "left", "Move left"));
  var pauseBtn = document.createElement("button");
  pauseBtn.textContent = "\u23EF";
  pauseBtn.setAttribute("aria-label", "Pause or play audio");
  pauseBtn.style.cssText =
    "width:60px;height:60px;font-size:20px;border:none;border-radius:50%;" +
    "background:rgba(255,255,255,0.5);color:#333;pointer-events:auto;" +
    "touch-action:none;user-select:none;-webkit-user-select:none;" +
    "display:flex;align-items:center;justify-content:center;";
  var pauseTapTime = 0;
  pauseBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    unlockAllAudio();
    // Double-tap pause button = welcome audio (same as double-tap spacebar)
    if (!welcomePlayed) {
      var now = Date.now();
      if (now - pauseTapTime < doubleTapThreshold) {
        welcomePlayed = true;
        var welcome = new Audio("./audio/welcome.mp3");
        welcome.play().catch(function (err) { console.warn("Welcome audio:", err); });
      }
      pauseTapTime = now;
    }
    if (sounds) { checkCollide = false; checkAudio(sounds); }
  }, { passive: false });
  midRow.appendChild(pauseBtn);
  midRow.appendChild(makeBtn("\u25B6", "right", "Move right"));

  botRow.appendChild(makeSpacer());
  botRow.appendChild(makeBtn("\u25BC", "backward", "Move backward"));
  botRow.appendChild(makeSpacer());

  container.appendChild(topRow);
  container.appendChild(midRow);
  container.appendChild(botRow);
  document.body.appendChild(container);
}

// ============================================================
// UI HELPERS
// ============================================================
function updateProgress(text, percent) {
  var area = document.getElementById("progress-area");
  area.classList.add("visible");
  document.getElementById("progress-text").textContent = text;
  document.getElementById("progress-bar").style.width = percent + "%";
  var bar = document.getElementById("progress-bar-container");
  if (bar) bar.setAttribute("aria-valuenow", Math.round(percent));
}

function showError(msg) {
  var el = document.getElementById("error-msg");
  el.textContent = msg;
  el.classList.add("visible");
}

function hideError() {
  document.getElementById("error-msg").classList.remove("visible");
  document.getElementById("error-msg").textContent = "";
}

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}
