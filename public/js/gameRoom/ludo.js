const ludoBoard = document.querySelector(".playGround");
ludoBoard.innerHTML = ""; // Clear previous board if any

const boardSize = 225; // Ludo board has 225 squares

for (let i = 1; i <= boardSize; i++) {
  const ludoBox = document.createElement("div");
  ludoBox.classList.add(`square_${i}`, "ludo-box"); // Add square class
  ludoBoard.appendChild(ludoBox);
}

console.log("Ludo board created!");
