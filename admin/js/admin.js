import { ConvexClient } from "convex/browser";
import { api } from "/convex/_generated/api.js";

/* =========================================
   KCC글라스 HomeCC | 관리자 대시보드 JS (ULTRA STABLE)
   ========================================= */

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const client = new ConvexClient(CONVEX_URL);

// ---- 전역 상태 및 데이터 ----
let currentEstimate = {
  customerName: "", contact: "", round: 1, quoteNumber: "", address: "", siteType: "APT", estimateDate: "",
  paymentSettings: { lumpDiscountRate: 0, lumpDiscountAmt: 0, subInterestRate: 0 },
  conditions: { isResident: false, hasElevator: true, inclDemolition: true, needLadderTruck: false },
  designConcept: { images: [], title: "", description: "" },
  quoteDetails: [], // 엑셀 추출 항목(isExcel:true) 및 사용자 수동 항목 모두 포함
  initialTotal: 0   // 엑셀에서 추출한 최종 고정 공급가
};

let globalSettings = {
  notes: ["본 견적은 상담 기준 금액입니다."],
  manager: { name: "관리자", role: "지원", dept: "KCC", imageUrl: "" }
};

let savedEstimates = [];

// ---- 초기화 및 이벤트 바인딩 ----
document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    initForm();
});

function initEvents() {
    // 1. 로그인 처리
    const loginBtn = document.getElementById('login-submit-btn');
    const passwordInput = document.getElementById('admin-password');
    
    const tryLogin = async () => {
        const pw = passwordInput.value.trim();
        if (pw === 'wnqkd@@') {
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('admin-content').style.display = 'block';
            await loadGlobalSettings();
            fetchEstimates();
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    };

    loginBtn?.addEventListener('click', tryLogin);
    passwordInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') tryLogin(); });
    
    // 이미지 압축 유틸리티
    window.compressImage = (file, maxWidth = 1200, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 용량 최적화를 위해 JPEG로 변환 (용량 1/10 수준으로 감소)
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
        });
    };

    // 2. 탭 전환 처리
    document.querySelectorAll('.tab-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            if(tabId) showTab(tabId);
        });
    });

    // 3. 엑셀 업로드 처리
    const excelBtn = document.getElementById('excel-upload-btn');
    const excelInput = document.getElementById('excel-upload-raw');
    
    excelBtn?.addEventListener('click', () => excelInput.click());
    excelInput?.addEventListener('change', (e) => handleExcelFile(e.target));

    // 4. 전역 버튼 연동 (ID가 수시로 바뀌는 행 버튼 제외)
    document.getElementById('save-all-btn')?.addEventListener('click', saveEstimate);
    document.getElementById('save-settings-btn')?.addEventListener('click', saveGlobalSettings);
    document.getElementById('add-design-img-btn')?.addEventListener('click', addDesignImage);
    document.getElementById('add-quote-row-btn')?.addEventListener('click', addQuoteRow);
    document.getElementById('add-note-btn')?.addEventListener('click', addSettingNote);
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
}

/* -----------------------------------------
   탭 관리
----------------------------------------- */
function showTab(tabId) {
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    const activeTab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
    if(activeTab) activeTab.classList.add('active');
    
    const activeContent = document.getElementById(`tab-${tabId}`);
    if(activeContent) activeContent.classList.add('active');
    
    if (tabId === 'settings') renderSettings();
    if (tabId === 'list') fetchEstimates();
}

/* -----------------------------------------
   서버 통신 로직
----------------------------------------- */
async function loadGlobalSettings() {
    try {
        const settings = await client.query(api.functions.getGlobalSettings);
        if (settings) {
            globalSettings = settings;
            // 만약 현재 설정 탭에 있다면 화면 갱신
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab && activeTab.getAttribute('data-tab') === 'settings') {
                renderSettings();
            }
        }
    } catch (err) { console.error("Setting Load Failed:", err); }
}

async function fetchEstimates() {
    const tbody = document.getElementById('list-tbody');
    try {
        const list = await client.query(api.functions.listEstimates);
        savedEstimates = list;
        tbody.innerHTML = list.length > 0 ? list.map(item => `
            <tr>
                <td>${item.quoteNumber}</td>
                <td style="font-weight:800; color:#2563eb; cursor:pointer;" onclick="window.viewEstimateDetail('${item._id}')">${item.customerName}</td>
                <td>${item.contact}</td>
                <td>${item.round}차</td>
                <td>${item.estimateDate}</td>
                <td><button class="add-btn" style="padding:4px 10px;" onclick="window.viewEstimateDetail('${item._id}')">상세</button></td>
            </tr>
        `).join('') : '<tr><td colspan="6" style="text-align:center; padding:100px;">조회된 데이터가 없습니다.</td></tr>';
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">서버 연결 불가</td></tr>';
    }
}

// 상세 보기는 동적 할당된 HTML에서 호출하므로 window에 임시 노출
window.viewEstimateDetail = function(id) {
    const item = savedEstimates.find(e => e._id === id);
    if(!item) return;
    
    const link = `${window.location.origin}/mobile-estimate/index.html?id=${item._id}`;
    
    // 팝업 내부 정보 렌더링
    document.getElementById('detail-info').innerHTML = `
        <div class="form-item"><strong>고객명</strong><div>${item.customerName}</div></div>
        <div class="form-item"><strong>연락처</strong><div>${item.contact}</div></div>
        <div class="form-item"><strong>견적번호</strong><div>${item.quoteNumber}</div></div>
        <div class="form-item"><strong>현장주소</strong><div style="font-size:12px;">${item.address}</div></div>
        <div class="form-item"><strong>견적차수</strong><div>${item.round}차</div></div>
        <div class="form-item"><strong>견적일자</strong><div>${item.estimateDate}</div></div>
    `;

    // 하단 액션 버튼 영역 교체
    const actionArea = document.getElementById('modal-action-area');
    if(actionArea) {
        actionArea.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%;">
                <button class="add-btn" style="background:#1a2b4a; color:#fff;" onclick="window.open('${link}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> 고객 견적서 열기
                </button>
                <button class="add-btn" style="background:var(--admin-point); color:#fff;" onclick="window.loadForEdit('${item._id}')">
                    <i class="fas fa-edit"></i> 이 견적 수정하기
                </button>
            </div>
            <div style="margin-top:15px; padding:10px; background:#f8fafc; border-radius:8px; font-size:11px; color:#64748b; border:1px solid #e2e8f0;">
                <i class="fas fa-link"></i> 공유 링크: <span style="word-break:break-all;">${link}</span>
                <button onclick="window.copyLink('${link}')" style="margin-left:5px; border:none; background:none; color:#2563eb; cursor:pointer; text-decoration:underline;">복사</button>
            </div>
        `;
    }

    document.getElementById('detail-modal').style.display = 'flex';
};

// 수정 모드로 로드
window.loadForEdit = function(id) {
    const item = savedEstimates.find(e => e._id === id);
    if(!item) return;

    // 데이터 로드
    currentEstimate = { ...item };
    
    // 폼 필드 업데이트
    document.getElementById('q-customer').value = item.customerName;
    document.getElementById('q-contact').value = item.contact;
    document.getElementById('q-round').value = item.round;
    document.getElementById('q-number').value = item.quoteNumber;
    document.getElementById('q-address').value = item.address;
    document.getElementById('q-type').value = item.siteType || "";
    document.getElementById('q-date').value = item.estimateDate;

    // 결제 방식 데이터 로드
    const ps = item.paymentSettings || { lumpDiscountRate: 0, lumpDiscountAmt: 0, subInterestRate: 0 };
    document.getElementById('pay-lump-discount-rate').value = ps.lumpDiscountRate;
    document.getElementById('pay-lump-discount-amt').value = ps.lumpDiscountAmt.toLocaleString();
    document.getElementById('pay-sub-interest-rate').value = ps.subInterestRate;
    
    // 조건값 체크박스
    if(item.conditions) {
        document.getElementById('c-resident').checked = !!item.conditions.isResident;
        document.getElementById('c-elevator').checked = !!item.conditions.hasElevator;
        document.getElementById('c-demolish').checked = !!item.conditions.inclDemolition;
        document.getElementById('c-ladder').checked = !!item.conditions.needLadderTruck;
    }

    // 디자인 컨셉
    if(item.designConcept) {
        document.getElementById('d-title').value = item.designConcept.title || "";
        document.getElementById('d-desc').value = item.designConcept.description || "";
    }

    renderQuoteTable();
    renderDesignImages();
    window.renderPricePreview();

    closeModal();
    showTab('create');
    showToast(`${item.customerName} 고객님의 견적 수정 모드입니다. ✍️`);
};

window.copyLink = (link) => {
    navigator.clipboard.writeText(link);
    showToast("링크가 복사되었습니다! 📋");
};

async function saveEstimate() {
    const data = {
        customerName: document.getElementById('q-customer').value,
        contact: document.getElementById('q-contact').value,
        round: Number(document.getElementById('q-round').value),
        quoteNumber: document.getElementById('q-number').value,
        address: document.getElementById('q-address').value,
        siteType: document.getElementById('q-type').value,
        estimateDate: document.getElementById('q-date').value,
        paymentSettings: {
            lumpDiscountRate: Number(document.getElementById('pay-lump-discount-rate').value) || 0,
            lumpDiscountAmt: Number(document.getElementById('pay-lump-discount-amt').value.replace(/,/g, "")) || 0,
            subInterestRate: Number(document.getElementById('pay-sub-interest-rate').value) || 0
        },
        conditions: {
            isResident: document.getElementById('c-resident').checked,
            hasElevator: document.getElementById('c-elevator').checked,
            inclDemolition: document.getElementById('c-demolish').checked,
            needLadderTruck: document.getElementById('c-ladder').checked
        },
        designConcept: {
            images: currentEstimate.designConcept.images,
            title: document.getElementById('d-title').value,
            description: document.getElementById('d-desc').value
        },
        quoteDetails: currentEstimate.quoteDetails,
        initialTotal: currentEstimate.initialTotal || 0,
        notes: globalSettings.notes,
        manager: globalSettings.manager
    };
    if(!data.customerName || !data.contact) return alert("고객 정보를 입력해 주세요.");
    
    // 수정 모드인 경우 ID 추가
    if (currentEstimate._id) {
        data.id = currentEstimate._id;
    }

    try {
        showToast("서버에 저장 중...");
        await client.mutation(api.functions.saveEstimate, data);
        showToast("서버 저장 완료! ✨");
        
        // 목록 갱신 및 탭 이동
        await fetchEstimates();
        showTab('list');
        
        // 데이터 초기화
        currentEstimate = { designConcept: { images: [] }, quoteDetails: [], initialTotal: 0 };
    } catch (err) { alert("저장 실패: " + err.message); }
}

async function saveGlobalSettings() {
    const data = {
        notes: globalSettings.notes,
        manager: {
            name: document.getElementById('m-name').value,
            role: document.getElementById('m-role').value,
            dept: document.getElementById('m-dept').value,
            imageUrl: document.getElementById('m-img').value
        }
    };
    try {
        showToast("공통 설정 저장 중...");
        await client.mutation(api.functions.saveGlobalSettings, data);
        globalSettings.manager = data.manager;
        showToast("공통 설정이 서버에 반영되었습니다. ✨");
    } catch (err) { 
        console.error(err);
        alert("설정 저장 실패: " + err.message);
    }
}

window.handleManagerImgUpload = async (input) => {
    const file = input.files[0]; if(!file) return;
    showToast("매니저 사진 최적화 중... 📸");
    const compressed = await window.compressImage(file, 400, 0.7); // 매니저 사진은 작게 최적화
    document.getElementById('m-img').value = compressed;
    showToast("사진 업로드 준비 완료! '저장하기'를 눌러주세요.");
};

/* -----------------------------------------
   동적 UI 렌더링
----------------------------------------- */
function initForm() {
    document.getElementById('q-date').value = new Date().toISOString().split('T')[0];
    renderQuoteTable();
    renderDesignImages();
    window.renderPricePreview(); // 초기화 시 실행
}

function addQuoteRow() {
    currentEstimate.quoteDetails.push({ 
        mainCategory: "주방", category: "기타", productName: "", 
        option1: "", option2: "", size: "-", quantity: 1, unit: "EA", price: 0 
    });
    renderQuoteTable();
}

function renderQuoteTable() {
    const tbody = document.getElementById('quote-tbody');
    if(!tbody) return;
    
    // 수동 등록한 것만 표시 (isExcel !== true)
    const visibleItems = currentEstimate.quoteDetails.filter(item => !item.isExcel);
    
    tbody.innerHTML = visibleItems.map((row, idx) => {
        const realIdx = currentEstimate.quoteDetails.indexOf(row);
        return `
        <tr>
            <td><input type="text" value="${row.mainCategory}" onchange="window.updateTableVal(${realIdx},'mainCategory',this.value)" /></td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <button class="add-btn" style="padding:4px; font-size:10px;" onclick="document.getElementById('f-${realIdx}').click()"><i class="fas fa-camera"></i> 업로드</button>
                    <input type="file" style="display:none" id="f-${realIdx}" onchange="window.handleRowImg(${realIdx},this)" />
                    <input type="text" placeholder="URL 입력" value="${row.imageUrl || ''}" onchange="window.updateTableVal(${realIdx},'imageUrl',this.value)" style="font-size:9px; padding:4px;" />
                    ${row.imageUrl ? `<img src="${row.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;"/>` : ""}
                </div>
            </td>
            <td><input type="text" value="${row.category || ''}" onchange="window.updateTableVal(${realIdx},'category',this.value)" /></td>
            <td><input type="text" value="${row.productName}" onchange="window.updateTableVal(${realIdx},'productName',this.value)" /></td>
            <td><input type="text" value="${row.option1}" onchange="window.updateTableVal(${realIdx},'option1',this.value)" /></td>
            <td><input type="text" value="${row.option2}" onchange="window.updateTableVal(${realIdx},'option2',this.value)" /></td>
            <td><input type="text" value="${row.size}" onchange="window.updateTableVal(${realIdx},'size',this.value)" /></td>
            <td><input type="text" value="${row.quantity}" onchange="window.updateTableVal(${realIdx},'quantity',this.value)" style="text-align:center;" /></td>
            <td>
                <select onchange="window.updateTableVal(${realIdx},'unit',this.value)">
                    <option value="EA" ${row.unit==='EA'?'selected':''}>EA</option>
                    <option value="M" ${row.unit==='M'?'selected':''}>M</option>
                </select>
            </td>
            <td>
                <input type="text" 
                    value="${(row.price || 0).toLocaleString()}" 
                    oninput="window.handleTablePriceInput(${realIdx}, this)" 
                    style="text-align:right; font-weight:700; color:#2563eb;" 
                />
            </td>
            <td><button class="icon-btn delete-btn" onclick="window.delQuoteRow(${realIdx})"><i class="fas fa-times"></i></button></td>
        </tr>
    `}).join('');
    
    // 테이블 하단에 안내 추가
    if (currentEstimate.quoteDetails.length > 0) {
        let notice = document.querySelector('.vat-notice-mini');
        if(!notice){
            notice = document.createElement('div');
            notice.className = 'vat-notice-mini';
            notice.innerText = '단위:원(VAT별도)';
            tbody.parentElement.parentElement.after(notice);
        }
    }
}

window.handleTablePriceInput = (idx, input) => {
    const val = input.value.replace(/,/g, '');
    const num = Number(val) || 0;
    currentEstimate.quoteDetails[idx].price = num;
    input.value = num.toLocaleString();
    window.renderPricePreview();
};

window.updateTableVal = (idx, f, v) => { 
    currentEstimate.quoteDetails[idx][f] = (f==='quantity'||f==='price') ? (Number(String(v).replace(/,/g,'')) || 0) : v; 
    if(f === 'imageUrl') renderQuoteTable(); // 이미지 URL 변경 시 썸네일 갱신
    window.renderPricePreview(); 
};

window.updateItemMargin = (idx, val) => {
    currentEstimate.quoteDetails[idx].margin = Number(val) || 100;
    window.renderPricePreview();
};

window.renderPricePreview = () => {
    const baseContainer = document.getElementById('price-preview-base-container');
    const benefitsContainer = document.getElementById('price-preview-benefits-container');
    if (!baseContainer || !benefitsContainer) return;

    let customerSupplyNet = 0;
    
    // 항목별 마진 입력 및 가격 목록 생성
    const itemsHtml = currentEstimate.quoteDetails.map((item, idx) => {
        if (!item.isExcel) return ''; // 수동 항목(내가 입력한 견적내역)은 목록에서 제외

        const itemRaw = (item.price || 0) * (item.quantity || 1);
        const margin = item.margin !== undefined ? item.margin : 100;
        const finalPrice = Math.floor(itemRaw * (margin / 100));
        customerSupplyNet += finalPrice;
        
        return `
            <div class="preview-row" style="align-items:center; border-bottom:1px solid #e2e8f0; padding:8px 0; display:flex; justify-content:space-between;">
               <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:flex; align-items:center; gap:8px;">
                   <span style="font-size:10px; color:#fff; background:#475569; padding:2px 4px; border-radius:3px;">${item.mainCategory}</span> 
                   <span style="font-weight:600; font-size:13px;">${item.productName}</span>
               </div>
               <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                   <div style="font-size:11px; color:#64748b; margin-right:5px;">원가: ${itemRaw.toLocaleString()}</div>
                   <div style="display:flex; align-items:center; border:1px solid #cbd5e1; border-radius:4px; overflow:hidden; background:#fff;">
                       <input type="number" value="${margin}" onchange="window.updateItemMargin(${idx}, this.value)" style="width:45px; padding:4px; text-align:right; border:none; font-size:12px; outline:none;">
                       <span style="padding:4px; font-size:12px; background:#f1f5f9; color:#64748b; border-left:1px solid #cbd5e1;">%</span>
                   </div>
                   <strong style="width:85px; text-align:right; color:#2563eb; font-size:13px; margin-left:10px;">${finalPrice.toLocaleString()}원</strong>
               </div>
            </div>
        `;
    }).join('');

    const vat = Math.floor(customerSupplyNet * 0.1);
    const customerFinalTotal = Math.floor((customerSupplyNet + vat) / 10) * 10;
    
    // 1. 일시불 결제 계산
    const lumpDiscRate = Number(document.getElementById('pay-lump-discount-rate')?.value) || 0;
    const lumpDiscAmt = Number(document.getElementById('pay-lump-discount-amt')?.value.replace(/,/g, '')) || 0;
    const rateDiscAmt = Math.floor(customerFinalTotal * (lumpDiscRate / 100));
    const finalLumpSum = customerFinalTotal - rateDiscAmt - lumpDiscAmt;
    
    // KCC공급가 및 마진 분석 업데이트
    let baseSupplyNet = 0;
    currentEstimate.quoteDetails.forEach(item => {
        if (!item.isExcel) return;
        baseSupplyNet += (item.price || 0) * (item.quantity || 1);
    });
    const baseTotal = Math.floor((baseSupplyNet + Math.floor(baseSupplyNet * 0.1)) / 10) * 10;
    const lumpMarginAmt = finalLumpSum - baseTotal;
    const lumpMarginRate = finalLumpSum > 0 ? (lumpMarginAmt / finalLumpSum) * 100 : 0;

    const elKcc = document.getElementById('label-kcc-supply');
    const elMargin = document.getElementById('label-lump-margin');
    const elRate = document.getElementById('label-lump-margin-rate');
    if (elKcc) elKcc.innerText = baseTotal.toLocaleString() + '원';
    if (elMargin) elMargin.innerText = lumpMarginAmt.toLocaleString() + '원';
    if (elRate) elRate.innerText = lumpMarginRate.toFixed(1) + '%';

    // 2. 구독 서비스 계산 (만기일시상환 기준 이자금)
    const subInterestRate = Number(document.getElementById('pay-sub-interest-rate')?.value) || 0;
    const getSubMonthly = (months) => {
        const interest = Math.floor(customerFinalTotal * (subInterestRate / 100) * (months / 12));
        const totalRepay = customerFinalTotal + interest;
        return Math.floor(totalRepay / months);
    };

    // 3. 렌탈 서비스 계산 (60개월 전용, 일시불 할인가 기준)
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

    // ---- [Render Base] ----
    baseContainer.innerHTML = `
        <div class="preview-group-title" style="margin-top:0;">항목별 마진율 설정 리스트</div>
        <div style="background:#f8fafc; padding:10px; border-radius:8px; margin-bottom:15px; border:1px solid #e2e8f0; max-height:250px; overflow-y:auto;">
            ${itemsHtml || '<div style="font-size:12px; color:#999; text-align:center; padding:15px;">등록된 견적 항목이 없습니다.</div>'}
        </div>
        
        <div class="preview-total-row">
            <div class="preview-total-label">공급가 합계 (VAT 별도)</div>
            <div class="preview-total-val">${customerSupplyNet.toLocaleString()}원</div>
        </div>
        <div class="preview-vat-row">
            <span>부가세 (VAT 10%)</span>
            <span>${vat.toLocaleString()}원</span>
        </div>
        <div class="preview-final-hero" style="padding:15px 0 5px;">
            <div class="hero-label" style="font-size:14px; text-align:left;">기본 총 견적 금액 <small>(부가세 포함)</small></div>
            <div class="hero-amount" style="text-align:right;">${customerFinalTotal.toLocaleString()}<small>원</small></div>
        </div>
    `;

    // ---- [Render Benefits] ----
    benefitsContainer.innerHTML = `
        <div class="preview-group-title" style="color:#d97706; margin-top:0;"><i class="fas fa-money-bill-wave"></i> 1. 일시불 결제 혜택</div>
        <div style="background:#fffbeb; padding:15px; border-radius:8px; border:1px solid #fde68a; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:#b45309;">
                <span>적용된 총 할인 금액</span>
                <strong>-${(rateDiscAmt + lumpDiscAmt).toLocaleString()}원</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:18px; font-weight:800; color:#d97706; padding-top:5px;">
                <span>최종 혜택가</span>
                <span>${finalLumpSum.toLocaleString()}원</span>
            </div>
        </div>

        <div class="preview-group-title" style="color:#0284c7;"><i class="fas fa-calendar-alt"></i> 2. 구독 서비스 <small>(연 ${subInterestRate}% / 만기일시상환 기준)</small></div>
        <div style="background:#f0f9ff; padding:15px; border-radius:8px; border:1px solid #bae6fd; margin-bottom:20px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${[24, 36, 48, 60].map(m => `
                <div style="background:#fff; padding:12px 5px; border-radius:6px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="font-size:12px; color:#64748b; margin-bottom:4px;">${m}개월</div>
                    <div style="font-weight:800; color:#0284c7; font-size:14px;">월 ${getSubMonthly(m).toLocaleString()}원</div>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="preview-group-title" style="color:#be185d;"><i class="fas fa-sync-alt"></i> 3. 렌탈 서비스 (60개월 전용)</div>
        <div style="background:#fdf2f8; padding:15px; border-radius:8px; border:1px solid #fbcfe8;">
            ${rentalOptions.map(opt => `
                <div style="background:#fff; padding:12px; border-radius:6px; margin-bottom:8px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    ${opt.data.isValid ? `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-size:12px; color:#64748b;">선납금: <strong style="color:#111; font-size:14px;">${opt.data.prepayment.toLocaleString()}원</strong></div>
                            <div style="font-weight:800; font-size:15px; color:#be185d;">월 ${opt.data.monthly.toLocaleString()}원 <span style="font-size:11px; font-weight:normal;">고정</span></div>
                        </div>
                    ` : `
                        <div style="font-size:12px; color:#94a3b8; font-weight:600; text-align:center;">해당없음 (선납금 미달)</div>
                    `}
                </div>
            `).join('')}
        </div>
    `;
};

// 숫자 자릿수 콤마 포맷터
window.handleExtraPriceInput = (input) => {
    let val = input.value.replace(/,/g, '');
    const isNegative = val.startsWith('-');
    if (isNegative) val = val.slice(1);
    
    val = val.replace(/[^0-9.]/g, ''); 
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    input.value = (isNegative ? '-' : '') + parts.join('.');
    window.renderPricePreview();
};


window.delQuoteRow = (idx) => { 
    currentEstimate.quoteDetails.splice(idx,1); 
    renderQuoteTable(); 
    window.renderPricePreview();
};
window.handleRowImg = async (idx, input) => {
    const file = input.files[0]; if(!file) return;
    showToast("이미지 압축 및 최적화 중...");
    const compressed = await window.compressImage(file, 1000, 0.6); // 테이블 이미지는 작게 최적화
    currentEstimate.quoteDetails[idx].imageUrl = compressed; 
    renderQuoteTable();
};

function handleExcelFile(input) {
    const file = input.files[0]; if(!file) return;
    
    // 1. 파일명 기반 기본 정보 파싱
    const parts = file.name.split('.')[0].split('_');
    if(parts[0]) document.getElementById('q-customer').value = parts[0];
    if(parts[1]) document.getElementById('q-contact').value = parts[1];
    document.getElementById('q-number').value = `EH-${new Date().getTime().toString().slice(-8)}`;
    
    // 2. 엑셀 내용 파싱 (주소, 최종가격 등)
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let foundAddress = "";
        let foundPrice = "";
        let foundSiteType = "APT";
        let foundDate = "";
        const newQuoteDetails = [];
        
        rows.forEach(row => {
            if (!row || !row.length) return;
            const line = row.join(' ');

            // 주소 찾기: "현장주소" 다음 칸에 데이터가 있는 경우가 많음
            if (line.includes('현장주소')) {
                const val = row.find((cell, i) => i > 0 && cell && String(cell).length > 5);
                if (val) foundAddress = String(val).trim();
            }

            // 최종 가격 찾기: "금액 총계" 레이블 근처
            if (line.includes('금액 총계')) {
                const val = row.find((cell, i) => i > 0 && cell && (String(cell).includes('포함') || /\d/.test(String(cell))));
                if (val) foundPrice = String(val).replace(/[^0-9]/g, ''); // 숫자만 남김
            }

            // 개별 견적 항목 수집
            const itemKeywords = ['자재비', '시공비', '타일 시공비', '물류+양중', '철거', '부대'];
            const foundLabel = row.find(cell => cell && typeof cell === 'string' && itemKeywords.some(kw => cell.includes(kw)));
            
            if (foundLabel && !foundLabel.includes('합계') && !foundLabel.includes('VAT')) {
                const val = [...row].reverse().find(cell => cell && (typeof cell === 'number' || (typeof cell === 'string' && /\d/.test(cell))));
                if (val) {
                    const price = Number(String(val).replace(/[^0-9]/g, ''));
                    if (price > 0) {
                        newQuoteDetails.push({
                            mainCategory: foundLabel.includes('자재') ? '주방' : '시공/기타',
                            category: '엑셀추출',
                            productName: foundLabel.trim(),
                            option1: '', option2: '', size: '-', quantity: 1, unit: 'EA',
                            price: price,
                            imageUrl: '',
                            isExcel: true
                        });
                    }
                }
            }

            // 기타 정보
            if (line.includes('현장유형')) {
                const val = row.find((cell, i) => i > 0 && cell && String(cell).length < 5);
                if (val) foundSiteType = String(val).trim();
            }
            if (line.includes('견적작성일')) {
                const val = row.find((cell, i) => i > 0 && cell && cell.toString().includes('/'));
                if (val) foundDate = val.toString().trim();
            }
        });

        if (foundAddress) document.getElementById('q-address').value = foundAddress;
        if (foundSiteType) document.getElementById('q-type').value = foundSiteType;
        if (foundDate) {
            try {
                const dateObj = new Date(foundDate);
                if (!isNaN(dateObj.getTime())) {
                    document.getElementById('q-date').value = dateObj.toISOString().split('T')[0];
                }
            } catch(e) {}
        }
        
        if (newQuoteDetails.length > 0) {
            // 기존 quoteDetails에 엑셀 항목들을 isExcel 플래그와 함께 추가
            const markedItems = newQuoteDetails.map(item => ({ ...item, isExcel: true }));
            currentEstimate.quoteDetails = [
                ...currentEstimate.quoteDetails.filter(item => !item.isExcel), // 기존 엑셀 항목 제거(업로드 시 갱신)
                ...markedItems
            ];
            renderQuoteTable(); // 수동 항목만 새로고침
            window.renderPricePreview(); // 엑셀 로드 후 계산 업데이트
        }

        if (foundPrice) {
            currentEstimate.initialTotal = Number(foundPrice);
            alert(`엑셀 데이터 추출 완료\n------------------\n주소: ${foundAddress}\n항목수: ${newQuoteDetails.length}개\n최종가격: ${Number(foundPrice).toLocaleString()}원 (VAT포함)`);
        }

        showToast("엑셀 상세 정보 로드 완료! 📊");
    };
    reader.readAsArrayBuffer(file);
}

function renderSettings() {
    const list = document.getElementById('settings-notes-list');
    if(!list) return;
    list.innerHTML = globalSettings.notes.map((n, i) => `
        <div style="display:flex;gap:10px;margin-bottom:8px;">
            <input type="text" value="${n}" style="flex:1;padding:10px;border-radius:8px;border:1px solid #ddd;" onchange="window.updateNoteVal(${i},this.value)" />
            <button class="icon-btn delete-btn" onclick="window.delNote(${i})"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
    const m = globalSettings.manager;
    document.getElementById('m-name').value = m.name;
    document.getElementById('m-role').value = m.role;
    document.getElementById('m-dept').value = m.dept;
    document.getElementById('m-img').value = m.imageUrl;
}

window.updateNoteVal = (i, v) => { globalSettings.notes[i] = v; };
window.delNote = (i) => { globalSettings.notes.splice(i,1); renderSettings(); };
function addSettingNote() { globalSettings.notes.push(""); renderSettings(); }

function addDesignImage() { currentEstimate.designConcept.images.push({url:""}); renderDesignImages(); }
function renderDesignImages() {
    const c = document.getElementById('design-image-list'); if(!c) return;
    c.innerHTML = currentEstimate.designConcept.images.map((img, i) => `
        <div class="admin-img-card">
            <div class="preview-16-9">
                <img src="${img.url || 'https://via.placeholder.com/160x90'}" />
            </div>
            <div class="card-body" style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; gap:4px;">
                    <button class="add-btn" style="flex:1; padding:4px; font-size:10px;" onclick="document.getElementById('di-f-${i}').click()">
                        <i class="fas fa-upload"></i> 업로드
                    </button>
                    <input type="file" id="di-f-${i}" style="display:none" onchange="window.handleDesignImgUpload(${i},this)" />
                    <button class="icon-btn delete-btn" onclick="window.delDesignImg(${i})"><i class="fas fa-trash-alt"></i></button>
                </div>
                <input type="text" placeholder="URL 이미지 주소" value="${img.url}" onchange="window.updateDesignImg(${i},this.value)" style="font-size:11px; padding:6px;" />
            </div>
        </div>
    `).join('');
}

window.handleDesignImgUpload = async (i, input) => {
    const file = input.files[0]; if(!file) return;
    showToast("디자인 이미지 최적화 중... ✨");
    const compressed = await window.compressImage(file, 1600, 0.7); // 디자인 이미지는 고화질 유지
    currentEstimate.designConcept.images[i].url = compressed; 
    renderDesignImages(); 
};

window.updateDesignImg = (i, v) => { currentEstimate.designConcept.images[i].url = v; renderDesignImages(); };
window.delDesignImg = (i) => { currentEstimate.designConcept.images.splice(i,1); renderDesignImages(); };

function showToast(m) {
    const t = document.createElement('div'); t.innerText = m;
    t.style.cssText = `position:fixed; top:20px; right:20px; background:#1a2b4a; color:#fff; padding:15px 30px; border-radius:12px; z-index:10000; box-shadow:0 10px 30px rgba(0,0,0,0.2); font-size:13px;`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}

// 상세 모당 닫기/복사 등
window.closeModal = () => {
    const modal = document.getElementById('detail-modal');
    if(modal) modal.style.display = 'none';
};
