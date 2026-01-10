(function () {
  class SimpleChessBoard {
    constructor(boardElement, options = {}) {
      this.boardEl = boardElement;
      this.files = "abcdefgh";
      this.pieces = {}; 
      this.selected = null;
      this.lesson = options.lesson || 1;

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
      this.render(); // Render clears hints automatically
    }

    render() {
      // 1. Reset all squares (remove pieces, remove highlights/hints)
      this.boardEl.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'hint');
        sq.innerHTML = '';
      });

      // 2. Draw pieces
      for (const sq in this.pieces) {
        const piece = this.pieces[sq];
        const el = this.boardEl.querySelector(`[data-square="${sq}"]`);
        if (!el) continue;
        const span = document.createElement('div');
        span.className = 'piece';
        span.textContent = this.unicode[piece] || '?';
        el.appendChild(span);
      }

      // 3. Highlight selected square
      if (this.selected) {
        const sEl = this.boardEl.querySelector(`[data-square="${this.selected}"]`);
        if (sEl) sEl.classList.add('selected');
      }
    }

    onSquareClick(square) {
      // A. Clicking a piece to select it
      if (this.selected === null) {
        if (this.pieces[square]) {
          if (this.pieces[square].startsWith('b')) return; // Ignore black pieces
          
          this.selected = square;
          this.render();             // 1. Render selection
          this.showHintsFor(square); // 2. Show hints AFTER render
        }
        return;
      }

      // B. Clicking the already selected piece (Deselect)
      if (this.selected === square) {
        this.selected = null;
        this.render(); // Clears everything
        return;
      }

      // C. Clicking a different friendly piece (Change selection)
      if (this.pieces[square] && this.pieces[square][0] === this.pieces[this.selected][0]) {
        this.selected = square;
        this.render();             // 1. Render new selection
        this.showHintsFor(square); // 2. Show new hints
        return;
      }

      // D. Attempting a move
      const from = this.selected;
      const to = square;
      const piece = this.pieces[from];

      if (this.isMoveAllowedByLesson(piece, from, to)) {
        // Handle Pawn Promotion (auto-queen for simplicity unless prompted)
        if (piece === 'wp' && to[1] === '8') {
            const choice = this.askPromotion();
            this.pieces[to] = this.promotionCodeFromChoice(choice);
        } else {
            this.pieces[to] = piece;
        }
        
        delete this.pieces[from];
        this.selected = null;
        
        this.render(); // Redraw board in new state
        
        if (this.onMoveAccepted) this.onMoveAccepted({ piece, from, to });
      } else {
        // Invalid move
        this.selected = null;
        this.render(); // Clear selection/hints
        if (this.onMoveRejected) this.onMoveRejected({ piece, from, to });
      }
    }

    askPromotion() {
      let ch = prompt("Promote to (q, r, b, n)?", "q");
      return ch ? ch.toLowerCase() : 'q';
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
        // Only show hint if the lesson actually allows this move
        if (this.isMoveAllowedByLesson(piece, square, to)) {
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

      // -- Pawn --
      if (piece === 'wp') {
        const one = file + (rank + 1);
        if (rank < 8 && !occupied(one)) results.push(one);
        const two = file + (rank + 2);
        if (rank === 2 && !occupied(one) && !occupied(two)) results.push(two);
        // Captures
        const fIdx = files.indexOf(file);
        if (fIdx > 0) {
            const capL = files[fIdx - 1] + (rank + 1);
            if (this.pieces[capL] && this.pieces[capL].startsWith('b')) results.push(capL);
        }
        if (fIdx < 7) {
            const capR = files[fIdx + 1] + (rank + 1);
            if (this.pieces[capR] && this.pieces[capR].startsWith('b')) results.push(capR);
        }
      }

      // -- Rook --
      if (piece === 'wr' || piece === 'wq') {
        // Up
        for (let r = rank + 1; r <= 8; r++) { 
            const s = file + r; results.push(s); if (occupied(s)) break; 
        }
        // Down
        for (let r = rank - 1; r >= 1; r--) { 
            const s = file + r; results.push(s); if (occupied(s)) break; 
        }
        // Right
        for (let i = files.indexOf(file) + 1; i < 8; i++) { 
            const s = files[i] + rank; results.push(s); if (occupied(s)) break; 
        }
        // Left
        for (let i = files.indexOf(file) - 1; i >= 0; i--) { 
            const s = files[i] + rank; results.push(s); if (occupied(s)) break; 
        }
      }

      // -- Bishop --
      if (piece === 'wb' || piece === 'wq') {
        const fIdx = files.indexOf(file);
        // NE
        for (let i = 1; fIdx + i < 8 && rank + i <= 8; i++) {
            const s = files[fIdx + i] + (rank + i); results.push(s); if (occupied(s)) break;
        }
        // NW
        for (let i = 1; fIdx - i >= 0 && rank + i <= 8; i++) {
            const s = files[fIdx - i] + (rank + i); results.push(s); if (occupied(s)) break;
        }
        // SE
        for (let i = 1; fIdx + i < 8 && rank - i >= 1; i++) {
            const s = files[fIdx + i] + (rank - i); results.push(s); if (occupied(s)) break;
        }
        // SW
        for (let i = 1; fIdx - i >= 0 && rank - i >= 1; i++) {
            const s = files[fIdx - i] + (rank - i); results.push(s); if (occupied(s)) break;
        }
      }

      // -- Knight --
      if (piece === 'wn') {
        const moves = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
        moves.forEach(([df, dr]) => {
            const f = files.indexOf(file) + df;
            const r = rank + dr;
            if (f >= 0 && f < 8 && r >= 1 && r <= 8) results.push(files[f] + r);
        });
      }

      // -- King --
      if (piece === 'wk') {
        const moves = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
        moves.forEach(([df, dr]) => {
            const f = files.indexOf(file) + df;
            const r = rank + dr;
            if (f >= 0 && f < 8 && r >= 1 && r <= 8) results.push(files[f] + r);
        });
      }

      // Final Filter: Unique & No Self Capture
      return [...new Set(results)].filter(sq => {
          if (this.pieces[sq] && this.pieces[sq].startsWith('w')) return false;
          return true;
      });
    }

    isMoveAllowedByLesson(piece, from, to) {
      if (!this.legalMovesFor(piece, from).includes(to)) return false;

      const l = this.lesson;
      if (l === 1 || l === 7) return piece === 'wp'; // Pawn
      if (l === 2 || l === 8) return piece === 'wr'; // Rook
      if (l === 3) return piece === 'wb';            // Bishop
      if (l === 4) return piece === 'wn';            // Knight
      if (l === 5) return piece === 'wq';            // Queen
      if (l === 6) return piece === 'wk';            // King
      
      // Combined/Free Practice
      if (l === 9 || l === 10) return true;

      return false;
    }

    setLesson(n) {
      this.lesson = n;
      this.selected = null;
      this.render();
    }
  }

  if (typeof window !== 'undefined') window.SimpleChessBoard = SimpleChessBoard;
})();
