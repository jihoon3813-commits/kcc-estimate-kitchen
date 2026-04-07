import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// 운영 서버 주소 강제 고정 (환경 변수 누락 방지)
const CONVEX_URL = "https://upbeat-herring-81.convex.cloud";
const client = new ConvexClient(CONVEX_URL);

console.log("[Login] Connecting to Convex:", CONVEX_URL);

// 1. 휴대폰 번호 자동 하이픈 로직 (강화된 버전)
const phoneInput = document.getElementById('cust-phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
        let formatted = '';
        
        if (val.length < 4) {
            formatted = val;
        } else if (val.length < 8) {
            formatted = val.slice(0, 3) + '-' + val.slice(3);
        } else {
            formatted = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
        }
        e.target.value = formatted;
    });
}

// 2. 차수 선택 로직
const roundBtns = document.querySelectorAll('.round-btn');
let activeRound = 1;
if (roundBtns.length > 0) {
    roundBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roundBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeRound = parseInt(btn.getAttribute('data-round'));
            console.log("[Login] Selected Round:", activeRound);
        });
    });
}

// 3. 로그인 처리
window.handleLogin = async function() {
    console.log("[Login] Attempting lookup...");
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const errorEl = document.getElementById('error-msg');
    const submitBtn = document.querySelector('.submit-btn');

    if(!nameInput || !phoneInput) {
        alert("입력창을 찾을 수 없습니다.");
        return;
    }

    const name = nameInput.value.trim();
    const phone = phoneInput.value.replace(/[^0-9]/g, '');

    if (!name || phone.length < 10) {
        alert('성함과 정확한 연락처를 입력해주세요.');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "조회 중...";
        if(errorEl) errorEl.style.display = 'none';

        const result = await client.query(api.functions.searchEstimate, {
            customerName: name,
            contact: phone,
            round: activeRound
        });

        if (result) {
            console.log("[Login] Match found! Redirecting to:", result._id);
            // 현재 경로에서 login 부분을 제거하고 index.html로 이동 (폴더 구조 대응)
            const targetPath = window.location.pathname.replace(/login(\.html|\/)?$/, "") + "index.html";
            window.location.href = `${targetPath}?id=${result._id}`;
        } else {
            console.warn("[Login] No match found for:", name, phone, activeRound);
            if(errorEl) errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerText = "견적서 조회하기";
        }
    } catch (err) {
        console.error("[Login] Query Error:", err);
        alert("조회 중 오류가 발생했습니다: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "견적서 조회하기";
    }
};
