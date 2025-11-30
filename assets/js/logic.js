// --- CẤU HÌNH ---
const CONFIG = { 
    baseTime: 20, bonusAnswer: 3, penalty: 5, questionsToLevelUp: 10 
};

function goTo(file) { window.location.href = file; }
function formatTime(dateStr) {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${(date.getMinutes()<10?'0':'') + date.getMinutes()}`;
}

// --- LOGIC MÀN HÌNH GAME ---
if (document.getElementById('game-screen')) {
    let state = {
        level: 1, score: 0, target: 100, 
        totalTime: CONFIG.baseTime, timeLeft: CONFIG.baseTime,  
        qCount: 0, currentQ: {}, historyLog: [], timer: null
    };

    function initGame() {
        renderUI();
        generateQuestion();
        state.timer = setInterval(() => {
            state.timeLeft -= 0.1;
            updateTimerUI();
            if (state.timeLeft <= 0) endGame();
        }, 100);
    }

    // --- HÀM MỚI: TỰ ĐỘNG GIÃN Ô INPUT ---
    function resizeInput() {
        const inp = document.getElementById('user-input');
        // Độ dài = số ký tự + 1 (để thoáng) + đơn vị 'ch' (chiều rộng ký tự)
        // Nếu rỗng thì để tối thiểu 1ch
        let len = inp.value.length || 1;
        inp.style.width = (len + 1) + 'ch';
    }

    function generateQuestion() {
        let min = Math.floor(state.target * 0.1) || 1;
        let max = Math.floor(state.target * 0.9) || (state.target - 1);
        let given = Math.floor(Math.random() * (max - min + 1)) + min;
        
        state.currentQ = {
            level: state.level, target: state.target, given: given,
            correct: state.target - given, startAt: Date.now()
        };
        
        document.getElementById('given-num').innerText = given;
        document.getElementById('target-num').innerText = state.target;
        
        // Reset input và size
        let inp = document.getElementById('user-input');
        inp.value = '';
        resizeInput(); // Reset độ rộng về nhỏ nhất
    }

    function checkAnswer() {
        let inp = document.getElementById('user-input');
        let val = parseInt(inp.value);
        if (isNaN(val)) return;

        let duration = ((Date.now() - state.currentQ.startAt)/1000).toFixed(1);
        let isCorrect = val === state.currentQ.correct;

        state.historyLog.push({
            ...state.currentQ, input: val,
            result: isCorrect ? "Đúng" : "Sai (-5s)", duration: duration
        });

        if (isCorrect) {
            state.timeLeft += CONFIG.bonusAnswer;
            if(state.timeLeft > state.totalTime) state.totalTime = state.timeLeft;
            state.score++; state.qCount++;
            if (state.qCount >= CONFIG.questionsToLevelUp) levelUp();
            else generateQuestion();
        } else {
            state.timeLeft -= CONFIG.penalty;
            if (state.timeLeft < 0) state.timeLeft = 0;
            document.querySelector('.main-card').classList.add('shake');
            setTimeout(()=>document.querySelector('.main-card').classList.remove('shake'), 500);
            inp.value = '';
            resizeInput(); // Reset size khi sai
        }
        renderUI();
    }

    function levelUp() {
        state.level++; state.qCount = 0; state.target *= 10;
        let newBase = CONFIG.baseTime + ((state.level - 1) * 2); 
        state.totalTime = newBase; state.timeLeft = newBase;  
        generateQuestion(); renderUI();
    }

    function endGame() {
        clearInterval(state.timer);
        const res = {
            timestamp: new Date().toISOString(), score: state.score,
            level: state.level, details: state.historyLog
        };
        localStorage.setItem('tempResult', JSON.stringify(res));
        let h = JSON.parse(localStorage.getItem('fullHistory')) || [];
        h.unshift(res);
        localStorage.setItem('fullHistory', JSON.stringify(h));
        goTo('result.html');
    }

    function renderUI() {
        document.getElementById('level-display').innerText = state.level;
        // document.getElementById('score-display').innerText = state.score;
        document.querySelector('#score-display span').innerText = state.score;
    }

    function updateTimerUI() {
        let pct = (state.timeLeft / state.totalTime) * 100;
        if(pct > 100) pct = 100;
        document.getElementById('timer-bar').style.width = pct + '%';
        document.getElementById('time-text').innerText = Math.ceil(state.timeLeft) + 's';
        if (pct < 30) document.getElementById('timer-bar').style.backgroundColor = '#ff4757'; 
        else if (pct > 100) document.getElementById('timer-bar').style.backgroundColor = '#fca311'; 
        else document.getElementById('timer-bar').style.backgroundColor = '#00d4ff'; 
    }

    // Numpad Logic có gọi thêm resizeInput
    window.press = (key) => {
        let inp = document.getElementById('user-input');
        if (inp.value.length < 6) {
            inp.value += key;
            resizeInput(); // Tự động giãn ra khi bấm phím
        }
    };
    window.del = () => {
        let inp = document.getElementById('user-input');
        inp.value = inp.value.slice(0, -1);
        resizeInput(); // Tự động co lại khi xoá
    };
    window.enter = checkAnswer;

    initGame();
}

// Phần logic Result và History
if (document.getElementById('result-screen')) {
    const result = JSON.parse(localStorage.getItem('tempResult'));
    let history = JSON.parse(localStorage.getItem('fullHistory')) || [];
    let maxScore = history.reduce((max, item) => (item.score > max ? item.score : max), 0);
    if (result) {
        document.getElementById('final-score').innerText = result.score;
        document.getElementById('final-level').innerText = result.level;
    }
    document.getElementById('best-score').innerText = maxScore;
}
if (document.getElementById('history-screen')) {
    let history = JSON.parse(localStorage.getItem('fullHistory')) || [];
    const listContainer = document.getElementById('history-list');
    function renderHistoryList() {
        listContainer.innerHTML = '';
        if (history.length === 0) { listContainer.innerHTML = '<p class="text-center" style="color:#666; margin-top:20px;">Chưa có lịch sử đấu.</p>'; return; }
        history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item history-grid-layout'; 
            div.onclick = function() { showDetail(index); };
            div.innerHTML = `
                <div style="text-align: left; color: var(--cyan); font-weight: bold;">${formatTime(item.timestamp)}</div>
                <div>${item.level}</div>
                <div style="color: var(--yellow); font-weight: bold;">${item.score}</div>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteItem(${index})"><i class="bi bi-trash"></i> 🗑️</button>
            `;
            listContainer.appendChild(div);
        });
    }
    window.deleteItem = (index) => { if (confirm('Bạn chắc chắn muốn xoá trận này?')) { history.splice(index, 1); localStorage.setItem('fullHistory', JSON.stringify(history)); renderHistoryList(); closeModal(); } };
    window.showDetail = (index) => {
        const item = history[index]; const tbody = document.getElementById('detail-body'); tbody.innerHTML = '';
        item.details.forEach(log => {
            let resultClass = log.result.includes('Đúng') ? 'text-success' : 'text-danger';
            tbody.innerHTML += `<tr><td>${log.level}</td><td>${log.given} + ? = ${log.target}</td><td>${log.input}</td><td class="${resultClass}">${log.result}</td><td>${log.duration}s</td></tr>`;
        });
        document.getElementById('detail-modal').style.display = 'flex';
    };
    window.closeModal = () => { document.getElementById('detail-modal').style.display = 'none'; };
    renderHistoryList();
}