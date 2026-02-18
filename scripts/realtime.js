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

// --- TTS mode: "webspeech" or "elevenlabs" ---
let ttsMode = "webspeech";
let ttsVoice = null; // selected Web Speech voice
let ttsTotal = 0;
let ttsDone = 0;

// Map from audio element id → text for Web Speech playback
var ttsTextMap = {};

// ============================================================
// DOM READY
// ============================================================
window.addEventListener("DOMContentLoaded", function () {
  sceneEl = document.querySelector("a-scene");
  assetEl = document.querySelector("a-assets");

  // Restore ElevenLabs key from sessionStorage
  var savedKey = sessionStorage.getItem("elevenlabs_key");
  if (savedKey) {
    document.getElementById("elevenlabs-key").value = savedKey;
  }

  // Toggle ElevenLabs section
  document.getElementById("elevenlabs-toggle").addEventListener("click", function () {
    document.getElementById("elevenlabs-section").classList.toggle("open");
  });

  // Generate button
  document.getElementById("generate-btn").addEventListener("click", function () {
    startGeneration();
  });

  // Allow Enter key in URL input
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
    showError("Please enter a Wikipedia URL or article title.");
    return;
  }

  hideError();
  var btn = document.getElementById("generate-btn");
  btn.disabled = true;

  // Save ElevenLabs key in sessionStorage
  var elKey = document.getElementById("elevenlabs-key").value.trim();
  if (elKey) sessionStorage.setItem("elevenlabs_key", elKey);

  try {
    updateProgress("Fetching Wikipedia article...", 5);

    var data = await fetchWikipedia(urlInput);
    console.log("Parsed Wikipedia data:", data);
    console.log("Sections found:", Object.keys(data.Sections).length);
    updateProgress("Article fetched. Generating speech...", 15);

    await generateSpeech(data, elKey);
    updateProgress("Building 3D scene...", 90);

    // Small delay so browser registers audio elements
    await delay(200);

    buildScene(data);
    updateProgress("Done!", 100);

    // Hide input screen, show start overlay
    await delay(400);
    document.getElementById("input-screen").style.display = "none";
    showStartOverlay();
  } catch (err) {
    console.error(err);
    showError(err.message || "Something went wrong.");
    btn.disabled = false;
  }
}

// ============================================================
// WIKIPEDIA FETCH & PARSE
// ============================================================
async function fetchWikipedia(input) {
  // Extract page title from URL or use as-is
  var title = input;
  var match = input.match(/wikipedia\.org\/wiki\/([^#?]+)/);
  if (match) title = decodeURIComponent(match[1]).replace(/_/g, " ");

  var apiUrl =
    "https://en.wikipedia.org/w/api.php?action=parse&page=" +
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

  // Remove unwanted elements
  doc.querySelectorAll(
    ".mw-editsection, .reference, .reflist, .navbox, .sistersitebox, " +
    ".mw-empty-elt, table, .infobox, .sidebar, .toc, .thumb, " +
    "style, script, .mw-references-wrap, .hatnote, .shortdescription, " +
    ".mw-ext-cite-error, figure, .gallery"
  ).forEach(function (el) { el.remove(); });

  var body = doc.querySelector(".mw-parser-output") || doc.body;
  var children = Array.from(body.children);

  // Helper: resolve the effective tag and element for a child.
  // Modern Wikipedia wraps headings in <div class="mw-heading mw-heading2">.
  function resolveChild(child) {
    var tag = child.tagName;
    // Handle mw-heading wrapper divs
    if (tag === "DIV" && child.classList.contains("mw-heading")) {
      var inner = child.querySelector("h2, h3, h4, h5, h6");
      if (inner) return { tag: inner.tagName, el: inner };
    }
    return { tag: tag, el: child };
  }

  // Collect introduction (everything before first H2)
  var introTexts = [];
  var sectionStart = -1;
  for (var i = 0; i < children.length; i++) {
    var resolved = resolveChild(children[i]);
    if (resolved.tag === "H2") { sectionStart = i; break; }
    if (resolved.tag === "P") {
      var t = resolved.el.textContent.trim();
      if (t) introTexts.push(t);
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

  // Parse sections
  var currentH2 = null;
  var currentH3 = null;

  for (var j = sectionStart; j < children.length; j++) {
    var r = resolveChild(children[j]);
    var tag = r.tag;
    var el = r.el;

    if (tag === "H2") {
      var heading = getHeadingText(el);
      // Skip reference/external/see also sections
      if (/^(See also|References|External links|Notes|Further reading|Bibliography|Sources)$/i.test(heading)) {
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
  // Collect all text blocks that need TTS
  var blocks = [];
  blocks.push({ id: data.Title._id, text: data.Title.text });
  if (data.Introduction.text) {
    blocks.push({ id: data.Introduction._id, text: data.Introduction.text });
  }
  collectSectionBlocks(data.Sections, blocks);

  ttsTotal = blocks.length;
  ttsDone = 0;

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
    blocks.push({ id: sec._id, text: sec.text });
    if (sec.P && sec.P.text && sec.P._id) {
      blocks.push({ id: sec.P._id, text: sec.P.text });
    }
    if (sec.Subsections) {
      collectSectionBlocks(sec.Subsections, blocks);
    }
  }
}

// --- Web Speech API ---
// Web Speech API can't export audio to files. Instead we:
// 1. Create a tiny silent placeholder audio for each section (so A-Frame sound component works)
// 2. Store the text for each id in ttsTextMap
// 3. Override playSoundOnElement to use speechSynthesis.speak() for these elements
async function generateWebSpeech(blocks) {
  // Create one shared silent audio blob
  var silentBlob = createSilentWavBlob();
  var silentUrl = URL.createObjectURL(silentBlob);

  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    // Store text for live TTS playback
    ttsTextMap[block.id] = block.text;
    // Add silent placeholder audio element
    addAudioElement(block.id, silentUrl);

    ttsDone++;
    updateProgress(
      "Preparing speech: " + ttsDone + "/" + ttsTotal + " sections...",
      15 + Math.round((ttsDone / ttsTotal) * 70)
    );
  }
}

function createSilentWavBlob() {
  // Minimal 0.1s silent WAV
  var sampleRate = 8000;
  var numSamples = 800; // 0.1 seconds
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
  // samples are already 0 (silent)
  return new Blob([buf], { type: "audio/wav" });
}

function writeString(view, offset, str) {
  for (var i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
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
  var english = voices.filter(function (v) { return /en[-_]/i.test(v.lang); });
  if (english.length === 0) english = voices;

  var premium = english.filter(function (v) {
    return /enhanced|premium|natural/i.test(v.name);
  });
  if (premium.length > 0) return premium[0];

  var google = english.filter(function (v) {
    return /google/i.test(v.name);
  });
  if (google.length > 0) return google[0];

  return english[0] || voices[0] || null;
}

// --- ElevenLabs API ---
async function generateElevenLabs(blocks, apiKey) {
  var voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel
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
        // Fallback: store for web speech
        ttsTextMap[block.id] = block.text;
        var silentUrl = URL.createObjectURL(createSilentWavBlob());
        addAudioElement(block.id, silentUrl);
      }
      ttsDone++;
      updateProgress(
        "Generating speech: " + ttsDone + "/" + ttsTotal + " sections...",
        15 + Math.round((ttsDone / ttsTotal) * 70)
      );
    });
  }
}

async function ttsElevenLabs(text, id, apiKey, voiceId) {
  var url = "https://api.elevenlabs.io/v1/text-to-speech/" + voiceId;
  var resp = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: text,
      model_id: "eleven_monolingual_v1"
    })
  });

  if (!resp.ok) {
    var errText = await resp.text().catch(function () { return ""; });
    throw new Error("ElevenLabs " + resp.status + ": " + errText);
  }

  var blob = await resp.blob();
  return URL.createObjectURL(blob);
}

// --- Audio element helpers ---
function addAudioElement(id, srcUrl) {
  var audioEl = document.createElement("audio");
  audioEl.setAttribute("id", id);
  audioEl.setAttribute("preload", "auto");
  audioEl.setAttribute("src", srcUrl);
  assetEl.appendChild(audioEl);
}

// ============================================================
// BUILD 3D SCENE (reused from layout.js)
// ============================================================
function buildScene(data) {
  drawLayout(data);
}

function drawLayout(data) {
  z = -d1;

  var titleAudioId = data.Title._id;
  var introAudioId = data.Introduction._id;

  var titleEl = createElement(sceneEl, x0, y, z, "#EF2D5E", "title", "title", titleAudioId, true);
  var introEl = createElement(titleEl, x0, 0, z, "#EF2D5E", "intro", "intro", introAudioId, true);

  // Boundary sound
  createElement(sceneEl, minX - margin, y, z0 + margin, "#F0FFFF", "sound-cues", "bound", "bound-cue", false);

  iterateSection(x0, 0, z, d1, data.Sections, introEl, "Sections_", 0);

  sounds = document.querySelectorAll("a-sphere");
  console.log("Total spheres created:", sounds.length);

  document.querySelector("[camera]").setAttribute("play-proxi", "");

  // Spacebar control
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

    var x1 = -d * Math.cos(degStep * i + angle);
    var z1 = -d / 2 - d * Math.sin(degStep * i + angle);

    var headerEl = createElement(parentEl, x1, y, z1, "#00FFFF", "header", key + i, headerAudioId, true);

    if (sec.P && sec.P.text && sec.P._id) {
      var xp = -dp * Math.cos(degStep * i + angle);
      var zp = -dp * Math.sin(degStep * i + angle);
      createElement(headerEl, xp, y, zp, "#FFFF00", "p", key + i + "_p", sec.P._id, true);
    }

    if (sec.Subsections) {
      iterateSection(x1, y, z1, d2, sec.Subsections, headerEl, name + "_Subsections_", 0);
    }
  });
}

function createElement(parentEl, x, y, z, color, className, id, soundId, autoPlay) {
  var sphereEl = document.createElement("a-sphere");
  sphereEl.setAttribute("color", color);
  sphereEl.setAttribute("shader", "flat");
  sphereEl.setAttribute("radius", "0.5");
  sphereEl.setAttribute("position", x + " " + y + " " + z);
  sphereEl.setAttribute("class", className);
  sphereEl.setAttribute("id", id);

  var soundSrc = "src:#" + soundId;
  sphereEl.setAttribute(
    "sound",
    autoPlay
      ? soundSrc + "; autoplay: false; loop: false; distanceModel: exponential; refDistance: 3; rolloffFactor: 3; poolSize: 1"
      : soundSrc + "; poolSize: 1"
  );

  // Store the audio id so we can look it up later
  // (A-Frame resolves src:#id to a full URL, so we can't extract it back)
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
// START OVERLAY (same as layout.js)
// ============================================================
function showStartOverlay() {
  var overlay = document.createElement("div");
  overlay.id = "start-overlay";
  overlay.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);" +
    "display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;";
  overlay.innerHTML =
    '<div style="color:white;font-family:sans-serif;text-align:center;">' +
    '<h1 style="font-size:2rem;margin-bottom:1rem;">Screen-to-Soundscape</h1>' +
    '<p style="font-size:1.2rem;">Click anywhere or press any key to start</p>' +
    '<p style="font-size:0.9rem;margin-top:1rem;opacity:0.7;">' +
    (isMobile()
      ? "Use on-screen buttons to move, tilt to look around, center button to play/pause"
      : "Use arrow keys to navigate, spacebar to play/pause, shift to find nearest sound") +
    "</p></div>";
  document.body.appendChild(overlay);

  function startApp() {
    if (started) return;
    started = true;
    overlay.remove();

    var doubletap = new Audio("./audio/doubletap.mp3");
    doubletap.play().catch(function (err) { console.warn("Doubletap audio:", err); });

    // Warm up speechSynthesis during user gesture so it's unlocked for later
    if (ttsMode === "webspeech") {
      var warmup = new SpeechSynthesisUtterance("");
      speechSynthesis.speak(warmup);
      speechSynthesis.cancel();
    }

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
// AUDIO HELPERS — with Web Speech TTS override
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
  // First check our custom attribute (set during createElement)
  if (el._soundAudioId) return el._soundAudioId;
  try {
    // Fallback: try raw DOM attribute string (A-Frame's getAttribute resolves
    // the src to a full URL, so we must use getDOMAttribute for the #id form)
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

// The key override: if this element's audio id is in ttsTextMap,
// use speechSynthesis instead of trying to play the (silent) audio file.
function playSoundOnElement(el) {
  var audioId = getAudioIdFromSound(el);
  console.log("playSoundOnElement audioId:", audioId, "inMap:", !!(audioId && ttsTextMap[audioId]), "mapKeys sample:", Object.keys(ttsTextMap).slice(0, 3));

  // Check if this has Web Speech text to speak
  if (audioId && ttsTextMap[audioId]) {
    // Use a short delay after any prior cancel() to work around Chrome bug
    // where cancel() immediately before speak() silently drops the utterance.
    var text = ttsTextMap[audioId];
    setTimeout(function () {
      var utterance = new SpeechSynthesisUtterance(text);
      if (ttsVoice) utterance.voice = ttsVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
      console.log("Speaking:", text.substring(0, 60) + "...");
    }, 50);
    return;
  }

  // Normal audio playback (ElevenLabs or bound-cue)
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
    // Don't cancel here — let the collide handler manage cancellation
    // so we avoid the cancel-then-speak Chrome bug
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
// A-FRAME COMPONENTS (same as layout.js)
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
    if (collide) {
      var cameraEl = document.querySelector("[camera]");
      var camX = cameraEl.object3D.position.x;
      var camZ = cameraEl.object3D.position.z;
      this.el.getObject3D("mesh").getWorldPosition(this.worldpos);
      if (distance(camX, camZ, this.worldpos.x, this.worldpos.z) < proxi) {
        checkCollide = true;
        collide = false;
        // Cancel any ongoing speech before speaking new section
        if (ttsMode === "webspeech") speechSynthesis.cancel();
        playSoundOnElement(this.el);
        console.log("collide: " + this.el.id);
        sounds.forEach(function (s) {
          if (s !== this.el) pauseSoundOnElement(s);
        }.bind(this));
      }
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
// DOUBLE-TAP UP ARROW FOR WELCOME
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

// Resume AudioContext on any click/key
document.addEventListener("click", resumeAudio);
document.addEventListener("keydown", resumeAudio);

// ============================================================
// MOBILE TOUCH CONTROLS (same as layout.js)
// ============================================================
function addMobileControls() {
  if (!isMobile()) return;

  var moveSpeed = 0.15;
  var moveInterval = null;
  var activeDir = null;

  var container = document.createElement("div");
  container.id = "mobile-controls";
  container.style.cssText =
    "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9998;" +
    "display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;";

  var topRow = document.createElement("div");
  topRow.style.cssText = "display:flex;gap:6px;pointer-events:none;";
  var midRow = document.createElement("div");
  midRow.style.cssText = "display:flex;gap:6px;pointer-events:none;";
  var botRow = document.createElement("div");
  botRow.style.cssText = "display:flex;gap:6px;pointer-events:none;";

  function makeBtn(label, dir) {
    var btn = document.createElement("button");
    btn.textContent = label;
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
  topRow.appendChild(makeBtn("\u25B2", "forward"));
  topRow.appendChild(makeSpacer());

  midRow.appendChild(makeBtn("\u25C0", "left"));
  var pauseBtn = document.createElement("button");
  pauseBtn.textContent = "\u23EF";
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
  midRow.appendChild(makeBtn("\u25B6", "right"));

  botRow.appendChild(makeSpacer());
  botRow.appendChild(makeBtn("\u25BC", "backward"));
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
}

function showError(msg) {
  var el = document.getElementById("error-msg");
  el.textContent = msg;
  el.classList.add("visible");
}

function hideError() {
  document.getElementById("error-msg").classList.remove("visible");
}

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}
