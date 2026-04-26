const GRID_SIZE = 5;
const NUM_ROOMS = GRID_SIZE * GRID_SIZE;
let playerPos = 0;
let wumpusPos = 0;
let pits = [];
let bats = [];
let arrows = 5;
let visited = new Set();
let gameOver = false;

const gridEl = document.getElementById('grid');
const logEl = document.getElementById('log');
const arrowCountEl = document.getElementById('arrow-count');
const restartBtn = document.getElementById('restart-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalBtn = document.getElementById('modal-btn');

function initGame() {
    gameOver = false;
    arrows = 5;
    visited.clear();
    logEl.innerHTML = '';
    arrowCountEl.textContent = arrows;
    
    // Reset radio buttons to move
    document.getElementById('mode-move').checked = true;

    // Place entities
    let availableRooms = Array.from({length: NUM_ROOMS}, (_, i) => i);
    
    // Shuffle available rooms for random placement
    for (let i = availableRooms.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableRooms[i], availableRooms[j]] = [availableRooms[j], availableRooms[i]];
    }
    
    // Player starts
    playerPos = availableRooms.pop();
    visited.add(playerPos);

    // Place Wumpus, Pits, Bats
    wumpusPos = availableRooms.pop();
    
    pits = [availableRooms.pop(), availableRooms.pop()];
    bats = [availableRooms.pop(), availableRooms.pop()];

    modal.classList.add('hidden');
    
    logMessage("You descend into the dark cave system.", "info");
    drawGrid();
    checkSensors();
}

function getAdjacent(pos) {
    const adj = [];
    const row = Math.floor(pos / GRID_SIZE);
    const col = pos % GRID_SIZE;

    if (row > 0) adj.push(pos - GRID_SIZE); // Up
    if (row < GRID_SIZE - 1) adj.push(pos + GRID_SIZE); // Down
    if (col > 0) adj.push(pos - 1); // Left
    if (col < GRID_SIZE - 1) adj.push(pos + 1); // Right

    return adj;
}

function drawGrid() {
    gridEl.innerHTML = '';
    const adjToPlayer = getAdjacent(playerPos);

    for (let i = 0; i < NUM_ROOMS; i++) {
        const roomEl = document.createElement('div');
        roomEl.classList.add('room');
        
        if (i === playerPos) {
            roomEl.classList.add('current');
            roomEl.classList.add('visited');
            roomEl.innerHTML = '👤';
        } else if (visited.has(i)) {
            roomEl.classList.add('visited');
        } else if (adjToPlayer.includes(i)) {
            roomEl.classList.add('adjacent');
        }

        if (!gameOver) {
            if (adjToPlayer.includes(i)) {
                roomEl.addEventListener('click', () => handleRoomClick(i));
            }
        } else {
            // Reveal all
            roomEl.classList.add('visited');
            if (i === wumpusPos) {
                roomEl.classList.add('wumpus-revealed');
                roomEl.innerHTML = '👹';
            } else if (pits.includes(i)) {
                roomEl.classList.add('pit-revealed');
                roomEl.innerHTML = '🕳️';
            } else if (bats.includes(i)) {
                roomEl.classList.add('bat-revealed');
                roomEl.innerHTML = '🦇';
            }
        }
        gridEl.appendChild(roomEl);
    }
}

function logMessage(msg, type = 'info') {
    const li = document.createElement('li');
    li.textContent = '> ' + msg;
    li.className = `log-${type}`;
    logEl.appendChild(li);
    // Smooth scroll to bottom
    logEl.parentElement.scrollTo({
        top: logEl.parentElement.scrollHeight,
        behavior: 'smooth'
    });
}

function handleRoomClick(targetPos) {
    if (gameOver) return;

    const mode = document.querySelector('input[name="action"]:checked').value;

    if (mode === 'move') {
        movePlayer(targetPos);
    } else if (mode === 'shoot') {
        shootArrow(targetPos);
    }
}

function checkSensors() {
    const adj = getAdjacent(playerPos);
    let senses = [];
    
    if (adj.includes(wumpusPos)) {
        senses.push({msg: "I smell a Wumpus...", type: 'warning'});
    }
    if (pits.some(p => adj.includes(p))) {
        senses.push({msg: "I feel a cold draft...", type: 'draft'});
    }
    if (bats.some(b => adj.includes(b))) {
        senses.push({msg: "I hear screeching bats...", type: 'bats'});
    }

    if (senses.length === 0) {
        logMessage("It's quiet here.", "info");
    } else {
        senses.forEach(s => logMessage(s.msg, s.type));
    }
}

function movePlayer(targetPos) {
    logMessage(`Moved safely to a new chamber.`, 'action');
    playerPos = targetPos;
    visited.add(playerPos);
    
    // Check hazards
    if (playerPos === wumpusPos) {
        endGame("You stumbled upon the Wumpus! It lunges from the dark and devours you.", false);
        return;
    }
    
    if (pits.includes(playerPos)) {
        endGame("You took a step forward into empty air. You fell into a bottomless pit!", false);
        return;
    }

    if (bats.includes(playerPos)) {
        logMessage("Super bats grabbed you! They carry you through the dark...", "bats");
        
        // Move to random room
        let newRoom;
        do {
            newRoom = Math.floor(Math.random() * NUM_ROOMS);
        } while (newRoom === playerPos);
        
        playerPos = newRoom;
        visited.add(playerPos);
        logMessage("They dropped you in an unknown part of the caves.", "info");
        
        // Check hazards again
        if (playerPos === wumpusPos) {
            endGame("The bats dropped you right on top of the Wumpus! You were eaten!", false);
            return;
        }
        if (pits.includes(playerPos)) {
            endGame("The bats dropped you directly into a bottomless pit!", false);
            return;
        }
        if (bats.includes(playerPos)) {
            logMessage("The bats dropped you in another bat cave... Luckily these ones ignore you.", 'info');
        }
    }

    drawGrid();
    checkSensors();
}

function shootArrow(targetPos) {
    if (arrows <= 0) {
        logMessage("You reach into your quiver... it's empty!", "warning");
        return;
    }

    arrows--;
    arrowCountEl.textContent = arrows;

    if (targetPos === wumpusPos) {
        logMessage("You hear a monstrous roar echo through the caves! A direct hit!", 'win');
        endGame("Your arrow pierced the beast! You've successfully hunted the Wumpus!", true);
    } else {
        logMessage("You hear the arrow clatter against the stone walls. Missed.", "info");
        
        // Wumpus might move 50% chance
        if (Math.random() > 0.5) {
            logMessage("The noise awoke the Wumpus! You hear heavy footsteps...", "warning");
            moveWumpus();
        }

        if (!gameOver) {
            if (arrows <= 0) {
                endGame("You've run out of arrows and have no way to defend yourself. The Wumpus will eventually find you.", false);
            } else {
                drawGrid();
                checkSensors(); // Re-check if Wumpus moved
            }
        }
    }
}

function moveWumpus() {
    const adj = getAdjacent(wumpusPos);
    const emptyAdj = adj.filter(p => !pits.includes(p) && !bats.includes(p));
    
    if (emptyAdj.length > 0) {
        wumpusPos = emptyAdj[Math.floor(Math.random() * emptyAdj.length)];
        
        if (wumpusPos === playerPos) {
            endGame("The Wumpus stumbled into your room while wandering in the dark. It devours you!", false);
        }
    }
}

function endGame(message, isWin) {
    gameOver = true;
    drawGrid(); // Reveal everything
    
    setTimeout(() => {
        modalTitle.textContent = isWin ? "VICTORY!" : "GAME OVER";
        modalTitle.className = isWin ? "win-title" : "lose-title";
        modalMessage.textContent = message;
        modal.classList.remove('hidden');
    }, 800);
}

restartBtn.addEventListener('click', initGame);
modalBtn.addEventListener('click', initGame);

function triggerDirection(direction) {
    if (gameOver || !modal.classList.contains('hidden')) return;

    let targetPos = -1;
    const row = Math.floor(playerPos / GRID_SIZE);
    const col = playerPos % GRID_SIZE;

    switch (direction) {
        case 'Up': if (row > 0) targetPos = playerPos - GRID_SIZE; break;
        case 'Down': if (row < GRID_SIZE - 1) targetPos = playerPos + GRID_SIZE; break;
        case 'Left': if (col > 0) targetPos = playerPos - 1; break;
        case 'Right': if (col < GRID_SIZE - 1) targetPos = playerPos + 1; break;
    }

    if (targetPos !== -1) {
        handleRoomClick(targetPos);
    }
}

// D-pad Event Listeners
document.getElementById('btn-up').addEventListener('click', () => triggerDirection('Up'));
document.getElementById('btn-down').addEventListener('click', () => triggerDirection('Down'));
document.getElementById('btn-left').addEventListener('click', () => triggerDirection('Left'));
document.getElementById('btn-right').addEventListener('click', () => triggerDirection('Right'));

document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault(); // Prevent page scrolling
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            triggerDirection('Up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            triggerDirection('Down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            triggerDirection('Left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            triggerDirection('Right');
            break;
        // Hotkeys for mode switching
        case 'm':
        case 'M':
        case '1':
            document.getElementById('mode-move').checked = true;
            break;
        case 'f':
        case 'F':
        case '2':
            document.getElementById('mode-shoot').checked = true;
            break;
    }
});

// Start
initGame();
