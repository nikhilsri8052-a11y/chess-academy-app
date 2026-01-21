/**
 * Enhanced Chess Engine for Interactive Learning
 * Handles piece movement, validation, and special moves
 */

(function () {
  class EnhancedChessBoard {
    constructor(boardElement) {
      this.boardEl = boardElement;
      this.files = "abcdefgh";
      this.pieces = {};
      this.selected = null;
      this.lesson = 1;
      this.task = 'move_piece';
      this.correctMoves = [];
      this.targetSquare = null;

      this.unicode = {
        'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
        'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
      };

      this.onMoveAccepted = null;
      this.onMoveRejected = null;

      this.createEmptyBoard();
      this.render();
    }

    createEmptyBoard() {
      this.boardEl.innerHTML = '';
      for (let rank = 8; rank >= 1; rank--) {
        for (let file = 0; file < 8; file++) {
          const coord = this.files[file] + rank;
          const sq = document.createElement('div');
          sq.className = 'square ' + (((file + rank) % 2 === 0) ? 'light' : 'dark');
          sq.dataset.square = coord;
          sq.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onSquareClick(coord);
          });
          this.boardEl.appendChild(sq);
        }
      }
    }

    setPieces(map) {
      this.pieces = Object.assign({}, map);
      this.selected = null;
      this.render();
    }

    render() {
      // Reset all squares
      this.boardEl.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'hint', 'target', 'correct-move', 'wrong-move');
        sq.innerHTML = '';
      });

      // Draw pieces
      for (const sq in this.pieces) {
        const piece = this.pieces[sq];
        const el = this.boardEl.querySelector(`[data-square="${sq}"]`);
        if (!el) continue;
        const span = document.createElement('div');
        // add piece id (e.g. "wp", "br") so it's easier to debug / style if needed
        span.className = 'piece ' + piece; 
        // add a readable class for colour based on piece side
        span.classList.add(piece.startsWith('w') ? 'white' : 'black');
        span.textContent = this.unicode[piece] || '?';
        el.appendChild(span);
      }

      // Highlight selected square
      if (this.selected) {
        const sEl = this.boardEl.querySelector(`[data-square="${this.selected}"]`);
        if (sEl) sEl.classList.add('selected');
      }
      
      // Highlight target square
      if (this.targetSquare) {
        const tEl = this.boardEl.querySelector(`[data-square="${this.targetSquare}"]`);
        if (tEl) tEl.classList.add('target');
      }
    }

    onSquareClick(square) {
      // A. Selecting a piece
      if (this.selected === null) {
        if (this.pieces[square]) {
          // Ignore black pieces
          if (this.pieces[square].startsWith('b')) return;
          
          this.selected = square;
          this.render();
          this.showHintsFor(square);
        }
        return;
      }

      // B. Deselecting (clicking same square)
      if (this.selected === square) {
        this.selected = null;
        this.render();
        return;
      }

      // C. Changing selection (clicking another friendly piece)
      if (this.pieces[square] && this.pieces[square][0] === this.pieces[this.selected][0]) {
        this.selected = square;
        this.render();
        this.showHintsFor(square);
        return;
      }

      // D. Attempting a move
      const from = this.selected;
      const to = square;
      const piece = this.pieces[from];

      const moveResult = this.validateMove(piece, from, to);
      
      if (moveResult.valid) {
        // Animate correct move
        const toEl = this.boardEl.querySelector(`[data-square="${to}"]`);
        if (toEl) toEl.classList.add('correct-move');

        // Handle special moves
        if (moveResult.special === 'promotion') {
          const choice = prompt("Promote to (q, r, b, n)?", "q") || 'q';
          this.pieces[to] = this.promotionCodeFromChoice(choice);
        } else if (moveResult.special === 'castle_kingside') {
          this.pieces[to] = piece;
          this.pieces['f1'] = 'wr';
          delete this.pieces['h1'];
        } else if (moveResult.special === 'castle_queenside') {
          this.pieces[to] = piece;
          this.pieces['d1'] = 'wr';
          delete this.pieces['a1'];
        } else if (moveResult.special === 'en_passant') {
          this.pieces[to] = piece;
          const captureSquare = to[0] + from[1];
          delete this.pieces[captureSquare];
        } else {
          this.pieces[to] = piece;
        }
        
        delete this.pieces[from];
        this.selected = null;
        this.render();
        
        if (this.onMoveAccepted) {
          this.onMoveAccepted({ piece, from, to, lesson: this.lesson });
        }
      } else {
        // Animate wrong move
        const toEl = this.boardEl.querySelector(`[data-square="${to}"]`);
        if (toEl) {
          toEl.classList.add('wrong-move');
          setTimeout(() => toEl.classList.remove('wrong-move'), 600);
        }
        
        this.selected = null;
        this.render();
        
        if (this.onMoveRejected) {
          this.onMoveRejected({ piece, from, to, reason: moveResult.reason });
        }
      }
    }

    validateMove(piece, from, to) {
      // Check if move is legal according to chess rules
      const legalMoves = this.legalMovesFor(piece, from);
      if (!legalMoves.includes(to)) {
        return { valid: false, reason: 'illegal' };
      }

      // For free practice, any legal move is valid
      if (this.task === 'free_practice' || this.task === 'none') {
        return { valid: true };
      }

      // Check if move matches lesson requirements
      if (this.correctMoves.length > 0) {
        const isCorrect = this.correctMoves.some(
          move => move[0] === from && move[1] === to
        );
        
        if (!isCorrect) {
          return { valid: false, reason: 'wrong_move' };
        }
      }

      // Check target square requirement
      if (this.targetSquare && to !== this.targetSquare) {
        return { valid: false, reason: 'wrong_target' };
      }

      // Check for special moves
      let special = null;
      
      if (piece === 'wp' && to[1] === '8') {
        special = 'promotion';
      } else if (piece === 'wk' && from === 'e1') {
        if (to === 'g1') special = 'castle_kingside';
        if (to === 'c1') special = 'castle_queenside';
      } else if (piece === 'wp' && Math.abs(this.files.indexOf(from[0]) - this.files.indexOf(to[0])) === 1 && !this.pieces[to]) {
        special = 'en_passant';
      }

      return { valid: true, special };
    }

    promotionCodeFromChoice(c) {
      if (c === 'r') return 'wr';
      if (c === 'b') return 'wb';
      if (c === 'n') return 'wn';
      return 'wq';
    }

    showHintsFor(square) {
      const piece = this.pieces[square];
      if (!piece) return;

      const moves = this.legalMovesFor(piece, square);
      
      moves.forEach(to => {
        // Only show hints for valid moves in the current lesson
        if (this.task === 'free_practice' || this.task === 'none' || 
            this.correctMoves.length === 0 ||
            this.correctMoves.some(move => move[0] === square && move[1] === to)) {
          const el = this.boardEl.querySelector(`[data-square="${to}"]`);
          if (el) el.classList.add('hint');
        }
      });
    }

    legalMovesFor(piece, from) {
      const file = from[0];
      const rank = parseInt(from[1], 10);
      const results = [];
      const files = this.files;
      const occupied = (sq) => !!this.pieces[sq];
      const fileIdx = files.indexOf(file);

      // Pawn
      if (piece === 'wp') {
        const one = file + (rank + 1);
        if (rank < 8 && !occupied(one)) results.push(one);
        const two = file + (rank + 2);
        if (rank === 2 && !occupied(one) && !occupied(two)) results.push(two);
        
        // Captures
        if (fileIdx > 0) {
          const capL = files[fileIdx - 1] + (rank + 1);
          if (this.pieces[capL] && this.pieces[capL].startsWith('b')) results.push(capL);
        }
        if (fileIdx < 7) {
          const capR = files[fileIdx + 1] + (rank + 1);
          if (this.pieces[capR] && this.pieces[capR].startsWith('b')) results.push(capR);
        }
        
        // En passant
        if (rank === 5) {
          if (fileIdx > 0 && this.pieces[files[fileIdx - 1] + 5] === 'bp') {
            results.push(files[fileIdx - 1] + 6);
          }
          if (fileIdx < 7 && this.pieces[files[fileIdx + 1] + 5] === 'bp') {
            results.push(files[fileIdx + 1] + 6);
          }
        }
      }

      // Rook
      if (piece === 'wr' || piece === 'wq') {
        for (let r = rank + 1; r <= 8; r++) { 
          const s = file + r; results.push(s); if (occupied(s)) break; 
        }
        for (let r = rank - 1; r >= 1; r--) { 
          const s = file + r; results.push(s); if (occupied(s)) break; 
        }
        for (let i = fileIdx + 1; i < 8; i++) { 
          const s = files[i] + rank; results.push(s); if (occupied(s)) break; 
        }
        for (let i = fileIdx - 1; i >= 0; i--) { 
          const s = files[i] + rank; results.push(s); if (occupied(s)) break; 
        }
      }

      // Bishop
      if (piece === 'wb' || piece === 'wq') {
        for (let i = 1; fileIdx + i < 8 && rank + i <= 8; i++) {
          const s = files[fileIdx + i] + (rank + i); results.push(s); if (occupied(s)) break;
        }
        for (let i = 1; fileIdx - i >= 0 && rank + i <= 8; i++) {
          const s = files[fileIdx - i] + (rank + i); results.push(s); if (occupied(s)) break;
        }
        for (let i = 1; fileIdx + i < 8 && rank - i >= 1; i++) {
          const s = files[fileIdx + i] + (rank - i); results.push(s); if (occupied(s)) break;
        }
        for (let i = 1; fileIdx - i >= 0 && rank - i >= 1; i++) {
          const s = files[fileIdx - i] + (rank - i); results.push(s); if (occupied(s)) break;
        }
      }

      // Knight
      if (piece === 'wn') {
        const moves = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
        moves.forEach(([df, dr]) => {
          const f = fileIdx + df;
          const r = rank + dr;
          if (f >= 0 && f < 8 && r >= 1 && r <= 8) results.push(files[f] + r);
        });
      }

      // King
      if (piece === 'wk') {
        const moves = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
        moves.forEach(([df, dr]) => {
          const f = fileIdx + df;
          const r = rank + dr;
          if (f >= 0 && f < 8 && r >= 1 && r <= 8) results.push(files[f] + r);
        });
        
        // Castling
        if (from === 'e1') {
          // Kingside
          if (this.pieces['h1'] === 'wr' && !occupied('f1') && !occupied('g1')) {
            results.push('g1');
          }
          // Queenside
          if (this.pieces['a1'] === 'wr' && !occupied('d1') && !occupied('c1') && !occupied('b1')) {
            results.push('c1');
          }
        }
      }

      // Filter: No self-capture
      return [...new Set(results)].filter(sq => {
        if (this.pieces[sq] && this.pieces[sq].startsWith('w')) return false;
        return true;
      });
    }

    setLesson(id, task = 'move_piece', correctMoves = [], targetSquare = null) {
      this.lesson = id;
      this.task = task;
      this.correctMoves = correctMoves;
      this.targetSquare = targetSquare;
      this.selected = null;
      this.render();
    }
  }

  // Export to window
  if (typeof window !== 'undefined') {
    window.EnhancedChessBoard = EnhancedChessBoard;
  }
})();