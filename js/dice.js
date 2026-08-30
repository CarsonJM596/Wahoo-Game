const dice = document.getElementById("dice");
const rollButton = document.getElementById("roll-button");

rollButton.addEventListener("click", rollDice);

function rollDice() {
    rollButton.disabled = true;

    // Reset the animation
    dice.classList.remove("rolling");

    // Force the browser to recognize the reset
    void dice.offsetWidth;

    // Start the animation
    dice.classList.add("rolling");

    // Change the image while the dice is rolling
    const rollInterval = setInterval(() => {
        const randomNumber = Math.floor(Math.random() * 6) + 1;

        dice.src = `assets/dice/dice-${randomNumber}.png`;
        dice.alt = `Dice showing ${randomNumber}`;
    }, 100);

    // Finish the roll
    setTimeout(() => {
        clearInterval(rollInterval);

        // Generate the final result
        const result = Math.floor(Math.random() * 6) + 1;

        dice.src = `assets/dice/dice-${result}.png`;
        dice.alt = `Dice showing ${result}`;

        dice.classList.remove("rolling");

        rollButton.disabled = false;
    }, 800);
}