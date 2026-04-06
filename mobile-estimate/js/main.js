/* =========================================
   KCC글라스 HomeCC 고객용 모바일 견적서
   Main JavaScript
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {

  // ---- 스크롤 페이드인 애니메이션 ----
  initScrollAnimations();

  // ---- 숫자 카운트업 애니메이션 ----
  initCountUp();

  // ---- 플로팅 버튼 스크롤 동작 ----
  initFloatingButton();

  // ---- 헤더 스크롤 효과 ----
  initHeaderScroll();

});

/* -----------------------------------------
   스크롤 기반 fade-in 애니메이션
----------------------------------------- */
function initScrollAnimations() {
  const sections = document.querySelectorAll('section, .summary-card, .condition-item, .product-card, .material-item, .manager-card');

  sections.forEach(el => {
    el.classList.add('fade-in');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, 100 * i);
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  sections.forEach(el => observer.observe(el));
}

/* -----------------------------------------
   숫자 카운트업 애니메이션
----------------------------------------- */
function initCountUp() {
  const priceNum = document.querySelector('.price-num');

  if (!priceNum) return;

  const target = 6787854;
  const duration = 1500;
  const delay = 500;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCount(element, finalValue) {
    let start = null;
    const startValue = 0;

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = easeOutCubic(progress);
      const current = Math.floor(startValue + (finalValue - startValue) * eased);
      element.textContent = current.toLocaleString('ko-KR');

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = finalValue.toLocaleString('ko-KR');
      }
    }

    setTimeout(() => requestAnimationFrame(step), delay);
  }

  // IntersectionObserver로 히어로 진입 시 실행
  const heroSection = document.querySelector('.hero-section');
  if (!heroSection) return;

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(priceNum, target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  counterObserver.observe(heroSection);
}

/* -----------------------------------------
   플로팅 버튼 스크롤 동작
   (CTA 섹션 진입 시 플로팅 버튼 숨김)
----------------------------------------- */
function initFloatingButton() {
  const floatingBtn = document.querySelector('.floating-cta');
  const ctaSection = document.querySelector('.cta-section');

  if (!floatingBtn || !ctaSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        floatingBtn.style.opacity = '0';
        floatingBtn.style.pointerEvents = 'none';
        floatingBtn.style.transform = 'translateY(100px)';
      } else {
        floatingBtn.style.opacity = '1';
        floatingBtn.style.pointerEvents = 'auto';
        floatingBtn.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  observer.observe(ctaSection);

  floatingBtn.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
}

/* -----------------------------------------
   헤더 스크롤 효과
----------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector('.top-bar');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
      header.style.background = 'rgba(26, 43, 74, 0.98)';
    } else {
      header.style.boxShadow = 'none';
      header.style.background = 'rgba(26, 43, 74, 0.97)';
    }
  }, { passive: true });
}

/* -----------------------------------------
   견적서 공유 기능
----------------------------------------- */
window.shareQuote = async function () {
  const shareData = {
    title: 'KCC글라스 HomeCC 주방가구 견적 제안서',
    text: '모던 그레이 주방 인테리어 견적을 확인해보세요.\n최종 견적가: 6,787,854원',
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        fallbackShare();
      }
    }
  } else {
    fallbackShare();
  }
};

function fallbackShare() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('링크가 복사되었습니다! 📋');
    });
  } else {
    showToast('브라우저에서 주소를 복사해 공유해주세요.');
  }
}

/* -----------------------------------------
   토스트 메시지
----------------------------------------- */
function showToast(message) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(26, 43, 74, 0.95);
    color: #fff;
    padding: 12px 24px;
    border-radius: 30px;
    z-index: 10000;
    opacity: 0;
    transition: all 0.3s ease;
    font-size: 14px;
    font-weight: 500;
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/* -----------------------------------------
   제품 카드 터치 인터랙션
----------------------------------------- */
document.querySelectorAll('.product-card, .cta-btn, .summary-card').forEach(el => {
  el.addEventListener('touchstart', function () {
    this.style.transform = 'scale(0.97)';
  }, { passive: true });

  el.addEventListener('touchend', function () {
    this.style.transform = 'scale(1)';
  }, { passive: true });
});
