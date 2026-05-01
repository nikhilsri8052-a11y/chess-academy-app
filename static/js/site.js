(() => {
  const toggle = document.querySelector('.mobile-nav-toggle');
  const nav = document.getElementById('siteNav');
  if (toggle && nav) toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
  });

  const rain = document.querySelector('.chess-rain');
  if (rain) {
    const pieces = ['♔','♕','♖','♗','♘','♙','♚','♛','♜','♝','♞','♟'];
    for (let i=0;i<36;i++) {
      const el = document.createElement('span');
      el.className = 'rain-piece';
      el.textContent = pieces[Math.floor(Math.random()*pieces.length)];
      el.style.left = `${Math.random()*100}vw`;
      el.style.fontSize = `${16 + Math.random()*24}px`;
      el.style.animationDuration = `${9 + Math.random()*14}s`;
      el.style.animationDelay = `${Math.random()*-20}s`;
      rain.appendChild(el);
    }
  }
})();
