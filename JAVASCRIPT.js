// ========== VARIABLES GLOBALES ==========
const backgroundMusic = document.getElementById("background-music");
let musicStarted = false;
const character = document.getElementById("character");
const objects = [
  document.getElementById("cama"),
  document.getElementById("mesita"),
  document.getElementById("escritorio"),
  document.getElementById("silla"),
  document.getElementById("mochila"),
  document.getElementById("guitarra"),
  document.getElementById("foca1"),
  document.getElementById("foca2"),
  document.getElementById("puerta"),
];

// Variables de posición y movimiento
let dialogActive = false;
let posX = 350;
let posY = 340;
let currentFrame = 0;
let direction = "ArrowDown";
let isKeyPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

// Variables del sistema de diálogo y elecciones
let readingBook = false;
let bookStage = 0;
let choiceMade = true; // Iniciar como true para diálogos normales
let playerChoice = null;
let hasFoca = false;
let focaOnHead = null;

const spriteSets = {
  ArrowUp: ["imagenes/characterup1.png", "imagenes/characterup2.png", "imagenes/characterup.png"],
  ArrowDown: ["imagenes/characterdown1.png", "imagenes/characterdown2.png", "imagenes/characterdown.png"],
  ArrowLeft: ["imagenes/characterleft1.png", "imagenes/characterleft2.png", "imagenes/characterleft.png"],
  ArrowRight: ["imagenes/characterright1.png", "imagenes/characterright2.png", "imagenes/characterright.png"],
};

const bookText = [
  "Este es el primer fragmento del libro.",
  "Este es el segundo fragmento del libro.",
  "Este es el último fragmento del libro.",
];

let speed = 8;
let frameSpeed = 160;
let frameInterval;
let textInterval = null; // Variable global para controlar el efecto

// ========== SISTEMA DE ESCALADO ==========
function scaleGame() {
  const gameContainer = document.getElementById('game-container');
  const frame = document.getElementById('frame');
  
  const containerWidth = gameContainer.clientWidth;
  const containerHeight = gameContainer.clientHeight;
  
  const originalWidth = 640;
  const originalHeight = 690;
  const fixedMargin = 20;
  
  const availableWidth = containerWidth - (fixedMargin * 2);
  const availableHeight = containerHeight - (fixedMargin * 2);
  
  const scaleX = availableWidth / originalWidth;
  const scaleY = availableHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);
  
  frame.style.transform = `scale(${scale})`;
  
  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;
  
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;
  
  frame.style.left = `${offsetX}px`;
  frame.style.top = `${offsetY}px`;
  frame.style.border = '10px solid black';
}

// ========== SISTEMA DE DIÁLOGOS Y ELECCIONES ==========
function showDialog(message, options = []) {
  const voiceSound = document.getElementById("voice-sound");
  const dialog = document.getElementById("dialog");
  const dialogText = document.getElementById("dialogText");
  const optionsContainer = document.getElementById("options");

  // Detener cualquier efecto anterior
  if (textInterval) {
    clearInterval(textInterval);
    textInterval = null;
    if (voiceSound) voiceSound.pause();
  }

  dialog.style.display = "block";
  optionsContainer.innerHTML = "";

  // Efecto de texto letra por letra + sonido
  let currentLength = 0;
  dialogText.textContent = "";
  if (voiceSound) {
    voiceSound.currentTime = 0;
    voiceSound.loop = true;
    voiceSound.play().catch(()=>{});
  }
  textInterval = setInterval(() => {
    currentLength++;
    dialogText.textContent = message.slice(0, currentLength);
    if (currentLength >= message.length) {
      clearInterval(textInterval);
      textInterval = null;
      if (voiceSound) voiceSound.pause();
    }
  }, 25);

  if (options && options.length > 0) {
    dialogActive = true;
    choiceMade = false;
    optionsContainer.style.display = "block";
    options.forEach((option, index) => {
      const optionElement = document.createElement("div");
      optionElement.classList.add("option");
      if (index === 0) optionElement.classList.add("selected");
      optionElement.textContent = option;
      optionElement.dataset.index = index;
      optionsContainer.appendChild(optionElement);
    });
    playerChoice = 0;
  } else {
    choiceMade = true;
    playerChoice = null;
    optionsContainer.style.display = "none";
  }

  dialog.style.top = "20px";
  dialog.style.bottom = "auto";
  dialog.style.transform = "translateX(-50%)";
}

function selectOption(index) {
  const options = document.querySelectorAll(".option");
  if (options.length > 0) {
    options.forEach((option) => option.classList.remove("selected"));
    options[index].classList.add("selected");
    playerChoice = index;
    console.log("Opción seleccionada:", index, "Texto:", options[index].textContent);
  }
}

function confirmChoice() {
  const dialog = document.getElementById("dialog");

  if (window._interactingWithDoor) {
  if (playerChoice === 0) { // Sí, salir
    if (!hasFoca) {
      showDialog("No estás lista para salir. ¿Olvidas algo?");
      window._interactingWithDoor = false;
      dialogActive = false;
    } else {
      dialog.style.display = "none"; // <-- Oculta el cuadro de diálogo
      dialogActive = false;
      fadeOutAndTeleport();
      window._interactingWithDoor = false;
    }
  } else if (playerChoice === 1) { // No, quedarse
    dialog.style.display = "none";
    dialogActive = false;
    window._interactingWithDoor = false;
  }
  choiceMade = true;
  playerChoice = null;
  return;
}

if (window._interactingWithDoor2) {
    if (playerChoice === 0) { // Sí, cruzar
      dialog.style.display = "none";
      window._interactingWithDoor2 = false;
      choiceMade = true;
      playerChoice = null;
      // Redirigir en la misma pestaña
      fadeOutAndChangePage("PAGINA2.html");
      return;
    } else { // No, quedarse
      dialog.style.display = "none";
      window._interactingWithDoor2 = false;
      choiceMade = true;
      playerChoice = null;
      return;
    }
  }

  console.log("confirmChoice llamado. playerChoice =", playerChoice);
  
  if (playerChoice === 0) {
    // Si eligió "Sí" para tomar la foca
    if (!hasFoca) {
      console.log("✅ Usuario eligió tomar la foca");
      takeFoca();
      dialogActive = false;
    } else if (readingBook) {
      bookStage = 0;
      showDialog(bookText[bookStage], []);
      dialogActive = false;
    }
  } else if (playerChoice === 1) {
    // Si eligió "No"
    console.log("❌ Usuario eligió NO tomar la foca");
    readingBook = false;
    hasFoca = false;
    dialog.style.display = "none";
    dialogActive = false;
  }
  
  choiceMade = true;
  playerChoice = null;
  console.log("Diálogo cerrado. choiceMade =", choiceMade);
}



function takeFoca() {
  console.log("Ejecutando takeFoca...");
  hasFoca = true;
  
  const originalFoca = document.getElementById("foca2");
  if (originalFoca) {
    console.log("Ocultando foca2 original");
    originalFoca.style.display = "none";
  }
  
  focaOnHead = document.createElement("div");
  focaOnHead.id = "foca-on-head";
  focaOnHead.style.position = "absolute";
  focaOnHead.style.width = "47px";
  focaOnHead.style.height = "36px";
  focaOnHead.style.backgroundImage = "url('imagenes/foca2.png')";
  focaOnHead.style.backgroundSize = "cover";
  focaOnHead.style.zIndex = "4";
  focaOnHead.style.pointerEvents = "none";
  
  updateFocaPosition();
  document.getElementById("frame").appendChild(focaOnHead);
  
  showDialog("Foca se unió al equipo.");
}

function updateFocaPosition() {
  if (focaOnHead && hasFoca) {
    const focaOffsetX = (character.offsetWidth - 47) / 2;
    const focaOffsetY = -10;
    focaOnHead.style.left = `${posX + focaOffsetX}px`;
    focaOnHead.style.top = `${posY + focaOffsetY}px`;
  }
}

// ========== SISTEMA DE INTERACCIÓN ==========
function checkInteraction() {
  const objectsWithMessages = [
    { 
      id: "puerta2", 
      message: "", // El mensaje lo manejarás en el evento
    },
    { id: "chica1", message: "", isChica: true },
    { id: "chica2", message: "", isChica: true },
    { id: "chica3", message: "", isChica: true },
    { id: "cama", message: "Una cama muy cómoda. Te mentalizas para no caer dormida sobre ella." },
    { 
      id: "mesita", 
      message: "Un gran armario. Dentro de él puedes ver a muchos peluches asomando la vista para poder verte."
    },
    { id: "silla", message: "Una silla vieja. Sabes que un día colapsará y caerás. Decides no pensar en ello." },
    { id: "escritorio", message: "Hay un libro de química sobre el escritorio. No es momento de estudiar. Decides no inspeccionarlo." },
    { id: "foca1", message: "Una foca de gran tamaño. Te incita a abrazarla. Decides contenerte." },
    { id: "mesa2", message: "Una mesa. Sus cajones contienen basura." },
    { id: "guitarra", message: "Es una guitarra. El 50% son pegatinas y el otro 50% es solo guitarra." },
    { id: "mochila", message: "Hay una mochila pegada a unos pines." },
    { 
      id: "mesa1", 
      message: "Una foca triste se encuentra sobre la mesa. ¿Quieres cargarla?",
      hasChoice: true,
      options: ["Sí, tomarla", "No, dejarla"]
    },
    { 
      id: "puerta", 
      message: "¿Quieres salir de la habitación?",
      hasChoice: true,
      options: ["Sí, salir", "No, quedarse"]
    },
  ];

  const charRect = character.getBoundingClientRect();
  const charCenterX = (charRect.left + charRect.right) / 2;
  const charCenterY = (charRect.top + charRect.bottom) / 2;

  let bestObj = null;
  let minDistance = Infinity;
  const MAX_INTERACT_DISTANCE = 70; // Puedes ajustar este valor

  for (const obj of objectsWithMessages) {
    const objElement = document.getElementById(obj.id);
    if (!objElement) continue;

    const objRect = objElement.getBoundingClientRect();
    const objCenterX = (objRect.left + objRect.right) / 2;
    const objCenterY = (objRect.top + objRect.bottom) / 2;

    // Determina si el objeto está "en frente" según la dirección
    let isInFront = false;
    const horizontalRange = Math.max(objRect.width, 60);
    const verticalRange = Math.max(objRect.height, 60);

    if (direction === "ArrowUp" && objCenterY < charCenterY && Math.abs(objCenterX - charCenterX) < horizontalRange / 2) {
      isInFront = true;
    }
    if (direction === "ArrowDown" && objCenterY > charCenterY && Math.abs(objCenterX - charCenterX) < horizontalRange / 2) {
      isInFront = true;
    }
    if (direction === "ArrowLeft" && objCenterX < charCenterX && Math.abs(objCenterY - charCenterY) < verticalRange / 2) {
      isInFront = true;
    }
    if (direction === "ArrowRight" && objCenterX > charCenterX && Math.abs(objCenterY - charCenterY) < verticalRange / 2) {
      isInFront = true;
    }

    if (isInFront) {
      // Calcula la distancia del centro del personaje al borde más cercano del objeto
      const dx = Math.max(objRect.left - charCenterX, 0, charCenterX - objRect.right);
      const dy = Math.max(objRect.top - charCenterY, 0, charCenterY - objRect.bottom);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance <= MAX_INTERACT_DISTANCE) {
        minDistance = distance;
        bestObj = obj;
      }
    }
  }

  // Llama a esto como callback al terminar los diálogos de puerta2:
function showNotaScreenWithFade() {
  // 1. Crear overlay negro y hacer fade-in
  let overlay = document.createElement("div");
  overlay.id = "nota-fade-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "black";
  overlay.style.opacity = "0";
  overlay.style.zIndex = "9999";
  overlay.style.transition = "opacity 1s";
  document.body.appendChild(overlay);

  // Fade in
  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 10);

  // 2. Cuando termine el fade, mostrar la nota y el botón
  setTimeout(() => {
    showNotaScreen();
  }, 1100);
}

// Muestra la nota y el botón sobre el overlay
function showNotaScreen() {
  // Crear el contenedor de la nota
  let nota = document.createElement("div");
  nota.id = "nota-overlay";
  nota.style.position = "fixed";
  nota.style.top = "80px";
  nota.style.left = "0";
  nota.style.width = "100vw";
  nota.style.height = "100vh";
  nota.style.backgroundImage = "url('imagenes/nota.png')";
  nota.style.backgroundSize = "contain";
  nota.style.backgroundRepeat = "no-repeat";
  nota.style.backgroundPosition = "center top";
  nota.style.zIndex = "10000";
  nota.style.display = "flex";
  nota.style.flexDirection = "column";
  nota.style.justifyContent = "flex-start";
  nota.style.alignItems = "center";

  // Botón para salir
  let btn = document.createElement("button");
  btn.textContent = "Salir de la simulacion";
  btn.style.marginTop = "650px"; // Separación de la nota (aprox. un dedo)
  btn.style.padding = "14px 28px";
  btn.style.fontSize = "18px";
  btn.style.background = "black";
  btn.style.color = "white";
  btn.style.border = "2px solid white";
  btn.style.cursor = "pointer";
  btn.onclick = closeSimulation;

  nota.appendChild(btn);
  document.body.appendChild(nota);
}

// Cierra la web
function closeSimulation() {
  try { window.close(); } catch (e) {}
  setTimeout(() => { window.location.href = "about:blank"; }, 150);
}

if (bestObj.id === "chica1") {
    showDialogSequence([
    "Él estuvo hablando bastante de ti. Hizo lo posible para poder mostrarse.", 
    "Lamentablemente, sus intentos fueron en vano.", 
    "Espero que puedas perdonarlo."
    ]);
    return;
  }
  if (bestObj.id === "chica2") {
    showDialogSequence([
      "Si no tienes tanta hambre... podrías dejarme probar un poco de eso que te cubre la cabeza.",
      "Prometo no tomar mucho. Solo quiero... tomar un poco..."
    ]);
    return;
  }
  if (bestObj.id === "chica3") {
    showDialogSequence([
      "Hoy es tu cumpleaños, ¿verdad?",
      "Solía tener uno también... hasta que dejaron de recordarlo.",
      "Desde entonces, cada año me despierto con más velas... pero sin cuerpo donde soplarlas.",
    ]);
    return;
  }

  if (bestObj) {
    if (bestObj.id === "puerta2") {
        // Mostrar diálogo con elección Sí/No para puerta2
        showDialog("¿Quieres cruzar la puerta?", ["Sí, cruzar", "No, quedarme"]);
        // Marcar que estamos interactuando con puerta2 para que confirmChoice lo procese
        window._interactingWithDoor2 = true;
        return;
      }
      if (bestObj.id === "puerta") {
        showDialog(bestObj.message, bestObj.options);
        // Guardar que estamos en la puerta
        window._interactingWithDoor = true;
        return;
      }
    if (bestObj.id === "puerta") {
      showDialog(bestObj.message, bestObj.options);
      // Guardar que estamos en la puerta
      window._interactingWithDoor = true;
      return;
    }
    if (bestObj.id === "mesa1") {
      if (!hasFoca && bestObj.hasChoice) {
        showDialog(bestObj.message, bestObj.options);
      } else if (hasFoca) {
        showDialog("La mesa está vacía.");
      } else {
        showDialog(bestObj.message);
      }
    } else {
      showDialog(bestObj.message);
    }
  } else {
    showDialog("No hay nada interesante aquí...");
  }
}

function showDialogSequence(messages, onComplete) {
  dialogActive = true;
  const voiceSound = document.getElementById("voice-sound");
  let index = 0;
  const dialog = document.getElementById("dialog");
  const dialogText = document.getElementById("dialogText");
  const optionsContainer = document.getElementById("options");

  function showNext() {
    let currentLength = 0;
    dialogText.textContent = "";
    if (textInterval) {
      clearInterval(textInterval);
      textInterval = null;
      if (voiceSound) voiceSound.pause();
    }
    if (voiceSound) {
      voiceSound.currentTime = 0;
      voiceSound.loop = true;
      voiceSound.play().catch(()=>{});
    }
    textInterval = setInterval(() => {
      currentLength++;
      dialogText.textContent = messages[index].slice(0, currentLength);
      if (currentLength >= messages[index].length) {
        clearInterval(textInterval);
        textInterval = null;
        if (voiceSound) voiceSound.pause();
      }
    }, 25);

    dialog.style.display = "block";
    optionsContainer.innerHTML = "";
    optionsContainer.style.display = "block";

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "→";
    nextBtn.className = "next-arrow";
    nextBtn.onclick = () => {
      index++;
      if (index < messages.length) {
        showNext();
      } else {
        dialog.style.display = "none";
        dialogActive = false;
        if (voiceSound) voiceSound.pause();
        if (typeof onComplete === "function") {
          setTimeout(onComplete, 200);
        }
      }
    };
    optionsContainer.appendChild(nextBtn);
  }

  showNext();
}

// ========== SISTEMA DE MOVIMIENTO Y COLISIONES ==========
function moveCharacter() {
  if (dialogActive) return;
  if (!readingBook) {
    let nextX = posX;
    let nextY = posY;
    let moved = false;

    if (isKeyPressed["ArrowUp"]) {
      nextY -= speed;
      direction = "ArrowUp";
      moved = true;
    }
    if (isKeyPressed["ArrowDown"]) {
      nextY += speed;
      direction = "ArrowDown";
      moved = true;
    }
    if (isKeyPressed["ArrowLeft"]) {
      nextX -= speed;
      direction = "ArrowLeft";
      moved = true;
    }
    if (isKeyPressed["ArrowRight"]) {
      nextX += speed;
      direction = "ArrowRight";
      moved = true;
    }

    const minX = 10;
    const maxX = 640 - 80 - 10;
    const minY = 180;
    const maxY = 690 - 125 - 10;
    
    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));

    if (!checkCollisions(nextX, nextY)) {
      posX = nextX;
      posY = nextY;
      character.style.left = `${posX}px`;
      character.style.top = `${posY}px`;
      
      if (hasFoca) {
        updateFocaPosition();
      }
    }

    if (!moved) {
      character.style.backgroundImage = `url('${spriteSets[direction][2]}')`;
    }
  }
}

function checkCollisions(nextX, nextY) {
  const collisionWidth = character.offsetWidth * 0.6;
  const collisionHeight = character.offsetHeight * 0.4;
  const collisionOffsetX = (character.offsetWidth - collisionWidth) / 2;
  const collisionOffsetY = character.offsetHeight - collisionHeight;

  for (const obj of objects) {
    const objX = obj.offsetLeft;
    const objY = obj.offsetTop;
    const objWidth = obj.offsetWidth;
    const objHeight = obj.offsetHeight;

    const overlapX = (nextX + collisionOffsetX) < objX + objWidth && 
                    (nextX + collisionOffsetX + collisionWidth) > objX;
    const overlapY = (nextY + collisionOffsetY) < objY + objHeight && 
                    (nextY + collisionOffsetY + collisionHeight) > objY;

    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function changeSprite() {
  if (isKeyPressed["ArrowUp"] || isKeyPressed["ArrowDown"] || isKeyPressed["ArrowLeft"] || isKeyPressed["ArrowRight"]) {
    currentFrame = (currentFrame + 1) % 2;
    character.style.backgroundImage = `url('${spriteSets[direction][currentFrame]}')`;
    
    if (hasFoca) {
      updateFocaPosition();
    }
  }
}

// ========== MANEJADOR DE TECLADO MEJORADO ==========
function keyDownHandler(e) {
  // Movimiento del personaje
  if (spriteSets[e.key] && !isKeyPressed[e.key]) {
    isKeyPressed[e.key] = true;
  }

  // Sistema de diálogos - VERIFICACIÓN MÁS ESTRICTA
  const dialog = document.getElementById("dialog");
  if (dialog.style.display === "block") {
    console.log("Tecla presionada con diálogo abierto:", e.key);
    
    const options = document.querySelectorAll(".option");
    const hasOptions = options.length > 0;
    
    console.log("Opciones disponibles:", hasOptions, "choiceMade:", choiceMade);
    
    if (hasOptions && !choiceMade) {
      console.log("Procesando tecla para opciones...");
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = (playerChoice + 1) % options.length;
        console.log("Flecha abajo - nueva selección:", newIndex);
        selectOption(newIndex);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = (playerChoice - 1 + options.length) % options.length;
        console.log("Flecha arriba - nueva selección:", newIndex);
        selectOption(newIndex);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        console.log("Enter presionado - confirmando elección");
        confirmChoice();
        return;
      }
    } else if (e.key === "Enter" && choiceMade) {
      // Cerrar diálogo sin opciones
      e.preventDefault();
      console.log("Cerrando diálogo sin opciones");
      dialog.style.display = "none";
      return;
    }
  }
}

function keyUpHandler(e) {
  if (spriteSets[e.key]) {
    isKeyPressed[e.key] = false;
  }
}

// ========== CONTROLES TÁCTILES ==========
const touchMap = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

Object.keys(touchMap).forEach((id) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      isKeyPressed[touchMap[id]] = true;
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      isKeyPressed[touchMap[id]] = false;
    });
  }
});

const interactBtn = document.getElementById("interact");
if (interactBtn) {
  interactBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    checkInteraction();
  });
  interactBtn.addEventListener("click", (e) => {
    e.preventDefault();
    checkInteraction();
  });
}

// Permitir seleccionar opciones de diálogo con toque/clic
document.getElementById("options").addEventListener("touchstart", function(e) {
  if (e.target.classList.contains("option")) {
    const index = parseInt(e.target.dataset.index, 10);
    selectOption(index);
    confirmChoice();
  }
});
document.getElementById("options").addEventListener("click", function(e) {
  if (e.target.classList.contains("option")) {
    const index = parseInt(e.target.dataset.index, 10);
    selectOption(index);
    confirmChoice();
  }
});

// ========== INICIALIZACIÓN ==========
document.addEventListener("keydown", (e) => {
  const validKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (validKeys.includes(e.key) && !musicStarted) {
    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch((error) => {
      console.error("Error al iniciar música:", error);
    });
    musicStarted = true;
  }
});

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
setInterval(moveCharacter, 50);
frameInterval = setInterval(changeSprite, frameSpeed);

window.addEventListener('load', scaleGame);
window.addEventListener('resize', scaleGame);
window.addEventListener('orientationchange', scaleGame);

document.getElementById('start-btn').onclick = function() {
  document.getElementById('start-screen').style.display = 'none';
};

function fadeOutAndTeleport() {
  // Crear overlay negro
  let overlay = document// ========== VARIABLES GLOBALES ==========
const backgroundMusic = document.getElementById("background-music");
let musicStarted = false;
const character = document.getElementById("character");
const objects = [
  document.getElementById("cama"),
  document.getElementById("mesita"),
  document.getElementById("escritorio"),
  document.getElementById("silla"),
  document.getElementById("mochila"),
  document.getElementById("guitarra"),
  document.getElementById("foca1"),
  document.getElementById("foca2"),
  document.getElementById("puerta"),
];

// Variables de posición y movimiento
let posX = 350;
let posY = 340;
let currentFrame = 0;
let direction = "ArrowDown";
let isKeyPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

// Variables del sistema de diálogo y elecciones
let readingBook = false;
let bookStage = 0;
let choiceMade = true; // Iniciar como true para diálogos normales
let playerChoice = null;
let hasFoca = false;
let focaOnHead = null;

const spriteSets = {
  ArrowUp: ["imagenes/characterup1.png", "imagenes/characterup2.png", "imagenes/characterup.png"],
  ArrowDown: ["imagenes/characterdown1.png", "imagenes/characterdown2.png", "imagenes/characterdown.png"],
  ArrowLeft: ["imagenes/characterleft1.png", "imagenes/characterleft2.png", "imagenes/characterleft.png"],
  ArrowRight: ["imagenes/characterright1.png", "imagenes/characterright2.png", "imagenes/characterright.png"],
};

const bookText = [
  "Este es el primer fragmento del libro.",
  "Este es el segundo fragmento del libro.",
  "Este es el último fragmento del libro.",
];

let speed = 8;
let frameSpeed = 160;
let frameInterval;
let textInterval = null; // Variable global para controlar el efecto

// ========== SISTEMA DE ESCALADO ==========
function scaleGame() {
  const gameContainer = document.getElementById('game-container');
  const frame = document.getElementById('frame');
  
  const containerWidth = gameContainer.clientWidth;
  const containerHeight = gameContainer.clientHeight;
  
  const originalWidth = 640;
  const originalHeight = 690;
  const fixedMargin = 20;
  
  const availableWidth = containerWidth - (fixedMargin * 2);
  const availableHeight = containerHeight - (fixedMargin * 2);
  
  const scaleX = availableWidth / originalWidth;
  const scaleY = availableHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);
  
  frame.style.transform = `scale(${scale})`;
  
  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;
  
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;
  
  frame.style.left = `${offsetX}px`;
  frame.style.top = `${offsetY}px`;
  frame.style.border = '10px solid black';
}

// ========== SISTEMA DE DIÁLOGOS Y ELECCIONES ==========
function showDialog(message, options = []) {
  const dialog = document.getElementById("dialog");
  const dialogText = document.getElementById("dialogText");
  const optionsContainer = document.getElementById("options");

  // Detener cualquier efecto anterior
  if (textInterval) {
    clearInterval(textInterval);
    textInterval = null;
  }

  dialog.style.display = "block";
  optionsContainer.innerHTML = "";

  // Efecto de texto letra por letra
  let currentLength = 0;
  dialogText.textContent = "";
  textInterval = setInterval(() => {
    currentLength++;
    dialogText.textContent = message.slice(0, currentLength);
    if (currentLength >= message.length) {
      clearInterval(textInterval);
      textInterval = null;
    }
  }, 25);

  if (options && options.length > 0) {
    dialogActive = true; // Bloquea movimiento solo si hay opciones
    choiceMade = false;
    optionsContainer.style.display = "block";
    options.forEach((option, index) => {
      const optionElement = document.createElement("div");
      optionElement.classList.add("option");
      if (index === 0) {
        optionElement.classList.add("selected");
      }
      optionElement.textContent = option;
      optionElement.dataset.index = index;
      optionsContainer.appendChild(optionElement);
    });
    playerChoice = 0;
  } else {
    choiceMade = true;
    playerChoice = null;
    optionsContainer.style.display = "none";
  }

  dialog.style.top = "20px";
  dialog.style.bottom = "auto";
  dialog.style.transform = "translateX(-50%)";
}

function selectOption(index) {
  const options = document.querySelectorAll(".option");
  if (options.length > 0) {
    options.forEach((option) => option.classList.remove("selected"));
    options[index].classList.add("selected");
    playerChoice = index;
    console.log("Opción seleccionada:", index, "Texto:", options[index].textContent);
  }
}

function confirmChoice() {
  const dialog = document.getElementById("dialog");

  // Si estamos interactuando con la puerta
  if (window._interactingWithDoor) {
    if (playerChoice === 0) { // Sí, salir
      if (!hasFoca) {
        showDialog("No estás lista para salir. ¿Olvidas algo?");
        window._interactingWithDoor = false;
      } else {
        // Oscurecer pantalla y teletransportar
        fadeOutAndTeleport();
        window._interactingWithDoor = false;
      }
    } else if (playerChoice === 1) { // No, quedarse
      dialog.style.display = "none";
      window._interactingWithDoor = false;
    }
    choiceMade = true;
    playerChoice = null;
    return;
  }

  console.log("confirmChoice llamado. playerChoice =", playerChoice);
  
  if (playerChoice === 0) {
    if (!hasFoca) {
      takeFoca();
      dialogActive = false; // Permitir movimiento después de elegir
    } else if (readingBook) {
      bookStage = 0;
      showDialog(bookText[bookStage], []);
      dialogActive = false;
    }
  } else if (playerChoice === 1) {
    readingBook = false;
    hasFoca = false;
    dialog.style.display = "none";
    dialogActive = false; // Permitir movimiento después de elegir
  }

  choiceMade = true;
  playerChoice = null;
}



function takeFoca() {
  console.log("Ejecutando takeFoca...");
  hasFoca = true;
  
  const originalFoca = document.getElementById("foca2");
  if (originalFoca) {
    console.log("Ocultando foca2 original");
    originalFoca.style.display = "none";
  }
  
  focaOnHead = document.createElement("div");
  focaOnHead.id = "foca-on-head";
  focaOnHead.style.position = "absolute";
  focaOnHead.style.width = "47px";
  focaOnHead.style.height = "36px";
  focaOnHead.style.backgroundImage = "url('imagenes/foca2.png')";
  focaOnHead.style.backgroundSize = "cover";
  focaOnHead.style.zIndex = "4";
  focaOnHead.style.pointerEvents = "none";
  
  updateFocaPosition();
  document.getElementById("frame").appendChild(focaOnHead);
  
  showDialog("Foca se unió al equipo.");
}

function updateFocaPosition() {
  if (focaOnHead && hasFoca) {
    const focaOffsetX = (character.offsetWidth - 47) / 2;
    const focaOffsetY = -10;
    focaOnHead.style.left = `${posX + focaOffsetX}px`;
    focaOnHead.style.top = `${posY + focaOffsetY}px`;
  }
}

// ========== SISTEMA DE INTERACCIÓN ==========
function checkInteraction() {
  const objectsWithMessages = [
    { id: "cama", message: "Una cama muy cómoda. Te mentalizas para no caer dormida sobre ella." },
    { 
      id: "mesita", 
      message: "Un gran armario. Dentro de él puedes ver a muchos peluches asomando la vista para poder verte."
    },
    { id: "silla", message: "Una silla vieja. Sabes que un día colapsará y caerás. Decides no pensar en ello." },
    { id: "escritorio", message: "Hay un libro de química sobre el escritorio. No es momento de estudiar. Decides no inspeccionarlo." },
    { id: "foca1", message: "Una foca de gran tamaño. Te incita a abrazarla. Decides contenerte." },
    { id: "mesa2", message: "Una mesa. Sus cajones contienen basura." },
    { id: "guitarra", message: "Es una guitarra. El 50% son pegatinas y el otro 50% es solo guitarra." },
    { id: "mochila", message: "Hay una mochila pegada a unos pines." },
    { 
      id: "mesa1", 
      message: "Una foca triste se encuentra sobre la mesa. ¿Quieres cargarla?",
      hasChoice: true,
      options: ["Sí, tomarla", "No, dejarla"]
    },
    { 
      id: "puerta", 
      message: "¿Quieres salir de la habitación?",
      hasChoice: true,
      options: ["Sí, salir", "No, quedarse"]
    },
  ];

  const charRect = character.getBoundingClientRect();
  const charCenterX = (charRect.left + charRect.right) / 2;
  const charCenterY = (charRect.top + charRect.bottom) / 2;

  let bestObj = null;
  let minDistance = Infinity;
  const MAX_INTERACT_DISTANCE = 70; // Puedes ajustar este valor

  for (const obj of objectsWithMessages) {
    const objElement = document.getElementById(obj.id);
    if (!objElement) continue;

    const objRect = objElement.getBoundingClientRect();
    const objCenterX = (objRect.left + objRect.right) / 2;
    const objCenterY = (objRect.top + objRect.bottom) / 2;

    // Determina si el objeto está "en frente" según la dirección
    let isInFront = false;
    const horizontalRange = Math.max(objRect.width, 60);
    const verticalRange = Math.max(objRect.height, 60);

    if (direction === "ArrowUp" && objCenterY < charCenterY && Math.abs(objCenterX - charCenterX) < horizontalRange / 2) {
      isInFront = true;
    }
    if (direction === "ArrowDown" && objCenterY > charCenterY && Math.abs(objCenterX - charCenterX) < horizontalRange / 2) {
      isInFront = true;
    }
    if (direction === "ArrowLeft" && objCenterX < charCenterX && Math.abs(objCenterY - charCenterY) < verticalRange / 2) {
      isInFront = true;
    }
    if (direction === "ArrowRight" && objCenterX > charCenterX && Math.abs(objCenterY - charCenterY) < verticalRange / 2) {
      isInFront = true;
    }

    if (isInFront) {
      // Calcula la distancia del centro del personaje al borde más cercano del objeto
      const dx = Math.max(objRect.left - charCenterX, 0, charCenterX - objRect.right);
      const dy = Math.max(objRect.top - charCenterY, 0, charCenterY - objRect.bottom);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance <= MAX_INTERACT_DISTANCE) {
        minDistance = distance;
        bestObj = obj;
      }
    }
  }

  if (bestObj) {
    if (bestObj.id === "puerta") {
      showDialog(bestObj.message, bestObj.options);
      // Guardar que estamos en la puerta
      window._interactingWithDoor = true;
      return;
    }
    if (bestObj.id === "mesa1") {
      if (!hasFoca && bestObj.hasChoice) {
        showDialog(bestObj.message, bestObj.options);
      } else if (hasFoca) {
        showDialog("La mesa está vacía.");
      } else {
        showDialog(bestObj.message);
      }
    } else {
      showDialog(bestObj.message);
    }
  } else {
    showDialog("No hay nada interesante aquí...");
  }
}

// ========== SISTEMA DE MOVIMIENTO Y COLISIONES ==========
function moveCharacter() {
  if (!readingBook) {
    let nextX = posX;
    let nextY = posY;
    let moved = false;

    if (isKeyPressed["ArrowUp"]) {
      nextY -= speed;
      direction = "ArrowUp";
      moved = true;
    }
    if (isKeyPressed["ArrowDown"]) {
      nextY += speed;
      direction = "ArrowDown";
      moved = true;
    }
    if (isKeyPressed["ArrowLeft"]) {
      nextX -= speed;
      direction = "ArrowLeft";
      moved = true;
    }
    if (isKeyPressed["ArrowRight"]) {
      nextX += speed;
      direction = "ArrowRight";
      moved = true;
    }

    const minX = 10;
    const maxX = 640 - 80 - 10;
    const minY = 180;
    const maxY = 690 - 125 - 10;
    
    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));

    if (!checkCollisions(nextX, nextY)) {
      posX = nextX;
      posY = nextY;
      character.style.left = `${posX}px`;
      character.style.top = `${posY}px`;
      
      if (hasFoca) {
        updateFocaPosition();
      }
    }

    if (!moved) {
      character.style.backgroundImage = `url('${spriteSets[direction][2]}')`;
    }
  }
}

function checkCollisions(nextX, nextY) {
  const collisionWidth = character.offsetWidth * 0.6;
  const collisionHeight = character.offsetHeight * 0.4;
  const collisionOffsetX = (character.offsetWidth - collisionWidth) / 2;
  const collisionOffsetY = character.offsetHeight - collisionHeight;

  for (const obj of objects) {
    const objX = obj.offsetLeft;
    const objY = obj.offsetTop;
    const objWidth = obj.offsetWidth;
    const objHeight = obj.offsetHeight;

    const overlapX = (nextX + collisionOffsetX) < objX + objWidth && 
                    (nextX + collisionOffsetX + collisionWidth) > objX;
    const overlapY = (nextY + collisionOffsetY) < objY + objHeight && 
                    (nextY + collisionOffsetY + collisionHeight) > objY;

    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function changeSprite() {
  if (isKeyPressed["ArrowUp"] || isKeyPressed["ArrowDown"] || isKeyPressed["ArrowLeft"] || isKeyPressed["ArrowRight"]) {
    currentFrame = (currentFrame + 1) % 2;
    character.style.backgroundImage = `url('${spriteSets[direction][currentFrame]}')`;
    
    if (hasFoca) {
      updateFocaPosition();
    }
  }
}

// ========== MANEJADOR DE TECLADO MEJORADO ==========
function keyDownHandler(e) {
  // Movimiento del personaje
  if (spriteSets[e.key] && !isKeyPressed[e.key]) {
    isKeyPressed[e.key] = true;
  }

  // Sistema de diálogos - VERIFICACIÓN MÁS ESTRICTA
  const dialog = document.getElementById("dialog");
  if (dialog.style.display === "block") {
    console.log("Tecla presionada con diálogo abierto:", e.key);
    
    const options = document.querySelectorAll(".option");
    const hasOptions = options.length > 0;
    
    console.log("Opciones disponibles:", hasOptions, "choiceMade:", choiceMade);
    
    if (hasOptions && !choiceMade) {
      console.log("Procesando tecla para opciones...");
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = (playerChoice + 1) % options.length;
        console.log("Flecha abajo - nueva selección:", newIndex);
        selectOption(newIndex);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = (playerChoice - 1 + options.length) % options.length;
        console.log("Flecha arriba - nueva selección:", newIndex);
        selectOption(newIndex);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        console.log("Enter presionado - confirmando elección");
        confirmChoice();
        return;
      }
    } else if (e.key === "Enter" && choiceMade) {
      // Cerrar diálogo sin opciones
      e.preventDefault();
      console.log("Cerrando diálogo sin opciones");
      dialog.style.display = "none";
      return;
    }
  }
}

function keyUpHandler(e) {
  if (spriteSets[e.key]) {
    isKeyPressed[e.key] = false;
  }
}

// ========== CONTROLES TÁCTILES ==========
const touchMap = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};

Object.keys(touchMap).forEach((id) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      isKeyPressed[touchMap[id]] = true;
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      isKeyPressed[touchMap[id]] = false;
    });
  }
});

const interactBtn = document.getElementById("interact");
if (interactBtn) {
  interactBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    checkInteraction();
  });
  interactBtn.addEventListener("click", (e) => {
    e.preventDefault();
    checkInteraction();
  });
}

// Permitir seleccionar opciones de diálogo con toque/clic
document.getElementById("options").addEventListener("touchstart", function(e) {
  if (e.target.classList.contains("option")) {
    const index = parseInt(e.target.dataset.index, 10);
    selectOption(index);
    confirmChoice();
  }
});
document.getElementById("options").addEventListener("click", function(e) {
  if (e.target.classList.contains("option")) {
    const index = parseInt(e.target.dataset.index, 10);
    selectOption(index);
    confirmChoice();
  }
});

// ========== INICIALIZACIÓN ==========
document.addEventListener("keydown", (e) => {
  const validKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (validKeys.includes(e.key) && !musicStarted) {
    backgroundMusic.volume = 0.5;
    backgroundMusic.play().catch((error) => {
      console.error("Error al iniciar música:", error);
    });
    musicStarted = true;
  }
});

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
setInterval(moveCharacter, 50);
frameInterval = setInterval(changeSprite, frameSpeed);

window.addEventListener('load', scaleGame);
window.addEventListener('resize', scaleGame);
window.addEventListener('orientationchange', scaleGame);

document.getElementById('start-btn').onclick = function() {
  document.getElementById('start-screen').style.display = 'none';
};
}

function fadeOutAndTeleport() {
  // Crear overlay negro
  let overlay = document.createElement("div");
  overlay.id = "fade-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "black";
  overlay.style.opacity = "0";
  overlay.style.zIndex = "9999";
  overlay.style.transition = "opacity 1s";
  document.body.appendChild(overlay);

  // Iniciar fade out
  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 10);

  // Después de 1 segundo, teletransportar y ocultar objetos
setTimeout(() => {
    // Teletransportar jugador a la izquierda
    posX = 30;
    posY = 340;
    character.style.left = `${posX}px`;
    character.style.top = `${posY}px`;
    if (hasFoca) updateFocaPosition();

    // Ocultar todos los objetos de la habitación
    [
      "cama", "mesita", "escritorio", "silla", "mochila", "guitarra", "foca1", "foca2", "mesa1", "mesa2", "puerta"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // CAMBIA EL SPRITE DE LA HABITACIÓN AQUÍ
    document.getElementById("frame").style.backgroundImage = "url('imagenes/habitacion2.png')";

    // AÑADIR NUEVA PUERTA2
    const puerta2 = document.createElement("div");
    puerta2.id = "puerta2";
    puerta2.style.position = "absolute";
    puerta2.style.width = "99px";
    puerta2.style.height = "130px";
    puerta2.style.top = "87px";
    puerta2.style.left = "385px";
    puerta2.style.backgroundImage = "url('imagenes/puerta2.png')";
    puerta2.style.backgroundSize = "cover";
    puerta2.style.zIndex = "2";
    document.getElementById("frame").appendChild(puerta2);
    objects.push(puerta2);

    // Añadir chica1
const chica1 = document.createElement("div");
chica1.id = "chica1";
chica1.className = "chica-flotante";
chica1.style.position = "absolute";
chica1.style.width = "80px";
chica1.style.height = "116px";
chica1.style.top = "200px";
chica1.style.left = "150px";
chica1.style.backgroundImage = "url('imagenes/chica1.png')";
chica1.style.backgroundSize = "cover";
chica1.style.zIndex = "2";
document.getElementById("frame").appendChild(chica1);
objects.push(chica1);

// Añadir chica2
const chica2 = document.createElement("div");
chica2.id = "chica2";
chica2.className = "chica-flotante";
chica2.style.position = "absolute";
chica2.style.width = "80px";
chica2.style.height = "116px";
chica2.style.top = "275px";
chica2.style.left = "550px";
chica2.style.backgroundImage = "url('imagenes/chica2.png')";
chica2.style.backgroundSize = "cover";
chica2.style.zIndex = "2";
document.getElementById("frame").appendChild(chica2);
objects.push(chica2);

// Añadir chica3
const chica3 = document.createElement("div");
chica3.id = "chica3";
chica3.className = "chica-flotante";
chica3.style.position = "absolute";
chica3.style.width = "80px";
chica3.style.height = "116px";
chica3.style.top = "490px";
chica3.style.left = "450px";
chica3.style.backgroundImage = "url('imagenes/chica3.png')";
chica3.style.backgroundSize = "cover";
chica3.style.zIndex = "2";
document.getElementById("frame").appendChild(chica3);
objects.push(chica3);

    // Quitar overlay
    setTimeout(() => {
      overlay.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 1000);
    }, 500);
  }, 1000);
}

  document.getElementById('start-btn').onclick = function() {
  document.getElementById('start-screen').style.display = 'none';
  backgroundMusic.volume = 0.5;
  backgroundMusic.play().catch((error) => {
    console.error("Error al iniciar música:", error);
  });
  musicStarted = true;
};

function fadeOutAndChangePage(targetUrl) {
  // 1. Crear el overlay negro
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.backgroundColor = "black"; // Color del fondo
  overlay.style.opacity = "0"; // Empieza transparente
  overlay.style.zIndex = "99999"; // Por encima de todo
  overlay.style.transition = "opacity 1.5s ease"; // Duración del degradado (1.5 segundos)
  overlay.style.pointerEvents = "none"; // Evita que el usuario haga clic durante la transición
  document.body.appendChild(overlay);

  // 2. Forzar el inicio de la animación
  // Usamos un pequeño timeout para asegurar que el navegador registre el elemento con opacidad 0 antes de cambiarla a 1
  setTimeout(() => {
    overlay.style.opacity = "1";
  }, 50);

  // 3. Esperar a que termine la animación y cambiar de página
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 1600); // 1600ms = 1.5s de transición + 0.1s de margen de seguridad
}