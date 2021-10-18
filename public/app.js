document.addEventListener('DOMContentLoaded', () => {
  const userGrid = document.querySelector('.grid-user');
  const computerGrid = document.querySelector('.grid-computer');
  const displayGrid = document.querySelector('.grid-display');
  const ships = document.querySelectorAll('.ship');
  const destroyer = document.querySelector('.destroyer-container');
  const submarine = document.querySelector('.submarine-container');
  const cruiser = document.querySelector('.cruiser-container');
  const battleship = document.querySelector('.battleship-container');
  const carrier = document.querySelector('.carrier-container');
  const startButton = document.querySelector('#start');
  const rotateButton = document.querySelector('#rotate');
  const turnDisplay = document.querySelector('#whose-go');
  const infoDisplay = document.querySelector('#info');
  const infoDisplay2 = document.querySelector('#info2');
  const setupButtons = document.querySelector('.setup-buttons');
  const userSquares = [];
  const computerSquares = [];
  let isHorizontal = true;
  let isGameOver = false;
  let currentPlayer = 'user';
  const width = 10;
  let playerNum = 0;
  let ready = false;
  let enemyReady = false;
  let allShipsPlaced = false;
  let shotFired = -1;

  const shipArray = [
    {
      name: 'destroyer', // ship name
      directions: [
        [0, 1], // horizontal
        [0, width] // vertical
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width*2, width*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width*2, width*3, width*4]
      ]
    }
  ];
  
  createBoard(userGrid, userSquares);
  createBoard(computerGrid, computerSquares);

  // Select Player Mode
  if(gameMode === 'singlePlayer') {
    startSinglePlayer();
  } else {
    startMultiPlayer();
  }

  // Multiplayer
  function startMultiPlayer() {
    const socket = io();

    // Get your player number
    socket.on('player-number', num => {
      if(num === -1) {
        infoDisplay.innerHTML = "Sorry the server is full :(";
        infoDisplay2.style.display = 'none';
      } else {
        playerNum = parseInt(num);
        if(playerNum === 1) currentPlayer = "enemy";

        console.log(playerNum);

        // Get other players status
        socket.emit('check-players');
      }
    });

    // SOCKETS

    // Another player has connected or disconnected'
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`);
      playerConnectedOrDisconnected(num);
    });

    // On enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true;
      playerReady(num);
      if(ready) {
        setupButtons.style.display = 'none';
        playGameMulti(socket);
      }
    });

    // Check player status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnected(i);
        if(p.ready) {
          playerReady(i);
          if(i === playerNum) enemyReady = true;
        }
      });
    });

    // On timeout
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'You have reached the 10 minute limit';
      infoDisplay2.style.display = 'none';
    });

    // Ready button click
    startButton.addEventListener('click', () => {
      if(allShipsPlaced) playGameMulti(socket);
      else {
        infoDisplay.innerHTML = "Please place all ships";
        infoDisplay2.innerHTML = "UnU";
      }
    });

    // Set up event listener for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if(currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id;
          socket.emit('fire', shotFired);
        }
      });
    });

    // On fire received
    socket.on('fire', id => {
      enemyGo(id);
      const square = userSquares[id];
      socket.emit('fire-reply', square.classList);
      playGameMulti(socket);
    });

    // On receiving fire reply
    socket.on('fire-reply', classList => {
      revealSquare(classList);
      playGameMulti(socket);
    });

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`;
      document.querySelector(`${player} .connected`).classList.toggle('active');
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold';
    }
  }

  // Single Player
  function startSinglePlayer() {
    // generates each ship
    generate(shipArray[0]);
    generate(shipArray[1]);
    generate(shipArray[2]);
    generate(shipArray[3]);
    generate(shipArray[4]);
    
    // Ready button click
    startButton.addEventListener('click', () => {
      if(allShipsPlaced){
        infoDisplay.innerHTML = "Your sunks will be displayed here!";
        infoDisplay2.innerHTML = "Enemy sunks will be displayed here!";
        playGameSingle();
      }
      else {
        infoDisplay.innerHTML = "Please place all ships";
        infoDisplay2.innerHTML = "UnU";
      }
    });
  }

  // Create Board
  function createBoard(grid, squares) {
    for (let i =0; i< width * width; i++) {
      const square = document.createElement('div');
      square.dataset.id = i; // adds a data id with value i
      grid.appendChild(square); // adds it to the html
      squares.push(square); // adds it to the array of x squares
    }
  }

  // Draw the computers ships in random locations
  function generate(ship) {
    // posible change for a number 2 literal at ships.directions.length
    let randomDirection = Math.floor(Math.random() * ship.directions.length); // 0 o 1
    let current = ship.directions[randomDirection]; // either the horizontal (0) or vertical (1) array
    if (randomDirection === 0) direction = 1; // horizontal
    if (randomDirection === 1) direction = 10; // vertical
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (current.length * direction))); // selects a random square between 0 and 99 minus the direction and size of ship

    // isTaken checks every square from the directions array for an element with class name taken
    // isAtRE checks for a number ending on 9, that is the right most column; checks that is horizontal and checks 
    // for a possible ship placed barely on the last edge
    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'));
    const isAtRightEdge = current.some(index => 
      ((randomStart + index) % width === width -1) && 
      (direction === 1) && 
      ((randomStart + current.length - 1) % width < current.length-1)
      );

    // generates the ship changing the classes on the main div squares. it checks if its possible, if not runs again
    if(!isTaken && !isAtRightEdge) {
      for(let i = 0; i < current.length; i++) {
        let directionClass = "middle";
        
        if(i === 0) directionClass = 'start';
        if(i === current.length - 1) directionClass = 'end';

        let waves2 = document.createElement('div');
        waves2.className = 'waves2';

        if(randomDirection === 0) {
          computerSquares[randomStart + i].classList.add(directionClass);
          waves2.classList.add(directionClass, 'horizontal', 'cpu', ship.name);
          computerSquares[randomStart + i].appendChild(waves2);
        } 
        else {
          computerSquares[randomStart + i*width].classList.add(directionClass);
          waves2.classList.add(directionClass, 'vertical', 'cpu', ship.name);
          computerSquares[randomStart + i*width].appendChild(waves2);
        } 
      }
      if(randomDirection === 0){
        current.forEach(index => computerSquares[randomStart + index].classList.add('taken', 'horizontal', 'cpu', ship.name));
      } else {
        current.forEach(index => computerSquares[randomStart + index].classList.add('taken', 'vertical', 'cpu', ship.name));
      }
    } 
    else generate(ship);
  }

  // rotate the ships
  function rotate() {
    destroyer.classList.toggle('destroyer-container-vertical');
    submarine.classList.toggle('submarine-container-vertical');
    cruiser.classList.toggle('cruiser-container-vertical');
    battleship.classList.toggle('battleship-container-vertical');
    carrier.classList.toggle('carrier-container-vertical');
    isHorizontal ? isHorizontal=false : isHorizontal=true;
  }
  rotateButton.addEventListener('click', rotate);

  // move around user ships
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart));
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart));
  userSquares.forEach(square => square.addEventListener('dragover', dragOver));
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter));
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave));
  userSquares.forEach(square => square.addEventListener('drop', dragDrop));
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd));

  let selectedShipNameWithIndex;
  let draggedShip;
  let draggedShipLength;

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id;
  }));

  function dragStart() {
    draggedShip = this;
    draggedShipLength = draggedShip.childElementCount;
  }

  function dragOver(e) {
    e.preventDefault();
  }

  function dragEnter(e) {
    e.preventDefault();
  }

  function dragLeave() {
  }

  function dragDrop() {
    let option;
    let shipNameWithLastId = draggedShip.lastElementChild.id;
    let shipClass = shipNameWithLastId.slice(0, -2);
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1));
    let shipLastId = lastShipIndex + parseInt(this.dataset.id);
    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1));

    isHorizontal ? option = 0 : option = 1;

    let whos;
    if(lastShipIndex == 1) whos = 0;
    if(lastShipIndex == 2) whos = 1;
    if(lastShipIndex == 3) whos = 3;
    if(lastShipIndex == 4) whos = 4;

    // same as in the computers turn
    let current = shipArray[whos].directions[option]; // either the horizontal (0) or vertical (1) array
    if (option === 0) direction = 1; // horizontal
    if (option === 1) direction = 10; // vertical

    let startingPoint = shipLastId - lastShipIndex - selectedShipIndex * direction;

    const isTaken = current.some(index => userSquares[startingPoint + index].classList.contains('taken'));
    const isAtRightEdge = current.some(index => 
      ((startingPoint + index) % width === width -1) && 
      (direction === 1) && 
      ((startingPoint + current.length - 1) % width < current.length-1)
      );

    if(!isTaken && !isAtRightEdge) {
      for(let i = 0; i < draggedShipLength; i++) {
        let directionClass = "middle";
        
        if(i === 0) directionClass = 'start';
        if(i === draggedShipLength - 1) directionClass = 'end';

        let waves = document.createElement('div');
        waves.className = 'waves';

        if(isHorizontal) {
          userSquares[startingPoint + i].classList.add(directionClass);
          waves.classList.add(directionClass, 'horizontal');
          userSquares[startingPoint + i].appendChild(waves);
        } 
        else {
          userSquares[startingPoint + i*width].classList.add(directionClass);
          waves.classList.add(directionClass, 'vertical');
          userSquares[startingPoint + i*width].appendChild(waves);
        } 
      }
      if(isHorizontal){
        current.forEach(index => userSquares[startingPoint + index].classList.add('taken', 'horizontal', shipClass));
      } else {
        current.forEach(index => userSquares[startingPoint + index].classList.add('taken', 'vertical', shipClass));
      }
      displayGrid.removeChild(draggedShip);
      if(!displayGrid.querySelector('.ship')) allShipsPlaced = true;
    }
  }

  function dragEnd() {
  }

  // Game logic for multi player
  function playGameMulti(socket) {
    setupButtons.style.display = 'none';
    if(isGameOver) return;
    if(!ready) {
      socket.emit('player-ready');
      ready = true;
      playerReady(playerNum);
      turnDisplay.innerHTML = "Ready!";
      infoDisplay.innerHTML = "Your sunks will be displayed here!";
      infoDisplay2.innerHTML = "Enemy sunks will be displayed here!";
    }

    if(enemyReady) {
      if(currentPlayer === 'user') {
        turnDisplay.innerHTML = "Your Go";
      }
      if(currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Enemy's Go";
      }
    }

  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`;
    document.querySelector(`${player} .ready`).classList.toggle('active');
  }


  // Game logic for single player
  function playGameSingle() {
    setupButtons.style.display = 'none';
    if (isGameOver) return
    if(currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Your Go';
      computerSquares.forEach(square => square.addEventListener('click', shotP));
    }
    if(currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Computer\'s Go';
      setTimeout(enemyGo, 150);
    }
  }

  var shotP = function shot(e) {
    shotFired = this.dataset.id;
    revealSquare(this.classList);
  }

  let destroyerCount = 0;
  let submarineCount = 0;
  let cruiserCount = 0;
  let battleshipCount = 0;
  let carrierCount = 0;
  
  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`);
    const obj = Object.values(classList);
    if(enemySquare.classList.contains('boom') || enemySquare.classList.contains('miss')) return;
    if((!enemySquare.classList.contains('boom') && !enemySquare.classList.contains('miss')) && currentPlayer === 'user' && !isGameOver){
      if(obj.includes('destroyer'))  destroyerCount++;
      if(obj.includes('submarine'))  submarineCount++;
      if(obj.includes('cruiser'))  cruiserCount++;
      if(obj.includes('battleship'))  battleshipCount++;
      if(obj.includes('carrier'))  carrierCount++;
    }
    
    let child = enemySquare.childNodes;
    if(obj.includes('taken')) {
      enemySquare.classList.add('boom');
      child.forEach(wave => wave.classList.add('boom2'));
    } else {
      enemySquare.classList.add('miss');
      child.forEach(wave => wave.classList.add('miss2'));
    }

    checkForWins();
    currentPlayer = 'enemy';
    if(gameMode === 'singlePlayer') playGameSingle();
  }

  let cpuDestroyerCount = 0;
  let cpuSubmarineCount = 0;
  let cpuCruiserCount = 0;
  let cpuBattleshipCount = 0;
  let cpuCarrierCount = 0;

  function enemyGo(square) {
    if(gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length);
    if(!userSquares[square].classList.contains('boom') && !userSquares[square].classList.contains('miss')) {
      if(userSquares[square].classList.contains('taken')) {
        userSquares[square].classList.add('boom');
      } else {
        userSquares[square].classList.add('miss');
      }
      if(userSquares[square].classList.contains('destroyer'))  cpuDestroyerCount++;
      if(userSquares[square].classList.contains('submarine'))  cpuSubmarineCount++;
      if(userSquares[square].classList.contains('cruiser'))  cpuCruiserCount++;
      if(userSquares[square].classList.contains('battleship'))  cpuBattleshipCount++;
      if(userSquares[square].classList.contains('carrier'))  cpuCarrierCount++;
      checkForWins();
    } else if(gameMode === 'singlePlayer') enemyGo();
    currentPlayer = 'user';
    turnDisplay.innerHTML = 'Your Go';
  }

  function checkForWins() {
    let enemy = 'computer';
    if(gameMode === 'multiPlayer') enemy = 'enemy';

    // ships destroyed by the player
    if(destroyerCount === 2){
      destroyerCount = 10;
      infoDisplay.innerHTML = `You sunk the ${enemy}'s destroyer!`;
      infoDisplay.style.background = "#91FF71";
      let destSquares = document.querySelectorAll("div.taken.destroyer.boom.cpu");
      let destWaves = document.querySelectorAll("div.waves2.destroyer.boom2.cpu");
      destSquares.forEach(square => {
        square.style.backgroundColor = "hsl(0,0%,80%)";
        square.classList.add('revealed');
      });
      destWaves.forEach(square => {
        square.style.cssText = "display:inline !important";
        square.style.zIndex = "1000";
        square.classList.add('waves3');
      });
    }
    if(submarineCount === 3){
      submarineCount = 10;
      infoDisplay.innerHTML = `You sunk the ${enemy}'s submarine!`;
      infoDisplay.style.background = "#71FFEE";
      let subSquares = document.querySelectorAll("div.taken.submarine.boom.cpu");
      let subWaves = document.querySelectorAll("div.waves2.submarine.boom2.cpu");
      subSquares.forEach(square => {
        square.style.backgroundColor = "hsl(0,0%,80%)";
        square.classList.add('revealed');
      });
      subWaves.forEach(square => {
        square.style.cssText = "display:inline !important";
        square.style.zIndex = "1000";
        square.classList.add('waves3');
      });
    }
    if(cruiserCount === 3){
      cruiserCount = 10;
      infoDisplay.innerHTML = `You sunk the ${enemy}'s cruiser!`;
      infoDisplay.style.background = "#71CBFF";
      let cruSquares = document.querySelectorAll("div.taken.cruiser.boom.cpu");
      let cruWaves = document.querySelectorAll("div.waves2.cruiser.boom2.cpu");
      cruSquares.forEach(square => {
        square.style.backgroundColor = "hsl(0,0%,80%)";
        square.classList.add('revealed');
      });
      cruWaves.forEach(square => {
        square.style.cssText = "display:inline !important";
        square.style.zIndex = "1000";
        square.classList.add('waves3');
      });
    }
    if(battleshipCount === 4){
      battleshipCount = 10;
      infoDisplay.innerHTML = `You sunk the ${enemy}'s battleship!`;
      infoDisplay.style.background = "#9571FF";
      let batSquares = document.querySelectorAll("div.taken.battleship.boom.cpu");
      let batWaves = document.querySelectorAll("div.waves2.battleship.boom2.cpu");
      batSquares.forEach(square => {
        square.style.backgroundColor = "hsl(0,0%,80%)";
        square.classList.add('revealed');
      });
      batWaves.forEach(square => {
        square.style.cssText = "display:inline !important";
        square.style.zIndex = "1000";
        square.classList.add('waves3');
      });
    }
    if(carrierCount === 5){
      carrierCount = 10;
      infoDisplay.innerHTML = `You sunk the ${enemy}'s carrier!`;
      infoDisplay.style.background = "#E771FF";
      let carSquares = document.querySelectorAll("div.taken.carrier.boom.cpu");
      let carWaves = document.querySelectorAll("div.waves2.carrier.boom2.cpu");
      carSquares.forEach(square => {
        square.style.backgroundColor = "hsl(0,0%,80%)";
        square.classList.add('revealed');
      });
      carWaves.forEach(square => {
        square.style.cssText = "display:inline !important";
        square.style.zIndex = "1000";
        square.classList.add('waves3');
      });
    }

    // ships destroyed by the computer
    if(cpuDestroyerCount === 2){
      cpuDestroyerCount = 10;
      infoDisplay2.innerHTML = `Your destroyer was sunk!`;
      infoDisplay2.style.background = "#FF2222";
    }
    if(cpuSubmarineCount === 3){
      cpuSubmarineCount = 10;
      infoDisplay2.innerHTML = `Your submarine was sunk!`;
      infoDisplay2.style.background = "#FF5353";
    }
    if(cpuCruiserCount === 3){
      cpuCruiserCount = 10;
      infoDisplay2.innerHTML = `Your cruiser was sunk!`;
      infoDisplay2.style.background = "#FF8585";
    }
    if(cpuBattleshipCount === 4){
      cpuBattleshipCount = 10;
      infoDisplay2.innerHTML = `Your battleship was sunk!`;
      infoDisplay2.style.background = "#FFA8A8";
    }
    if(cpuCarrierCount === 5){
      cpuCarrierCount = 10;
      infoDisplay2.innerHTML = `Your carrier was sunk!`;
      infoDisplay2.style.background = "#FFE0E0";
    }

    if (destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount === 50) {
      infoDisplay.innerHTML = "You Win!!!";
      infoDisplay2.innerHTML = "😀";
      infoDisplay.style.background = "none";
      infoDisplay2.style.background = "none";
      gameOver();
    }
    if (cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount === 50) {
      infoDisplay.innerHTML = `${enemy} Wins!!!`;
      infoDisplay2.innerHTML = "😥";
      infoDisplay.style.background = "none";
      infoDisplay2.style.background = "none";
      let allShips = document.querySelectorAll('div.taken.cpu');
      allShips.forEach(square => square.classList.add('revealed'));
      let allWaves = document.querySelectorAll("div.waves2.cpu");
      allWaves.forEach(square => {
        square.style.cssText = "display:inline !important";
        square.style.zIndex = "1000";
        square.classList.add('waves3');
      });
      gameOver();
    }
  }

  function gameOver() {
    computerSquares.forEach(square => square.removeEventListener('click', shotP));
    isGameOver = true;
  }

});
