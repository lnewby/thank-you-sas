console.log("Thank you, SAS!");
const GameStatus = Object.freeze({
    IN_PROGESS: 1,
    SOLVED: 2,
    SHOW_HINT: 3,
    SHUFFLE_BOARD: 4,
    BUBBLE_SORT: 5,
    SELECTION_SORT: 6,
    QUICK_SORT: 7,
    MERGE_SORT: 8,
    INSERTION_SORT: 9,
    EASY: 10,
    MEDIUM: 11,
    HARD: 12
});

const GameState = {
    STATUS: GameStatus.IN_PROGESS,
    PRIOR_STATUS: GameStatus.IN_PROGESS,
    BLOCK_WIDTH: 90,
    BLOCK_HEIGHT: 90,
    BLANK_PIECE_INDEX: 0,
    gameBlocks: [],
    initGridIndices: [],
    GLOBAL_ALPHA: 0,
    DELTA_ALPHA: 0.05,
    SOLVABLE_PUZZLE: false,
    DEBUG: false,
    DIFFICULTY: GameStatus.MEDIUM
};

class puzzleBlock {
    constructor(index, spriteX = 0, spriteY = 0, row = 0, col = 0) {
        this.spriteX = spriteX;
        this.spriteY = spriteY;
        this.row = row;
        this.col = col;
        this.index = index;
        this.deltaX = 0;
        this.deltaY = 0;
    }
}

function initPuzzleBlocks(grid, sprite, rows, cols) {
    
    // build puzzle pieces
    let spriteWidth = sprite.width / cols;
    let spriteHeight = sprite.height / rows;
    GameState.gameBlocks = []; 
    GameState.SOLVABLE_PUZZLE = false;

    for (let row = 0; row < rows; ++ row) {
        for (let col = 0; col < cols; ++col) {
            let blockIndex = row * cols + col;
            let spriteX = col * spriteWidth;
            let spriteY = row * spriteHeight;
            GameState.gameBlocks.push(
                new puzzleBlock(
                    blockIndex, 
                    spriteX, 
                    spriteY
                )
            );
        }
    }

    while(!GameState.SOLVABLE_PUZZLE) {
        // array of ints [0,1,2,3... WxH] to help randomize pieces on grid
        let pieces = Array.from(Array(grid.length).keys())

        // randomly assign puzzle pieces on grid
        let str = '';
        GameState.initGridIndices = [];

        for (let i = 0; i < grid.length; ++i) {
            let pieceIndex = Math.floor(Math.random() * pieces.length);
            grid[i].block = GameState.gameBlocks[pieces[pieceIndex]];

            GameState.initGridIndices.push(grid[i].block.index);

            if (GameState.DEBUG) {
                str += `${grid[i].block.index}, `;
                if ((i+1) % cols == 0) {
                    console.log(str);
                    str = '';
                }
            }
            
            if (pieces[pieceIndex] == grid.length - 1) {
                GameState.BLANK_PIECE_INDEX = i;
            }
            pieces.splice(pieceIndex, 1);
        }

        evenInversion = totalInversions() % 2 == 0;
        oddNumCols = cols % 2 != 0
        GameState.SOLVABLE_PUZZLE = evenInversion && oddNumCols;
    }

    return grid
}

function getInitGrid(rows, cols, sprite) {
    let tempGrid = [];
    for (let row=0; row<rows; ++row) {
        for (let col=0; col<cols; ++col) {
            tempGrid.push({ 
                x: col * GameState.BLOCK_WIDTH, 
                y: row * GameState.BLOCK_HEIGHT,
                row,
                col,
                block: null
            });
        }
    }

    tempGrid = initPuzzleBlocks(tempGrid, sprite, rows, cols);

    return tempGrid;
}

let sliderPuzzle = {
    canvas: document.getElementById("game-canvas"),
    gameGrid: [],
    numRows: null,
    numCols: null,
    sprite: new Image(),
    start: function(rows = 2, cols = 2) {
        this.context = this.canvas.getContext("2d");
        GameState.BLOCK_WIDTH = Math.floor(this.canvas.width / cols);
        GameState.BLOCK_HEIGHT = Math.floor(this.canvas.height / rows);
        this.sprite.src = "Sas.png";
        this.numRows = rows;
        this.numCols = cols;
        this.gameGrid = getInitGrid(rows, cols, this.sprite);
        this.interval = setInterval(updateGame, 20);

        this.canvas.addEventListener('mousedown', (event) => {
            let xCoord = event.pageX - sliderPuzzle.canvas.offsetLeft;
            let yCoord = event.pageY - sliderPuzzle.canvas.offsetTop;
            if (GameState.DEBUG) console.log(xCoord, yCoord);

            sliderPuzzle.gameGrid.forEach((piece, index) => {
                if (xCoord >= piece.x && xCoord <= piece.x + GameState.BLOCK_WIDTH &&
                    yCoord >= piece.y && yCoord <= piece.y + GameState.BLOCK_HEIGHT &&
                    sliderPuzzle.slideablePiece(piece) &&
                    GameState.STATUS == GameStatus.IN_PROGESS) {
                        sliderPuzzle.context.fillStyle = "red";
                        sliderPuzzle.context.fillRect(piece.x, piece.y, GameState.BLOCK_WIDTH, GameState.BLOCK_HEIGHT);
                        sliderPuzzle.swapPuzzleBlocks(index, GameState.BLANK_PIECE_INDEX);
                        GameState.BLANK_PIECE_INDEX = index;
                    }
            })
         }, false);
    },
    clear: function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    draw: function() {
        switch (GameState.STATUS) {
            case GameStatus.IN_PROGESS:
                let spriteWidth = this.sprite.width / this.numCols;
                let spriteHeight = this.sprite.height / this.numRows;
                for (let i = 0; i < this.gameGrid.length; ++i) {
                    let {x, y, block} = this.gameGrid[i];
                    if (i != GameState.BLANK_PIECE_INDEX) {
                        this.context.drawImage(
                            this.sprite, 
                            block.spriteX, 
                            block.spriteY, 
                            spriteWidth, 
                            spriteHeight, 
                            x, y, 
                            GameState.BLOCK_WIDTH, 
                            GameState.BLOCK_HEIGHT
                        );
                    } else {
                        this.context.fillStyle = "grey";
                        this.context.fillRect(x, y, GameState.BLOCK_WIDTH, GameState.BLOCK_HEIGHT);
                    }
                    
                }
                break;
            case GameStatus.SOLVED:
                this.showSolution();
                break;
            case GameStatus.SHOW_HINT:
                this.context.drawImage(this.sprite, 0, 0, this.canvas.width, this.canvas.height);
                break;
            case GameStatus.SHUFFLE_BOARD:
                this.shuffleBoard();
                break;
            default:
                break;
        }
    },
    swapPuzzleBlocks(index1, index2) {
        let tempBlock = this.gameGrid[index1].block;
        this.gameGrid[index1].block = this.gameGrid[index2].block;
        this.gameGrid[index2].block = tempBlock;
    },
    slideablePiece(piece) {
        let blankPiece = this.gameGrid[GameState.BLANK_PIECE_INDEX];
        return ((piece.row == blankPiece.row && piece.col == blankPiece.col - 1) ||
            (piece.row == blankPiece.row && piece.col == blankPiece.col + 1) ||
            (piece.row == blankPiece.row - 1 && piece.col == blankPiece.col) ||
            (piece.row == blankPiece.row + 1 && piece.col == blankPiece.col));
    },
    checkWinState() {
        let winState = true;

        for (let gridIndex = 0; gridIndex < this.gameGrid.length; ++gridIndex) {
            let { block } = this.gameGrid[gridIndex];
            winState &= (block.index == gridIndex);
            if (!winState) break;
        }

        if (winState)
            GameState.STATUS = GameStatus.SOLVED;
    },
    showSolution() {
        if (GameState.GLOBAL_ALPHA < 1) {
            GameState.GLOBAL_ALPHA += GameState.DELTA_ALPHA;
        }
        this.context.globalAlpha = GameState.GLOBAL_ALPHA;
        this.context.drawImage(this.sprite, 0, 0, this.canvas.width, this.canvas.height);
    },
    shuffleBoard() {
        this.gameGrid = getInitGrid(this.numRows, this.numCols, this.sprite);
        if (GameState.DEBUG) 
            console.log(`inversions: ${totalInversions()}`);

        GameState.STATUS = GameStatus.IN_PROGESS;
    },
    insertionSortSolve(compareIndex = 0) {
        // O(n^2)
        let blockToInsertIndex = compareIndex + 1;
        if (blockToInsertIndex < sliderPuzzle.gameGrid.length) {
            sliderPuzzle._insert(compareIndex, blockToInsertIndex); // O(nlogn)
        }
        setTimeout(() => {
            this.insertionSortSolve(blockToInsertIndex);
         }, 300);
    },
    _insert(compareIndex, blockToInsertIndex) {
        let currentIndex;
        let blockToInsert = this.gameGrid[blockToInsertIndex].block;
        // O(nlogn)
        for (currentIndex = compareIndex;
             currentIndex >= 0 && this.gameGrid[currentIndex].block.index > blockToInsert.index;
             --currentIndex)
        {
            let nextIndex = currentIndex + 1;
            this.gameGrid[nextIndex].block = this.gameGrid[currentIndex].block;

            if (currentIndex == GameState.BLANK_PIECE_INDEX) {
                if (GameState.STATUS == GameStatus.DEBUG) {
                    console.log("Blank moved");
                }
                GameState.BLANK_PIECE_INDEX = nextIndex;
            }
        }
        
        this.gameGrid[currentIndex + 1].block = blockToInsert;
        if (blockToInsertIndex == GameState.BLANK_PIECE_INDEX) {
            if (GameState.STATUS == GameStatus.DEBUG) {
                console.log("Blank inserted");
            }
            GameState.BLANK_PIECE_INDEX = currentIndex + 1;
        }
    },
    bubbleSortSolve(firstIndex = 0, swaps = 0) {
        if (firstIndex < this.gameGrid.length - 1) {
            let secondIndex = firstIndex + 1;
            
            if (this.gameGrid[firstIndex].block.index > this.gameGrid[secondIndex].block.index) {
                sliderPuzzle.swapPuzzleBlocks(firstIndex, secondIndex);
                if (GameState.BLANK_PIECE_INDEX == firstIndex || GameState.BLANK_PIECE_INDEX == secondIndex) {
                    GameState.BLANK_PIECE_INDEX = (GameState.BLANK_PIECE_INDEX == firstIndex)
                    ? secondIndex 
                    : firstIndex;
                }
                ++swaps;
            }
            setTimeout(function(){ sliderPuzzle.bubbleSortSolve(secondIndex, swaps); }, 150);
        } else if (swaps) {
            setTimeout(function(){ sliderPuzzle.bubbleSortSolve(); }, 150);
        }
    },
    selectionSortSolve(currentIndex = 0) {
        if (currentIndex < this.gameGrid.length - 1) {
            minIndex = currentIndex;
            
            for (let i = currentIndex + 1; i < this.gameGrid.length; ++i)
                minIndex = (this.gameGrid[minIndex].block.index < this.gameGrid[i].block.index) ? minIndex : i;
            
            if (currentIndex != minIndex)
                sliderPuzzle.swapPuzzleBlocks(minIndex, currentIndex);
                if (GameState.BLANK_PIECE_INDEX == minIndex || GameState.BLANK_PIECE_INDEX == currentIndex) {
                    GameState.BLANK_PIECE_INDEX = (GameState.BLANK_PIECE_INDEX == minIndex)
                    ? currentIndex 
                    : minIndex;
            }

            setTimeout(function(){ sliderPuzzle.selectionSortSolve(currentIndex + 1); }, 150);
        }
    },
    quickSortSolve(startIndex = 0, endIndex = this.gameGrid.length-1) {
        if (startIndex < endIndex) {
            let pivot = sliderPuzzle._partition(startIndex, endIndex);
            setTimeout(function(){ sliderPuzzle.quickSortSolve(startIndex, pivot - 1); }, 200);
            setTimeout(function(){ sliderPuzzle.quickSortSolve(pivot + 1, endIndex); }, 200);
        }
    },
    _partition(lessPtr, pivotPtr) {
        let greaterPtr = lessPtr;
        let unpartitionedPtr = lessPtr;
        let pivotPos;
        
        while (pivotPtr > unpartitionedPtr) {
            if (this.gameGrid[unpartitionedPtr].block.index < this.gameGrid[pivotPtr].block.index) {
                sliderPuzzle.swapPuzzleBlocks(unpartitionedPtr, greaterPtr);
                if (GameState.BLANK_PIECE_INDEX == unpartitionedPtr || GameState.BLANK_PIECE_INDEX == greaterPtr) {
                    GameState.BLANK_PIECE_INDEX = (GameState.BLANK_PIECE_INDEX == unpartitionedPtr)
                    ? greaterPtr
                    : unpartitionedPtr;
                }
                ++greaterPtr;
            }
            ++unpartitionedPtr;
        }
        
        if (this.gameGrid[unpartitionedPtr].block.index == this.gameGrid[pivotPtr].block.index) {
            sliderPuzzle.swapPuzzleBlocks(pivotPtr, greaterPtr);
            if (GameState.BLANK_PIECE_INDEX == pivotPtr || GameState.BLANK_PIECE_INDEX == greaterPtr) {
                GameState.BLANK_PIECE_INDEX = (GameState.BLANK_PIECE_INDEX == pivotPtr)
                ? greaterPtr 
                : pivotPtr;
            }
        }
        
        pivotPos = greaterPtr;
        
        return pivotPos;
    },
    async mergeSortSolve(startIndex = 0, endIndex = this.gameGrid.length - 1) {
        if (startIndex < endIndex) {
            // divide & conquer
            let mid = Math.floor((startIndex + endIndex) >> 1);
            sliderPuzzle.mergeSortSolve(startIndex, mid);
            sliderPuzzle.mergeSortSolve(mid + 1, endIndex);
            sliderPuzzle._merge(startIndex, mid, endIndex);    
        }
    },
    _merge(startIndex, mid, endIndex) {
        let tempBlock = [];
        let l_index = startIndex;
        let r_index = mid + 1;
        let blankBlock = this.gameGrid[GameState.BLANK_PIECE_INDEX].block;
        while (l_index <= mid && r_index <= endIndex)
        {
            if (this.gameGrid[l_index].block.index <= this.gameGrid[r_index].block.index) {
                tempBlock.push(this.gameGrid[l_index++].block);
            } else {
                tempBlock.push(this.gameGrid[r_index++].block);
            }
        }
        
        while (l_index <= mid) {
            tempBlock.push(this.gameGrid[l_index++].block);
        }
        
        while (r_index <= endIndex) {
            tempBlock.push(this.gameGrid[r_index++].block);
        }
        
        // add merged elements back to the gameGrid
        tempBlock.forEach((block, index) => { 
            if (block == blankBlock) {
                GameState.BLANK_PIECE_INDEX = startIndex + index;
            }
            this.gameGrid[startIndex + index].block = block; 
        });
    }
};

function totalInversions() {
    let inversions = 0;
    for (let i = 0; i < GameState.initGridIndices.length; ++i) {
        for (let j = i+1; j < GameState.initGridIndices.length; ++j) {
            if (GameState.initGridIndices[i] > GameState.initGridIndices[j])
                ++inversions;
        }
    }

    return inversions;
}

function getGridDimensions() {
    let dimensions;

    switch (GameState.DIFFICULTY) {
        case GameStatus.EASY:
            dimensions = {rows: 3, cols: 3};
            break;
        case GameStatus.MEDIUM:
            dimensions = {rows: 5, cols: 5};
            break;
        case GameStatus.HARD:
            dimensions = {rows: 7, cols: 7};
            break;   
    }

    return dimensions;
};

function updateGame() {
    sliderPuzzle.clear();
    sliderPuzzle.draw();
    sliderPuzzle.checkWinState()
}

//
// Event System
//

function moveup() {
    let { numRows, numCols } = sliderPuzzle;
    let pieceAboveIndex = GameState.BLANK_PIECE_INDEX + numCols;

    if (pieceAboveIndex < numRows * numCols) {
        sliderPuzzle.swapPuzzleBlocks(pieceAboveIndex, GameState.BLANK_PIECE_INDEX);
        GameState.BLANK_PIECE_INDEX = pieceAboveIndex;
    }
}

function movedown() {
    let pieceAboveIndex = GameState.BLANK_PIECE_INDEX - sliderPuzzle.numCols;

    if (pieceAboveIndex >= 0) {
        sliderPuzzle.swapPuzzleBlocks(pieceAboveIndex, GameState.BLANK_PIECE_INDEX);
        GameState.BLANK_PIECE_INDEX = pieceAboveIndex;
    }
}

function moveleft() {
    let pieceRightIndex = GameState.BLANK_PIECE_INDEX + 1
    let { gameGrid, numRows, numCols } = sliderPuzzle;
    if (pieceRightIndex < numRows * numCols && gameGrid[pieceRightIndex].col > 0) {
        sliderPuzzle.swapPuzzleBlocks(pieceRightIndex, GameState.BLANK_PIECE_INDEX);
        GameState.BLANK_PIECE_INDEX = pieceRightIndex;
    }
}

function moveright() {
    let pieceLeftIndex = GameState.BLANK_PIECE_INDEX - 1
    let { gameGrid, numCols } = sliderPuzzle;
    if (pieceLeftIndex >= 0 && gameGrid[pieceLeftIndex].col < numCols - 1) {
        sliderPuzzle.swapPuzzleBlocks(pieceLeftIndex, GameState.BLANK_PIECE_INDEX);
        GameState.BLANK_PIECE_INDEX = pieceLeftIndex;
    }
}

function showHint() {
    if (GameState.STATUS != GameStatus.SHOW_HINT) {
        GameState.PRIOR_STATUS = GameState.STATUS;
        GameState.STATUS = GameStatus.SHOW_HINT;
    }
}

function hideHint() {
    GameState.STATUS = GameState.PRIOR_STATUS;
}

function shuffleBoard() {
    GameState.STATUS = GameStatus.SHUFFLE_BOARD;
}

let easyBtn = document.getElementById("easy-puzzle");
let mediumBtn = document.getElementById("medium-puzzle");
let hardBtn = document.getElementById("hard-puzzle");
let insertBtn = document.getElementById("insertion-btn");
let bubbleBtn = document.getElementById("bubble-btn");
let selectBtn = document.getElementById("selection-btn");
let quickBtn = document.getElementById("quick-btn");
let hintBtn = document.getElementById("hint-btn");

easyBtn.addEventListener('click', e => {
    if (sliderPuzzle.interval)
        clearInterval(sliderPuzzle.interval);
    
    easyBtn.classList.add("easy-puzzle");
    mediumBtn.classList.remove("medium-puzzle");
    hardBtn.classList.remove("hard-puzzle");

    startGame(GameStatus.EASY);
}, false);


mediumBtn.addEventListener('click', e => {
    if (sliderPuzzle.interval)
        clearInterval(sliderPuzzle.interval);

    easyBtn.classList.remove("easy-puzzle");
    mediumBtn.classList.add("medium-puzzle");
    hardBtn.classList.remove("hard-puzzle");

    startGame(GameStatus.MEDIUM);
}, false);

hardBtn.addEventListener('click', e => {
    if (sliderPuzzle.interval)
        clearInterval(sliderPuzzle.interval);

    easyBtn.classList.remove("easy-puzzle");
    mediumBtn.classList.remove("medium-puzzle");
    hardBtn.classList.add("hard-puzzle");

    startGame(GameStatus.HARD);
}, false);

insertBtn.addEventListener('click', e => {
    insertBtn.classList.add("selected-sort-btn");
    bubbleBtn.classList.remove("selected-sort-btn");
    selectBtn.classList.remove("selected-sort-btn");
    quickBtn.classList.remove("selected-sort-btn");

    sliderPuzzle.insertionSortSolve();
}, false);

bubbleBtn.addEventListener('click', e => {
    insertBtn.classList.remove("selected-sort-btn");
    bubbleBtn.classList.add("selected-sort-btn");
    selectBtn.classList.remove("selected-sort-btn");
    quickBtn.classList.remove("selected-sort-btn");

    sliderPuzzle.bubbleSortSolve();
}, false);

selectBtn.addEventListener('click', e => {
    insertBtn.classList.remove("selected-sort-btn");
    bubbleBtn.classList.remove("selected-sort-btn");
    selectBtn.classList.add("selected-sort-btn");
    quickBtn.classList.remove("selected-sort-btn");

    sliderPuzzle.selectionSortSolve();
}, false);

quickBtn.addEventListener('click', e => {
    insertBtn.classList.remove("selected-sort-btn");
    bubbleBtn.classList.remove("selected-sort-btn");
    selectBtn.classList.remove("selected-sort-btn");
    quickBtn.classList.add("selected-sort-btn");

    sliderPuzzle.quickSortSolve();
}, false);

hintBtn.addEventListener('mousedown', e => {
    showHint();
});

hintBtn.addEventListener('mouseup', e => {
    hideHint();
});

document.addEventListener('keydown', e => {
    let key = e.key || String.fromCharCode(e.keyCode);
    key = key.toLowerCase()
    if (key in ["arrowup", "arrowdown", "arrowleft", "arrowright"])
        e.preventDefault();

    switch(key) {
        case 'w':
        case "arrowup": 
            e.preventDefault();
            moveup();
            break;
        case 's':
        case "arrowdown": 
            movedown();
            break;
        case 'a':
        case "arrowleft": 
            moveleft();
            break;
        case 'd':
        case "arrowright": 
            moveright();
            break;
        case 'h':
            showHint();
            break;
    }
}, false);

document.addEventListener('keyup', e => {
    let key = e.key || String.fromCharCode(e.keyCode);
    key = key.toLowerCase();

    switch(key) {
        case 'h':
            hideHint();
            break;
    }
}, false);

// Event System End

//
// Game Entry Point
//

function startGame(difficulty = GameStatus.MEDIUM) {
    console.log("Starting Game...");
    GameState.STATUS = GameStatus.IN_PROGESS;
    GameState.DIFFICULTY = difficulty;
    GameState.DEBUG = false;

    let dim = getGridDimensions();
    sliderPuzzle.start(dim.rows, dim.cols);

    if (GameState.DEBUG) 
        console.log(`inversions: ${totalInversions()}`);
}

// Game Entry Point End