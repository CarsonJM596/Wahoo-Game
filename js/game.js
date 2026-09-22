const TRACK_LENGTH = 52;

const players = [
    { id: 1, name: "Player 1", color: "green", entry: 0 },
    { id: 2, name: "Player 2", color: "yellow", entry: 13 },
    { id: 3, name: "Player 3", color: "blue", entry: 39 },
    { id: 4, name: "Player 4", color: "red", entry: 26 }
];

let currentPlayerIndex = 0;
let selectedMarble = null;
let selectedMarbleMoved = false;

const currentPlayerText = document.getElementById("current-player");
const rollButton = document.getElementById("roll-button");
const marbles = document.querySelectorAll(".marble");

function updateTurnDisplay() {
    const player = players[currentPlayerIndex];
    currentPlayerText.textContent = `${player.name} — ${capitalize(player.color)}`;
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function selectMarble(marble) {
    const playerNumber = Number(marble.dataset.player);

    if (playerNumber !== players[currentPlayerIndex].id) {
        return;
    }

    if (selectedMarble) {
        selectedMarble.classList.remove("selected");
    }

    selectedMarble = marble;
    selectedMarble.classList.add("selected");
    selectedMarbleMoved = false;
}

function moveMarble(marble, roll) {
    const player = players[currentPlayerIndex];
    const currentPosition = Number(marble.dataset.position);

    let newPosition;

    if (currentPosition === -1) {
        // First move puts the marble onto this player's starting point.
        newPosition = player.entry + roll - 1;
    } else {
        newPosition = currentPosition + roll;
    }

    newPosition = ((newPosition % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;

    const trackHole = document.querySelector(`.t${newPosition + 1}`);

    if (!trackHole) {
        return;
    }

    const column = trackHole.style.gridColumn || getComputedStyle(trackHole).gridColumnStart;
    const row = trackHole.style.gridRow || getComputedStyle(trackHole).gridRowStart;

    marble.style.gridColumn = column;
    marble.style.gridRow = row;
    marble.dataset.position = newPosition;

    selectedMarbleMoved = true;
    marble.classList.remove("selected");
}

function nextPlayer() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    selectedMarble = null;
    selectedMarbleMoved = false;
    updateTurnDisplay();
}

marbles.forEach((marble) => {
    marble.addEventListener("click", () => selectMarble(marble));
});

rollButton.addEventListener("click", () => {
    if (!selectedMarble) {
        alert("Select one of your marbles first.");
        return;
    }

    if (selectedMarbleMoved) {
        return;
    }

    const result = Math.floor(Math.random() * 6) + 1;

    const dice = document.getElementById("dice");
    dice.src = `assets/dice/dice-${result}.png`;
    dice.alt = `Dice showing ${result}`;

    moveMarble(selectedMarble, result);

    setTimeout(nextPlayer, 400);
});

updateTurnDisplay();
