// ============================================================
// Real-Time Wikipedia-to-Spatial-Audio
// ============================================================

// --- Global variables (same as layout.js) ---
let sceneEl, assetEl, sounds;
const y = 1.6;
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
    overlay_desktop: "Use arrow keys to navigate, spacebar to play/pause, shift to find nearest sound",
    overlay_mobile: "Use on-screen buttons to move, tilt to look around, center button to play/pause",
    aria_sphere_title: "Article title: {name}",
    aria_sphere_intro: "Introduction",
    aria_sphere_section: "Section: {name}",
    aria_sphere_subsection: "Subsection: {name}",
    aria_sphere_paragraph: "Paragraph for: {name}",
    skip_sections: "See also|References|External links|Notes|Further reading|Bibliography|Sources"
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
    overlay_desktop: "Utilisez les flèches pour naviguer, espace pour pause, shift pour le son le plus proche",
    overlay_mobile: "Utilisez les boutons à l'écran pour vous déplacer, inclinez pour regarder, bouton central pour pause",
    aria_sphere_title: "Titre de l'article : {name}",
    aria_sphere_intro: "Introduction",
    aria_sphere_section: "Section : {name}",
    aria_sphere_subsection: "Sous-section : {name}",
    aria_sphere_paragraph: "Paragraphe pour : {name}",
    skip_sections: "Voir aussi|Références|Liens externes|Notes|Notes et références|Bibliographie|Sources|Articles connexes"
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

  // Update all elements with data-i18n attributes
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

  // Language selector
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

  // ElevenLabs toggle with ARIA
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
    console.log("Parsed Wikipedia data:", data);
    console.log("Sections found:", Object.keys(data.Sections).length);
    updateProgress(t("progress_fetched"), 15);

    await generateSpeech(data, elKey);
    updateProgress(t("progress_scene"), 90);

    await delay(200);

    createBeaconTones();
    buildScene(data);
    updateProgress(t("progress_done"), 100);

    await delay(400);
    document.getElementById("input-screen").style.display = "none";
    // Reveal A-Frame scene to assistive tech
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
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
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
// WIKIPEDIA FETCH & PARSE
// ============================================================
async function fetchWikipedia(input) {
  var title = input;
  // Detect language from URL or use selected language
  var wikiLang = currentLang;
  var match = input.match(/([a-z]{2,3})\.wikipedia\.org\/wiki\/([^#?]+)/);
  if (match) {
    wikiLang = match[1]; // use the language from the URL
    title = decodeURIComponent(match[2]).replace(/_/g, " ");
  } else {
    // Plain text title — could also be a non-language URL
    var urlMatch = input.match(/wikipedia\.org\/wiki\/([^#?]+)/);
    if (urlMatch) {
      title = decodeURIComponent(urlMatch[1]).replace(/_/g, " ");
    }
  }

  var apiUrl =
    "https://" + wikiLang + ".wikipedia.org/w/api.php?action=parse&page=" +
    encodeURIComponent(title) +
    "&format=json&origin=*&prop=text|displaytitle";

  var resp = await fetch(apiUrl);
  if (!resp.ok) throw new Error("Wikipedia API error: " + resp.status);
  var json = await resp.json();
  if (json.error) throw new Error("Wikipedia: " + json.error.info);

  var html = json.parse.text["*"];
  var pageTitle = json.parse.title;

  return parseWikipediaHTML(pageTitle, html);
}

function parseWikipediaHTML(pageTitle, html) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, "text/html");

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

  var introText = truncateText(introTexts.join(" "), 500);
  var titleId = sanitizeId("Title_header");
  var introId = sanitizeId("Introduction_paragraph");

  var data = {
    Title: { text: pageTitle, audio_path: titleId + ".mp3", _id: titleId },
    Introduction: { text: introText, audio_path: introId + ".mp3", _id: introId },
    Sections: {}
  };

  if (sectionStart < 0) return data;

  // Build skip regex from i18n
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
        sub.P.text = truncateText((sub.P.text ? sub.P.text + " " : "") + pText, 500);
        if (!sub.P._id) {
          var pSubId = sanitizeId("Sections_H2_" + data.Sections[currentH2].text + "_Subsections_H3_" + sub.text + "_paragraph");
          sub.P._id = pSubId;
          sub.P.audio_path = pSubId + ".mp3";
        }
      } else if (currentH2 && data.Sections[currentH2]) {
        var sec = data.Sections[currentH2];
        sec.P.text = truncateText((sec.P.text ? sec.P.text + " " : "") + pText, 500);
        if (!sec.P._id) {
          var pSecId = sanitizeId("Sections_H2_" + sec.text + "_paragraph");
          sec.P._id = pSecId;
          sec.P.audio_path = pSecId + ".mp3";
        }
      }
    }
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
      blocks.push({ id: sec.P._id, text: sec.P.text, heading: sec.text });
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
  // Filter by selected language
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
  var voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel (English)
  // For French, use a French voice if available
  if (currentLang === "fr") {
    voiceId = "pFZP5JQG7iQjIQuC4Bku"; // Lily (French, multilingual)
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
}

function drawLayout(data) {
  z = -d1;

  var titleAudioId = data.Title._id;
  var introAudioId = data.Introduction._id;

  var titleEl = createElement(sceneEl, x0, y, z, "#EF2D5E", "title", "title", titleAudioId, true, "title",
    t("aria_sphere_title", { name: data.Title.text }));
  var introEl = createElement(titleEl, x0, 0, z, "#EF2D5E", "intro", "intro", introAudioId, true, "title",
    t("aria_sphere_intro"));

  createElement(sceneEl, minX - margin, y, z0 + margin, "#F0FFFF", "sound-cues", "bound", "bound-cue", false, null, "Boundary");

  iterateSection(x0, 0, z, d1, data.Sections, introEl, "Sections_", 0);

  sounds = document.querySelectorAll("a-sphere");
  console.log("Total spheres created:", sounds.length);

  document.querySelector("[camera]").setAttribute("play-proxi", "");

  document.addEventListener("keyup", function (event) {
    if (event.code === "Space") {
      checkCollide = false;
      checkAudio(sounds);
    }
  });

  document.addEventListener("keydown", function (event) {
    collide = true;
  });

  document.querySelector("[camera]").setAttribute("hit-bounds", "");

  resumeAudio();
  setTimeout(resumeAudio, 500);
  setTimeout(resumeAudio, 1500);

  if (isMobile()) {
    document.addEventListener("touchstart", function mobileUnlock() {
      unlockAllAudio();
      document.removeEventListener("touchstart", mobileUnlock);
    }, { once: true });
  }
}

function iterateSection(x, y, z, d, section, parentEl, prename, angle) {
  var numSections = Object.keys(section).length;
  var degStep = numSections === 1 ? Math.PI / 2 : Math.PI / (numSections - 1);

  Object.keys(section).forEach(function (key, i) {
    var sec = section[key];
    var name = prename + key.replace(":", "").replaceAll(" ", "_");
    var headerAudioId = sec._id;
    var level = key.startsWith("H3") ? "subsection" : "section";
    var ariaKey = key.startsWith("H3") ? "aria_sphere_subsection" : "aria_sphere_section";

    var x1 = -d * Math.cos(degStep * i + angle);
    var z1 = -d / 2 - d * Math.sin(degStep * i + angle);

    var headerEl = createElement(parentEl, x1, y, z1, "#00FFFF", "header", key + i, headerAudioId, true, level,
      t(ariaKey, { name: sec.text }));

    if (sec.P && sec.P.text && sec.P._id) {
      var xp = -dp * Math.cos(degStep * i + angle);
      var zp = -dp * Math.sin(degStep * i + angle);
      createElement(headerEl, xp, y, zp, "#FFFF00", "p", key + i + "_p", sec.P._id, true, "paragraph",
        t("aria_sphere_paragraph", { name: sec.text }));
    }

    if (sec.Subsections) {
      iterateSection(x1, y, z1, d2, sec.Subsections, headerEl, name + "_Subsections_", 0);
    }
  });
}

function createElement(parentEl, x, y, z, color, className, id, soundId, autoPlay, beaconLevel, ariaLabel) {
  var sphereEl = document.createElement("a-sphere");
  sphereEl.setAttribute("color", color);
  sphereEl.setAttribute("shader", "flat");
  sphereEl.setAttribute("radius", "0.5");
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

  if (autoPlay) {
    sphereEl.setAttribute("world-pos", "");
    sphereEl.setAttribute("collide", "");
  }

  parentEl.appendChild(sphereEl);
  elCount++;
  return sphereEl;
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
    '<div style="color:white;font-family:sans-serif;text-align:center;">' +
    '<h1 style="font-size:2rem;margin-bottom:1rem;">' + t("overlay_title") + '</h1>' +
    '<p style="font-size:1.2rem;">' + t("overlay_start") + '</p>' +
    '<p style="font-size:0.9rem;margin-top:1rem;opacity:0.7;">' +
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

    startAmbient();
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

function playSoundOnElement(el) {
  var audioId = getAudioIdFromSound(el);

  muteBeacon(el);

  if (audioId && ttsTextMap[audioId]) {
    var text = ttsTextMap[audioId];
    setTimeout(function () {
      var utterance = new SpeechSynthesisUtterance(text);
      if (ttsVoice) utterance.voice = ttsVoice;
      utterance.lang = currentLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = function () { unmuteBeacon(el); };
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
// DOUBLE-TAP DOWN ARROW FOR WELCOME
// ============================================================
document.addEventListener("keydown", function (event) {
  if (welcomePlayed) return;
  if (event.code === "ArrowDown") {
    var now = Date.now();
    if (now - lastUpTime < doubleTapThreshold) {
      welcomePlayed = true;
      var welcome = new Audio("./audio/welcome.mp3");
      welcome.play().catch(function (err) { console.warn("Welcome audio:", err); });
    }
    lastUpTime = now;
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
      if (dir === "backward" && !welcomePlayed) {
        var now = Date.now();
        if (now - lastUpTime < doubleTapThreshold) {
          welcomePlayed = true;
          var welcome = new Audio("./audio/welcome.mp3");
          welcome.play().catch(function (err) { console.warn("Welcome audio:", err); });
        }
        lastUpTime = now;
      }
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
  pauseBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    unlockAllAudio();
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
  // Update ARIA progressbar
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
