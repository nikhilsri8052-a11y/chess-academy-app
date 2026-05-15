/* ── home.js: Slider, Counter Animations, Reveal on Scroll ── */

document.addEventListener('DOMContentLoaded', () => {

  /* ════════════════════════════
     INTERSECTION OBSERVER — Reveal
  ════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger children inside the same parent
        const delay = Array.from(entry.target.parentElement.children).indexOf(entry.target) * 0.08;
        entry.target.style.transitionDelay = `${delay}s`;
        entry.target.classList.add('visible');
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealIO.observe(el));


  /* ════════════════════════════
     ANIMATED COUNTERS
  ════════════════════════════ */
  const counterEls = document.querySelectorAll('.hp-stat-num');
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const isDecimal = target % 1 !== 0;
        const duration = 1600;
        const step = 16;
        const steps = duration / step;
        let current = 0;
        const increment = target / steps;

        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        }, step);

        counterIO.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counterEls.forEach(el => counterIO.observe(el));


  /* ════════════════════════════
     HERO IMAGE SLIDER (if slides exist in DOM)
  ════════════════════════════ */
  const slides = document.querySelectorAll('.slide');
  const dots   = document.querySelectorAll('.dot');
  if (slides.length) {
    let current = 0;
    const go = (n) => {
      slides[current].classList.remove('active');
      if (dots[current]) dots[current].classList.remove('active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      if (dots[current]) dots[current].classList.add('active');
    };
    document.querySelector('.prev-btn')?.addEventListener('click', () => go(current - 1));
    document.querySelector('.next-btn')?.addEventListener('click', () => go(current + 1));
    dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.slide)));
    setInterval(() => go(current + 1), 5000);
  }


  /* ════════════════════════════
     MOBILE MENU TOGGLE
  ════════════════════════════ */
  const mobileBtn  = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
      mobileBtn.classList.toggle('active');
    });
    // Close on link click
    mobileMenu.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileBtn.classList.remove('active');
      });
    });
  }


  /* ════════════════════════════
     ENQUIRY FORM — map new IDs to expected fields
  ════════════════════════════ */
  // The enquiry_form.js looks for #enquiryForm. 
  // New form uses id="enquiryForm" and field ids like enq-name, etc.
  // Remap them so enquiry_form.js works (or handle inline):
  const form = document.getElementById('enquiryForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgDiv = document.getElementById('formMessage');

      const name    = (document.getElementById('enq-name')    || document.getElementById('name'))?.value.trim();
      const email   = (document.getElementById('enq-email')   || document.getElementById('email'))?.value.trim();
      const phone   = (document.getElementById('enq-phone')   || document.getElementById('phone'))?.value.trim();
      const batch   = (document.getElementById('enq-batch')   || document.getElementById('batch'))?.value;
      const message = (document.getElementById('enq-message') || document.getElementById('message'))?.value.trim();

      if (!name || !email || !phone || !message) {
        showFormMsg(msgDiv, 'Please fill in all required fields.', 'error');
        return;
      }

      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;

      try {
        const res = await fetch('/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, batch, message })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showFormMsg(msgDiv, '✓ Message sent! We will contact you shortly.', 'success');
          form.reset();
        } else {
          throw new Error(data.error || 'Something went wrong.');
        }
      } catch (err) {
        showFormMsg(msgDiv, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  function showFormMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `hp-form-msg ${type}`;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
  }

});