// JAVASCRIPT3_new.js — movement, mobile controls, collisions and basic dialog
(function(){
  const backgroundMusic = document.getElementById('background-music');
  const voiceSound = document.getElementById('voice-sound');
  const frame = document.getElementById('frame');
  const character = document.getElementById('character');
  const dialog = document.getElementById('dialog');
  const dialogText = document.getElementById('dialogText');
  const optionsContainer = document.getElementById('options');

  if (!frame || !character) return; // nothing to do

  // Obstacles in the room — prevent player overlapping
  const obstacleIds = ['mesacumple', 'focarealista', 'tele'];
  function getObstacles() {
    // include both specific id-based obstacles and any floating seals (.foca)
    const byId = obstacleIds.map(id=>document.getElementById(id)).filter(Boolean);
    const seals = Array.from(frame.querySelectorAll('.foca'));
    // avoid duplicates (some elements may have an id and the .foca class)
    const set = new Set();
    const result = [];
    for(const el of [...byId, ...seals]){ if (!set.has(el)) { set.add(el); result.push(el); } }
    return result;
  }

  // Dialog sequences for special objects
  const dialogues = {
    focarealista: [
      "¡¡Estoy muy emocionada!!",
      "Me encantan los cumpleaños, las tartas y los pescados.",
      "Pero, no me gusta el anisakis :C"
    ],
    // Generic seals: shown for any element with class 'foca'
    foca: [
      "Las focas están realmente muy felices.",
      "No dicen nada, pero su rostro dice \"feliz cumpleaños, cris\"."
    ]
  };
  let lastInteractedId = null;
  const dialogueIndexes = {}; // tracks current index per id


  // Top boundary for the room (px from top)
  const TOP_LIMIT = 120; // la posición Y mínima permitida (px desde arriba)

  // Position variables (initialized by initPlayer)
  let posX = 0, posY = 0;

  // Initialize player position: center-bottom and facing up, robustly
  function initPlayer(){
    if (!frame || !character) return;
    // If frame has no layout yet, try again on next frame
    if (frame.clientWidth === 0 || frame.clientHeight === 0) { requestAnimationFrame(initPlayer); return; }
    character.style.position = 'absolute';
    // center horizontally
    posX = Math.round((frame.clientWidth - character.clientWidth) / 2);
    // bottom aligned
    posY = Math.round(frame.clientHeight - character.clientHeight);
    // respect top limit
    posY = Math.max(posY, TOP_LIMIT);
    character.style.left = posX + 'px';
    character.style.top = posY + 'px';
    // ensure starting facing up
    direction = 'ArrowUp';
    currentFrame = 2;
    if (spriteSets && spriteSets[direction]) {
      character.style.backgroundImage = `url('${spriteSets[direction][currentFrame]}')`;
    }
  }

  // run initPlayer on load (and after scaling)
  let speed = 6; // px per tick
  let isKeyPressed = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
  let dialogActive = false;
  let dialogVisible = false;
  let textInterval = null;
  let playerChoice = null;
  let currentDialogOwner = null;
  let choiceMade = true;
  let _dialogOnConfirm = null;
  let lastDialogTarget = null; // which object triggered a choice dialog (e.g., 'tele')
  let videoPlaying = false; // when true, player can't move or interact
  let musicWasPlaying = false; // track whether background music was playing before the video
  let showingNote = false; // true while the full-note overlay is visible
  let noteRead = false; // once true, the note cannot be opened again
  // start facing up and with static frame
  let direction = 'ArrowUp';
  let currentFrame = 2;
  let frameSpeed = 160; // ms between sprite frame changes

  const spriteSets = {
    ArrowUp: ["imagenes/characterup1.png", "imagenes/characterup2.png", "imagenes/characterup.png"],
    ArrowDown: ["imagenes/characterdown1.png", "imagenes/characterdown2.png", "imagenes/characterdown.png"],
    ArrowLeft: ["imagenes/characterleft1.png", "imagenes/characterleft2.png", "imagenes/characterleft.png"],
    ArrowRight: ["imagenes/characterright1.png", "imagenes/characterright2.png", "imagenes/characterright.png"],
  };

  // start music on first user gesture to avoid autoplay block
  function startMusic() {
    if (!backgroundMusic) return;
    try { backgroundMusic.play().then(()=>{}).catch(()=>{}); } catch(e){}
    window.removeEventListener('pointerdown', startMusic);
    window.removeEventListener('keydown', startMusic);
  }
  window.addEventListener('pointerdown', startMusic);
  window.addEventListener('keydown', startMusic);

  function rectsIntersect(a,b){
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  function checkCollisions(nextX,nextY){
    const cw = character.offsetWidth * 0.7;
    const ch = character.offsetHeight * 0.6;
    const offsetX = (character.offsetWidth - cw)/2;
    const offsetY = (character.offsetHeight - ch);

    const a = { left: nextX+offsetX, top: nextY+offsetY, right: nextX+offsetX+cw, bottom: nextY+offsetY+ch };
    const obstacles = getObstacles();
    for(const o of obstacles){
      // small padding for seals and tele to account for tremble and give a comfortable buffer
      const isSeal = (o.classList && o.classList.contains('foca')) || o.id === 'focarealista';
      const pad = (isSeal || o.id === 'tele') ? 8 : 0;
      // special-case: reduce top padding for the realistic seal so the player can interact from above
      // negative topPad moves the top boundary downward (shrinking collision box) to let the player reach the seal from above
      const topPad = (o.id === 'focarealista') ? -20 : pad;
      const oRect = { left: o.offsetLeft - pad, top: o.offsetTop - topPad, right: o.offsetLeft + o.offsetWidth + pad, bottom: o.offsetTop + o.offsetHeight + pad };
      if (rectsIntersect(a,oRect)) return true; 
    }
    return false;
  }

  function moveCharacter(){
    if (dialogActive || videoPlaying) return;
    let nextX = posX, nextY = posY;
    let moved = false;

    if (isKeyPressed.ArrowUp) { nextY -= speed; direction = 'ArrowUp'; moved = true; }
    if (isKeyPressed.ArrowDown) { nextY += speed; direction = 'ArrowDown'; moved = true; }
    if (isKeyPressed.ArrowLeft) { nextX -= speed; direction = 'ArrowLeft'; moved = true; }
    if (isKeyPressed.ArrowRight) { nextX += speed; direction = 'ArrowRight'; moved = true; }

    // bounds inside frame
    const minX = 0, minY = TOP_LIMIT;
    const maxX = Math.max(0, frame.clientWidth - character.clientWidth);
    const maxY = Math.max(0, frame.clientHeight - character.clientHeight);
    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));

    // collision
    if (!checkCollisions(nextX,nextY)){
      posX = nextX; posY = nextY;
      character.style.left = posX + 'px';
      character.style.top = posY + 'px';
    } else {
      // attempt axis sliding
      if (!checkCollisions(nextX,posY)) { posX = nextX; character.style.left = posX + 'px'; }
      else if (!checkCollisions(posX,nextY)) { posY = nextY; character.style.top = posY + 'px'; }
    }

    // if not moved, set static frame
    if (!moved) {
      currentFrame = 2; // static
      character.style.backgroundImage = `url('${spriteSets[direction][2]}')`;
    }
  }

  // keyboard handlers
  document.addEventListener('keydown', (e)=>{
    // If a dialog with option elements is active, use arrow keys to navigate options
    const optionEls = optionsContainer ? optionsContainer.querySelectorAll('.option') : null;
    if (dialogActive && optionEls && optionEls.length > 0) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const arr = Array.from(optionEls);
        const current = arr.findIndex(el => el.classList.contains('selected'));
        const next = (current <= 0) ? arr.length - 1 : current - 1;
        selectOption(next);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const arr = Array.from(optionEls);
        const current = arr.findIndex(el => el.classList.contains('selected'));
        const next = (current === -1 || current >= arr.length - 1) ? 0 : current + 1;
        selectOption(next);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmChoice(); return; }
    }

    // default movement behavior
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) { isKeyPressed[e.key]=true; e.preventDefault(); }
    if ((e.key === 'Enter' || e.key === ' ') && dialogActive) { confirmChoice(); e.preventDefault(); }
  });
  document.addEventListener('keyup', (e)=>{ if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) isKeyPressed[e.key]=false; });

  // touch/button controls
  const touchMap = { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' };
  Object.keys(touchMap).forEach(id=>{
    const btn = document.getElementById(id);
    if (!btn) return;
    const key = touchMap[id];
    const start = (ev)=>{ ev.preventDefault(); isKeyPressed[key]=true; };
    const end = (ev)=>{ ev.preventDefault(); isKeyPressed[key]=false; };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('touchstart', start, {passive:false});
    btn.addEventListener('touchend', end);
    // click single-step
    btn.addEventListener('click', ()=>{ isKeyPressed[key]=true; setTimeout(()=>isKeyPressed[key]=false,120); });
  });

  // interact button
  const interactBtn = document.getElementById('interact');
  if (interactBtn) interactBtn.addEventListener('click', ()=>{ tryInteract(); });

  function tryInteract(){
    // find nearest obstacle within distance
    const cx = posX + character.offsetWidth/2; const cy = posY + character.offsetHeight/2;
    let nearest=null, minDist=Infinity;
    for(const o of getObstacles()){
      const ox = o.offsetLeft + o.offsetWidth/2; const oy = o.offsetTop + o.offsetHeight/2;
      const d = Math.hypot(cx-ox, cy-oy);
      if (d < minDist) { minDist=d; nearest=o; }
    }
    if (nearest && minDist < 120){
      if (videoPlaying) return; // no interactions while viewing
      if (nearest.classList && nearest.classList.contains('foca')) {
        // start the generic seal dialogue sequence (two messages)
        lastInteractedId = 'foca';
        dialogueIndexes['foca'] = 0;
        showDialog(dialogues['foca'][0], []);
      } else if (nearest.id === 'focarealista') {
        // start sequence for the realista foca
        lastInteractedId = 'focarealista';
        dialogueIndexes['focarealista'] = 0;
        showDialog(dialogues.focarealista[0], []);
      }
      else if (nearest.id === 'tele') {
        // ask to watch tv
        lastDialogTarget = 'tele';
        showDialog('¿Quieres ver el vídeo preparado en la televisión?', ['Sí, ver el vídeo.','No verlo'], (choice)=>{
          if (choice === 0) startTeleSequence();
          lastDialogTarget = null;
        });
      }
      else if (nearest.id === 'mesacumple') {
        // table with cake + note
        if (noteRead) {
          showDialog('Ya has leído la nota.');
        } else {
          lastDialogTarget = 'mesa';
          showDialog('Una tarta muy apetecible está sobre la mesa, al lado, una nota. ¿Quieres leerla? (DESPUÉS NO PODRÁS REGRESAR).', ['Sí, leer la nota','No, no leerla'], (choice)=>{
            if (choice === 0) showFullNote();
            lastDialogTarget = null;
          });
        }
      }
      else if (nearest.id === 'puerta') showDialog('¿Quieres salir?', ['Sí','No'], (choice)=>{ if (choice === 0) { /* placeholder: leave room */ } });
      else showDialog('Interactuaste con ' + nearest.id);
    } else {
      // no nearby interactable — don't show a dialog
    }
  }

  // Dialog system (user-provided implementation)
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
          // if exactly two options, apply the 'two-options' layout to match the original decision UI
          if (options.length === 2) optionsContainer.classList.add('two-options'); else optionsContainer.classList.remove('two-options');
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
            // Use the existing confirmChoice handler so the dialog sequence continues
            confirmChoice();
          });
          nextBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
          optionsContainer.appendChild(nextBtn);
        }
      }
    }, 25);
  }

  // Select an option by index: update UI and internal playerChoice
  function selectOption(index){
    const opts = document.querySelectorAll('#options .option');
    if (!opts || opts.length === 0) return;
    const i = Math.max(0, Math.min(opts.length - 1, index));
    opts.forEach(o => o.classList.remove('selected'));
    opts[i].classList.add('selected');
    playerChoice = i;
  }

  // Start the 'watch TV' sequence: 3s black screen, then play video.mp4 centered; when video ends, restore controls
  function startTeleSequence(){
    if (videoPlaying) return;
    // Remember and pause background music if it was playing
    try { musicWasPlaying = !!(backgroundMusic && !backgroundMusic.paused); if (musicWasPlaying && backgroundMusic) { try { backgroundMusic.pause(); } catch(e){} } } catch(e){}
    let overlay = document.getElementById('screen-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'screen-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
    } else if (overlay.parentNode !== document.body) {
      document.body.appendChild(overlay);
    }

    videoPlaying = true;
    // ensure empty and start faded-in black screen
    overlay.innerHTML = '';
    overlay.style.transition = 'opacity 300ms ease';
    overlay.style.opacity = '0';
    overlay.style.display = 'flex';
    // force a frame and then fade in
    requestAnimationFrame(()=>{ overlay.style.opacity = '1'; });

    // wait 3s with black screen
    setTimeout(()=>{
      // create video element (point to carpeta imagenes)
      const video = document.createElement('video');
      video.id = 'tele-video';
      video.src = 'imagenes/video.mp4';
      video.autoplay = true;
      video.playsInline = true;
      video.controls = false;
      video.style.maxWidth = '80vw';
      video.style.maxHeight = '80vh';
      overlay.appendChild(video);

      // play and handle end
      const p = video.play(); if (p && p.catch) p.catch(()=>{});

      const cleanup = () => {
        overlay.style.opacity = '0';
        setTimeout(()=>{
          overlay.style.display='none'; overlay.innerHTML=''; videoPlaying=false;
          // resume background music if it was playing before the video
          if (musicWasPlaying && backgroundMusic) { try { backgroundMusic.play().catch(()=>{}); } catch(e){} }
          musicWasPlaying = false;
        }, 350);
      };

      let errorHandled = false;
      video.addEventListener('error', ()=>{
        if (errorHandled) return; errorHandled = true;
        // hide and show a short dialog informing of the problem
        cleanup();
        setTimeout(()=>{ showDialog('No se pudo cargar el vídeo.'); }, 500);
      });

      video.addEventListener('ended', ()=>{ cleanup(); });

      // Optional: allow click to skip
      overlay.addEventListener('click', function _skip(){ if (video && !video.paused){ try{ video.pause(); }catch(e){} } cleanup(); overlay.removeEventListener('click', _skip); }, { once: true });
    }, 3000);
  }

// Show the full note image on black background
  function showFullNote(){
    if (showingNote) return;
    showingNote = true;
    dialogActive = true; // block movement

    // Buscar o crear el overlay
    const overlay = document.getElementById('screen-overlay') || (()=>{ 
        const c=document.createElement('div'); 
        c.id='screen-overlay'; 
        document.body.appendChild(c); 
        return c; 
    })();

    // IMPORTANTE: Quitamos aria-hidden porque ahora vamos a interactuar con esto
    overlay.removeAttribute('aria-hidden');

    overlay.innerHTML = '';
    overlay.style.display = 'flex'; 
    overlay.style.opacity = '1';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.95)'; // Fondo casi negro

    const container = document.createElement('div'); 
    container.className = 'note-container';
    
    const img = document.createElement('img'); 
    img.className = 'note-img'; 
    img.src = 'imagenes/nota.png'; 
    img.alt = 'Nota secreta';

    const exitBtn = document.createElement('button'); 
    exitBtn.className = 'note-exit'; 
    exitBtn.textContent = 'SALIR DE LA SIMULACIÓN';
    
    // --- AQUÍ ESTÁ EL CAMBIO PRINCIPAL ---
    exitBtn.addEventListener('click', ()=>{
      noteRead = true;
      
      // 1. Detener toda la música y sonidos
      if(backgroundMusic) backgroundMusic.pause();
      if(voiceSound) voiceSound.pause();
      stopConfettiLoop(); // Detener confeti si hay

      // 2. Limpiar el contenido del overlay
      overlay.innerHTML = '';
      
      // 3. Poner la pantalla en negro total (Simulación de apagado)
      overlay.style.backgroundColor = 'black';
      overlay.style.transition = 'background-color 1s ease';
      overlay.style.cursor = 'none'; // Ocultar el ratón

      // 4. Mensaje final opcional (estilo terminal/sistema)
      const finalMsg = document.createElement('div');
      finalMsg.style.color = '#00ff00'; // Verde terminal o Blanco
      finalMsg.style.fontFamily = 'monospace';
      finalMsg.style.marginTop = '20vh';
      finalMsg.innerText = '> SYSTEM SHUTDOWN...\n> DISCONNECTED.';
      overlay.appendChild(finalMsg);
      
      // Intentar cerrar por si acaso (algunos navegadores viejos lo permiten), pero sin depender de ello
      try { window.close(); } catch(e){}
    });

    container.appendChild(img);
    container.appendChild(exitBtn);
    overlay.appendChild(container);
  }

  function confirmChoice(){
    // If a custom dialog confirm handler is registered, call it (it will close the dialog)
    if (typeof _dialogOnConfirm === 'function') { _dialogOnConfirm(playerChoice); return; }
    if (!dialog) return;
    // ensure voice stops when dialog closed
    if (voiceSound) { try { voiceSound.pause(); voiceSound.currentTime = 0; } catch(e){} }
    dialog.style.display = 'none'; dialogText.textContent=''; optionsContainer.innerHTML=''; dialogActive=false;

    // If we were in a dialog sequence for an object, continue to the next line if any
    if (lastInteractedId && dialogues[lastInteractedId]) {
      const idx = dialogueIndexes[lastInteractedId] ?? 0;
      const nextIdx = idx + 1;
      if (dialogues[lastInteractedId][nextIdx]) {
        dialogueIndexes[lastInteractedId] = nextIdx;
        showDialog(dialogues[lastInteractedId][nextIdx], []);
        playerChoice = null;
        return;
      } else {
        // finished sequence -> celebratory confetti
        try { startConfetti(40, 3000); } catch(e){}
        delete dialogueIndexes[lastInteractedId];
        lastInteractedId = null;
      }
    }

    // handle special choice dialogs
    if (lastDialogTarget === 'tele') {
      // playerChoice: 0 => Sí, 1 => No
      if (playerChoice === 0) {
        // start the black screen and video sequence
        startTeleSequence();
      }
      lastDialogTarget = null;
      playerChoice = null;
    } else if (lastDialogTarget === 'mesa') {
      if (playerChoice === 0) {
        // show the note image on black background and mark as read
        showFullNote();
      }
      lastDialogTarget = null;
      playerChoice = null;
    } else {
      // other simple choices: placeholder for future logic
      if (playerChoice !== null){ /* you can add custom handlers here */ }
      playerChoice = null;
    }
  }

  // main loop
  setInterval(moveCharacter, 40);
  setInterval(changeSprite, frameSpeed);

  // change sprite while moving
  function changeSprite(){
    // if any movement key down -> animate between frames 0 and 1
    if (isKeyPressed.ArrowUp || isKeyPressed.ArrowDown || isKeyPressed.ArrowLeft || isKeyPressed.ArrowRight) {
      currentFrame = (currentFrame + 1) % 2;
      character.style.backgroundImage = `url('${spriteSets[direction][currentFrame]}')`;
    } else {
      // static image (index 2)
      character.style.backgroundImage = `url('${spriteSets[direction][2]}')`;
    }
  }

  // Scaling & centering like the original page
  function scaleGame() {
    const gc = document.getElementById('game-container');
    if (!gc || !frame) return;
    const originalWidth = 640;
    const originalHeight = 690;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const scale = Math.min(containerWidth / originalWidth, containerHeight / originalHeight);
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = '0 0';
    frame.style.left = `${(containerWidth - originalWidth * scale) / 2}px`;
    frame.style.top = `${(containerHeight - originalHeight * scale) / 2}px`;
  }

  window.addEventListener('resize', scaleGame);
  window.addEventListener('orientationchange', scaleGame);
  window.addEventListener('load', ()=>{ scaleGame(); initPlayer(); });
  // Run once now
  scaleGame();
  initPlayer();

  // Confetti utility: single-spawn, bursts and continuous loop
  let _confettiLoopId = null;
  function spawnConfettiPiece(duration = 3000) {
    const container = document.getElementById('confetti-container') || (()=>{
      const c = document.createElement('div'); c.id='confetti-container'; c.setAttribute('aria-hidden','true'); document.body.appendChild(c); return c;
    })();
    const colors = ['#f94144','#f3722c','#f9c74f','#90be6d','#577590','#277da1','#ff6b6b','#ffd166'];
    const el = document.createElement('div');
    el.className = 'confetti';
    const w = Math.round(6 + Math.random()*10);
    const h = Math.round(8 + Math.random()*14);
    const left = Math.random()*100;
    const dx = Math.round((Math.random()*200 - 100));
    const rot = Math.round(180 + Math.random()*540);
    const dur = (duration/1000)*(0.8 + Math.random()*0.8);
    const color = colors[Math.floor(Math.random()*colors.length)];
    el.style.width = w+'px'; el.style.height = h+'px';
    el.style.left = left+'vw';
    el.style.setProperty('--dx', dx + 'px');
    el.style.setProperty('--rot', rot + 'deg');
    el.style.setProperty('--dur', dur + 's');
    el.style.backgroundColor = color;
    container.appendChild(el);
    setTimeout(()=>{ el.remove(); }, (dur*1000)+500);
  }

  function startConfetti(count = 40, duration = 3000) {
    for(let i=0;i<count;i++){ setTimeout(()=> spawnConfettiPiece(duration), Math.random()*500); }
  }

  function startConfettiLoop(ratePerSecond = 8) {
    stopConfettiLoop();
    // spawn at a moderate rate to avoid heavy CPU usage
    _confettiLoopId = setInterval(()=>{
      const pieces = Math.max(1, Math.round(ratePerSecond/2));
      for(let i=0;i<pieces;i++) spawnConfettiPiece(3000);
    }, 1000);
  }

  function stopConfettiLoop(){ if (_confettiLoopId) { clearInterval(_confettiLoopId); _confettiLoopId = null; } }

  // Start continuous confetti by default (a bit more confetti)
  // Puedes ajustar la intensidad desde la consola: startConfettiLoop(ratePerSecond)
  startConfettiLoop(14);

  // quick test: press 'C' to fire a stronger burst
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'c' || e.key === 'C') { startConfetti(80, 3500); }
  });

  // cleanup on unload
  window.addEventListener('beforeunload', stopConfettiLoop);

  // expose for debugging
  window._pag3 = { moveCharacter, checkCollisions, getObstacles, tryInteract, showDialog, scaleGame, startConfetti, startConfettiLoop, stopConfettiLoop };
})();