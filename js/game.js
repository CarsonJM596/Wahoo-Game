const TRACK_LENGTH = 52;

// Turn order is fixed: Player 1 → Player 2 → Player 3 → Player 4.
const TURN_ORDER = [1, 2, 3, 4];

const players = [
    {
        id: 1,
        name: "Player 1",
        color: "green",
        entry: 43,       // t44: left arm top corner
        homeEntry: 41,   // t42: left arm center hole
        centerExit: 43   // t44: closest corner to green's home
    },
    {
        id: 2,
        name: "Player 2",
        color: "yellow",
        entry: 4,        // t5: top arm right corner
        homeEntry: 2,    // t3: top arm center hole
        centerExit: 0    // t1: closest corner to yellow's home
    },
    {
        id: 3,
        name: "Player 3",
        color: "blue",
        entry: 30,       // t31: bottom arm left corner
        homeEntry: 28,   // t29: bottom arm center hole
        centerExit: 30   // t31: closest corner to blue's home
    },
    {
        id: 4,
        name: "Player 4",
        color: "red",
        entry: 17,       // t18: right arm bottom corner
        homeEntry: 15,   // t16: right arm center hole
        centerExit: 17   // t18: closest corner to red's home
    }
];

const teams = {
    green: "green-red",
    red: "green-red",
    blue: "blue-yellow",
    yellow: "blue-yellow"
};

// Home paths point inward toward the center.
// Green = left, Yellow = top, Red = right, Blue = bottom.
const homeHoles = {
    green: [12, 13, 14, 15],
    yellow: [0, 1, 2, 3],
    red: [4, 5, 6, 7],
    blue: [8, 9, 10, 11]
};

const currentPlayerText = document.getElementById("current-player");
const moveMessage = document.getElementById("move-message");
const rollButton = document.getElementById("roll-button");
const marbles = [...document.querySelectorAll(".marble")];

let currentPlayerIndex = 0;
let currentRoll = null;
let legalMoves = [];
let awaitingMove = false;
let gameOver = false;

function currentPlayer() {
    return players[currentPlayerIndex];
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function updateTurnDisplay() {
    const player = currentPlayer();
    currentPlayerText.textContent = `${player.name} — ${capitalize(player.color)}`;
}

function setMessage(message) {
    if (moveMessage) {
        moveMessage.textContent = message;
    }
}

function clearLegalMoves() {
    marbles.forEach((marble) => {
        marble.classList.remove("legal-move", "selected");
    });

    const choices = document.getElementById("move-choices");
    if (choices) {
        choices.innerHTML = "";
    }

    legalMoves = [];
}

function getTrackMarbles() {
    return marbles.filter((marble) => {
        const position = marble.dataset.position;

        return (
            position !== "-1" &&
            position !== "center" &&
            !position.startsWith("home:")
        );
    });
}

function getMarbleAtTrack(position) {
    return getTrackMarbles().find(
        (marble) => Number(marble.dataset.position) === position
    );
}

function getMarbleAtHome(color, homeIndex) {
    return marbles.find(
        (marble) =>
            marble.dataset.color === color &&
            marble.dataset.position === `home:${homeIndex}`
    );
}

function getCenterMarble() {
    return marbles.find((marble) => marble.dataset.position === "center");
}

function isFriendlyMarble(marble, player) {
    return marble && teams[marble.dataset.color] === teams[player.color];
}

function getTrackHole(position) {
    return document.querySelector(`.t${position + 1}`);
}

function getHomeHole(color, homeIndex) {
    return document.querySelector(`.h${homeHoles[color][homeIndex] + 1}`);
}

function placeOnHole(marble, hole) {
    const column =
        hole.style.gridColumn || getComputedStyle(hole).gridColumnStart;
    const row =
        hole.style.gridRow || getComputedStyle(hole).gridRowStart;

    marble.style.gridColumn = column;
    marble.style.gridRow = row;
}

function returnToBase(marble) {
    marble.style.gridColumn = "";
    marble.style.gridRow = "";
    marble.dataset.position = "-1";
}

function captureIfNeeded(targetMarble, player) {
    if (targetMarble && !isFriendlyMarble(targetMarble, player)) {
        returnToBase(targetMarble);
    }
}

function getHomeDestination(player, marble, roll) {
    const position = marble.dataset.position;

    if (position.startsWith("home:")) {
        const currentHome = Number(position.split(":")[1]);
        const destination = currentHome + roll;

        if (destination >= homeHoles[player.color].length) {
            return null;
        }

        return {
            type: "home",
            index: destination
        };
    }

    const currentPosition = Number(position);

    // The home-entry track hole is immediately before the first home hole.
    const distanceToHomeEntry =
        (player.homeEntry - currentPosition + TRACK_LENGTH) % TRACK_LENGTH;

    const stepsToFirstHome = distanceToHomeEntry + 1;

    if (roll < stepsToFirstHome) {
        return {
            type: "track",
            position: (currentPosition + roll) % TRACK_LENGTH
        };
    }

    const homeIndex = roll - stepsToFirstHome;

    if (homeIndex < 0 || homeIndex >= homeHoles[player.color].length) {
        return null;
    }

    return {
        type: "home",
        index: homeIndex
    };
}

function pathIsBlocked(player, marble, roll) {
    const position = marble.dataset.position;

    // A marble in its home path can only move forward through empty holes.
    if (position.startsWith("home:")) {
        const currentHome = Number(position.split(":")[1]);

        for (let step = 1; step <= roll; step++) {
            const targetHome = currentHome + step;

            if (targetHome >= homeHoles[player.color].length) {
                return true;
            }

            if (getMarbleAtHome(player.color, targetHome)) {
                return true;
            }
        }

        return false;
    }

    const currentPosition = Number(position);
    const destination = getHomeDestination(player, marble, roll);

    if (!destination) {
        return true;
    }

    // Only teammates block the path. Enemy-team marbles may be crossed.
    const distanceToHomeEntry =
        (player.homeEntry - currentPosition + TRACK_LENGTH) % TRACK_LENGTH;

    const trackSteps =
        destination.type === "track"
            ? roll
            : distanceToHomeEntry;

    for (let step = 1; step <= trackSteps; step++) {
        const trackPosition = (currentPosition + step) % TRACK_LENGTH;
        const occupant = getMarbleAtTrack(trackPosition);

        if (isFriendlyMarble(occupant, player)) {
            return true;
        }
    }

    // Once a marble enters its home path, all holes it travels through
    // must be empty because home paths only belong to that player.
    if (destination.type === "home") {
        const finalIndex = destination.index;

        for (let index = 0; index <= finalIndex; index++) {
            if (getMarbleAtHome(player.color, index)) {
                return true;
            }
        }
    }

    return false;
}

function getLegalDestination(marble, roll) {
    const player = currentPlayer();
    const position = marble.dataset.position;

    // A marble must leave its starting base first.
    // Only a marble sitting on its own starting corner may enter
    // the center on a subsequent roll of 5.
    if (position === "-1") {
        if (roll !== 1 && roll !== 6) {
            return null;
        }

        const occupant = getMarbleAtTrack(player.entry);

        if (isFriendlyMarble(occupant, player)) {
            return null;
        }

        return {
            type: "track",
            position: player.entry
        };
    }

    // A marble that has already entered the board from its starting
    // corner may enter the center on a 5.
    if (position === String(player.entry) && roll === 5) {
        const centerOccupant = getCenterMarble();

        if (centerOccupant && isFriendlyMarble(centerOccupant, player)) {
            return null;
        }

        return { type: "center" };
    }

    // Center marbles can only leave on a 1, and they leave through
    // the corner closest to their home.
    if (position === "center") {
        if (roll !== 1) {
            return null;
        }

        const occupant = getMarbleAtTrack(player.centerExit);

        if (isFriendlyMarble(occupant, player)) {
            return null;
        }

        return {
            type: "track",
            position: player.centerExit
        };
    }

    if (pathIsBlocked(player, marble, roll)) {
        return null;
    }

    return getHomeDestination(player, marble, roll);
}

function getLegalMoves(roll) {
    const moves = [];

    marbles.forEach((marble) => {
        if (Number(marble.dataset.player) !== currentPlayer().id) {
            return;
        }

        // A marble can have more than one legal destination.
        // In particular, a marble on its starting corner with a 5
        // may either continue around the track or choose the center.
        const destinations = [];

        const normalDestination = getLegalDestination(marble, roll);
        if (normalDestination) {
            destinations.push(normalDestination);
        }

        // Center is an optional destination, not a forced one.
        if (
            marble.dataset.position === String(currentPlayer().entry) &&
            roll === 5 &&
            !destinations.some((destination) => destination.type === "center")
        ) {
            const centerOccupant = getCenterMarble();

            if (!centerOccupant || !isFriendlyMarble(centerOccupant, currentPlayer())) {
                destinations.push({ type: "center" });
            }
        }

        destinations.forEach((destination) => {
            moves.push({ marble, destination });
        });
    });

    return moves;
}

function getMoveLabel(move, index) {
    const { marble, destination } = move;
    const marbleName = capitalize(marble.dataset.color) + " " + marble.id.split("-")[1];

    if (destination.type === "center") {
        return `${index + 1}. ${marbleName} → Center`;
    }

    if (destination.type === "home") {
        return `${index + 1}. ${marbleName} → Home ${destination.index + 1}`;
    }

    return `${index + 1}. ${marbleName} → Track ${destination.position + 1}`;
}

function showMoveChoices() {
    const choices = document.getElementById("move-choices");
    if (!choices) {
        return;
    }

    choices.innerHTML = "";

    legalMoves.forEach((move, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "move-choice";
        button.textContent = getMoveLabel(move, index);

        button.addEventListener("click", () => {
            moveMarble(move.marble, move.destination);
        });

        choices.appendChild(button);
    });
}

function showLegalMoves(roll) {
    clearLegalMoves();

    legalMoves = getLegalMoves(roll);

    legalMoves.forEach((move) => {
        move.marble.classList.add("legal-move");
    });

    if (legalMoves.length === 0) {
        if (roll === 1 || roll === 6) {
            setMessage(`Rolled ${roll}. No legal moves — turn passes to the next player.`);
        } else {
            setMessage(`Rolled ${roll}. No legal moves — turn passes to the next player.`);
        }

        return;
    }

    // Only one legal destination means there is no choice to make.
    if (legalMoves.length === 1) {
        setMessage(`Rolled ${roll}. Making the only legal move.`);
        moveMarble(legalMoves[0].marble, legalMoves[0].destination);
        return;
    }

    awaitingMove = true;
    rollButton.disabled = true;
    setMessage(`Rolled ${roll}. Choose any legal move.`);
    showMoveChoices();
}

function moveMarble(marble, destination) {
    const player = currentPlayer();

    clearLegalMoves();
    awaitingMove = false;

    const choices = document.getElementById("move-choices");
    if (choices) {
        choices.innerHTML = "";
    }

    if (destination.type === "center") {
        const centerOccupant = getCenterMarble();
        captureIfNeeded(centerOccupant, player);

        placeOnHole(marble, document.querySelector(".center-hole"));
        marble.dataset.position = "center";
    } else if (destination.type === "track") {
        const targetMarble = getMarbleAtTrack(destination.position);
        captureIfNeeded(targetMarble, player);

        placeOnHole(marble, getTrackHole(destination.position));
        marble.dataset.position = String(destination.position);
    } else if (destination.type === "home") {
        placeOnHole(marble, getHomeHole(player.color, destination.index));
        marble.dataset.position = `home:${destination.index}`;
    }

    checkWin(player);
    finishMove();
}

function finishMove() {
    if (gameOver) {
        return;
    }

    // Turn order is always Player 1 → 2 → 3 → 4.
    // Every completed turn passes to the next player, including
    // rolls of 1 or 6.
    nextPlayer();
}

function nextPlayer() {
    const currentId = currentPlayer().id;
    const currentOrderIndex = TURN_ORDER.indexOf(currentId);
    const nextOrderIndex =
        (currentOrderIndex + 1) % TURN_ORDER.length;
    const nextPlayerId = TURN_ORDER[nextOrderIndex];

    // Resolve the next player by their fixed ID rather than relying on
    // array position. This guarantees Player 1 → 2 → 3 → 4 every time.
    currentPlayerIndex = players.findIndex(
        (player) => player.id === nextPlayerId
    );

    currentRoll = null;
    awaitingMove = false;
    clearLegalMoves();
    updateTurnDisplay();
    rollButton.disabled = false;
    setMessage("Roll the dice.");
}

function checkWin(player) {
    const homeCount = marbles.filter(
        (marble) =>
            marble.dataset.color === player.color &&
            marble.dataset.position.startsWith("home:")
    ).length;

    if (homeCount === 4) {
        gameOver = true;
        setMessage(`${player.name} has all four marbles home!`);
        rollButton.disabled = true;
    }
}

rollButton.addEventListener("click", async () => {
    if (gameOver || awaitingMove) {
        return;
    }

    rollButton.disabled = true;
    clearLegalMoves();

    const result = await animateDiceRoll();
    currentRoll = result;

    showLegalMoves(result);

    if (legalMoves.length === 0) {
        // No legal move: briefly show the result, then pass the turn.
        // This applies to every roll so the order remains 1 → 2 → 3 → 4.
        setMessage(`Rolled ${result}. No legal moves — next player's turn in 3 seconds.`);
        setTimeout(nextPlayer, 3000);
    }
});

marbles.forEach((marble) => {
    marble.addEventListener("click", () => {
        if (!awaitingMove) {
            return;
        }

        const marbleMoves = legalMoves.filter((move) => move.marble === marble);

        if (marbleMoves.length === 1) {
            moveMarble(marbleMoves[0].marble, marbleMoves[0].destination);
        }
    });
});

updateTurnDisplay();
setMessage("Roll the dice.");
