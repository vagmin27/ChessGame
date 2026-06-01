// Single source of truth for the board state (8x8 grid)
// Row 0 corresponds to rank 8 (Black pieces), Row 7 corresponds to rank 1 (White pieces)
const board = [
    ['brook', 'bknight', 'bbishop', 'bqueen', 'bking', 'bbishop', 'bknight', 'brook'],
    ['bpawn', 'bpawn', 'bpawn', 'bpawn', 'bpawn', 'bpawn', 'bpawn', 'bpawn'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wpawn', 'wpawn', 'wpawn', 'wpawn', 'wpawn', 'wpawn', 'wpawn', 'wpawn'],
    ['wrook', 'wknight', 'wbishop', 'wqueen', 'wking', 'wbishop', 'wknight', 'wrook']
];

// Game State variables
let tog = 1; // odd = White's Turn, even = Black's Turn
let whiteCastleChance = true;
let blackCastleChance = true;

const castlingRights = {
    w: { kingSide: true, queenSide: true },
    b: { kingSide: true, queenSide: true }
};

let selectedSquare = null; // { row, col }
let activeLegalMoves = []; // array of move objects

// Helper functions for mapping between DOM IDs and board coordinates
function getCoordsFromId(id) {
    const row = 8 - parseInt(id[1]);
    const col = parseInt(id[3]) - 1;
    return [row, col];
}

function getIdFromCoords(row, col) {
    return `b${8 - row}0${col + 1}`;
}

function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Reset checkerboard coloring to original state
function coloring() {
    document.querySelectorAll('.box').forEach(box => {
        const r = parseInt(box.id[1]);
        const c = parseInt(box.id[3]);
        if ((r + c) % 2 === 0) {
            box.style.backgroundColor = 'rgb(240, 201, 150)';
        } else {
            box.style.backgroundColor = 'rgb(100, 75, 43)';
        }
    });
}

// Render board state to DOM
function renderBoard() {
    console.log("renderBoard() starting. Current board state: ", board);
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const id = getIdFromCoords(row, col);
            const box = document.getElementById(id);
            if (box) {
                const piece = board[row][col];
                box.innerText = piece;
            }
        }
    }
    insertImage();
}

// Insert Images to the squares based on the board array state
function insertImage() {
    console.log("insertImage() starting execution.");
    document.querySelectorAll('.box').forEach(image => {
        const [row, col] = getCoordsFromId(image.id);
        const piece = board[row][col];

        // Diagnostic logs
        console.log(`[Diagnostic] Box ID: ${image.id}, row: ${row}, col: ${col}`);
        console.log(`[Diagnostic] DOM innerText: "${image.innerText}"`);
        console.log(`[Diagnostic] DOM textContent: "${image.textContent}"`);
        console.log(`[Diagnostic] Board Array Piece: "${piece}"`);

        image.innerHTML = ''; // Clear previous content
        if (piece) {
            const pieceName = piece.toLowerCase();
            // Capitalize the first letter (e.g., 'brook' -> 'Brook.png', 'wpawn' -> 'Wpawn.png')
            // to match case-sensitive files on Linux-based environments like Vercel.
            const imageUrl = pieceName.charAt(0).toUpperCase() + pieceName.slice(1) + '.png';
            console.log(`[Diagnostic] Generating image URL: "${imageUrl}" for piece: "${piece}"`);

            if (pieceName.endsWith('pawn')) {
                image.innerHTML = `${piece} <img class='allimg allpawn' src="${imageUrl}" alt="" onerror="console.error('Failed to load image at: ' + this.src)">`;
                image.style.cursor = 'pointer';
            } else {
                image.innerHTML = `${piece} <img class='allimg' src="${imageUrl}" alt="" onerror="console.error('Failed to load image at: ' + this.src)">`;
                image.style.cursor = 'pointer';
            }
        } else {
            image.style.cursor = '';
        }
    });
}

// Check if a piece can attack a square (used internally by attack detection)
function canPieceAttackCoords(fromRow, fromCol, toRow, toCol, boardState) {
    const piece = boardState[fromRow][fromCol];
    if (!piece) return false;
    const color = piece[0];
    const type = piece.slice(1);

    if (type === 'pawn') {
        const dir = color === 'w' ? -1 : 1;
        return toRow === fromRow + dir && Math.abs(toCol - fromCol) === 1;
    }

    if (type === 'king') {
        return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
    }

    if (type === 'knight') {
        const dr = Math.abs(toRow - fromRow);
        const dc = Math.abs(toCol - fromCol);
        return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    }

    if (type === 'bishop' || type === 'queen') {
        if (Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)) {
            const dr = toRow > fromRow ? 1 : -1;
            const dc = toCol > fromCol ? 1 : -1;
            let r = fromRow + dr;
            let c = fromCol + dc;
            while (r !== toRow && c !== toCol) {
                if (boardState[r][c] !== '') return false; // Blocked by piece
                r += dr;
                c += dc;
            }
            return true;
        }
    }

    if (type === 'rook' || type === 'queen') {
        if (fromRow === toRow || fromCol === toCol) {
            const dr = toRow === fromRow ? 0 : (toRow > fromRow ? 1 : -1);
            const dc = toCol === fromCol ? 0 : (toCol > fromCol ? 1 : -1);
            let r = fromRow + dr;
            let c = fromCol + dc;
            while (r !== toRow || c !== toCol) {
                if (boardState[r][c] !== '') return false; // Blocked by piece
                r += dr;
                c += dc;
            }
            return true;
        }
    }

    return false;
}

// User-facing function to check if a piece can attack another position
function canPieceAttack(fromId, toId, piece) {
    const [fromRow, fromCol] = getCoordsFromId(fromId);
    const [toRow, toCol] = getCoordsFromId(toId);
    
    // Temporarily place the piece if the board square is empty
    const originalPiece = board[fromRow][fromCol];
    if (originalPiece === '' && piece) {
        board[fromRow][fromCol] = piece;
        const result = canPieceAttackCoords(fromRow, fromCol, toRow, toCol, board);
        board[fromRow][fromCol] = '';
        return result;
    }
    return canPieceAttackCoords(fromRow, fromCol, toRow, toCol, board);
}

// Check if square is attacked by any piece of attackerColor
function isSquareAttacked(row, col, attackerColor, boardState) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = boardState[r][c];
            if (piece !== '' && piece.startsWith(attackerColor)) {
                if (canPieceAttackCoords(r, c, row, col, boardState)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Check if King is in check
function isKingInCheck(color) {
    const lowerColor = color.toLowerCase();
    let kingRow = -1;
    let kingCol = -1;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === (lowerColor + 'king')) {
                kingRow = r;
                kingCol = c;
                break;
            }
        }
        if (kingRow !== -1) break;
    }
    if (kingRow === -1) return false;

    const opponentColor = lowerColor === 'w' ? 'b' : 'w';
    return isSquareAttacked(kingRow, kingCol, opponentColor, board);
}

// Move simulation and undoing
function simulateMove(fromRow, fromCol, toRow, toCol, boardState) {
    const backup = {
        fromPiece: boardState[fromRow][fromCol],
        toPiece: boardState[toRow][toCol]
    };
    boardState[toRow][toCol] = boardState[fromRow][fromCol];
    boardState[fromRow][fromCol] = '';
    return backup;
}

function undoMove(fromRow, fromCol, toRow, toCol, backup, boardState) {
    boardState[fromRow][fromCol] = backup.fromPiece;
    boardState[toRow][toCol] = backup.toPiece;
}

// Move generators for each piece type
function generatePawnMoves(row, col, boardState) {
    const moves = [];
    const piece = boardState[row][col];
    const color = piece[0];
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const enemyPrefix = color === 'w' ? 'b' : 'w';

    const nextRow = row + dir;
    if (inBounds(nextRow, col) && boardState[nextRow][col] === '') {
        moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: col, type: 'normal' });
        const doubleRow = row + 2 * dir;
        if (row === startRow && boardState[doubleRow][col] === '') {
            moves.push({ fromRow: row, fromCol: col, toRow: doubleRow, toCol: col, type: 'normal' });
        }
    }

    const captureCols = [col - 1, col + 1];
    for (const c of captureCols) {
        if (inBounds(nextRow, c)) {
            const target = boardState[nextRow][c];
            if (target !== '' && target.startsWith(enemyPrefix)) {
                moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: c, type: 'normal' });
            }
        }
    }
    return moves;
}

function generateKnightMoves(row, col, boardState) {
    const moves = [];
    const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    const piece = boardState[row][col];
    const color = piece[0];
    for (const [dr, dc] of knightOffsets) {
        const nr = row + dr;
        const nc = col + dc;
        if (inBounds(nr, nc)) {
            const target = boardState[nr][nc];
            if (target === '' || target[0] !== color) {
                moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, type: 'normal' });
            }
        }
    }
    return moves;
}

function generateBishopMoves(row, col, boardState) {
    const moves = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const piece = boardState[row][col];
    const color = piece[0];
    for (const [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;
        while (inBounds(nr, nc)) {
            const target = boardState[nr][nc];
            if (target === '') {
                moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, type: 'normal' });
            } else {
                if (target[0] !== color) {
                    moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, type: 'normal' });
                }
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    return moves;
}

function generateRookMoves(row, col, boardState) {
    const moves = [];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const piece = boardState[row][col];
    const color = piece[0];
    for (const [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;
        while (inBounds(nr, nc)) {
            const target = boardState[nr][nc];
            if (target === '') {
                moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, type: 'normal' });
            } else {
                if (target[0] !== color) {
                    moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, type: 'normal' });
                }
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    return moves;
}

function generateQueenMoves(row, col, boardState) {
    return [
        ...generateBishopMoves(row, col, boardState),
        ...generateRookMoves(row, col, boardState)
    ];
}

function generateKingMoves(row, col, boardState, includeCastling = true) {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
    ];
    const piece = boardState[row][col];
    const color = piece[0];
    for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (inBounds(nr, nc)) {
            const target = boardState[nr][nc];
            if (target === '' || target[0] !== color) {
                moves.push({ fromRow: row, fromCol: col, toRow: nr, toCol: nc, type: 'normal' });
            }
        }
    }

    if (includeCastling) {
        const startRow = color === 'w' ? 7 : 0;
        const opponentColor = color === 'w' ? 'b' : 'w';
        if (row === startRow && col === 4) {
            const rights = castlingRights[color];
            // Kingside castling
            if (rights.kingSide &&
                boardState[startRow][5] === '' &&
                boardState[startRow][6] === '' &&
                boardState[startRow][7] === (color + 'rook') &&
                !isSquareAttacked(startRow, 4, opponentColor, boardState) &&
                !isSquareAttacked(startRow, 5, opponentColor, boardState) &&
                !isSquareAttacked(startRow, 6, opponentColor, boardState)) {
                moves.push({ fromRow: row, fromCol: col, toRow: startRow, toCol: 6, type: 'castling-kingside' });
            }
            // Queenside castling
            if (rights.queenSide &&
                boardState[startRow][1] === '' &&
                boardState[startRow][2] === '' &&
                boardState[startRow][3] === '' &&
                boardState[startRow][0] === (color + 'rook') &&
                !isSquareAttacked(startRow, 4, opponentColor, boardState) &&
                !isSquareAttacked(startRow, 3, opponentColor, boardState) &&
                !isSquareAttacked(startRow, 2, opponentColor, boardState)) {
                moves.push({ fromRow: row, fromCol: col, toRow: startRow, toCol: 2, type: 'castling-queenside' });
            }
        }
    }
    return moves;
}

function generatePseudoLegalMoves(row, col, boardState) {
    const piece = boardState[row][col];
    if (piece === '') return [];
    const type = piece.slice(1);
    switch (type) {
        case 'pawn': return generatePawnMoves(row, col, boardState);
        case 'knight': return generateKnightMoves(row, col, boardState);
        case 'bishop': return generateBishopMoves(row, col, boardState);
        case 'rook': return generateRookMoves(row, col, boardState);
        case 'queen': return generateQueenMoves(row, col, boardState);
        case 'king': return generateKingMoves(row, col, boardState, false);
        default: return [];
    }
}

function generateLegalMoves(row, col, boardState) {
    const piece = boardState[row][col];
    if (piece === '') return [];
    const color = piece[0];

    const pseudoMoves = generatePseudoLegalMoves(row, col, boardState);
    const legalMoves = [];

    for (const move of pseudoMoves) {
        const backup = simulateMove(move.fromRow, move.fromCol, move.toRow, move.toCol, boardState);
        const inCheck = isKingInCheck(color);
        undoMove(move.fromRow, move.fromCol, move.toRow, move.toCol, backup, boardState);

        if (!inCheck) {
            legalMoves.push(move);
        }
    }

    if (piece.slice(1) === 'king') {
        const castlingMoves = generateKingMoves(row, col, boardState, true).filter(m => m.type.startsWith('castling'));
        for (const move of castlingMoves) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}

// Check if a player color has any legal moves remaining
function hasLegalMoves(color) {
    const lowerColor = color.toLowerCase();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '' && piece.startsWith(lowerColor)) {
                const moves = generateLegalMoves(r, c, board);
                if (moves.length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Handle execution of a real move on the board state
function executeMove(move) {
    const piece = board[move.fromRow][move.fromCol];
    const color = piece[0];

    if (move.type === 'castling-kingside') {
        board[move.toRow][6] = board[move.fromRow][4];
        board[move.fromRow][4] = '';
        board[move.toRow][5] = board[move.toRow][7];
        board[move.toRow][7] = '';
    } else if (move.type === 'castling-queenside') {
        board[move.toRow][2] = board[move.fromRow][4];
        board[move.fromRow][4] = '';
        board[move.toRow][3] = board[move.toRow][0];
        board[move.toRow][0] = '';
    } else {
        // Normal move or promotion
        if (piece.slice(1) === 'pawn' && (move.toRow === 0 || move.toRow === 7)) {
            board[move.toRow][move.toCol] = color + 'queen'; // Auto promote to Queen
        } else {
            board[move.toRow][move.toCol] = board[move.fromRow][move.fromCol];
        }
        board[move.fromRow][move.fromCol] = '';
    }

    // Update castling rights
    if (piece.slice(1) === 'king') {
        castlingRights[color].kingSide = false;
        castlingRights[color].queenSide = false;
    }
    if (piece.slice(1) === 'rook') {
        if (move.fromRow === (color === 'w' ? 7 : 0)) {
            if (move.fromCol === 0) castlingRights[color].queenSide = false;
            if (move.fromCol === 7) castlingRights[color].kingSide = false;
        }
    }
    // If a rook is captured, disable castling rights for the captured rook
    const opponentColor = color === 'w' ? 'b' : 'w';
    if (move.toRow === (opponentColor === 'w' ? 7 : 0)) {
        if (move.toCol === 0) castlingRights[opponentColor].queenSide = false;
        if (move.toCol === 7) castlingRights[opponentColor].kingSide = false;
    }

    // Update global compatibility flags
    whiteCastleChance = castlingRights.w.kingSide || castlingRights.w.queenSide;
    blackCastleChance = castlingRights.b.kingSide || castlingRights.b.queenSide;
}

// Attach Event Delegation Listener
document.querySelector('ul').addEventListener('click', function (e) {
    const box = e.target.closest('.box');
    if (!box) return;

    // Check if game is already over
    if (document.getElementById('gameOverPopup').style.display === 'block') {
        return;
    }

    const [row, col] = getCoordsFromId(box.id);
    const piece = board[row][col];
    const playerColor = (tog % 2 !== 0) ? 'w' : 'b';

    // Check if player clicked on one of their highlighted moves
    const clickedMove = activeLegalMoves.find(m => m.toRow === row && m.toCol === col);

    if (clickedMove) {
        // Execute move
        executeMove(clickedMove);

        // Turn switching
        tog = tog + 1;
        document.getElementById('tog').innerText = (tog % 2 !== 0) ? "White's Turn" : "Black's Turn";

        // Reset Selection
        selectedSquare = null;
        activeLegalMoves = [];

        // Redraw board
        renderBoard();
        coloring();

        // Check for checkmate/stalemate for next player
        const nextPlayerColor = (tog % 2 !== 0) ? 'w' : 'b';
        if (!hasLegalMoves(nextPlayerColor)) {
            setTimeout(() => {
                const winnerText = document.getElementById("winner");
                const popup = document.getElementById("gameOverPopup");
                const popupText = document.getElementById("gameOverText");

                if (isKingInCheck(nextPlayerColor)) {
                    // Checkmate
                    const resultMsg = (nextPlayerColor === 'w' ? 'Black' : 'White') + ' Wins by Checkmate';
                    winnerText.innerText = resultMsg;
                    popupText.innerText = resultMsg;
                } else {
                    // Stalemate
                    const resultMsg = 'Draw by Stalemate';
                    winnerText.innerText = resultMsg;
                    popupText.innerText = resultMsg;
                }
                popup.style.display = "block";
            }, 100);
        }
    } else {
        // Clear highlights and reset
        selectedSquare = null;
        activeLegalMoves = [];
        coloring();

        // If clicked square contains current player's piece, select and highlight it
        if (piece !== '' && piece.startsWith(playerColor)) {
            selectedSquare = { row, col };
            activeLegalMoves = generateLegalMoves(row, col, board);

            if (activeLegalMoves.length > 0) {
                // Highlight the selected square
                box.style.backgroundColor = 'pink';

                // Highlight the move options
                activeLegalMoves.forEach(move => {
                    const destBox = document.getElementById(getIdFromCoords(move.toRow, move.toCol));
                    if (destBox) {
                        if (move.type.startsWith('castling')) {
                            destBox.style.backgroundColor = 'aqua';
                        } else {
                            destBox.style.backgroundColor = 'green';
                        }
                    }
                });
            }
        }
    }
});

// Initialize Board on Page Load
document.addEventListener('DOMContentLoaded', () => {
    renderBoard();
    coloring();
});
