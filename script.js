// Новые боссы с увеличенным запасом HP
const MONSTERS = [
    { name: "Хитрый Лис Пересчет", avatar: "🦊", maxHp: 50 },
    { name: "Сова Задачкина", avatar: "🦉", maxHp: 65 },
    { name: "Кибер-Калькулятор", avatar: "🤖", maxHp: 80 },
    { name: "Паук Путаник", avatar: "🕸️", maxHp: 95 },
    { name: "Призрак Забытых Цифр", avatar: "🔮", maxHp: 110 },
    { name: "Повелительница Иксов", avatar: "👑", maxHp: 130 }
];

// Специальный босс для режима "Контроль" (36 уникальных пар таблицы умножения)
const CONTROL_BOSS = {
    name: "Пятёрка по Математике",
    avatar: "🌟",
    maxHp: 36
};

let state = JSON.parse(localStorage.getItem("mathRpgState_v2")) || {
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

// Переменные для режима "Контроль"
let isControlMode = false;
let controlDeck = [];

function init() {
    renderNumberToggles();
    loadMonster(0);
    updateTopBar();
    nextQuestion();

    document.getElementById("edit-name-trigger").onclick = changePlayerName;
}

function saveState() {
    localStorage.setItem("mathRpgState_v2", JSON.stringify(state));
}

// Смена имени игрока
function changePlayerName() {
    const newName = prompt("Введи своё имя для битвы:", state.playerName);
    if (newName && newName.trim().length > 0) {
        state.playerName = newName.trim().slice(0, 18);
        saveState();
        updateTopBar();
    }
}

// Отрисовка кнопок чисел 2..9 + кнопка "Контроль"
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

// Включение / выключение режима "Контроль"
function toggleControlMode() {
    isControlMode = !isControlMode;
    const arena = document.getElementById("arena-box");

    if (isControlMode) {
        arena.classList.add("control-mode-arena");
        startControlExam();
    } else {
        arena.classList.remove("control-mode-arena");
        loadMonster(monsterIndex);
        setLog("Режим тренировки: выбирай правильные ответы!");
        nextQuestion();
    }
    renderNumberToggles();
}

// Формируем колоду из всех 36 уникальных примеров таблицы умножения (от 2х2 до 9х9)
function buildControlDeck() {
    const pairs = [];
    for (let i = 2; i <= 9; i++) {
        for (let j = i; j <= 9; j++) {
            // Случайно меняем множители местами (например 6x7 или 7x6)
            if (Math.random() < 0.5) {
                pairs.push({ a: i, b: j });
            } else {
                pairs.push({ a: j, b: i });
            }
        }
    }
    // Перемешиваем по алгоритму Фишера-Йетса
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    return pairs;
}

function startControlExam() {
    controlDeck = buildControlDeck();
    monsterHp = CONTROL_BOSS.maxHp;
    heroHp = 100;
    combo = 0;

    document.getElementById("monster-avatar").textContent = CONTROL_BOSS.avatar;
    document.getElementById("monster-name").textContent = CONTROL_BOSS.name;
    setLog("🔥 ЭКЗАМЕН НА ПЯТЁРКУ! Ответь на все 36 примеров без единой ошибки!");
    updateTopBar();
    updateHpBars();
    nextQuestion();
}

function loadMonster(idx) {
    monsterIndex = idx % MONSTERS.length;
    const m = MONSTERS[monsterIndex];
    monsterHp = m.maxHp;
    document.getElementById("monster-avatar").textContent = m.avatar;
    document.getElementById("monster-name").textContent = m.name;
    updateHpBars();
}

function updateTopBar() {
    document.getElementById("hero-name").textContent = state.playerName;
    document.getElementById("player-lvl").textContent = state.lvl;
    document.getElementById("crystals").textContent = state.crystals;
    document.getElementById("combo").textContent = combo;
}

function updateHpBars() {
    const maxM = isControlMode ? CONTROL_BOSS.maxHp : MONSTERS[monsterIndex].maxHp;
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
        setLog("🎯 Реванш! Попробуй снова решить этот пример:");
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

function checkAnswer(selected, btnElement) {
    if (isLocked) return;
    isLocked = true;

    const timeSpent = (Date.now() - questionStartTime) / 1000;

    if (selected === currentQ.correct) {
        btnElement.classList.add("correct");
        combo++;

        if (isControlMode) {
            // В режиме Контроля каждый правильный ответ снимает ровно 1 HP из 36
            monsterHp -= 1;
            state.crystals += 1;

            showDamagePopup(`-1 (Осталось: ${monsterHp})`);
            triggerShake("monster-card");
            setLog(`✅ Верно! До Пятёрки осталось решить примеров: ${monsterHp}`);
        } else {
            // Обычный режим: значительно уменьшенный урон и кристаллы
            const isCrit = timeSpent < 3.5;
            const baseDmg = 4 + Math.min(2, Math.floor(combo / 3)); // 4..6 урона
            const finalDmg = isCrit ? baseDmg + 2 : baseDmg; // макс 8 урона при крите
            const earnedCrystals = isCrit ? 2 : 1; // 1 кристалл (или 2 за быстрый ответ)

            monsterHp -= finalDmg;
            state.crystals += earnedCrystals;

            showDamagePopup(isCrit ? `💥 КРИТ -${finalDmg}!` : `-${finalDmg}`);
            triggerShake("monster-card");
            setLog(isCrit ? `⚡ Быстрый ответ! Урон ${finalDmg} и +${earnedCrystals} 💎` : `✨ Точно в цель! Урон ${finalDmg} и +${earnedCrystals} 💎`);
        }

        updateTopBar();
        updateHpBars();
        saveState();

        if (monsterHp <= 0) {
            setTimeout(handleMonsterDefeat, 600);
        } else {
            setTimeout(nextQuestion, 750);
        }
    } else {
        // ОШИБКА
        btnElement.classList.add("wrong");
        combo = 0;

        document.querySelectorAll(".ans-btn").forEach(b => {
            if (Number(b.textContent) === currentQ.correct) b.classList.add("correct");
        });

        triggerShake("hero-card");
        showVisualHint(currentQ.a, currentQ.b, currentQ.correct);

        if (isControlMode) {
            // В режиме Контроля любая ошибка полностью сбрасывает прогресс босса!
            heroHp = Math.max(10, heroHp - 30);
            setLog(`❌ Ошибка! ${currentQ.a} × ${currentQ.b} = ${currentQ.correct}. Пятёрка сорвалась — начинаем Контроль сначала!`);
            updateTopBar();
            updateHpBars();

            setTimeout(() => {
                startControlExam();
            }, 3500);
        } else {
            heroHp = Math.max(10, heroHp - 15);
            setLog(`🛡️ Промах! ${currentQ.a} × ${currentQ.b} = ${currentQ.correct}. Запомни, скоро повторим!`);
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
    grid.style.gridTemplateColumns = `repeat(${b}, 15px)`;

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
            particleCount: isControlMode ? 160 : 80,
            spread: 80,
            origin: { y: 0.6 }
        });
    }

    if (isControlMode) {
        setLog(`🏆 ГРАНДИОЗНАЯ ПОБЕДА! Ты решила всю таблицу без единой ошибки и получила ПЯТЁРКУ! (+${bonusCrystals} 💎)`);
        setTimeout(() => {
            isControlMode = false;
            document.getElementById("arena-box").classList.remove("control-mode-arena");
            renderNumberToggles();
            loadMonster(monsterIndex);
            nextQuestion();
        }, 4000);
    } else {
        setLog(`🎉 Босс повержен! +${bonusCrystals} 💎 и переход на следующий уровень!`);
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

function triggerShake(elementId) {
    const el = document.getElementById(elementId);
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
}

function setLog(msg) {
    document.getElementById("battle-log").textContent = msg;
}

init();
