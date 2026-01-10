// static/js/learn.js
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

  const board = new window.SimpleChessBoard(boardEl);

  let lessons = [];
  let current = 0;

  const prevBtn = document.getElementById('prevLesson');
  const nextBtn = document.getElementById('nextLesson');

  // 🔥 LOAD LESSONS FROM FIRESTORE
  async function loadLessonsFromFirestore() {
    const q = query(collection(db, 'lessons'), orderBy('id'));
    const snapshot = await getDocs(q);

    lessons = snapshot.docs.map(doc => doc.data());
  }

  function loadIndex(i) {
    current = i;
    const lesson = lessons[i];

    solutionEl.innerText = `${lesson.title}\n\n${lesson.text}`;
    board.setPieces(lesson.pieces);
    board.setLesson(lesson.id);

    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === lessons.length - 1;
  }

  prevBtn.addEventListener('click', () => {
    if (current > 0) loadIndex(current - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (current < lessons.length - 1) loadIndex(current + 1);
  });

  board.onMoveAccepted = ({ piece, from, to }) => {
    solutionEl.innerText =
      `Good move! (${piece} ${from} → ${to})\n\n` + lessons[current].text;
  };

  board.onMoveRejected = () => {
    solutionEl.innerText =
      `Try again — that move is not allowed for this lesson.\n\n` +
      lessons[current].text;

    setTimeout(() => {
      solutionEl.innerText =
        lessons[current].title + '\n\n' + lessons[current].text;
    }, 1200);
  };

  // 🔥 INIT
  await loadLessonsFromFirestore();
  loadIndex(0);
});
