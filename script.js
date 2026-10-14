// Генератор реальных звуков удара ("леща") через Web Audio API (без сторонних mp3)
let soundEnabled = true;
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
    if (!soundEnabled) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;

    if (type === "slap" || type === "crit") {
        // 1. Хлесткий хлопок ладонью (белый шум с фильтром)
        const bufferSize = audioCtx.sampleRate * 0.14;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.035));
        }
        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(type === "crit" ? 1900 : 1400, now);

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(type === "crit" ? 1.2 : 0.85, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        whiteNoise.start(now);

        // 2. Басовый панч при ударе
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(type === "crit" ? 220 : 160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(oscGain);
        oscGain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    } else if (type === "wrong") {
        // Звук промаха / укуса монстра
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(75, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

// Боссы с кастомным внешним видом (SVG-параметры)
const MONSTERS = [
    { name: "Зубастый Слайм", maxHp: 50, color: "#2ed573", secondary: "#7bed9f", horns: false, eyes: 2 },
    { name: "Восьминог Путаник", maxHp: 65, color: "#ff4757", secondary: "#ff7f50", horns: true, eyes: 3 },
    { name: "Кибер-Калькулятор", maxHp: 80, color: "#1e90ff", secondary: "#70a1ff", horns: false, eyes: 1 },
    { name: "Паук Забывашка", maxHp: 95, color: "#9c88ff", secondary: "#cd84f1", horns: true, eyes: 3 },
    { name: "Ледяной Голем", maxHp: 110, color: "#00d2d3", secondary: "#48dbfb", horns: true, eyes: 2 },
    { name: "Повелитель Иксов", maxHp: 130, color: "#e84118", secondary: "#fbc531", horns: true, eyes: 3 }
];

const CONTROL_BOSS = {
    name: "Пятёрка по Математике",
    maxHp: 36,
    color: "#feca57",
    secondary: "#ff9f43",
    isStar: true
};

// Отрисовка живого SVG монстра (обычное лицо или лицо в момент получения леща!)
function generateMonsterSVG(m, isHurt = false) {
    if (m.isStar) {
        return `
        <svg viewBox="0 0 130 140" class="char-svg">
            <ellipse cx="65" cy="132" rx="38" ry="8" fill="rgba(0,0,0,0.4)"/>
            <polygon points="65,10 82,48 122,52 90,80 100,120 65,98 30,120 40,80 8,52 48,48" fill="${m.color}" stroke="#fff" stroke-width="3"/>
            ${isHurt ? `
                <!-- Лицо при получении леща (X_X) -->
                <path d="M44 52 L56 64 M56 52 L44 64" stroke="#130b24" stroke-width="4" stroke-linecap="round"/>
                <path d="M74 52 L86 64 M86 52 L74 64" stroke="#130b24" stroke-width="4" stroke-linecap="round"/>
                <circle cx="65" cy="80" r="8" fill="#130b24"/>
            ` : `
                <circle cx="50" cy="58" r="6" fill="#130b24"/>
                <circle cx="80" cy="58" r="6" fill="#130b24"/>
                <text x="65" y="92" font-size="24" font-weight="900" text-anchor="middle" fill="#ff4757">5+</text>
            `}
        </svg>`;
    }

    const hornsHtml = m.horns ? `
        <path d="M32 38 L15 12 L46 28 Z" fill="${m.secondary}"/>
        <path d="M98 38 L115 12 L84 28 Z" fill="${m.secondary}"/>
    ` : "";

    let eyesHtml = "";
    if (isHurt) {
        // Глаза крестиками от сочного леща!
        eyesHtml = `
            <path d="M38 50 L54 66 M54 50 L38 66" stroke="#1e272e" stroke-width="5" stroke-linecap="round"/>
            <path d="M76 50 L92 66 M92 50 L76 66" stroke="#1e272e" stroke-width="5" stroke-linecap="round"/>
            <!-- Синяк / румянец от леща -->
            <ellipse cx="35" cy="74" rx="10" ry="6" fill="#ff4757" opacity="0.85"/>
        `;
    } else if (m.eyes === 1) {
        eyesHtml = `
            <circle cx="65" cy="55" r="18" fill="#fff"/>
            <circle cx="63" cy="55" r="8" fill="#ff4757"/>
            <circle cx="61" cy="52" r="3" fill="#fff"/>
        `;
    } else if (m.eyes === 3) {
        eyesHtml = `
            <circle cx="44" cy="60" r="9" fill="#fff"/><circle cx="43" cy="60" r="4" fill="#1e272e"/>
            <circle cx="86" cy="60" r="9" fill="#fff"/><circle cx="85" cy="60" r="4" fill="#1e272e"/>
            <circle cx="65" cy="42" r="10" fill="#fff"/><circle cx="65" cy="42" r="5" fill="#ff4757"/>
        `;
    } else {
        eyesHtml = `
            <circle cx="46" cy="56" r="11" fill="#fff"/><circle cx="44" cy="56" r="5" fill="#1e272e"/>
            <circle cx="84" cy="56" r="11" fill="#fff"/><circle cx="82" cy="56" r="5" fill="#1e272e"/>
            <path d="M36 44 L54 50" stroke="#1e272e" stroke-width="4" stroke-linecap="round"/>
            <path d="M94 44 L76 50" stroke="#1e272e" stroke-width="4" stroke-linecap="round"/>
        `;
    }

    const mouthHtml = isHurt ? `
        <!-- Перекошенный от леща рот и вылетающий зуб -->
        <ellipse cx="70" cy="92" rx="14" ry="11" fill="#1e272e"/>
        <rect x="64" y="81" width="7" height="7" fill="#fff" transform="rotate(15 64 81)"/>
    ` : `
        <!-- Зубастая пасть -->
        <path d="M40 86 Q65 106 90 86 Z" fill="#1e272e"/>
        <polygon points="48,88 53,96 58,88" fill="#fff"/>
        <polygon points="72,88 77,96 82,88" fill="#fff"/>
    `;

    return `
    <svg viewBox="0 0 130 140" class="char-svg">
        <ellipse cx="65" cy="132" rx="40" ry="8" fill="rgba(0,0,0,0.4)"/>
        ${hornsHtml}
        <!-- Тело монстра -->
        <path d="M22 115 C18 45, 35 24, 65 24 C95 24, 112 45, 108 115 C95 125, 35 125, 22 115 Z" fill="${m.color}" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
        <!-- Пузико -->
        <ellipse cx="65" cy="102" rx="26" ry="14" fill="${m.secondary}" opacity="0.5"/>
        ${eyesHtml}
        ${mouthHtml}
    </svg>`;
}

let state = JSON.parse(localStorage.getItem("mathRpgState_v3")) || {
    playerName: "Хранительница",
    lvl: 1,
    crystals: 0,
    activeNumbers: [2, 3, 4, 5, 6, 7, 8, 9]
};

let heroHp = 100;
let monsterIndex = 0;
let monsterHp = MONSTERS[0].maxHp;
let combo = 0;
let currentQ = null;
let questionStartTime = 0;
let retryQueue = [];
let isLocked = false;

let isControlMode = false;
let controlDeck = [];

function init() {
    renderNumberToggles();
    loadMonster(0);
    updateTopBar();
    nextQuestion();

    document.getElementById("edit-name-trigger").onclick = changePlayerName;
    document.getElementById("sound-toggle").onclick = () => {
        soundEnabled = !soundEnabled;
        document.getElementById("sound-toggle").textContent = soundEnabled ? "🔊" : "🔇";
    };
}

function saveState() {
    localStorage.setItem("mathRpgState_v3", JSON.stringify(state));
}

function changePlayerName() {
    const newName = prompt("Введи своё боевое имя:", state.playerName);
    if (newName && newName.trim().length > 0) {
        state.playerName = newName.trim().slice(0, 18);
        saveState();
        updateTopBar();
    }
}

function renderNumberToggles() {
    const container = document.getElementById("num-toggles");
    container.innerHTML = "";

    for (let n = 2; n <= 9; n++) {
        const btn = document.createElement("button");
        const isActive = !isControlMode && state.activeNumbers.includes(n);
        btn.className = "num-btn" + (isActive ? " active" : "");
        btn.textContent = n;
        btn.onclick = () => toggleNumber(n);
        container.appendChild(btn);
    }

    const ctrlBtn = document.createElement("button");
    ctrlBtn.className = "control-btn" + (isControlMode ? " active" : "");
    ctrlBtn.textContent = "🏆 Контроль";
    ctrlBtn.onclick = toggleControlMode;
    container.appendChild(ctrlBtn);
}

function toggleNumber(n) {
    if (isControlMode) {
        isControlMode = false;
        document.getElementById("arena-box").classList.remove("control-mode-arena");
        loadMonster(monsterIndex);
    }

    if (state.activeNumbers.includes(n)) {
        if (state.activeNumbers.length === 1) return;
        state.activeNumbers = state.activeNumbers.filter(x => x !== n);
    } else {
        state.activeNumbers.push(n);
    }
    saveState();
    renderNumberToggles();
    nextQuestion();
}

function toggleControlMode() {
    isControlMode = !isControlMode;
    const arena = document.getElementById("arena-box");

    if (isControlMode) {
        arena.classList.add("control-mode-arena");
        startControlExam();
    } else {
        arena.classList.remove("control-mode-arena");
        loadMonster(monsterIndex);
        setLog("Режим тренировки: раздавай лещей монстрам!");
        nextQuestion();
    }
    renderNumberToggles();
}

function buildControlDeck() {
    const pairs = [];
    for (let i = 2; i <= 9; i++) {
        for (let j = i; j <= 9; j++) {
            pairs.push(Math.random() < 0.5 ? { a: i, b: j } : { a: j, b: i });
        }
    }
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
}

function getCurrentMonsterObj() {
    return isControlMode ? CONTROL_BOSS : MONSTERS[monsterIndex];
}

function renderMonsterSprite(isHurt = false) {
    const m = getCurrentMonsterObj();
    document.getElementById("monster-sprite").innerHTML = generateMonsterSVG(m, isHurt);
}

function startControlExam() {
    controlDeck = buildControlDeck();
    monsterHp = CONTROL_BOSS.maxHp;
    heroHp = 100;
    combo = 0;

    document.getElementById("monster-name").textContent = CONTROL_BOSS.name;
    renderMonsterSprite(false);
    setLog("🔥 БИТВА ЗА ПЯТЁРКУ! Реши все 36 примеров подряд без ошибок!");
    updateTopBar();
    updateHpBars();
    nextQuestion();
}

function loadMonster(idx) {
    monsterIndex = idx % MONSTERS.length;
    const m = MONSTERS[monsterIndex];
    monsterHp = m.maxHp;
    document.getElementById("monster-name").textContent = m.name;
    renderMonsterSprite(false);
    updateHpBars();
}

function updateTopBar() {
    document.getElementById("hero-name").textContent = state.playerName;
    document.getElementById("player-lvl").textContent = state.lvl;
    document.getElementById("crystals").textContent = state.crystals;
    document.getElementById("combo").textContent = combo;
}

function updateHpBars() {
    const maxM = getCurrentMonsterObj().maxHp;
    document.getElementById("hero-hp-bar").style.width = `${Math.max(0, heroHp)}%`;
    document.getElementById("hero-hp-text").textContent = `${Math.max(0, heroHp)}/100`;

    document.getElementById("monster-hp-bar").style.width = `${Math.max(0, (monsterHp / maxM) * 100)}%`;
    document.getElementById("monster-hp-text").textContent = `${Math.max(0, monsterHp)}/${maxM}`;
}

function nextQuestion() {
    isLocked = false;
    document.getElementById("visual-hint").classList.add("hidden");

    let a, b;
    if (isControlMode) {
        const nextPair = controlDeck.pop();
        a = nextPair.a;
        b = nextPair.b;
    } else if (retryQueue.length > 0 && Math.random() < 0.45) {
        const item = retryQueue.shift();
        a = item.a;
        b = item.b;
        setLog("🎯 Реванш! Вспомни этот пример и дай леща:");
    } else {
        a = state.activeNumbers[Math.floor(Math.random() * state.activeNumbers.length)];
        b = Math.floor(Math.random() * 8) + 2;
    }

    const correct = a * b;
    currentQ = { a, b, correct };
    questionStartTime = Date.now();

    document.getElementById("question-box").textContent = `${a} × ${b} = ?`;

    const options = new Set([correct]);
    const offsets = [a, -a, b, -b, 2, -2, 4, -4, 10, -10];
    while (options.size < 4) {
        const offset = offsets[Math.floor(Math.random() * offsets.length)];
        const wrong = correct + offset;
        if (wrong > 2 && wrong !== correct) {
            options.add(wrong);
        } else {
            options.add(Math.floor(Math.random() * 65) + 8);
        }
    }

    const shuffled = Array.from(options).sort(() => Math.random() - 0.5);
    const grid = document.getElementById("answers-grid");
    grid.innerHTML = "";

    shuffled.forEach(val => {
        const btn = document.createElement("button");
        btn.className = "ans-btn";
        btn.textContent = val;
        btn.onclick = () => checkAnswer(val, btn);
        grid.appendChild(btn);
    });
}

// Запускает полноценную сцену разбега и отвешивания ЛЕЩА
function performSlapAttack(isCrit, popupText) {
    const heroWrap = document.getElementById("hero-wrap");
    const monsterSprite = document.getElementById("monster-sprite");
    const slapHand = document.getElementById("slap-hand");
    const slapSparks = document.getElementById("slap-sparks");

    // 1. Героиня разбегается к монстру
    heroWrap.classList.remove("hero-attack-run");
    void heroWrap.offsetWidth;
    heroWrap.classList.add("hero-attack-run");

    // 2. В момент подлета (через 160 мс) прилетает ладонь, звук леща и корчится лицо босса
    setTimeout(() => {
        playSound(isCrit ? "crit" : "slap");

        slapHand.textContent = isCrit ? "🫱" : "👋";
        slapHand.classList.remove("active");
        slapSparks.classList.remove("active");
        void slapHand.offsetWidth;
        slapHand.classList.add("active");
        slapSparks.classList.add("active");

        // Меняем лицо монстра на побитое (X_X) и сплющиваем его
        renderMonsterSprite(true);
        monsterSprite.classList.remove("monster-slapped");
        void monsterSprite.offsetWidth;
        monsterSprite.classList.add("monster-slapped");

        showDamagePopup(popupText);
    }, 160);

    // 3. Возвращаем обычное лицо монстру, если он еще жив
    setTimeout(() => {
        if (monsterHp > 0) renderMonsterSprite(false);
    }, 680);
}

function checkAnswer(selected, btnElement) {
    if (isLocked) return;
    isLocked = true;

    const timeSpent = (Date.now() - questionStartTime) / 1000;

    if (selected === currentQ.correct) {
        btnElement.classList.add("correct");
        combo++;

        const slapWords = ["ЛЕЩ!", "СОЧНЫЙ ЛЕЩ!", "ШЛЕП!", "БАЦ!", "В ЩИ!"];
        const randomWord = slapWords[Math.floor(Math.random() * slapWords.length)];

        if (isControlMode) {
            monsterHp -= 1;
            state.crystals += 1;
            performSlapAttack(false, `👋 ${randomWord} -1`);
            setLog(`✅ Четко! Осталось примеров до Пятёрки: ${monsterHp}`);
        } else {
            const isCrit = timeSpent < 3.5;
            const baseDmg = 4 + Math.min(2, Math.floor(combo / 3));
            const finalDmg = isCrit ? baseDmg + 2 : baseDmg;
            const earnedCrystals = isCrit ? 2 : 1;

            monsterHp -= finalDmg;
            state.crystals += earnedCrystals;

            const text = isCrit ? `🔥 МЕГА-ЛЕЩ -${finalDmg}!` : `👋 ${randomWord} -${finalDmg}`;
            performSlapAttack(isCrit, text);
            setLog(isCrit ? `⚡ Сверхзвуковой лещ! Урон ${finalDmg} и +${earnedCrystals} 💎` : `👏 Хороший шлепок! Урон ${finalDmg} и +${earnedCrystals} 💎`);
        }

        updateTopBar();
        updateHpBars();
        saveState();

        if (monsterHp <= 0) {
            setTimeout(handleMonsterDefeat, 750);
        } else {
            setTimeout(nextQuestion, 850);
        }
    } else {
        // ОШИБКА: Монстр контратакует!
        btnElement.classList.add("wrong");
        combo = 0;
        playSound("wrong");

        document.querySelectorAll(".ans-btn").forEach(b => {
            if (Number(b.textContent) === currentQ.correct) b.classList.add("correct");
        });

        const monsterWrap = document.getElementById("monster-wrap");
        monsterWrap.classList.remove("monster-attack-run");
        void monsterWrap.offsetWidth;
        monsterWrap.classList.add("monster-attack-run");

        showVisualHint(currentQ.a, currentQ.b, currentQ.correct);

        if (isControlMode) {
            heroHp = Math.max(10, heroHp - 30);
            setLog(`❌ Промах! ${currentQ.a} × ${currentQ.b} = ${currentQ.correct}. Пятёрка увернулась — начинаем Контроль заново!`);
            updateTopBar();
            updateHpBars();
            setTimeout(startControlExam, 3500);
        } else {
            heroHp = Math.max(10, heroHp - 15);
            setLog(`🛡️ Босс куснул в ответ! ${currentQ.a} × ${currentQ.b} = ${currentQ.correct}. Запомни и отомсти!`);
            retryQueue.push({ a: currentQ.a, b: currentQ.b });
            updateTopBar();
            updateHpBars();
            setTimeout(nextQuestion, 3200);
        }
    }
}

function showVisualHint(a, b, total) {
    const hintBox = document.getElementById("visual-hint");
    hintBox.classList.remove("hidden");
    hintBox.innerHTML = `<div>Подсказка: <b>${a}</b> рядов по <b>${b}</b> точек = <b>${total}</b></div>`;

    const grid = document.createElement("div");
    grid.className = "hint-grid";
    grid.style.gridTemplateColumns = `repeat(${b}, 13px)`;

    for (let i = 0; i < total; i++) {
        const dot = document.createElement("div");
        dot.className = "hint-dot";
        grid.appendChild(dot);
    }
    hintBox.appendChild(grid);
}

function handleMonsterDefeat() {
    state.lvl++;
    const bonusCrystals = isControlMode ? 25 : 10;
    state.crystals += bonusCrystals;
    heroHp = 100;
    saveState();
    updateTopBar();

    if (typeof confetti === "function") {
        confetti({
            particleCount: isControlMode ? 160 : 85,
            spread: 80,
            origin: { y: 0.6 }
        });
    }

    if (isControlMode) {
        setLog(`🏆 НОКАУТ! Ты отвесила 36 лещей без единой ошибки и забрала ПЯТЁРКУ! (+${bonusCrystals} 💎)`);
        setTimeout(() => {
            isControlMode = false;
            document.getElementById("arena-box").classList.remove("control-mode-arena");
            renderNumberToggles();
            loadMonster(monsterIndex);
            nextQuestion();
        }, 4000);
    } else {
        setLog(`🎉 Босс улетел в нокаут! +${bonusCrystals} 💎 и следующий соперник!`);
        setTimeout(() => {
            loadMonster(monsterIndex + 1);
            nextQuestion();
        }, 1500);
    }
}

function showDamagePopup(text) {
    const popup = document.getElementById("dmg-popup");
    popup.textContent = text;
    popup.classList.remove("show");
    void popup.offsetWidth;
    popup.classList.add("show");
}

function setLog(msg) {
    document.getElementById("battle-log").textContent = msg;
}

init();
