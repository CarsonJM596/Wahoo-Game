const dice = document.getElementById("dice");

function animateDiceRoll() {
    return new Promise((resolve) => {
        dice.classList.remove("rolling");
        void dice.offsetWidth;
        dice.classList.add("rolling");

        const rollInterval = setInterval(() => {
            const randomNumber = Math.floor(Math.random() * 6) + 1;
            dice.src = `assets/dice/dice-${randomNumber}.png`;
            dice.alt = `Dice showing ${randomNumber}`;
        }, 100);

        setTimeout(() => {
            clearInterval(rollInterval);

            const result = Math.floor(Math.random() * 6) + 1;
            dice.src = `assets/dice/dice-${result}.png`;
            dice.alt = `Dice showing ${result}`;
            dice.classList.remove("rolling");

            resolve(result);
        }, 800);
    });
}
