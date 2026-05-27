// ==========================================
// 測驗核心程式邏輯（完全解耦版）
// ==========================================
let questionBankRaw = null; // 用來存放從外部非同步讀取的題庫
let currentQuizQuestions = [];
let userAnswers = [];
let currentIndex = 0;

// 非同步載入 JSON 檔案（GitHub Pages 專用相容版）
async function loadQuestionBank() {
    try {
        // 自動取得當前 index.html 所在的資料夾絕對路徑
        const currentDir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const jsonUrl = `${window.location.origin}${currentDir}/questions.json`;
        
        console.log("正在嘗試讀取題庫，路徑為:", jsonUrl); // 方便你按 F12 檢查路徑

        const response = await fetch(jsonUrl);
        if (!response.ok) {
            throw new Error(`伺服器回應錯誤代碼: ${response.status}`);
        }
        questionBankRaw = await response.json();
        startNewQuiz();
    } catch (error) {
        console.error("載入失敗詳細原因:", error);
        document.getElementById('question-text').innerText = "❌ 題庫載入失敗，請確認 questions.json 是否已成功上傳且檔名全為小寫。";
    }
}

// 從題庫隨機抽取 8 題一般 + 2 題難題
function generateQuiz() {
    if (!questionBankRaw) return;

    const normalPool = [...questionBankRaw.normal];
    const hardPool = [...questionBankRaw.hard];

    // 洗牌函數
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    shuffle(normalPool);
    shuffle(hardPool);

    // 抽出指定數量
    const selectedNormal = normalPool.slice(0, 8);
    const selectedHard = hardPool.slice(0, 2);

    // 合併並再次打亂順序
    currentQuizQuestions = shuffle([...selectedNormal, ...selectedHard]);
    userAnswers = new Array(10).fill(null); // 初始化答案為空
    currentIndex = 0;
}

// 開始新測驗
function startNewQuiz() {
    if (!questionBankRaw) {
        loadQuestionBank();
        return;
    }

    generateQuiz();

    // 切換顯示區域
    document.getElementById('question-area').classList.remove('hidden');
    document.getElementById('nav-container').classList.remove('hidden');
    document.getElementById('progress-container').classList.remove('hidden');
    document.getElementById('result-area').classList.add('hidden');
    document.getElementById('page-title').innerText = "股票與 ETF 知識小測驗";

    showQuestion(0);
}

// 顯示特定題目的內容
function showQuestion(index) {
    currentIndex = index;
    const question = currentQuizQuestions[index];

    // 更新進度條與標題
    document.getElementById('page-title').innerText = `第 ${index + 1} 題 / 共 10 題`;
    const progressPercent = ((index + 1) / 10) * 100;
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;

    // 題目文字
    document.getElementById('question-text').innerText = question.q;

    // 渲染四個選項
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const optionLabels = ['A', 'B', 'C', 'D'];
    question.options.forEach((opt, optIdx) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        if (userAnswers[index] === optIdx) {
            button.classList.add('selected');
        }
        button.onclick = () => selectOption(optIdx);

        button.innerHTML = `
            <span class="option-index">${optionLabels[optIdx]}</span>
            <span>${opt}</span>
        `;
        optionsContainer.appendChild(button);
    });

    // 控管導覽按鈕顯示
    document.getElementById('prev-btn').disabled = (index === 0);

    if (index === 9) {
        document.getElementById('next-btn').classList.add('hidden');
        document.getElementById('submit-btn').classList.remove('hidden');
    } else {
        document.getElementById('next-btn').classList.remove('hidden');
        document.getElementById('submit-btn').classList.add('hidden');
    }
}

// 選擇選項
function selectOption(optIdx) {
    userAnswers[currentIndex] = optIdx;

    // 重新渲染當前畫面以顯示選取狀態
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, idx) => {
        if (idx === optIdx) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // 自動微秒延遲引導下一題，提升操作流暢感（最後一題除外）
    if (currentIndex < 9) {
        setTimeout(() => {
            nextQuestion();
        }, 300);
    }
}

// 下一題
function nextQuestion() {
    if (currentIndex < 9) {
        showQuestion(currentIndex + 1);
    }
}

// 上一題
function prevQuestion() {
    if (currentIndex > 0) {
        showQuestion(currentIndex - 1);
    }
}

// 提交測驗並計算結果
function submitQuiz() {
    // 檢查是否有未寫的題目
    const unanswered = userAnswers.map((ans, idx) => ans === null ? idx + 1 : null).filter(v => v !== null);
    if (unanswered.length > 0) {
        alert(`您還有題目沒有填寫喔！請填寫第 ${unanswered.join(', ')} 題再提交。`);
        return;
    }

    // 計算分數
    let score = 0;
    currentQuizQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.ans) {
            score += 10;
        }
    });

    // 隱藏題目與進度條，顯示結果
    document.getElementById('question-area').classList.add('hidden');
    document.getElementById('nav-container').classList.add('hidden');
    document.getElementById('progress-container').classList.add('hidden');
    document.getElementById('result-area').classList.remove('hidden');
    document.getElementById('page-title').innerText = "測驗結果報告";

    // 顯示分數與評語
    let comment = "要再加油喔！多看解析能幫您避開危險！";
    if (score >= 90) comment = "太厲害了！您非常有基礎的股票與 ETF 正確觀念！";
    else if (score >= 70) comment = "很棒！您已經有不錯的基礎，交易時請繼續保持謹慎。";
    else if (score >= 50) comment = "及格邊緣，建議投資前再多了解一下喔！";

    document.getElementById('result-score-text').innerHTML = `您的分數：${score} 分<br><span style="font-size:20px; color:#5f6368; font-weight:normal;">${comment}</span>`;

    // 渲染答案解析回顧
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = '';

    const optionLabels = ['A', 'B', 'C', 'D'];
    currentQuizQuestions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.ans;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'review-item';

        itemDiv.innerHTML = `
            <div class="review-q">${idx + 1}. ${q.q}</div>
            <div>
                <span class="review-status ${isCorrect ? 'status-correct' : 'status-wrong'}">
                    ${isCorrect ? '✓ 答對了' : '✗ 答錯了'}
                </span>
            </div>
            <div class="review-ans" style="color: ${isCorrect ? '#2e7d32' : '#c62828'}">
                您的回答：(${optionLabels[userAnswers[idx]]}) ${q.options[userAnswers[idx]]}
            </div>
            ${!isCorrect ? `<div class="review-ans" style="color: #2e7d32; font-weight:bold;">正確答案：(${optionLabels[q.ans]}) ${q.options[q.ans]}</div>` : ''}
            <div class="review-explain">
                <strong>💡 觀念大解析：</strong>${q.exp}
            </div>
        `;
        reviewContainer.appendChild(itemDiv);
    });

    // 讓畫面自動捲動回頂端方便長輩看分數
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 網頁開啟時自動啟動讀取
window.onload = loadQuestionBank;
