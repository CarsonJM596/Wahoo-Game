const dice = document.getElementById("dice");
const rollButton = document.getElementById("roll-button");

rollButton.addEventListener("click", rollDice);

function rollDice() {
    // Disable button while dice is rolling
    rollButton.disabled = true;

    // Reset animation
    dice.classList.remove("rolling");

    // Force browser to recognize the animation reset
    void dice.offsetWidth;

    // Start animation
    dice.classList.add("rolling");

    // Change dice image while rolling
    const rollInterval = setInterval(() => {
        const randomNumber = Math.floor(Math.random() * 6) + 1;

        dice.src = `assets/dice/dice-${randomNumber}.png`;
        dice.alt = `Dice showing ${randomNumber}`;
    }, 100);

    // Finish the roll
    setTimeout(() => {
        clearInterval(rollInterval);

        // Generate final result
        const result = Math.floor(Math.random() * 6) + 1;

        dice.src = `assets/dice/dice-${result}.png`;
        dice.alt = `Dice showing ${result}`;

        // Stop animation
        dice.classList.remove("rolling");

        // Re-enable button
        rollButton.disabled = false;
    }, 800);
}