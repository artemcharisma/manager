// assets/js/training.js

const DB_KEY_TRAIN = 'protocol_training_sys';

const DefaultTraining = {
    currentProgram: "A",
    weeks: [] // Structure: { id, name, days: [ {id, name, exercises: [] } ] }
};

const App = {
    data: null,
    state: {
        activeWeekId: null,
        activeDayId: null,
        expandedEx: new Set(), // Для збереження відкритих вправ
        timer: { time: 0, interval: null, running: false },
        editing: false
    },

    init() {
        // 1. Завантаження даних
        const loaded = Utils.load(DB_KEY_TRAIN, null);
        if(loaded) {
            this.data = loaded;
            // Міграція старих даних якщо треба
            if(!this.data.weeks) this.data = { currentProgram: "A", weeks: loaded }; 
        } else {
            this.data = JSON.parse(JSON.stringify(DefaultTraining));
            this.addWeek("Тиждень 1");
        }

        // 2. Визначення активного дня
        if(this.data.weeks.length > 0) {
            const lastWeek = this.data.weeks[this.data.weeks.length - 1];
            this.state.activeWeekId = lastWeek.id;
            if(lastWeek.days.length > 0) {
                // Шукаємо перший незавершений день або останній
                this.state.activeDayId = lastWeek.days[lastWeek.days.length - 1].id;
            }
        }

        this.render();
        this.initTimerUI();
    },

    save() {
        Utils.save(DB_KEY_TRAIN, this.data);
    },

    // --- NAVIGATION ---
    getWeek(id) { return this.data.weeks.find(w => w.id === id); },
    getDay(wid, did) { 
        const w = this.getWeek(wid); 
        return w ? w.days.find(d => d.id === did) : null; 
    },
    getCurrentDay() { return this.getDay(this.state.activeWeekId, this.state.activeDayId); },

    switchWeek(id) {
        this.state.activeWeekId = id;
        const w = this.getWeek(id);
        if(w && w.days.length > 0) this.state.activeDayId = w.days[0].id;
        this.render();
    },
    switchDay(id) {
        this.state.activeDayId = id;
        this.render();
    },

    // --- CRUD OPERATIONS ---
    addWeek(name) {
        const id = Utils.id();
        const num = this.data.weeks.length + 1;
        this.data.weeks.push({
            id: id,
            name: name || `Week ${num}`,
            days: []
        });
        this.state.activeWeekId = id;
        this.addDay(id, "День 1"); // Автоматично додаємо перший день
        this.save(); this.render();
    },

    addDay(wid, name) {
        const w = this.getWeek(wid);
        if(!w) return;
        const id = Utils.id();
        w.days.push({ id: id, name: name || "New Day", exercises: [] });
        this.state.activeDayId = id;
        this.save(); this.render();
    },

    addExercise(dayId) {
        const day = this.getCurrentDay();
        if(!day) return;
        const name = prompt("Назва вправи (напр. Жим лежачи):");
        if(!name) return;
        
        day.exercises.push({
            id: Utils.id(),
            name: name,
            sets: [{w:0, r:0, done:false}] // Перший розминочний сет
        });
        this.save(); this.render();
    },

    deleteExercise(exIdx) {
        if(!confirm("Видалити вправу?")) return;
        const day = this.getCurrentDay();
        day.exercises.splice(exIdx, 1);
        this.save(); this.render();
    },

    renameDay() {
        const d = this.getCurrentDay();
        if(!d) return;
        const n = prompt("Нова назва дня:", d.name);
        if(n) { d.name = n; this.save(); this.render(); }
    },

    // --- SETS LOGIC ---
    updateSet(exIdx, setIdx, field, val) {
        const day = this.getCurrentDay();
        const set = day.exercises[exIdx].sets[setIdx];
        set[field] = parseFloat(val) || 0;
        this.save();
        // Не робимо повний ререндер, щоб не втрачати фокус вводу
    },

    toggleSet(exIdx, setIdx) {
        const day = this.getCurrentDay();
        const set = day.exercises[exIdx].sets[setIdx];
        set.done = !set.done;
        
        // Вібрація при завершенні
        if(set.done && navigator.vibrate) navigator.vibrate(50);
        
        this.save(); this.render();
    },

    addSet(exIdx) {
        const day = this.getCurrentDay();
        const ex = day.exercises[exIdx];
        const lastSet = ex.sets[ex.sets.length - 1];
        // Копіюємо вагу з попереднього сету для зручності
        ex.sets.push({ w: lastSet ? lastSet.w : 0, r: 0, done: false });
        this.save(); this.render();
    },

    delSet(exIdx, setIdx) {
        const day = this.getCurrentDay();
        day.exercises[exIdx].sets.splice(setIdx, 1);
        this.save(); this.render();
    },

    // --- RENDERING ---
    render() {
        const c = document.getElementById('app-container');
        if(!c) return;

        // 1. Header & Week Nav
        let html = `
        <div class="train-header">
            <div class="week-scroller">
                ${this.data.weeks.map(w => `
                    <div class="week-chip ${w.id === this.state.activeWeekId ? 'active' : ''}" 
                         onclick="App.switchWeek(${w.id})">${w.name}</div>
                `).join('')}
                <div class="week-chip add" onclick="App.addWeek()">+</div>
            </div>
        </div>`;

        // 2. Days Nav
        const activeWeek = this.getWeek(this.state.activeWeekId);
        if(activeWeek) {
            html += `<div class="days-bar">`;
            activeWeek.days.forEach(d => {
                html += `<div class="day-tab ${d.id === this.state.activeDayId ? 'active' : ''}" 
                              onclick="App.switchDay(${d.id})">${d.name}</div>`;
            });
            html += `<div class="day-tab add" onclick="App.addDay(${activeWeek.id})">+</div></div>`;
        }

        // 3. Main Content
        const day = this.getCurrentDay();
        if(day) {
            html += `<div class="workout-area">`;
            
            // Header дня з налаштуваннями
            html += `
            <div class="day-tools">
                <h2 onclick="App.renameDay()">${day.name} ✎</h2>
                <div class="dt-actions">
                    <button class="btn-timer" onclick="App.toggleTimerBox()">⏱ ТАЙМЕР</button>
                    <button class="btn-icon" onclick="App.exportData()">📤</button>
                </div>
            </div>`;

            if(day.exercises.length === 0) {
                html += `<div class="empty-state">День відпочинку або новий спліт.<br>Додай вправу 👇</div>`;
            }

            // Список вправ
            day.exercises.forEach((ex, exIdx) => {
                const totalVol = ex.sets.filter(s=>s.done).reduce((acc,s) => acc + (s.w * s.r), 0);
                
                html += `
                <div class="ex-card">
                    <div class="ex-header">
                        <div class="ex-title">
                            <h3>${ex.name}</h3>
                            <small>Об'єм: ${totalVol} кг</small>
                        </div>
                        <div class="ex-menu" onclick="App.deleteExercise(${exIdx})">✕</div>
                    </div>
                    
                    <div class="sets-list">
                        <div class="set-header">
                            <span>SET</span><span>KG</span><span>REPS</span><span>✓</span>
                        </div>
                        ${ex.sets.map((s, sIdx) => `
                            <div class="set-row ${s.done ? 'done' : ''}">
                                <div class="sr-num">${sIdx + 1}</div>
                                <input type="number" class="sr-inp" value="${s.w}" placeholder="0" 
                                       onchange="App.updateSet(${exIdx}, ${sIdx}, 'w', this.value)">
                                <input type="number" class="sr-inp" value="${s.r}" placeholder="0" 
                                       onchange="App.updateSet(${exIdx}, ${sIdx}, 'r', this.value)">
                                <div class="sr-check" onclick="App.toggleSet(${exIdx}, ${sIdx})">
                                    ${s.done ? '✔' : ''}
                                </div>
                                <div class="sr-del" onclick="App.delSet(${exIdx}, ${sIdx})">✕</div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn-add-set" onclick="App.addSet(${exIdx})">+ СЕТ</button>
                </div>`;
            });

            html += `<button class="btn-big-add" onclick="App.addExercise()">+ НОВА ВПРАВА</button>`;
            html += `</div>`; // Close workout-area
        }

        c.innerHTML = html;
        this.updateTimerDisplay();
    },

    // --- TIMER LOGIC ---
    toggleTimerBox() {
        const box = document.getElementById('timer-overlay');
        box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
    },
    
    initTimerUI() {
        // Створюємо елементи таймера, якщо їх немає в HTML
        if(!document.getElementById('timer-overlay')) {
            const div = document.createElement('div');
            div.id = 'timer-overlay';
            div.className = 'timer-overlay';
            div.style.display = 'none';
            div.innerHTML = `
                <div class="timer-box">
                    <div class="timer-digits" id="timer-disp">00:00</div>
                    <div class="timer-controls">
                        <button onclick="App.startTimer(30)">30s</button>
                        <button onclick="App.startTimer(60)">60s</button>
                        <button onclick="App.startTimer(90)">90s</button>
                        <button onclick="App.startTimer(120)">2m</button>
                    </div>
                    <div class="timer-actions">
                        <button class="btn-stop" onclick="App.stopTimer()">СТОП</button>
                        <button class="btn-hide" onclick="App.toggleTimerBox()">▼</button>
                    </div>
                </div>
            `;
            document.body.appendChild(div);
        }
    },

    startTimer(seconds) {
        this.stopTimer();
        this.state.timer.time = seconds;
        this.state.timer.running = true;
        this.updateTimerDisplay();
        
        this.state.timer.interval = setInterval(() => {
            if(this.state.timer.time > 0) {
                this.state.timer.time--;
                this.updateTimerDisplay();
            } else {
                this.stopTimer();
                if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
                alert("⏰ ЧАС ВИЙШОВ!");
            }
        }, 1000);
    },

    stopTimer() {
        clearInterval(this.state.timer.interval);
        this.state.timer.running = false;
        this.state.timer.time = 0;
        this.updateTimerDisplay();
    },

    updateTimerDisplay() {
        const el = document.getElementById('timer-disp');
        if(!el) return;
        const m = Math.floor(this.state.timer.time / 60).toString().padStart(2, '0');
        const s = (this.state.timer.time % 60).toString().padStart(2, '0');
        el.innerText = `${m}:${s}`;
    },

    // --- IMPORT/EXPORT ---
    exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = "protocol_training.json";
        a.click();
    },
    
    importTrigger() {
        document.getElementById('fileInput').click();
    },
    
    importData(input) {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if(json.weeks) {
                    this.data = json;
                    this.save();
                    location.reload();
                } else {
                    alert("Невірний формат файлу");
                }
            } catch(err) {
                alert("Помилка читання JSON");
            }
        };
        reader.readAsText(file);
    }
};

window.onload = () => App.init();
