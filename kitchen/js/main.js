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
        }, 60 * i);
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
  const totalAmount = document.querySelector('.total-amount');

  if (!priceNum) return;

  const target = 6787854;
  const duration = 1400;
  const delay = 300;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCount(element, finalValue) {
    let start = null;
    const startValue = Math.floor(finalValue * 0.6);

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
        floatingBtn.style.transform = 'translateY(80px)';
      } else {
        floatingBtn.style.opacity = '1';
        floatingBtn.style.pointerEvents = 'auto';
        floatingBtn.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.3 });

  observer.observe(ctaSection);

  // 부드러운 트랜지션 추가
  floatingBtn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
}

/* -----------------------------------------
   헤더 스크롤 투명도 효과
----------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector('.top-bar');
  if (!header) return;

  let lastScrollY = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    if (scrollY > 60) {
      header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.3)';
    } else {
      header.style.boxShadow = 'none';
    }

    lastScrollY = scrollY;
  }, { passive: true });
}

/* -----------------------------------------
   견적서 공유 기능
----------------------------------------- */
window.shareQuote = async function () {
  const shareData = {
    title: 'KCC글라스 HomeCC 주방가구 견적 제안서',
    text: '모던 그레이 주방 인테리어 견적을 확인해보세요.\n총 견적가: 6,787,854원 (부가세 포함)\n시공예정: 4월 중순',
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
  // 클립보드 복사 폴백
  const url = window.location.href;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('링크가 클립보드에 복사되었습니다! 📋');
    }).catch(() => {
      showToast('공유: ' + url);
    });
  } else {
    // 구형 브라우저 폴백
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('링크가 복사되었습니다! 📋');
    } catch (e) {
      showToast('주소창 URL을 복사해서 공유해주세요.');
    }
    document.body.removeChild(textArea);
  }
}

/* -----------------------------------------
   토스트 메시지
----------------------------------------- */
function showToast(message) {
  // 기존 토스트 제거
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: rgba(26, 43, 74, 0.95);
    color: #fff;
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 13px;
    font-weight: 500;
    padding: 12px 20px;
    border-radius: 24px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    z-index: 9999;
    white-space: nowrap;
    opacity: 0;
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: none;
    max-width: 90vw;
    text-align: center;
  `;

  document.body.appendChild(toast);

  // 트리거 레이아웃 강제
  void toast.offsetHeight;

  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

/* -----------------------------------------
   제품 카드 터치 리플 효과
----------------------------------------- */
document.querySelectorAll('.product-card, .cta-btn, .summary-card').forEach(el => {
  el.addEventListener('touchstart', function (e) {
    this.style.transition = 'transform 0.1s ease';
    this.style.transform = 'scale(0.97)';
  }, { passive: true });

  el.addEventListener('touchend', function (e) {
    this.style.transition = 'transform 0.2s ease';
    this.style.transform = 'scale(1)';
  }, { passive: true });
});
