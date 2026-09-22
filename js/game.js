const TRACK_LENGTH = 52;

const players = [
    // entry = starting track hole (0-based)
    // homeEntry = track hole immediately outside this player's home path
    // centerExit = the corner used when leaving the center on a roll of 1
    { id: 1, name: "Player 1", color: "green", entry: 43, homeEntry: 41, centerExit: 39 },
    { id: 2, name: "Player 2", color: "yellow", entry: 4, homeEntry: 2, centerExit: 0 },
    { id: 3, name: "Player 3", color: "blue", entry: 30, homeEntry: 28, centerExit: 26 },
    { id: 4, name: "Player 4", color: "red", entry: 17, homeEntry: 15, centerExit: 13 }
];

const teams = {
    green: "green-red",
    red: "green-red",
    blue: "blue-yellow",
    yellow: "blue-yellow"
};

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
    marbles.forEach((marble) => marble.classList.remove("legal-move", "selected"));
    legalMoves = [];
}

function getTrackMarbles() {
    return marbles.filter((marble) => {
        const position = marble.dataset.position;
        return position !== "-1" && position !== "center" && !position.startsWith("home:");
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
    const column = hole.style.gridColumn || getComputedStyle(hole).gridColumnStart;
    const row = hole.style.gridRow || getComputedStyle(hole).gridRowStart;

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

function getTrackPath(start, steps) {
    const path = [];

    for (let i = 1; i <= steps; i++) {
        path.push((start + i) % TRACK_LENGTH);
    }

    return path;
}

function getHomeDestination(player, marble, roll) {
    const position = marble.dataset.position;
    const homeCount = homeHoles[player.color].length;

    if (position.startsWith("home:")) {
        const currentHome = Number(position.split(":")[1]);
        const destination = currentHome + roll;

        if (destination >= homeCount) {
            return null;
        }

        return { type: "home", index: destination };
    }

    const currentPosition = Number(position);
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

    if (homeIndex >= homeCount) {
        return null;
    }

    return { type: "home", index: homeIndex };
}

function pathIsBlocked(player, marble, roll) {
    const position = marble.dataset.position;

    if (position.startsWith("home:")) {
        const currentHome = Number(position.split(":")[1]);
        for (let i = 1; i <= roll; i++) {
            const targetHome = currentHome + i;

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
    const homeDestination = getHomeDestination(player, marble, roll);

    if (!homeDestination) {
        return true;
    }

    const stepsToHomeEntry =
        (player.homeEntry - currentPosition + TRACK_LENGTH) % TRACK_LENGTH;

    const trackSteps = Math.min(roll, stepsToHomeEntry);

    for (let i = 1; i <= trackSteps; i++) {
        const trackPosition = (currentPosition + i) % TRACK_LENGTH;
        const occupant = getMarbleAtTrack(trackPosition);

        if (isFriendlyMarble(occupant, player)) {
            return true;
        }
    }

    if (homeDestination.type === "home") {
        for (let i = 0; i <= homeDestination.index; i++) {
            if (getMarbleAtHome(player.color, i)) {
                return true;
            }
        }
    }

    return false;
}

function getLegalDestination(marble, roll) {
    const player = currentPlayer();
    const position = marble.dataset.position;

    // Marbles in the starting area can enter on 1 or 6.
    if (position === "-1") {
        if (roll === 5) {
            const centerOccupant = getCenterMarble();

            if (centerOccupant && isFriendlyMarble(centerOccupant, player)) {
                return null;
            }

            return { type: "center" };
        }

        if (roll !== 1 && roll !== 6) {
            return null;
        }

        const occupant = getMarbleAtTrack(player.entry);

        if (isFriendlyMarble(occupant, player)) {
            return null;
        }

        return { type: "track", position: player.entry };
    }

    // A marble in the center can only leave on a 1.
    if (position === "center") {
        if (roll !== 1) {
            return null;
        }

        const occupant = getMarbleAtTrack(player.centerExit);

        if (isFriendlyMarble(occupant, player)) {
            return null;
        }

        return { type: "track", position: player.centerExit };
    }

    if (pathIsBlocked(player, marble, roll)) {
        return null;
    }

    return getHomeDestination(player, marble, roll);
}

function getLegalMoves(roll) {
    return marbles.filter((marble) => {
        if (Number(marble.dataset.player) !== currentPlayer().id) {
            return false;
        }

        return getLegalDestination(marble, roll) !== null;
    });
}

function showLegalMoves(roll) {
    clearLegalMoves();

    legalMoves = getLegalMoves(roll);

    legalMoves.forEach((marble) => marble.classList.add("legal-move"));

    if (legalMoves.length === 0) {
        setMessage(
            roll === 1 || roll === 6
                ? `Rolled ${roll}. No legal move — rolling again.`
                : `Rolled ${roll}. No legal moves — turn ends.`
        );
        return;
    }

    if (legalMoves.length === 1) {
        setMessage(`Rolled ${roll}. Only one legal move.`);
        moveMarble(legalMoves[0], roll);
        return;
    }

    setMessage(`Rolled ${roll}. Choose a highlighted marble.`);
    awaitingMove = true;
}

function moveMarble(marble, roll) {
    const player = currentPlayer();
    const destination = getLegalDestination(marble, roll);

    if (!destination) {
        return;
    }

    clearLegalMoves();
    awaitingMove = false;

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
    finishMove(roll);
}

function finishMove(roll) {
    // 1 and 6 always give another roll, even if the player had no legal move.
    if (roll === 1 || roll === 6) {
        currentRoll = null;
        setMessage(`Rolled ${roll}. Roll again.`);
        return;
    }

    nextPlayer();
}

function nextPlayer() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    currentRoll = null;
    awaitingMove = false;
    clearLegalMoves();
    updateTurnDisplay();
    setMessage("Roll the dice.");
}

function checkWin(player) {
    const homeCount = marbles.filter(
        (marble) =>
            marble.dataset.color === player.color &&
            marble.dataset.position.startsWith("home:")
    ).length;

    if (homeCount === 4) {
        setMessage(`${player.name} has all four marbles home!`);
        rollButton.disabled = true;
        awaitingMove = false;
    }
}

rollButton.addEventListener("click", async () => {
    if (awaitingMove) {
        return;
    }

    rollButton.disabled = true;
    clearLegalMoves();

    const result = await animateDiceRoll();
    currentRoll = result;

    rollButton.disabled = false;
    showLegalMoves(result);

    // If there is exactly one legal move, showLegalMoves handles it automatically.
    // If there are zero legal moves, 1/6 gets another roll; other rolls end the turn.
    if (legalMoves.length === 0) {
        if (result !== 1 && result !== 6) {
            setTimeout(nextPlayer, 500);
        }
    }
});

marbles.forEach((marble) => {
    marble.addEventListener("click", () => {
        if (!awaitingMove) {
            return;
        }

        if (!legalMoves.includes(marble)) {
            return;
        }

        moveMarble(marble, currentRoll);
    });
});

updateTurnDisplay();
setMessage("Roll the dice.");
