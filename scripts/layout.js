// Global variables
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

window.addEventListener("DOMContentLoaded", () => {
  sceneEl = document.querySelector("a-scene");
  assetEl = document.querySelector("a-assets");
  showStartOverlay();
});

//////////////// START OVERLAY ////////////////
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
    '<p style="font-size:0.9rem;margin-top:1rem;opacity:0.7;">Use arrow keys to navigate, spacebar to play/pause, shift to find nearest sound</p>' +
    "</div>";
  document.body.appendChild(overlay);

  // Play welcome message audio if available
  const welcomeAudio = document.getElementById("welcome-audio");
  if (welcomeAudio) {
    welcomeAudio.play().catch(() => {});
  }

  function startApp() {
    overlay.remove();

    // Stop welcome audio if still playing
    if (welcomeAudio) {
      welcomeAudio.pause();
      welcomeAudio.currentTime = 0;
    }

    // Resume every AudioContext we can find (critical for Firefox)
    resumeAllAudioContexts();

    fetchJSONData();
  }

  overlay.addEventListener("click", startApp, { once: true });
  document.addEventListener("keydown", startApp, { once: true });
}

//////////////// AUDIO CONTEXT FIX (Firefox) ////////////////
// Firefox suspends AudioContexts created before user gesture.
// This function finds and resumes all relevant contexts.
function resumeAllAudioContexts() {
  // 1. THREE's shared AudioContext (used by A-Frame internally)
  if (typeof THREE !== "undefined" && THREE.AudioContext) {
    const ctx = THREE.AudioContext.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(() => console.log("THREE AudioContext resumed"));
    }
  }

  // 2. A-Frame scene's audioListener context
  const scene = document.querySelector("a-scene");
  if (scene && scene.audioListener && scene.audioListener.context) {
    const ctx = scene.audioListener.context;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => console.log("A-Frame AudioContext resumed"));
    }
  }

  // 3. Keep retrying for a few seconds in case A-Frame hasn't fully initialized
  let retries = 0;
  const retryInterval = setInterval(() => {
    retries++;
    let allRunning = true;

    if (typeof THREE !== "undefined" && THREE.AudioContext) {
      const ctx = THREE.AudioContext.getContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
        allRunning = false;
      }
    }

    const s = document.querySelector("a-scene");
    if (s && s.audioListener && s.audioListener.context) {
      if (s.audioListener.context.state === "suspended") {
        s.audioListener.context.resume();
        allRunning = false;
      }
    }

    if (allRunning || retries > 20) {
      clearInterval(retryInterval);
      if (retries > 20) {
        console.warn("AudioContext may still be suspended after retries");
      }
    }
  }, 250);
}

// Patch A-Frame sound component: resume AudioContext before every playSound call
// This is the most reliable Firefox fix — it ensures the context is running
// at the exact moment sound playback is attempted.
AFRAME.registerComponent("sound-context-fix", {
  init: function () {
    const soundComp = this.el.components.sound;
    if (!soundComp) return;

    const originalPlay = soundComp.playSound.bind(soundComp);
    soundComp.playSound = function () {
      if (this.pool && this.pool.children && this.pool.children.length > 0) {
        const ctx = this.pool.children[0].context;
        if (ctx && ctx.state === "suspended") {
          ctx.resume();
        }
      }
      return originalPlay();
    };
  },
});

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
  const audioPromises = [];

  audioPromises.push(
    createAudio(data.Title.audio_path.replace("mp3s\\", "").replace(".mp3", ""))
  );
  audioPromises.push(
    createAudio(
      data.Introduction.audio_path.replace("mp3s\\", "").replace(".mp3", "")
    )
  );
  collectAudioPromises(data.Sections, "Sections_", audioPromises);

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000));
  Promise.race([Promise.all(audioPromises), timeoutPromise])
    .then(() => {
      console.log("Audio loaded, building scene...");
      drawLayout(data);
    })
    .catch((err) => {
      console.warn("Some audio failed to load, building scene anyway:", err);
      drawLayout(data);
    });
}

function collectAudioPromises(section, prename, promises) {
  for (const key in section) {
    const name = prename + key.replace(":", "").replaceAll(" ", "_");
    promises.push(
      createAudio(
        section[key].audio_path.replace("mp3s\\", "").replace(".mp3", "")
      )
    );

    if (section[key].P && section[key].P.audio_path !== "") {
      promises.push(
        createAudio(
          section[key].P.audio_path.replace("mp3s\\", "").replace(".mp3", "")
        )
      );
    }
    if (section[key].Subsections) {
      collectAudioPromises(section[key].Subsections, name + "_Subsections_", promises);
    }
  }
}

function createAudio(name) {
  if (!name) return Promise.resolve();

  return new Promise((resolve) => {
    const audioEl = document.createElement("audio");
    const url = `./audio/${name}.mp3`;

    audioEl.setAttribute("id", name);
    audioEl.setAttribute("preload", "auto");
    audioEl.setAttribute("src", url);

    audioEl.addEventListener("canplaythrough", () => resolve(), { once: true });
    audioEl.addEventListener(
      "error",
      (e) => {
        console.warn(`Failed to load audio: ${url}`, e);
        resolve();
      },
      { once: true }
    );

    assetEl.appendChild(audioEl);
    setTimeout(resolve, 4000);
  });
}

//////////////// DRAW LAYOUT ///////////////////
function drawLayout(data) {
  z = -d1;
  const titleEl = createElement(
    sceneEl, x0, y, z, "#EF2D5E", "title", "title",
    data.Title.audio_path.replace("mp3s\\", "").replace(".mp3", ""), true,
  );
  const introEl = createElement(
    titleEl, x0, 0, z, "#EF2D5E", "intro", "intro",
    data.Introduction.audio_path.replace("mp3s\\", "").replace(".mp3", ""), true,
  );

  createElement(
    sceneEl, minX - margin, y, z0 + margin, "#F0FFFF", "sound-cues", "bound",
    "bound-cue", false,
  );

  iterateSection(x0, 0, z, d1, data.Sections, introEl, "Sections_", 0);

  sounds = document.querySelectorAll("a-sphere");
  document.querySelector("[camera]").setAttribute("play-proxi", "");

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

  // Apply the sound-context-fix to all spheres with sound (Firefox fix)
  sounds.forEach((s) => {
    s.setAttribute("sound-context-fix", "");
  });
}

function iterateSection(x, y, z, d, section, parentEl, prename, angle) {
  const numSections = Object.keys(section).length;
  const degStep = numSections === 1 ? Math.PI / 2 : Math.PI / (numSections - 1);

  Object.keys(section).forEach((key, i) => {
    const name = prename + key.replace(":", "").replaceAll(" ", "_");
    const headerName = section[key].audio_path
      .replace("mp3s\\", "")
      .replace(".mp3", "");

    const x1 = -d * Math.cos(degStep * i + angle);
    const z1 = -d / 2 - d * Math.sin(degStep * i + angle);

    const headerEl = createElement(
      parentEl, x1, y, z1, "#00FFFF", "header", `${key}${i}`, headerName, true,
    );

    if (section[key].P) {
      const xp = -dp * Math.cos(degStep * i + angle);
      const zp = -dp * Math.sin(degStep * i + angle);
      createElement(
        headerEl, xp, y, zp, "#FFFF00", "p", `${key}${i}_p`,
        section[key].P.audio_path.replace("mp3s\\", "").replace(".mp3", ""), true,
      );
    }

    if (section[key].Subsections) {
      iterateSection(
        x1, y, z1, d2, section[key].Subsections, headerEl,
        name + "_Subsections_", 0,
      );
    }
  });
}

function createElement(parentEl, x, y, z, color, className, id, soundId, autoPlay) {
  const sphereEl = document.createElement("a-sphere");
  sphereEl.setAttribute("color", color);
  sphereEl.setAttribute("shader", "flat");
  sphereEl.setAttribute("radius", "0.5");
  sphereEl.setAttribute("position", `${x} ${y} ${z}`);
  sphereEl.setAttribute("class", className);
  sphereEl.setAttribute("id", id);

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
      s.components.sound.playSound();
    });
    playing = true;
    console.log("play");
  } else {
    audioArray.forEach((s) => {
      s.components.sound.pauseSound();
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
    let hitBound;
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
        bound.components.sound.playSound();
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowDown") {
          hit = true;
          bound.components.sound.playSound();
        }
      });
    }
    if (
      this.el.object3D.position.z < minZ - margin ||
      this.el.object3D.position.z == minZ - margin
    ) {
      this.el.object3D.position.z = minZ - margin;
      hitBound = minZ - margin - 0.5;
      bound.object3D.position.x = elX;
      bound.object3D.position.z = hitBound;
      if (!hit) {
        hit = true;
        bound.components.sound.playSound();
        console.log("hit");
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowUp") {
          hit = true;
          bound.components.sound.playSound();
        }
      });
    }
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
        bound.components.sound.playSound();
        console.log("hit");
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowRight") {
          hit = true;
          bound.components.sound.playSound();
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
        bound.components.sound.playSound();
        console.log("hit");
      }
      document.addEventListener("keydown", (event) => {
        if (event.code === "ArrowLeft") {
          hit = true;
          bound.components.sound.playSound();
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
        bound.components.sound.stopSound();
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
      const cameraEl = document.querySelector("[camera]");
      let camX = cameraEl.object3D.position.x;
      let camZ = cameraEl.object3D.position.z;
      this.el.getObject3D("mesh").getWorldPosition(this.worldpos);
      if (distance(camX, camZ, this.worldpos.x, this.worldpos.z) < proxi) {
        checkCollide = true;
        collide = false;
        this.el.components.sound.playSound();
        console.log("collide: " + this.el.id);
        sounds.forEach((s) => {
          if (s != this.el) {
            s.components.sound.pauseSound();
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
      sounds.forEach((s) => {
        s.getObject3D("mesh").getWorldPosition(worldpos);
        if (distance(elX, elZ, worldpos.x, worldpos.z) < proxi) {
          colStatus = true;
        }
      });

      if (!colStatus) {
        sounds.forEach((s) => {
          if (!s.components.sound.isPlaying) {
            s.components.sound.playSound();
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
      if (event.code === "ShiftLeft") {
        checkCollide = false;
        sounds.forEach((s) => {
          s.getObject3D("mesh").getWorldPosition(worldpos);
          if (distance(elX, elZ, worldpos.x, worldpos.z) < closeDist) {
            closeDist = distance(elX, elZ, worldpos.x, worldpos.z);
            proxiEl = s;
          }
        });
        sounds.forEach((s) => {
          if (s != proxiEl) {
            s.components.sound.pauseSound();
          }
        });
        proxiEl.components.sound.playSound();
      }
    });
  },
});

function distance(x1, z1, x2, z2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(z1 - z2, 2));
}
