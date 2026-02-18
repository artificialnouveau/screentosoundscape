// Global variables - keep them here but don't assign DOM elements yet
let sceneEl, assetEl, sounds;
const y = 1.6;
const d1 = 8;
const d2 = 8;
const dp = 6;
let x0 = 0,
  z = 0,
  z0 = 0;
let minX = 0,
  maxX = 0,
  minZ = 0;
const margin = 2;
const proxi = 2;
let elCount = 0;
let checkCollide = false;
let collide = true;

window.addEventListener("DOMContentLoaded", (event) => {
  sceneEl = document.querySelector("a-scene");
  assetEl = document.querySelector("a-assets");
  showStartOverlay();
});

//////////////// MOBILE DETECTION ////////////////
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
}

//////////////// START OVERLAY ////////////////
let started = false;
function showStartOverlay() {
  const overlay = document.createElement("div");
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
      ? 'Use on-screen buttons to move, tilt to look around, center button to play/pause'
      : 'Use arrow keys to navigate, spacebar to play/pause, shift to find nearest sound') +
    '</p>' +
    "</div>";
  document.body.appendChild(overlay);

  function startApp() {
    if (started) return;
    started = true;
    overlay.remove();

    // Play doubletap instruction audio on start
    var doubletap = new Audio("./audio/doubletap.mp3");
    doubletap.play().catch(function(err) { console.warn("Doubletap audio:", err); });

    // Resume AudioContext during user gesture (needed for Firefox)
    resumeAudio();

    fetchJSONData();
  }

  overlay.addEventListener("click", startApp, { once: true });
  document.addEventListener("keydown", startApp, { once: true });
}

// Resume ALL audio contexts we can find — THREE, A-Frame, and inside sound pools
function resumeAudio() {
  try {
    // 1. THREE's shared context
    if (typeof THREE !== "undefined" && THREE.AudioContext) {
      var ctx = THREE.AudioContext.getContext();
      if (ctx.state === "suspended") ctx.resume();
    }
  } catch (e) {}

  try {
    // 2. A-Frame scene's audioListener context
    var scene = document.querySelector("a-scene");
    if (scene && scene.audioListener && scene.audioListener.context) {
      if (scene.audioListener.context.state === "suspended") {
        scene.audioListener.context.resume();
      }
    }
  } catch (e) {}

  try {
    // 3. Dig into every sound component's pool to find and resume their context
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

//////////////// AUDIO FALLBACK HELPERS ////////////////
// These check if Web Audio context is running; if not, fall back to HTML <audio> element directly.
// This fixes Firefox where AudioContext stays suspended despite resume() calls.

function isWebAudioWorking(el) {
  try {
    var soundComp = el.components && el.components.sound;
    if (soundComp && soundComp.pool && soundComp.pool.children.length > 0) {
      return soundComp.pool.children[0].context.state === "running";
    }
  } catch (e) {}
  return false;
}

function getAudioElFromSound(el) {
  try {
    var soundAttr = el.getAttribute("sound");
    if (soundAttr) {
      var match = soundAttr.match(/src:#([^;]+)/);
      if (match) {
        return document.getElementById(match[1].trim());
      }
    }
  } catch (e) {}
  return null;
}

function playSoundOnElement(el) {
  if (isWebAudioWorking(el)) {
    el.components.sound.playSound();
  } else {
    var audioEl = getAudioElFromSound(el);
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(function() {});
    }
  }
}

function pauseSoundOnElement(el) {
  if (isWebAudioWorking(el)) {
    el.components.sound.pauseSound();
  } else {
    var audioEl = getAudioElFromSound(el);
    if (audioEl) {
      audioEl.pause();
    }
  }
}

function stopSoundOnElement(el) {
  if (isWebAudioWorking(el)) {
    el.components.sound.stopSound();
  } else {
    var audioEl = getAudioElFromSound(el);
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
  }
}

function fetchJSONData() {
  fetch("./en_wiki_Galaxy_with_audio.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then((data) => loadAudio(data))
    .catch((error) => console.error("Unable to fetch data:", error));
}

//////////////// LOAD AUDIO ////////////////
function loadAudio(data) {
  // Create all audio elements
  createAudio(data.Title.audio_path.replace("mp3s\\", "").replace(".mp3", ""));
  createAudio(
    data.Introduction.audio_path.replace("mp3s\\", "").replace(".mp3", ""),
  );
  iterateAudio(data.Sections, "Sections_");

  // Give the browser a tiny moment to "see" the new audio tags before building the VR spheres
  setTimeout(() => {
    drawLayout(data);
  }, 100);
}

function iterateAudio(section, prename) {
  for (const key in section) {
    const name = prename + key.replace(":", "").replaceAll(" ", "_");
    createAudio(
      section[key].audio_path.replace("mp3s\\", "").replace(".mp3", ""),
    );

    if (section[key].P && section[key].P.audio_path !== "") {
      createAudio(
        section[key].P.audio_path.replace("mp3s\\", "").replace(".mp3", ""),
      );
    }
    if (section[key].Subsections) {
      iterateAudio(section[key].Subsections, name + "_Subsections_");
    }
  }
}

function createAudio(name) {
  if (!name) return;
  const audioEl = document.createElement("audio");
  // Use backticks for template literal
  let url = `./audio/${name}.mp3`;

  audioEl.setAttribute("id", name);
  audioEl.setAttribute("preload", "auto");
  audioEl.setAttribute("src", url);
  assetEl.appendChild(audioEl);
}

//////////////// DRAW LAYOUT ///////////////////
function drawLayout(data) {
  z = -d1;
  const titleEl = createElement(
    sceneEl,
    x0,
    y,
    z,
    "#EF2D5E",
    "title",
    "title",
    data.Title.audio_path.replace("mp3s\\", "").replace(".mp3", ""),
    true,
  );
  const introEl = createElement(
    titleEl,
    x0,
    0,
    z,
    "#EF2D5E",
    "intro",
    "intro",
    data.Introduction.audio_path.replace("mp3s\\", "").replace(".mp3", ""),
    true,
  );

  // Boundary sound
  createElement(
    sceneEl,
    minX - margin,
    y,
    z0 + margin,
    "#F0FFFF",
    "sound-cues",
    "bound",
    "bound-cue",
    false,
  );

  iterateSection(x0, 0, z, d1, data.Sections, introEl, "Sections_", 0);

  sounds = document.querySelectorAll("a-sphere");
  document.querySelector("[camera]").setAttribute("play-proxi", "");

  // Spacebar control
  document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      checkCollide = false;
      checkAudio(sounds);
    }
  });

  document.addEventListener("keydown", (event) => {
    collide = true;
  });

  document.querySelector("[camera]").setAttribute("hit-bounds", "");

  // Resume audio contexts now that sound components are initialized
  // (needed for Firefox — the contexts may exist now even if they didn't before)
  resumeAudio();
  setTimeout(resumeAudio, 500);
  setTimeout(resumeAudio, 1500);

  // On mobile, unlock all audio on the next touch gesture
  if (isMobile()) {
    document.addEventListener("touchstart", function mobileUnlock() {
      unlockAllAudio();
      document.removeEventListener("touchstart", mobileUnlock);
    }, { once: true });
  }
}

// Recursively iterates through sections, creating header and paragraph elements
function iterateSection(x, y, z, d, section, parentEl, prename, angle) {
  const numSections = Object.keys(section).length;
  const degStep = numSections === 1 ? Math.PI / 2 : Math.PI / (numSections - 1);

  Object.keys(section).forEach((key, i) => {
    const name = prename + key.replace(":", "").replaceAll(" ", "_");
    const headerName = section[key].audio_path
      .replace("mp3s\\", "")
      .replace(".mp3", "");

    // Calculate position for the section
    const x1 = -d * Math.cos(degStep * i + angle);
    const z1 = -d / 2 - d * Math.sin(degStep * i + angle);

    // Create header element (blue)
    const headerEl = createElement(
      parentEl,
      x1,
      y,
      z1,
      "#00FFFF",
      "header",
      `${key}${i}`,
      headerName,
      true,
    );

    // If paragraph exists, create it (yellow)
    if (section[key].P) {
      const xp = -dp * Math.cos(degStep * i + angle);
      const zp = -dp * Math.sin(degStep * i + angle);
      createElement(
        headerEl,
        xp,
        y,
        zp,
        "#FFFF00",
        "p",
        `${key}${i}_p`,
        section[key].P.audio_path.replace("mp3s\\", "").replace(".mp3", ""),
        true,
      );
    }

    // Recursively handle subsections
    if (section[key].Subsections) {
      iterateSection(
        x1,
        y,
        z1,
        d2,
        section[key].Subsections,
        headerEl,
        name + "_Subsections_",
        0,
      );
    }
  });
}

// Helper function to create a visual element (sphere) in the scene
function createElement(
  parentEl,
  x,
  y,
  z,
  color,
  className,
  id,
  soundId,
  autoPlay,
) {
  const sphereEl = document.createElement("a-sphere");
  sphereEl.setAttribute("color", color);
  sphereEl.setAttribute("shader", "flat");
  sphereEl.setAttribute("radius", "0.5");
  sphereEl.setAttribute("position", `${x} ${y} ${z}`);
  sphereEl.setAttribute("class", className);
  sphereEl.setAttribute("id", id);

  // Added poolSize: 10 to fix the "All sounds are playing" warning
  const soundSrc = `src:#${soundId}`;
  sphereEl.setAttribute(
    "sound",
    autoPlay
      ? `${soundSrc}; autoplay: false; loop: false; distanceModel: exponential; refDistance: 3; rolloffFactor: 3; poolSize: 1`
      : `${soundSrc}; poolSize: 1`,
  );

  if (autoPlay) {
    sphereEl.setAttribute("world-pos", "");
    sphereEl.setAttribute("collide", "");
  }

  parentEl.appendChild(sphereEl);
  elCount++;
  return sphereEl;
}

//////////////// PLAY AUDIO ////////////////
let playing = true;
function checkAudio(audioArray) {
  if (!playing) {
    audioArray.forEach((s) => {
      playSoundOnElement(s);
    });
    playing = true;
    console.log("play");
  } else {
    audioArray.forEach((s) => {
      pauseSoundOnElement(s);
    });
    playing = false;
    console.log("stop");
  }
}

//////////////// GET WORLD POS ////////////////
AFRAME.registerComponent("world-pos", {
  init: function () {
    this.worldpos = new THREE.Vector3();
  },
  update: function () {
    this.el.getObject3D("mesh").getWorldPosition(this.worldpos);
    // console.log(this.worldpos);
    if (this.worldpos.x < 0) {
      if (this.worldpos.x < minX) {
        minX = this.worldpos.x;
      }
    } else {
      if (this.worldpos.x > maxX) {
        maxX = this.worldpos.x;
      }
    }

    if (this.worldpos.z < minZ) {
      minZ = this.worldpos.z;
    }
  },
});

//////////////// HIT BOUND ////////////////
let hit = false;
AFRAME.registerComponent("hit-bounds", {
  init: function () {},
  tick: function () {
    const bound = document.querySelector("#bound");
    let elX = this.el.object3D.position.x;
    let elZ = this.el.object3D.position.z;
    // console.log(elX);
    let hitBound;
    // limit Z
    if (
      this.el.object3D.position.z > z0 + margin ||
      this.el.object3D.position.z == z0 + margin
    ) {
      this.el.object3D.position.z = z0 + margin;
      hitBound = z0 + margin + 0.5;
      bound.object3D.position.x = elX;
      bound.object3D.position.z = hitBound;
      if (!hit) {
        hit = true;
        playSoundOnElement(bound);
        // console.log("hit" + this.el.object3D.position.z);
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowDown") {
          hit = true;
          playSoundOnElement(bound);
        }
      });
    }
    if (
      this.el.object3D.position.z < minZ - margin ||
      this.el.object3D.position.z == minZ - margin
    ) {
      this.el.object3D.position.z = minZ - margin;
      hitBound = minZ - margin - 0.5;
      // console.log("MINZ: " + minZ);
      bound.object3D.position.x = elX;
      bound.object3D.position.z = hitBound;
      if (!hit) {
        hit = true;
        playSoundOnElement(bound);
        console.log("hit");
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowUp") {
          hit = true;
          playSoundOnElement(bound);
        }
      });
    }
    // limit X
    if (
      this.el.object3D.position.x > maxX + margin ||
      this.el.object3D.position.x == maxX + margin
    ) {
      this.el.object3D.position.x = maxX + margin;
      hitBound = maxX + margin + 0.5;
      bound.object3D.position.x = hitBound;
      bound.object3D.position.z = elZ;
      if (!hit) {
        hit = true;
        playSoundOnElement(bound);
        console.log("hit");
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowRight") {
          hit = true;
          playSoundOnElement(bound);
        }
      });
    }
    if (
      this.el.object3D.position.x < minX - margin ||
      this.el.object3D.position.x == minX - margin
    ) {
      this.el.object3D.position.x = minX - margin;
      hitBound = minX - margin - 0.5;
      bound.object3D.position.x = hitBound;
      bound.object3D.position.z = elZ;
      if (!hit) {
        hit = true;
        playSoundOnElement(bound);
        console.log("hit");
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowLeft") {
          hit = true;
          playSoundOnElement(bound);
        }
      });
    }

    if (
      this.el.object3D.position.x > minX - margin &&
      this.el.object3D.position.x < maxX + margin &&
      this.el.object3D.position.z > minZ - margin &&
      this.el.object3D.position.z < z0 + margin
    ) {
      if (hit) {
        stopSoundOnElement(bound);
      }
      hit = false;
    }
  },
});

AFRAME.registerComponent("collide", {
  init: function () {
    this.worldpos = new THREE.Vector3();
  },
  tick: function () {
    if (collide) {
      // const cameraEl = this.el.sceneEl.camera.el;
      const cameraEl = document.querySelector("[camera]");
      let camX = cameraEl.object3D.position.x;
      let camZ = cameraEl.object3D.position.z;
      this.el.getObject3D("mesh").getWorldPosition(this.worldpos);
      if (distance(camX, camZ, this.worldpos.x, this.worldpos.z) < proxi) {
        // console.log(this.el);
        checkCollide = true;
        collide = false;
        playSoundOnElement(this.el);
        console.log("collide: " + this.el.id);
        sounds.forEach((s) => {
          if (s != this.el) {
            pauseSoundOnElement(s);
          }
        });
      }
    }
  },
});

AFRAME.registerComponent("check-collide", {
  init: function () {},
  tick: function () {
    if (checkCollide) {
      let worldpos = new THREE.Vector3();
      let elX = this.el.object3D.position.x;
      let elZ = this.el.object3D.position.z;
      let colStatus = false;
      // console.log(checkCollide);
      sounds.forEach((s) => {
        s.getObject3D("mesh").getWorldPosition(worldpos);
        // console.log(worldpos)
        if (distance(elX, elZ, worldpos.x, worldpos.z) < proxi) {
          colStatus = true;
        }
      });

      if (!colStatus) {
        sounds.forEach((s) => {
          if (!s.components.sound.isPlaying) {
            playSoundOnElement(s);
          }
        });
        checkCollide = false;
        collide = true;
      }
    }
  },
});

AFRAME.registerComponent("play-proxi", {
  init: function () {},
  tick: function () {
    let worldpos = new THREE.Vector3();
    let elX = this.el.object3D.position.x;
    let elZ = this.el.object3D.position.z;
    let proxiEl;
    let closeDist = 100;

    document.addEventListener("keyup", (event) => {
      // console.log(event.code)
      if (event.code === "ShiftLeft") {
        checkCollide = false;
        sounds.forEach((s) => {
          s.getObject3D("mesh").getWorldPosition(worldpos);
          // console.log(worldpos)
          if (distance(elX, elZ, worldpos.x, worldpos.z) < closeDist) {
            closeDist = distance(elX, elZ, worldpos.x, worldpos.z);
            proxiEl = s;
          }
        });
        sounds.forEach((s) => {
          if (s != proxiEl) {
            pauseSoundOnElement(s);
          }
        });
        playSoundOnElement(proxiEl);
        // console.log(proxiEl);
      }
    });
  },
});

// Helper function to calculate distance between two points (x1, z1) and (x2, z2)
function distance(x1, z1, x2, z2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2));
}

// Resume AudioContext on any click/key (handles both Chrome and Firefox autoplay policy)
document.addEventListener("click", resumeAudio);
document.addEventListener("keydown", resumeAudio);

//////////////// DOUBLE-TAP UP ARROW FOR WELCOME ////////////////
let welcomePlayed = false;
let lastUpTime = 0;
var doubleTapThreshold = 400; // ms
document.addEventListener("keydown", function(event) {
  if (welcomePlayed) return;
  if (event.code === "ArrowUp") {
    var now = Date.now();
    if (now - lastUpTime < doubleTapThreshold) {
      welcomePlayed = true;
      var welcome = new Audio("./audio/welcome.mp3");
      welcome.play().catch(function(err) { console.warn("Welcome audio:", err); });
    }
    lastUpTime = now;
  }
});

//////////////// MOBILE AUDIO UNLOCK ////////////////
// Mobile browsers require .play() to be called directly within a user gesture
// for EACH audio element. This unlocks them for future programmatic playback.
let audioUnlocked = false;
function unlockAllAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  resumeAudio();

  // Unlock every <audio> element in the page
  var allAudio = document.querySelectorAll("audio");
  allAudio.forEach(function(audioEl) {
    var origTime = audioEl.currentTime;
    var origPaused = audioEl.paused;
    audioEl.play().then(function() {
      audioEl.pause();
      audioEl.currentTime = origTime;
    }).catch(function() {});
  });
  console.log("Mobile audio unlocked: " + allAudio.length + " elements");
}

//////////////// MOBILE TOUCH CONTROLS ////////////////
function addMobileControls() {
  if (!isMobile()) return;

  var moveSpeed = 0.15;
  var moveInterval = null;
  var activeDir = null;

  // Container for controls
  var container = document.createElement("div");
  container.id = "mobile-controls";
  container.style.cssText =
    "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9998;" +
    "display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;";

  // D-pad style layout
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
      // Double-tap forward to play welcome.mp3 (once)
      if (dir === "forward" && !welcomePlayed) {
        var now = Date.now();
        if (now - lastUpTime < doubleTapThreshold) {
          welcomePlayed = true;
          var welcome = new Audio("./audio/welcome.mp3");
          welcome.play().catch(function(err) { console.warn("Welcome audio:", err); });
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

    // Get camera's forward direction (yaw only)
    var yaw = rot.y;
    var forwardX = -Math.sin(yaw);
    var forwardZ = -Math.cos(yaw);
    var rightX = Math.cos(yaw);
    var rightZ = -Math.sin(yaw);

    if (activeDir === "forward") {
      pos.x += forwardX * moveSpeed;
      pos.z += forwardZ * moveSpeed;
    } else if (activeDir === "backward") {
      pos.x -= forwardX * moveSpeed;
      pos.z -= forwardZ * moveSpeed;
    } else if (activeDir === "left") {
      pos.x -= rightX * moveSpeed;
      pos.z -= rightZ * moveSpeed;
    } else if (activeDir === "right") {
      pos.x += rightX * moveSpeed;
      pos.z += rightZ * moveSpeed;
    }
    collide = true;
  }

  // Spacer for layout
  function makeSpacer() {
    var sp = document.createElement("div");
    sp.style.cssText = "width:60px;height:60px;pointer-events:none;";
    return sp;
  }

  topRow.appendChild(makeSpacer());
  topRow.appendChild(makeBtn("\u25B2", "forward"));
  topRow.appendChild(makeSpacer());

  midRow.appendChild(makeBtn("\u25C0", "left"));
  // Play/pause button in center
  var pauseBtn = document.createElement("button");
  pauseBtn.textContent = "\u23EF";
  pauseBtn.style.cssText =
    "width:60px;height:60px;font-size:20px;border:none;border-radius:50%;" +
    "background:rgba(255,255,255,0.5);color:#333;pointer-events:auto;" +
    "touch-action:none;user-select:none;-webkit-user-select:none;" +
    "display:flex;align-items:center;justify-content:center;";
  pauseBtn.addEventListener("touchstart", function(e) {
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

// Add mobile controls once the scene is ready
window.addEventListener("DOMContentLoaded", function() {
  addMobileControls();
});
