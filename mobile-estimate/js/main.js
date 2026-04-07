import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

/* =========================================
   KCC글라스 HomeCC | 고객용 견적서 JS (PREMIUM VERSION)
   ========================================= */

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const client = new ConvexClient(CONVEX_URL);

let quoteData = null;
let globalSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const estimateId = urlParams.get('id');

    if (!estimateId) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const [data, settings] = await Promise.all([
            client.query(api.functions.getEstimate, { id: estimateId }),
            client.query(api.functions.getGlobalSettings)
        ]);

        if (!data) {
            alert("해당 견적서를 찾을 수 없습니다.");
            return;
        }

        quoteData = data;
        globalSettings = settings;
        renderAll();
    } catch (err) {
        console.error("Fetch Error:", err);
    }
});

let galleryItems = []; // 라이트박스 연동 데이터

function renderAll() {
    if (!quoteData) return;
    
    // 갤러리용 데이터 미리 수집
    prepareGalleryData();
    
    // 1. 헤더 및 히어로 정보
    const titleEl = document.getElementById('display-title');
    const descEl = document.getElementById('display-subtitle');
    const validityEl = document.getElementById('display-validity');
    const qNumFooter = document.getElementById('footer-q-number');
    const qValFooter = document.getElementById('footer-q-validity');

    if(titleEl) titleEl.innerHTML = (quoteData.designConcept.title || "KCC 프리미엄 주방").replace(/\n/g, '<br/>');
    if(descEl) descEl.innerText = quoteData.designConcept.description || "상담을 통해 완성된 맞춤형 주방 견적입니다.";
    if(validityEl) validityEl.innerText = `견적 유효기간: 발행일로부터 1개월 (${quoteData.estimateDate} 발행)`;
    if(qNumFooter) qNumFooter.innerText = `견적번호: ${quoteData.quoteNumber || 'EH-000000'}`;
    if(qValFooter) qValFooter.innerText = `견적 유효기간: ${quoteData.estimateDate} ~ `;

    // 2. 최종 가격 산출 (개별 항목 마진 연동 - 엑셀 항목만 산출)
    let customerSupplyNet = 0;
    quoteData.quoteDetails.forEach(item => {
        if (!item.isExcel) return;
        const itemRaw = (item.price || 0) * (item.quantity || 1);
        const margin = item.margin !== undefined ? item.margin : 100;
        customerSupplyNet += Math.floor(itemRaw * (margin / 100));
    });

    const vat = Math.floor(customerSupplyNet * 0.1);
    const finalTotal = Math.floor((customerSupplyNet + vat) / 10) * 10;

    // 결제 설정 및 할인 계산 (히어로 업데이트용)
    const ps = quoteData.paymentSettings || { lumpDiscountRate: 0, lumpDiscountAmt: 0, subInterestRate: 0 };
    const rateDiscAmt = Math.floor(finalTotal * (ps.lumpDiscountRate / 100));
    const totalDiscountAmt = rateDiscAmt + ps.lumpDiscountAmt;
    const finalLumpSum = finalTotal - totalDiscountAmt;

    // 히어로 금액 업데이트
    const elBasePrice = document.getElementById('hero-base-price');
    const elDiscountPrice = document.getElementById('hero-discount-price');
    const elFinalPriceNum = document.getElementById('hero-final-price');

    if(elBasePrice) elBasePrice.innerText = finalTotal.toLocaleString() + '원';
    if(elDiscountPrice) elDiscountPrice.innerText = `-${totalDiscountAmt.toLocaleString()}원`;
    if(elFinalPriceNum) elFinalPriceNum.innerText = finalLumpSum.toLocaleString();

    // 3. 각 섹션 렌더링
    renderSummary();
    renderConditions();
    renderConcept();
    renderQuoteCards(); 
    renderPriceBreakdown(customerSupplyNet, vat, finalTotal); 
    renderManager();
    renderNotes();
}

function renderSummary() {
    const grid = document.getElementById('summary-grid');
    if(!grid) return;
    const items = [
        { icon: "fa-calendar-alt", label: "견적 신청일", value: quoteData.estimateDate },
        { icon: "fa-user-tie", label: "고객명", value: quoteData.customerName + "님" },
        { icon: "fa-hashtag", label: "견적 차수", value: quoteData.round + "차 견적" },
        { icon: "fa-map-marker-alt", label: "시공 주소", value: quoteData.address || "서울 금천구 은행나무로 12길 37, 3F" }
    ];
    grid.innerHTML = items.map(i => `
        <div class="summary-card">
            <div class="summary-icon"><i class="fas ${i.icon}"></i></div>
            <div class="summary-title">${i.label}</div>
            <div class="summary-value">${i.value}</div>
        </div>
    `).join('');
}

function renderConditions() {
    const list = document.getElementById('condition-list');
    if(!list) return;
    const conds = quoteData.conditions;
    const items = [
        { label: "거주여부", value: conds.isResident ? "거주 중" : "공실", icon: "fa-house-user" },
        { label: "엘리베이터", value: conds.hasElevator ? "사용 가능" : "사용 불가", icon: "fa-elevator" },
        { label: "철거유무", value: conds.inclDemolition ? "철거 포함" : "철거 제외", icon: "fa-truck-loading" }
    ];
    list.innerHTML = items.map(i => `
        <div class="condition-item">
            <div class="condition-icon"><i class="fas ${i.icon}"></i></div>
            <div class="condition-text">
                <strong>${i.value}</strong>
                <span>${i.label} 상담 완료</span>
            </div>
        </div>
    `).join('');
}

function renderConcept() {
    const container = document.getElementById('concept-container');
    if(!container) return;
    
    const dc = quoteData.designConcept;
    const images = dc.images || [];
    
    container.innerHTML = `
        <div class="concept-card" style="background:#fff; border-radius:16px; overflow:hidden;">
            ${images.length > 0 ? `
                <div class="concept-main-img" id="concept-main-trigger" style="height:240px; background-image:url('${images[0].url}'); background-size:cover; background-position:center; cursor:pointer;"></div>
                ${images.length > 1 ? `
                    <div class="concept-thumb-list" style="display:flex; gap:8px; padding:10px; overflow-x:auto;">
                        ${images.slice(1).map((img, i) => `<div class="concept-thumb-trigger" data-idx="${i+1}" style="width:60px; height:40px; flex-shrink:0; border-radius:4px; background-image:url('${img.url}'); background-size:cover; cursor:pointer;"></div>`).join('')}
                    </div>
                ` : ''}
            ` : '<div style="height:100px; display:flex; align-items:center; justify-content:center; background:#f8f9fa; color:#ccc;"><i class="fas fa-image fa-2x"></i></div>'}
            <div style="padding:20px;">
                <h3 style="font-size:18px; font-weight:800; margin-bottom:10px; color:var(--navy);">${dc.title || '디자인 컨셉'}</h3>
                <p style="font-size:14px; color:#666; line-height:1.6; word-break:keep-all;">${(dc.description || "").replace(/\n/g, '<br/>')}</p>
            </div>
        </div>
    `;

    // 이벤트 바인딩
    const mainTrigger = document.getElementById('concept-main-trigger');
    if(mainTrigger) mainTrigger.onclick = () => window.openLightbox(0);
    
    document.querySelectorAll('.concept-thumb-trigger').forEach(el => {
        el.onclick = () => window.openLightbox(parseInt(el.dataset.idx));
    });
}

function renderQuoteCards() {
    const container = document.getElementById('quote-card-container');
    if (!container) return;
    // 모든 항목 표시 (사용자의 수동 추가 항목 제외)
    const cardItems = quoteData.quoteDetails.filter(item => 
         !item.mainCategory.includes('시공') && 
         !item.mainCategory.includes('부대') &&
         item.productName !== '자재비' // '자재비'라는 이름의 원가 항목 제외
    );
    
    container.innerHTML = cardItems.map((item, idx) => {
        // 개별 마진율 연동 (100% 기준)
        const margin = item.margin !== undefined ? item.margin : 100;
        const itemPriceNet = Math.floor((item.price || 0) * (item.quantity || 1) * (margin / 100));
        const catText = item.category && item.category !== '기타' ? ` · ${item.category}` : '';
        
        return `
        <div class="product-card" id="pc-${idx}" style="cursor:pointer;">
            <div class="product-img" style="background-image: url('${item.imageUrl || 'https://via.placeholder.com/400x300?text=KCC+HomeCC'}')">
            </div>
            <div class="product-info" style="display:flex; flex-direction:column; gap:6px;">
                <div class="cat" style="margin-bottom:0;">${item.mainCategory}${catText}</div>
                <div class="name" style="font-size:16px; font-weight:800; line-height:1.2; margin:0;">${item.productName}</div>
                <div class="specs" style="display:flex; flex-direction:column; gap:2px; font-size:13px; color:#666;">
                    ${item.option1 ? `<div>${item.option1}</div>` : ''}
                    ${item.option2 ? `<div>${item.option2}</div>` : ''}
                    <div>규격: ${item.size || '-'}</div>
                    <div>수량: ${item.quantity || 1} ${item.unit || 'EA'}</div>
                </div>
                <div class="price" style="font-size:17px; font-weight:800; color:var(--navy); margin-top:4px;">
                    ${itemPriceNet > 0 ? itemPriceNet.toLocaleString() + '원' : '-'}
                </div>
            </div>
        </div>
    `; }).join('');

    // 섹션별 통합 안내 문구
    const noticeEl = document.getElementById('section-vat-notice');
    if(noticeEl) noticeEl.innerText = '단위:원(VAT별도)';

    // 이벤트 바인딩
    const designCount = (quoteData.designConcept.images || []).length;
    cardItems.forEach((item, idx) => {
        const el = document.getElementById(`pc-${idx}`);
        if(el) el.onclick = () => window.openLightbox(designCount + idx);
    });
}

function prepareGalleryData() {
    galleryItems = [];
    // 1. 디자인 이미지
    const dc = quoteData.designConcept;
    (dc.images || []).forEach(img => {
        galleryItems.push({
            url: img.url,
            title: dc.title || "디자인 제안",
            desc: dc.description || "",
            price: ""
        });
    });

    // 2. 포함 기기 이미지 (가격 계산 포함)
    const margin = (quoteData.globalMargin || 100) / 100;
    const items = quoteData.quoteDetails.filter(item => 
         !item.mainCategory.includes('시공') && 
         !item.mainCategory.includes('부대') &&
         item.productName !== '자재비'
    );
    
    items.forEach(item => {
        const catText = (item.category && item.category !== '기타') ? ` · ${item.category}` : '';
        galleryItems.push({
            url: item.imageUrl,
            title: item.productName,
            desc: `${item.mainCategory}${catText} / ${item.size || '-'}`,
            price: "" // 확대 화면에서 금액 정보 제외
        });
    });

    // 라이트박스 스크롤러 렌더링
    const scroller = document.getElementById('lightbox-scroller');
    if(scroller) {
        scroller.innerHTML = galleryItems.map(gi => `
            <div class="lightbox-slide">
                <div class="slide-content">
                    <img src="${gi.url || 'https://via.placeholder.com/800x600?text=KCC+HomeCC'}" />
                    <div class="slide-info">
                        <h3>${gi.title}</h3>
                        <p>${gi.desc}</p>
                        ${gi.price ? `<div class="slide-price">${gi.price}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// 라이트박스 제어 (Index 기반)
window.openLightbox = function(index) {
    const lightbox = document.getElementById('image-lightbox');
    const scroller = document.getElementById('lightbox-scroller');
    if(!lightbox || !scroller) return;

    lightbox.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // 해당 인덱스로 스크롤 이동
    const slideWidth = window.innerWidth;
    scroller.scrollLeft = index * slideWidth;
}

window.closeLightbox = function() {
    const lightbox = document.getElementById('image-lightbox');
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function renderPriceBreakdown(supplyNet, vatNet, finalTotal) {
    const matGroup = document.getElementById('group-material');
    const conGroup = document.getElementById('group-construction');
    
    let matSumNet = 0;
    const conItems = [];

    quoteData.quoteDetails.forEach(item => {
        const itemRaw = (item.price || 0) * (item.quantity || 1);
        const margin = item.margin !== undefined ? item.margin : 100;
        const finalPrice = Math.floor(itemRaw * (margin / 100));

        if (item.isExcel) {
            if (item.mainCategory.includes('시공') || item.mainCategory.includes('부대') || item.mainCategory.includes('배송')) {
                conItems.push({ name: item.productName, price: finalPrice });
            } else {
                matSumNet += finalPrice;
            }
        }
    });

    if (matGroup) matGroup.innerHTML = `<div class="cost-row"><div class="name">기본 자재 및 기기 합계</div><div class="val">${Math.floor(matSumNet).toLocaleString()}원</div></div>`;
    
    if (conGroup) conGroup.innerHTML = conItems.map(item => `
        <div class="cost-row">
            <div class="name">${item.name}</div>
            <div class="val">${Math.floor(item.price).toLocaleString()}원</div>
        </div>
    `).join('') || '<div class="cost-row"><div class="name">추가 비용 없음</div><div class="val">-</div></div>';

    const elSupplyNet = document.getElementById('display-supply-net');
    const elVatNet = document.getElementById('display-vat-net');
    const elFinalTotal = document.getElementById('display-final-total');

    if (elSupplyNet) elSupplyNet.innerText = supplyNet.toLocaleString() + "원";
    if (elVatNet) elVatNet.innerText = vatNet.toLocaleString() + "원";
    if (elFinalTotal) elFinalTotal.innerHTML = finalTotal.toLocaleString() + "<small>원</small>";

    // '단위:원(VAT별도)' 안내 추가
    const vatNotice = document.getElementById('label-net-total');
    if (vatNotice) vatNotice.innerHTML = `기본 총 견적가 합계 <span style="font-size:9px; font-weight:400; color:#999; margin-left:4px;">단위:원(VAT별도)</span>`;

    renderPaymentOptions(finalTotal);
}

function renderPaymentOptions(finalTotal) {
    const container = document.getElementById('payment-options-container');
    if (!container) return;

    const ps = quoteData.paymentSettings || { lumpDiscountRate: 0, lumpDiscountAmt: 0, subInterestRate: 0 };
    
    const rateDiscAmt = Math.floor(finalTotal * (ps.lumpDiscountRate / 100));
    const finalLumpSum = finalTotal - rateDiscAmt - ps.lumpDiscountAmt;

    const getSubMonthly = (months) => {
        const interest = Math.floor(finalTotal * (ps.subInterestRate / 100) * (months / 12));
        const totalRepay = finalTotal + interest;
        return Math.floor(totalRepay / months);
    };

    const getRentalData = (monthlyFixed, prepayBase) => {
        const prepayment = finalLumpSum - prepayBase;
        return { monthly: monthlyFixed, prepayment, isValid: prepayment >= 0 };
    };
    const rentalOptions = [
        { data: getRentalData(67000, 3000000) },
        { data: getRentalData(111000, 5000000) },
        { data: getRentalData(155000, 7000000) },
        { data: getRentalData(199000, 9000000) }
    ];

    container.innerHTML = `
        <div style="margin-top:30px;">
            <div class="section-label" style="text-align:center; display:block; padding-bottom:10px; font-size:16px;">맞춤형 결제 혜택 안내</div>
            
            <!-- 1. 일시불 -->
            <div class="emphasized-card card-lump-sum" style="background:#fff; border-radius:18px; padding:24px 20px; margin-bottom:20px; position:relative;">
                <div style="font-size:15px; font-weight:800; color:#d97706; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-money-bill-wave"></i> 일시불 결제 혜택가
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f8fafc; padding-bottom:12px; margin-bottom:12px;">
                    <span style="font-size:13px; color:#64748b;">적용된 특별 할인</span>
                    <span style="font-size:15px; font-weight:700; color:#ef4444;">-${(rateDiscAmt + ps.lumpDiscountAmt).toLocaleString()}원</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <span style="font-size:14px; font-weight:800; color:#1e293b;">최종 일시불가</span>
                    <span style="font-size:30px; font-weight:900; color:#d97706; letter-spacing:-1px;">${finalLumpSum.toLocaleString()}<small style="font-size:16px; margin-left:2px;">원</small></span>
                </div>
            </div>

            <!-- 2. 구독 -->
            <div class="emphasized-card card-subscription" style="background:#fff; border-radius:18px; padding:24px 20px; margin-bottom:20px; position:relative;">
                <div style="font-size:15px; font-weight:800; color:#0284c7; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-calendar-check"></i> 구독 할부 서비스
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    ${[24, 36, 48, 60].map(m => `
                    <div style="background:#f0f9ff; padding:15px 5px; border-radius:12px; text-align:center; border:1px solid rgba(2, 132, 199, 0.1);">
                        <div style="font-size:11px; color:#64748b; margin-bottom:4px; font-weight:600;">${m}개월 구독 시</div>
                        <div style="font-size:16px; font-weight:900; color:#0284c7;">월 ${getSubMonthly(m).toLocaleString()}원</div>
                    </div>
                    `).join('')}
                </div>
                <p style="margin-top:12px; font-size:11px; color:#94a3b8; text-align:center;">* 할부 이자가 적용된 금액입니다.</p>
            </div>

            <!-- 3. 렌탈 (60M) -->
            <div class="emphasized-card card-rental" style="background:#fff; border-radius:18px; padding:24px 20px; position:relative; margin-bottom:40px;">
                <div style="font-size:15px; font-weight:800; color:#be185d; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-sync-alt"></i> 프리미엄 렌탈 (60개월)
                </div>
                <p style="font-size:12px; color:#be185d; margin-bottom:15px; text-align:center; background:#fdf2f8; padding:10px; border-radius:10px; font-weight:600;">렌탈료는 고정하고, 초기 비용을 맞춤 설계하세요.</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    ${rentalOptions.map(opt => opt.data.isValid ? `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:12px 10px; border-radius:14px; border:1px solid #fce7f3; box-shadow:0 2px 8px rgba(190, 24, 93, 0.05);">
                            <div style="font-size:12px; color:#64748b;">선납금: <strong style="color:#0f172a; font-size:13px;">${opt.data.prepayment.toLocaleString()}원</strong></div>
                            <div style="font-size:18px; font-weight:900; color:#be185d;">월 ${opt.data.monthly.toLocaleString()}원</div>
                        </div>
                    ` : `
                        <div style="display:flex; justify-content:center; align-items:center; background:#f8fafc; padding:15px; border-radius:12px; opacity:0.6; border:1px dashed #cbd5e1;">
                            <div style="font-size:13px; color:#94a3b8; font-weight:700;">해당없음 (선납금 기준 미달)</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderManager(manager) {
    const managerContainer = document.getElementById('manager-container');
    if (!managerContainer) return;

    // 데이터 소스 결정 (인자가 있으면 사용, 없으면 글로벌 설정 우선, 그다음 견적서 데이터)
    const m = manager || (globalSettings && globalSettings.manager ? globalSettings.manager : (quoteData.manager || {}));
    if (!m || !m.name) return;

    managerContainer.innerHTML = `
        <div class="manager-card">
            <div class="manager-img" 
                 style="background-image: url('${m.imageUrl || 'https://via.placeholder.com/150'}'); cursor: pointer;"
                 onclick="openImageModal('${m.imageUrl || 'https://via.placeholder.com/150'}')"></div>
            <div class="manager-info">
                <p>${m.dept || 'KCC홈씨씨 티유디지털'}</p>
                <h6>${m.name} ${m.role || ''}</h6>
            </div>
        </div>
    `;
}

// 이미지 모달 열기
window.openImageModal = function(url) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const downloadBtn = document.getElementById('download-btn');
    
    if (modal && modalImg && downloadBtn) {
        modalImg.src = url;
        downloadBtn.href = url;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    }
};

// 이미지 모달 닫기
window.closeImageModal = function() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // 스크롤 복구
    }
};

function renderNotes() {
    const list = document.getElementById('notice-list');
    if (!list) return;
    
    // 글로벌 설정이 있으면 우선 반영, 없으면 견적서상의 복사본 사용
    const notes = (globalSettings && globalSettings.notes && globalSettings.notes.length > 0) ? globalSettings.notes : (quoteData.notes || []);
    
    list.innerHTML = notes.length > 0 ? notes.map(n => `
        <div class="note-item" style="display:flex; gap:8px; margin-bottom:12px;">
            <i class="fas fa-check-circle" style="color:var(--point); font-size:12px; margin-top:4px;"></i>
            <span>${n}</span>
        </div>
    `).join('') : '<p>설정된 안내 사항이 없습니다.</p>';
}

window.changeQuoteView = function(mode) {
    const container = document.getElementById('quote-card-container');
    const scrollBtn = document.getElementById('view-scroll');
    const fullBtn = document.getElementById('view-full');
    if(mode === 'scroll') {
        container.style.flexWrap = 'nowrap';
        container.style.overflowX = 'auto';
        scrollBtn.style.background = '#fff';
        fullBtn.style.background = 'none';
    } else {
        container.style.flexWrap = 'wrap';
        container.style.overflowX = 'visible';
        scrollBtn.style.background = 'none';
        fullBtn.style.background = '#fff';
    }
}
