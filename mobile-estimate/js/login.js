import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const client = new ConvexClient(CONVEX_URL);

// 1. 휴대폰 번호 자동 하이픈 로직
const phoneInput = document.getElementById('cust-phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length > 3 && val.length <= 7) {
            val = val.slice(0, 3) + '-' + val.slice(3);
        } else if (val.length > 7) {
            val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7);
        }
        e.target.value = val;
    });
}

// 2. 차수 선택 로직
let activeRound = 1;
const roundBtns = document.querySelectorAll('.round-btn');
roundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        roundBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRound = parseInt(btn.dataset.round);
    });
});

// 3. 로그인 처리
window.handleLogin = async function() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const error = document.getElementById('error-msg');
    const submitBtn = document.querySelector('.submit-btn');

    if (!name || phone.length < 12) {
        alert('이름과 정확한 연락처를 입력해주세요.');
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "조회 중...";
        error.style.display = 'none';

        console.log(`Searching for: ${name}, ${phone}, ${activeRound}차`);
        
        const result = await client.query(api.functions.searchEstimate, {
            customerName: name,
            contact: phone,
            round: activeRound
        });

        if (result) {
            // 성공 시 해당 견적서 페이지로 이동 (ID 파라미터 사용)
            location.href = `index.html?id=${result._id}`;
        } else {
            error.style.display = 'block';
        }
    } catch (err) {
        console.error("Login Error:", err);
        alert("시스템 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "견적서 조회하기";
    }
}
