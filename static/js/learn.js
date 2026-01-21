/**
 * Interactive Chess Learning System
 * Loads lessons from Firestore and manages learning progress
 */

import { db } from './firebase.js';
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
  const boardEl = document.getElementById('board');
  const solutionEl = document.getElementById('solution');
  const progressBar = document.querySelector('.progress-bar');
  const progressStats = document.querySelector('.progress-stats');

  const board = new window.EnhancedChessBoard(boardEl);

  let lessons = [];
  let current = 0;
  let completedLessons = new Set();

  const prevBtn = document.getElementById('prevLesson');
  const nextBtn = document.getElementById('nextLesson');
  const resetBtn = document.getElementById('resetLesson');

  // Load completed lessons from localStorage
  const savedProgress = localStorage.getItem('chessLessonsProgress');
  if (savedProgress) {
    try {
      completedLessons = new Set(JSON.parse(savedProgress));
    } catch (e) {
      console.error('Error loading progress:', e);
      completedLessons = new Set();
    }
  }

  // Load lessons from Firestore
  async function loadLessonsFromFirestore() {
    try {
      const q = query(collection(db, 'lessons'), orderBy('id'));
      const snapshot = await getDocs(q);

      lessons = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert correctMoves array format from Firestore
        if (data.correctMoves && data.correctMoves.length > 0) {
          data.correctMoves = data.correctMoves.map(move => [move.from, move.to]);
        } else {
          data.correctMoves = [];
        }
        
        return data;
      });

      console.log(`Loaded ${lessons.length} lessons from Firestore`);
    } catch (error) {
      console.error('Error loading lessons:', error);
      solutionEl.innerHTML = `
        <strong style="color: #f44336;">Error Loading Lessons</strong>
        <br><br>
        Could not load lessons from database. Please refresh the page.
        <br><br>
        <small>Error: ${error.message}</small>
      `;
    }
  }

  function updateProgress() {
    const completed = completedLessons.size;
    const total = lessons.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    if (progressBar) {
      progressBar.style.width = percentage + '%';
      progressBar.textContent = percentage + '%';
    }
    
    if (progressStats) {
      progressStats.innerHTML = `
        <span>Completed: ${completed}/${total}</span>
        <span>Progress: ${percentage}%</span>
      `;
    }
  }

  function markLessonComplete(lessonId) {
    if (!completedLessons.has(lessonId)) {
      completedLessons.add(lessonId);
      localStorage.setItem('chessLessonsProgress', JSON.stringify([...completedLessons]));
      updateProgress();
    }
  }

  function showFeedback(type, message, submessage = '') {
    const overlay = document.createElement('div');
    overlay.className = `feedback-overlay ${type}`;
    
    const icon = type === 'success' ? '🎉' : '❌';
    
    overlay.innerHTML = `
      <div class="feedback-icon">${icon}</div>
      <div class="feedback-text">${message}</div>
      <div class="feedback-subtext">${submessage}</div>
    `;
    
    document.body.appendChild(overlay);
    
    setTimeout(() => overlay.classList.add('show'), 10);
    
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }, 2000);
  }

  function loadIndex(i) {
    if (i < 0 || i >= lessons.length) return;
    
    current = i;
    const lesson = lessons[i];

    // Update lesson badge
    const badge = document.querySelector('.lesson-badge');
    if (badge) {
      badge.textContent = `Lesson ${lesson.id} of ${lessons.length}`;
    }

    // Get task description
    let taskText = '';
    switch (lesson.task) {
      case 'move_piece':
        taskText = '📝 Task: Make any legal move';
        break;
      case 'capture':
        taskText = '⚔️ Task: Capture the target piece';
        break;
      case 'promote':
        taskText = '👑 Task: Promote your pawn';
        break;
      case 'castle':
        taskText = '🏰 Task: Castle your king';
        break;
      case 'en_passant':
        taskText = '👻 Task: Capture en passant';
        break;
      case 'tactic':
        taskText = '🎯 Task: Find the tactical move';
        break;
      case 'check':
        taskText = '✅ Task: Give check';
        break;
      case 'checkmate':
        taskText = '♔ Task: Deliver checkmate!';
        break;
      case 'free_practice':
        taskText = '🎓 Free practice mode';
        break;
      default:
        taskText = '';
    }

    // Update solution text
    solutionEl.innerHTML = `
      <strong style="font-size: 22px; color: #d4a24f;">${lesson.title}</strong>
      <br><br>
      ${lesson.text}
      ${taskText ? `<br><br><span class="task-indicator">${taskText}</span>` : ''}
    `;
    
    solutionEl.className = 'solution-text';

    // Set up board
    board.setPieces(lesson.pieces || {});
    board.setLesson(
      lesson.id, 
      lesson.task || 'move_piece', 
      lesson.correctMoves || [], 
      lesson.targetSquare || null
    );

    // Update navigation buttons
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === lessons.length - 1;
    
    updateProgress();
  }

  // Navigation event listeners
  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      loadIndex(current - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (current < lessons.length - 1) {
      loadIndex(current + 1);
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      loadIndex(current);
      showFeedback('success', 'Lesson Reset! 🔄', 'Try again from the beginning');
    });
  }

  // Handle successful moves
  board.onMoveAccepted = ({ piece, from, to, lesson }) => {
    const currentLesson = lessons[current];
    
    solutionEl.className = 'solution-text success';
    
    const pieceNames = {
      'wp': 'Pawn', 'wr': 'Rook', 'wn': 'Knight', 
      'wb': 'Bishop', 'wq': 'Queen', 'wk': 'King'
    };
    
    const pieceName = pieceNames[piece] || 'Piece';
    
    solutionEl.innerHTML = `
      <strong style="font-size: 22px; color: #4caf50;">✅ Excellent Move!</strong>
      <br><br>
      ${pieceName} moved from ${from} to ${to}
      <br><br>
      ${currentLesson.text}
    `;

    showFeedback('success', 'Perfect! 🎉', 'You made the correct move!');
    
    // Mark lesson as complete
    markLessonComplete(currentLesson.id);

    // Auto-advance after success (except for free practice)
    if (currentLesson.task !== 'free_practice' && current < lessons.length - 1) {
      setTimeout(() => {
        loadIndex(current + 1);
      }, 2500);
    }
  };

  // Handle rejected moves
  board.onMoveRejected = ({ piece, from, to, reason }) => {
    const currentLesson = lessons[current];
    
    solutionEl.className = 'solution-text error';
    
    let errorMsg = 'Try again! That move is not correct for this lesson.';
    
    if (reason === 'illegal') {
      errorMsg = 'That move is not legal for this piece!';
    } else if (reason === 'wrong_piece') {
      errorMsg = 'Try moving a different piece for this lesson.';
    } else if (reason === 'wrong_target') {
      errorMsg = 'You need to reach the target square!';
    }
    
    solutionEl.innerHTML = `
      <strong style="font-size: 22px; color: #f44336;">❌ Not Quite!</strong>
      <br><br>
      ${errorMsg}
      <br><br>
      <em>Hint: ${currentLesson.text}</em>
    `;

    showFeedback('error', 'Try Again! 💪', errorMsg);

    // Reset message after delay
    setTimeout(() => {
      solutionEl.className = 'solution-text';
      
      let taskText = '';
      switch (currentLesson.task) {
        case 'move_piece': taskText = '📝 Task: Make any legal move'; break;
        case 'capture': taskText = '⚔️ Task: Capture the target piece'; break;
        case 'promote': taskText = '👑 Task: Promote your pawn'; break;
        case 'castle': taskText = '🏰 Task: Castle your king'; break;
        case 'en_passant': taskText = '👻 Task: Capture en passant'; break;
        case 'tactic': taskText = '🎯 Task: Find the tactical move'; break;
        case 'check': taskText = '✅ Task: Give check'; break;
        case 'checkmate': taskText = '♔ Task: Deliver checkmate!'; break;
        case 'free_practice': taskText = '🎓 Free practice mode'; break;
      }
      
      solutionEl.innerHTML = `
        <strong style="font-size: 22px; color: #d4a24f;">${currentLesson.title}</strong>
        <br><br>
        ${currentLesson.text}
        ${taskText ? `<br><br><span class="task-indicator">${taskText}</span>` : ''}
      `;
    }, 2000);
  };

  // Initialize the system
  console.log('Initializing Chess Learning System...');
  await loadLessonsFromFirestore();
  
  if (lessons.length > 0) {
    loadIndex(0);
  } else {
    solutionEl.innerHTML = `
      <strong style="color: #f44336;">No Lessons Found</strong>
      <br><br>
      Please make sure lessons are added to Firestore.
      <br><br>
      Run the Python script to populate lessons.
    `;
  }
});