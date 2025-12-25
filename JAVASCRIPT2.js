// ========== VARIABLES GLOBALES ==========
const backgroundMusic = document.getElementById("background-music");
let musicStarted = false;
const character = document.getElementById("character");
const world = document.getElementById("world");
const gameContainer = document.getElementById("game-container");
backgroundMusic.volume = 0.5;
backgroundMusic.play();

// Elementos con los que el personaje puede chocar (agrega IDs aquí)
const objects = [
  document.getElementById('puerta'),
  document.getElementById('cosa1'),
  document.getElementById('tobogan'),
  document.getElementById('muchachas'),
  document.getElementById('esfera'),
  document.getElementById('pozo')
];

// Variables de posición y movimiento
let posX = 30;
let posY = 340;
let currentFrame = 0;
let direction = "ArrowDown";
let isKeyPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

// Tiempo del último interact para evitar double-clicks rápidos
let lastInteractTime = 0;

const spriteSets = {
  ArrowUp: ["imagenes/characterup1.png", "imagenes/characterup2.png", "imagenes/characterup.png"],
  ArrowDown: ["imagenes/characterdown1.png", "imagenes/characterdown2.png", "imagenes/characterdown.png"],
  ArrowLeft: ["imagenes/characterleft1.png", "imagenes/characterleft2.png", "imagenes/characterleft.png"],
  ArrowRight: ["imagenes/characterright1.png", "imagenes/characterright2.png", "imagenes/characterright.png"],
};

let speed = 8;
let frameSpeed = 160;
let frameInterval;
let hasFoca = false;
let focaOnHead = null;
// Inicializar desde persistencia por defecto (si venimos de la página 1)
try { if (localStorage.getItem('hasFoca') === '1') hasFoca = true; } catch (e) { /* ignorar */ }

// Diálogo
let dialogActive = false;            // bloqueo de inputs/movimiento
let dialogVisible = false;           // diálogo mostrado (aunque no bloquee movimiento)
let textInterval = null;
let currentDialogOwner = null; // id del objeto que inició el diálogo (evita que otros diálogos se apliquen)
let playerChoice = null;
let choiceMade = true;
let _dialogOnConfirm = null; // handler interno para confirmar diálogos (se establece por showDialog)

// ========== SISTEMA DE CÁMARA ==========
function updateCamera() {
  // Centro de la pantalla
  const screenCenterX = 320; // 640 / 2
  const screenCenterY = 345; // 690 / 2

  // Posición ideal de la cámara (personaje centrado)
  let cameraX = posX + 40 - screenCenterX; // 40 es la mitad del ancho del personaje
  let cameraY = posY + 62.5 - screenCenterY; // 62.5 es la mitad de la altura del personaje

  // Limitar la cámara para que no salga del mundo
  const maxCameraX = world.offsetWidth - gameContainer.offsetWidth;
  const maxCameraY = world.offsetHeight - gameContainer.offsetHeight;

  cameraX = Math.max(0, Math.min(cameraX, maxCameraX));
  cameraY = Math.max(0, Math.min(cameraY, maxCameraY));

  // Aplicar la cámara moviendo el mundo
  world.style.left = `-${cameraX}px`;
  world.style.top = `-${cameraY}px`;
}

// ========== MOVIMIENTO DEL PERSONAJE ==========
function moveCharacter() {
  if (dialogActive) return; // No moverse durante diálogos
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

  // Limites del mundo (el personaje no puede salir)
  const minX = 10;
  const maxX = world.offsetWidth - 80 - 10; // 80 es el ancho del personaje
  // En mundos más altos permitimos llegar más arriba (puertas altas). Si el mundo es más alto que la pantalla usamos mínimos bajos.
  const minY = world.offsetHeight > gameContainer.offsetHeight ? 10 : 180;
  const maxY = world.offsetHeight - 125 - 10; // 125 es la altura del personaje

  nextX = Math.max(minX, Math.min(maxX, nextX));
  nextY = Math.max(minY, Math.min(maxY, nextY));

  // Movimiento con colisiones: intentar movimiento completo, si choca permitir deslizar en un eje
  if (!checkCollisions(nextX, nextY)) {
    posX = nextX;
    posY = nextY;
  } else if (!checkCollisions(nextX, posY)) {
    posX = nextX;
  } else if (!checkCollisions(posX, nextY)) {
    posY = nextY;
  } // si todo choca, no moverse

  character.style.left = `${posX}px`;
  character.style.top = `${posY}px`;

  // Actualizar cámara cuando se mueve
  updateCamera();

  // Actualizar posición de la foca si la tenemos
  if (hasFoca) updateFocaPosition();

  // Cambiar sprite si no se mueve
  if (!moved) {
    character.style.backgroundImage = `url('${spriteSets[direction][2]}')`;
  }
}

// ========== CAMBIO DE SPRITE ==========
function changeSprite() {
  if (isKeyPressed["ArrowUp"] || isKeyPressed["ArrowDown"] || isKeyPressed["ArrowLeft"] || isKeyPressed["ArrowRight"]) {
    currentFrame = (currentFrame + 1) % 2;
    character.style.backgroundImage = `url('${spriteSets[direction][currentFrame]}')`;
  }
}

// ========== MANEJADOR DE TECLADO ==========
function keyDownHandler(e) {
  const dialogEl = document.getElementById('dialog');
  const optionsContainer = document.getElementById('options');

  // Si hay diálogo visible, manejar selección/confirmación
  if (dialogVisible) {
    const optionEls = optionsContainer.querySelectorAll('.option');
    if (optionEls.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIndex = Math.max(0, (playerChoice || 0) - 1);
        selectOption(nextIndex);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(optionEls.length - 1, (playerChoice || 0) + 1);
        selectOption(nextIndex);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        confirmChoice();
        return;
      }
    } else {
      // Sin opciones: Enter/Espacio actúa como botón →
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        confirmChoice();
        return;
      }
    }
  }

  // comportamiento normal de movimiento
  if (spriteSets[e.key] && !isKeyPressed[e.key]) {
    isKeyPressed[e.key] = true;
    if (!musicStarted) {
      backgroundMusic.volume = 0.5;
      backgroundMusic.play().catch(() => {});
      musicStarted = true;
    }
  }
}

// Comprueba colisiones entre la caja de colisión del personaje en (nextX,nextY) y los objetos
function checkCollisions(nextX, nextY) {
  const collisionWidth = character.offsetWidth * 0.6;
  const collisionHeight = character.offsetHeight * 0.4;
  const collisionOffsetX = (character.offsetWidth - collisionWidth) / 2;
  const collisionOffsetY = character.offsetHeight - collisionHeight;

  for (const obj of objects) {
    if (!obj) continue;
    const objX = obj.offsetLeft;
    const objY = obj.offsetTop;
    const objWidth = obj.offsetWidth;
    const objHeight = obj.offsetHeight;

    const overlapX = (nextX + collisionOffsetX) < (objX + objWidth) &&
                     (nextX + collisionOffsetX + collisionWidth) > objX;
    const overlapY = (nextY + collisionOffsetY) < (objY + objHeight) &&
                     (nextY + collisionOffsetY + collisionHeight) > objY;

    if (overlapX && overlapY) {
      return true;
    }
  }
  return false;
}

function keyUpHandler(e) {
  if (spriteSets[e.key]) {
    isKeyPressed[e.key] = false;
  }
}

function selectOption(index) {
  const options = document.querySelectorAll('.option');
  if (options.length > 0) {
    options.forEach((o) => o.classList.remove('selected'));
    const idx = Math.max(0, Math.min(options.length - 1, index));
    options[idx].classList.add('selected');
    playerChoice = idx;
  }
}

function confirmChoice() {
  const dialog = document.getElementById('dialog');

  // Manejo especial para puertas (compatibilidad con el sistema de JAVASCRIPT.js)
  if (window._interactingWithDoor) {
    if (playerChoice === 0) { // Sí, salir
      // Si existe la variable hasFoca y es false -> impedir salir
      if (typeof hasFoca !== 'undefined' && !hasFoca) {
        showDialog("No estás listo para salir. ¿Olvidas algo?");
        window._interactingWithDoor = false;
        dialogActive = false;
        dialogVisible = true;
      } else if (typeof hasFoca === 'undefined') {
        // No tenemos esa lógica en esta escena: mostrar mensaje neutral
        showDialog("No estás listo para salir. ¿Olvidas algo?");
        window._interactingWithDoor = false;
        dialogActive = false;
        dialogVisible = true;
      } else {
        dialog.style.display = 'none';
        dialogVisible = false;
        dialogActive = false;
        if (typeof fadeOutAndTeleport === 'function') fadeOutAndTeleport();
        window._interactingWithDoor = false;
      }
    } else if (playerChoice === 1) { // No, quedarse
      dialog.style.display = 'none';
      dialogVisible = false;
      dialogActive = false;
      window._interactingWithDoor = false;
    }
    choiceMade = true;
    playerChoice = null;
    return;
  }

  if (window._interactingWithDoor2) {
    if (playerChoice === 0) { // Sí, cruzar
      dialog.style.display = 'none';
      dialogVisible = false;
      dialogActive = true; // bloquear inputs durante la transición
      window._interactingWithDoor2 = false;
      choiceMade = true;
      playerChoice = null;
      // Mostrar degradado y mensaje, luego ir a PAGINA3.html
      if (typeof fadeOutAndTeleport === 'function') fadeOutAndTeleport('PAGINA3.html'); else setTimeout(()=>{ window.location.href = 'PAGINA3.html'; }, 2200);
      return;
    } else { // No, quedarse
      // Cerrar diálogo y permitir moverse de vuelta
      dialog.style.display = 'none';
      dialogVisible = false;
      dialogActive = false;
      currentDialogOwner = null;
      window._interactingWithDoor2 = false;
      choiceMade = true;
      playerChoice = null;

      // Retroceder ligeramente para que el jugador pueda alejarse de la puerta
      const BACKOFF = 24;
      if (direction === 'ArrowUp') posY = Math.min(world.offsetHeight - 125 - 10, posY + BACKOFF);
      else if (direction === 'ArrowDown') posY = Math.max(world.offsetHeight > gameContainer.offsetHeight ? 10 : 180, posY - BACKOFF);
      else if (direction === 'ArrowLeft') posX = Math.min(world.offsetWidth - 80 - 10, posX + BACKOFF);
      else if (direction === 'ArrowRight') posX = Math.max(10, posX - BACKOFF);

      // Aplicar posición y cámara
      character.style.left = `${posX}px`;
      character.style.top = `${posY}px`;
      updateCamera();

      return;
    }
  }

  // Si hay un handler personalizado (showDialog lo registra), usarlo
  if (typeof _dialogOnConfirm === 'function') {
    _dialogOnConfirm(playerChoice);
    return;
  }

  // Si no, intentar encontrar botón siguiente y simular click
  const optionsContainer = document.getElementById('options');
  const nextBtn = optionsContainer.querySelector('.next-arrow');
  if (nextBtn) {
    nextBtn.click();
  } else {
    // fallback: cerrar diálogo
    dialog.style.display = 'none';
    dialogVisible = false;
    dialogActive = false;
    currentDialogOwner = null;
  }
}

// Muestra una secuencia de mensajes (tipo 'diálogo' con botón ->)
// showDialog: muestra UN solo mensaje o opciones y llama onComplete(choice|null) cuando se confirma
function showDialog(message, options = [], onComplete, ownerId, block = true) {
  // Si ya hay diálogo (visible o bloqueante) de otro owner, ignorar
  if ((dialogActive || dialogVisible) && currentDialogOwner && currentDialogOwner !== ownerId) return;
  // block: si true, bloquea movimiento/inputs; si false, permite moverse pero el diálogo sigue visible
  dialogActive = !!block;
  dialogVisible = true;
  currentDialogOwner = ownerId || null;
  const voiceSound = document.getElementById('voice-sound');
  const dialog = document.getElementById('dialog');
  const dialogText = document.getElementById('dialogText');
  const optionsContainer = document.getElementById('options');

  // limpiar estado previo
  if (textInterval) { clearInterval(textInterval); textInterval = null; }
  optionsContainer.innerHTML = '';
  optionsContainer.style.display = 'none';
  dialogText.textContent = '';
  dialog.style.display = 'block';

  // efecto máquina de escribir
  let currentLength = 0;
  if (voiceSound) { voiceSound.currentTime = 0; voiceSound.loop = true; voiceSound.play().catch(()=>{}); }
  textInterval = setInterval(() => {
    currentLength++;
    dialogText.textContent = message.slice(0, currentLength);
    if (currentLength >= message.length) {
      clearInterval(textInterval);
      textInterval = null;
      if (voiceSound) { voiceSound.pause(); }

      // Si hay opciones, mostrarlas y esperar elección
      if (options && options.length > 0) {
        optionsContainer.style.display = 'block';
        choiceMade = false;
        playerChoice = 0;
        options.forEach((opt, idx) => {
          const el = document.createElement('div');
          el.className = 'option';
          if (idx === 0) el.classList.add('selected');
          el.textContent = opt;
          el.dataset.index = idx;
          el.addEventListener('click', (e) => {
            selectOption(Number(e.currentTarget.dataset.index));
            // confirmar inmediatamente al click (comportamiento claro para móviles)
            confirmChoice();
          });
          optionsContainer.appendChild(el);
        });
        // establecer handler para confirmChoice
        _dialogOnConfirm = (choiceIndex) => {
          dialog.style.display = 'none';
          dialogVisible = false;
          dialogActive = false;
          currentDialogOwner = null;
          optionsContainer.style.display = 'none';
          choiceMade = true;
          const ch = (typeof choiceIndex === 'number') ? choiceIndex : playerChoice;
          playerChoice = null;
          _dialogOnConfirm = null;
          if (typeof onComplete === 'function') onComplete(ch);
        };
      } else {
        // Sin opciones -> mostrar botón siguiente (asegurarse de que el contenedor sea visible)
        optionsContainer.style.display = 'block';
        const nextBtn = document.createElement('button');
        nextBtn.textContent = '→';
        nextBtn.className = 'next-arrow';
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dialog.style.display = 'none';
          dialogVisible = false;
          dialogActive = false;
          currentDialogOwner = null;
          if (typeof onComplete === 'function') onComplete(null);
        });
        nextBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
        optionsContainer.appendChild(nextBtn);
      }
    }
  }, 25);
}

// showDialogSequence: muestra mensajes secuenciales usando showDialog y respeta ownerId
function showDialogSequence(messages, onComplete, ownerId, block = true) {
  let index = 0;
  function next() {
    if (index >= messages.length) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    showDialog(messages[index], [], () => {
      index++;
      next();
    }, ownerId, block);
  }
  next();
}

// Transición de pantalla: degradado a negro con mensaje central y teletransporte
let _isFading = false;
function fadeOutAndTeleport(targetUrl = 'PAGINA3.html', message = 'Aún no es el momento', fadeMs = 5000, showMs = 5000) {
  if (_isFading) return;
  _isFading = true;

  // crear overlay completamente negro
  const overlay = document.createElement('div');
  overlay.id = 'screen-fade-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
    background: 'black', opacity: '0', transition: `opacity ${fadeMs}ms ease`, zIndex: 99999, pointerEvents: 'auto'
  });
  document.body.appendChild(overlay);

  // forzar reflow y empezar fade hasta opacidad 1 (oscuro absoluto)
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  // Mensaje central (oculto hasta que el fade esté completo)
  const msg = document.createElement('div');
  msg.id = 'screen-fade-message';
  msg.textContent = '';
  Object.assign(msg.style, {
    position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    color: 'white', fontSize: '28px', textAlign: 'center', zIndex: 100000, opacity: '0', transition: 'opacity 300ms ease', padding: '10px 20px', fontFamily: 'Press Start 2P, monospace', maxWidth: '90%'
  });
  document.body.appendChild(msg);

  // Mensajes en secuencia: primero el mensaje recibido, luego el segundo mensaje fijo
  const firstText = message;
  const secondText = 'Nos veremos pronto, Cris.';
  const typingSpeed = 25; // ms por carácter

  function typeText(el, text) {
    return new Promise((resolve) => {
      el.textContent = '';
      el.style.opacity = '1';
      let idx = 0;
      const iv = setInterval(() => {
        idx++;
        el.textContent = text.slice(0, idx);
        if (idx >= text.length) {
          clearInterval(iv);
          resolve();
        }
      }, typingSpeed);
    });
  }

  // Mostrar primer mensaje tras completar el fade
  setTimeout(() => {
    typeText(msg, firstText).then(() => {
      // esperar el tiempo showMs con el primer mensaje visible
      setTimeout(() => {
        // desvanecer el primer mensaje antes de mostrar el segundo
        msg.style.opacity = '0';
        setTimeout(() => {
          // Mostrar y escribir el segundo mensaje
          typeText(msg, secondText).then(() => {
            // esperar y luego redirigir
            const typingDuration2 = secondText.length * typingSpeed;
            setTimeout(() => {
              window.location.href = targetUrl;
            }, typingDuration2 + showMs);
          });
        }, 350); // tiempo para el fade de salida
      }, showMs);
    });
  }, fadeMs);
}

// Check interaction with nearest object (puerta or cosa1) and show its dialog sequence
function checkInteraction() {
  // Inspirado en la lógica de JAVASCRIPT.js: buscar objetos "en frente" según dirección y seleccionar el más cercano
  const objectsWithMessages = [
    { id: 'puerta', message: '¿Quieres salir de la habitación?', hasChoice: true, options: ['Sí, salir', 'No, quedarse'] },
    { id: 'cosa1', message: '', },
    { id: 'tobogan', message: 'Es un tobogán' },
    { id: 'muchachas', message: '' },
    { id: 'esfera', message: '' },
    { id: 'fantasma', message: '' },
    { id: 'pozo', message: '' },
  ];

  const charRect = character.getBoundingClientRect();
  const charCenterX = (charRect.left + charRect.right) / 2;
  const charCenterY = (charRect.top + charRect.bottom) / 2;

  let bestObj = null;
  let minDistance = Infinity;
  const MAX_INTERACT_DISTANCE = 120;

  for (const obj of objectsWithMessages) {
    const el = document.getElementById(obj.id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const objCenterX = (r.left + r.right) / 2;
    const objCenterY = (r.top + r.bottom) / 2;

    // Determina si el objeto está "en frente" según la dirección
    let isInFront = false;
    const horizontalRange = Math.max(r.width, 60);
    const verticalRange = Math.max(r.height, 60);

    if (direction === 'ArrowUp' && objCenterY < charCenterY && Math.abs(objCenterX - charCenterX) < horizontalRange / 2) isInFront = true;
    if (direction === 'ArrowDown' && objCenterY > charCenterY && Math.abs(objCenterX - charCenterX) < horizontalRange / 2) isInFront = true;
    if (direction === 'ArrowLeft' && objCenterX < charCenterX && Math.abs(objCenterY - charCenterY) < verticalRange / 2) isInFront = true;
    if (direction === 'ArrowRight' && objCenterX > charCenterX && Math.abs(objCenterY - charCenterY) < verticalRange / 2) isInFront = true;

    if (!isInFront) continue;

    // Distancia mínima al borde del objeto
    const dx = Math.max(r.left - charCenterX, 0, charCenterX - r.right);
    const dy = Math.max(r.top - charCenterY, 0, charCenterY - r.bottom);
    const distance = Math.sqrt(dx*dx + dy*dy);

    if (distance < minDistance && distance <= MAX_INTERACT_DISTANCE) {
      minDistance = distance;
      bestObj = obj;
    }
  }

  if (!bestObj) return; // nada cerca o no en frente

  // Casos específicos (como en JAVASCRIPT.js)
  if (bestObj.id === 'cosa1') {
    // Si ya la tienes, mostrar secuencia reflexiva
    showDialogSequence(['¿Alguna vez has pensado en qué sucedería si un día desaparecieses?', 
      '¿Por cuánto tiempo crees que te llorarían? ¿Por cuánto tiempo crees que les costaría superarte?',
      'Él sabe la respuesta. Espero que nunca tengas que pasar por lo mismo...'], 
      null, 'cosa1');
    return;
  }

// FUNCIONES PARA LA FOCA (tomar y actualizar posición)

  if (bestObj.id === 'muchachas') {
    // Secuencia para las muchachas (bloqueante)
    showDialogSequence(['Nosotras solíamos ser 4.', 
      'Nuestra amiga tenía un deseo que quería cumplir, y con la intención de que el pozo cumpliese su deseo, ella misma se arrojó al fondo.', 
      'Que estúpida, con tan solo una moneda hubiese bastado.'], null, 'muchachas', true);
    return;
  }

  if (bestObj.id === 'fantasma') {
    // Secuencia para el fantasma
    showDialogSequence(['Deseo tanto cruzar esa puerta y verle de nuevo.', 
      'Antes hablábamos a todas horas, pero un día decidió aislarse en las profundidades.', 
      'De todas formas, tiene mucho interés en conocerte.', 
      'Manipuló la conexión del creador para verte, pero aun así, el precio que pagó le impide llegar a ti.', 
      '¿Que quién soy? Solo un viajero errante. Un parásito necesario.', 
    'Sé que nos volveremos a ver. Quizás no bajo esta piel... pero este envase me servirá por ahora.',
    'Que la oscuridad te sea leve.'
    ], null, 'fantasma', true);
    return;
  }

  if (bestObj.id === 'esfera') {
    // Secuencia para la esfera (bloqueante)
    showDialogSequence(['No reconoces lo que estás viendo.', 'Por alguna razón, sientes que esa cosa tiene más miedo de ti, que tú de ella.'], null, 'esfera', true);
    return;
  }

  if (bestObj.id === 'pozo') {
    // Secuencia para el pozo (bloqueante)
    showDialogSequence(['Es un pozo muy pequeño.', 'Por un segundo sientes que algo te ha susurrado desde el fondo.'], null, 'pozo', true);
    return;
  }

  if (bestObj.id === 'tobogan') {
    // Mensaje simple para el tobogán (no bloqueante)
    showDialogSequence(['Es un tobogán.', 'Ves imposible la idea de jugar con él.'], null, 'tobogan', false);
    return;
  }


  if (bestObj.id === "puerta") {
        // Mostrar diálogo con elección Sí/No para puerta2
        showDialog("¿Quieres cruzar la puerta?", ["Sí, cruzar", "No, quedarme"]);
        // Marcar que estamos interactuando con puerta2 para que confirmChoice lo procese
        window._interactingWithDoor2 = true;
        return;
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
    const down = (e) => { e.preventDefault(); isKeyPressed[touchMap[id]] = true; };
    const up = (e) => { e.preventDefault(); isKeyPressed[touchMap[id]] = false; };
    btn.addEventListener("touchstart", down);
    btn.addEventListener("touchend", up);
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("mousedown", down);
    btn.addEventListener("mouseup", up);
    btn.addEventListener("pointercancel", up);
  }
});

// Botón de interacción (touch / click)
const interactBtn = document.getElementById('interact');
if (interactBtn) {
  interactBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); interactAction(); });
  interactBtn.addEventListener('click', (e)=>{ e.preventDefault(); interactAction(); });
} 

function interactAction() {
  // Si ya hay diálogo visible, no hacer nada (evita que doble clic cierre el cuadro)
  if (dialogVisible) return;

  // Evitar múltiples activaciones rápidas (debounce: 200ms)
  const now = Date.now();
  if (now - lastInteractTime < 200) return;
  lastInteractTime = now;

  if (typeof checkInteraction === 'function') {
    checkInteraction();
  } else {
    window.dispatchEvent(new Event('gameInteract'));
  }
}

function scaleGame() {
  const gc = document.getElementById('game-container');
  const originalWidth = 640;
  const originalHeight = 690;
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;
  const scale = Math.min(containerWidth / originalWidth, containerHeight / originalHeight);
  gc.style.transform = `scale(${scale})`;
  gc.style.transformOrigin = '0 0';
  gc.style.position = 'absolute';
  gc.style.left = `${(containerWidth - originalWidth * scale) / 2}px`;
  gc.style.top = `${(containerHeight - originalHeight * scale) / 2}px`;
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

setInterval(moveCharacter, 50);
frameInterval = setInterval(changeSprite, frameSpeed);

// Inicializar cámara, posición inicial del personaje y escala al cargar
window.addEventListener('load', () => {
  // Posicionar personaje en centro-abajo del mundo y mirar hacia arriba
  const charW = character.offsetWidth || 80;
  const charH = character.offsetHeight || 125;
  posX = Math.round((world.offsetWidth - charW) / 2);
  posY = Math.round(world.offsetHeight - charH - 10); // 10px de margen sobre el límite
  direction = 'ArrowUp';
  character.style.left = `${posX}px`;
  character.style.top = `${posY}px`;
  character.style.backgroundImage = `url('${spriteSets[direction][2]}')`;

  updateCamera();
  scaleGame();

  // Si no hay foca por persistencia, ponerla por defecto en pagina2 (según petición)
  try {
    if (!hasFoca) {
      console.log('No se detectó foca persistente — colocando foca por defecto en pagina2');
      hasFoca = true;
      try { localStorage.setItem('hasFoca', '1'); } catch (e) { /* ignorar */ }
      if (!focaOnHead) {
        focaOnHead = document.createElement('div');
        focaOnHead.id = 'foca-on-head';
        focaOnHead.style.position = 'absolute';
        focaOnHead.style.width = '47px';
        focaOnHead.style.height = '36px';
        focaOnHead.style.backgroundImage = "url('imagenes/foca2.png')";
        focaOnHead.style.backgroundSize = 'cover';
        focaOnHead.style.zIndex = '4';
        focaOnHead.style.pointerEvents = 'none';
        const w = document.getElementById('world') || document.getElementById('frame') || document.body;
        w.appendChild(focaOnHead);
      }
      updateFocaPosition();
      requestAnimationFrame(updateFocaPosition);
    }
  } catch(e) { /* ignorar errores de storage */ }

  // Registrar objetos en la lista de colisiones si existen (seguro para cargas tardías)
  const cosa1El = document.getElementById('cosa1');
  if (cosa1El && !objects.includes(cosa1El)) objects.push(cosa1El);
  const toboganEl = document.getElementById('tobogan');
  if (toboganEl && !objects.includes(toboganEl)) objects.push(toboganEl);
  const muchachasEl = document.getElementById('muchachas');
  if (muchachasEl && !objects.includes(muchachasEl)) objects.push(muchachasEl);
  const esferaEl = document.getElementById('esfera');
  if (esferaEl && !objects.includes(esferaEl)) objects.push(esferaEl);
  const pozoEl = document.getElementById('pozo');
  if (pozoEl && !objects.includes(pozoEl)) objects.push(pozoEl);
  // Añadir fantasma como obstáculo para evitar superposición con el jugador
  const fantasmaEl = document.getElementById('fantasma');
  if (fantasmaEl && !objects.includes(fantasmaEl)) {
    objects.push(fantasmaEl);
    console.log('Fantasma añadido a objetos de colisión');
  }
});
window.addEventListener('resize', scaleGame);
window.addEventListener('orientationchange', scaleGame);

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
  document.getElementById("world").appendChild(focaOnHead);
}

function updateFocaPosition() {
  if (focaOnHead && hasFoca) {
    const focaOffsetX = (character.offsetWidth - 47) / 2;
    const focaOffsetY = -10;
    focaOnHead.style.left = `${posX + focaOffsetX}px`;
    focaOnHead.style.top = `${posY + focaOffsetY}px`;
  }
}
// takeFoca() was being called here for testing; removed duplicate confirmChoice definition to keep single implementation.
takeFoca();
