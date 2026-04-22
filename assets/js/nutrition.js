const DB_KEY = 'protocol_sys_plus_days';

const DefaultBank = {
    "Вівсянка": {p:13, f:6, c:68, k:380},
    "Рис": {p:2.7, f:0.3, c:28, k:130},
    "Гречка": {p:4, f:1, c:21, k:110},
    "Макарони": {p:5, f:1, c:30, k:150},
    "Картопля": {p:2, f:0, c:17, k:77},
    "Куряче філе": {p:23, f:1, c:0, k:110},
    "Яловичина": {p:20, f:10, c:0, k:180},
    "Яйце (1шт)": {p:6, f:5, c:0.5, k:70, unit:true},
    "Білок яєчний": {p:3, f:0, c:0, k:15, unit:true},
    "Сир кисломолочний": {p:18, f:5, c:2, k:120},
    "Олія оливкова": {p:0, f:100, c:0, k:884},
    "Горіхи": {p:15, f:60, c:10, k:650},
    "Авокадо": {p:2, f:15, c:9, k:160},
    "Банан": {p:1, f:0, c:21, k:90},
    "Протеїн (1 порція)": {p:24, f:1, c:2, k:110, unit:true}
};

const App = {
    data: { 
        bank: DefaultBank, 
        targets: {p:200, f:80, c:300, k:2700}, 
        days: [],
        schedule: {}
    },
    state: { mid: null, fidx: null, editName: null, currentDayId: null, tempFood: null, mealBuffer: null, dayBuffer: null },
    history: [],
    _sortables: [], // Кеш для об'єктів Sortable
    _daySorter: null,
    _dayModalSorter: null,
    
    // Функція для жорсткого знищення старих обробників
    clearSortables() {
        if (this._sortables && this._sortables.length > 0) {
            this._sortables.forEach(s => { if(s && typeof s.destroy === 'function') s.destroy(); });
        }
        this._sortables = [];
    },

    async init() {
        // КРИТИЧНИЙ ФІКС: Тепер ми чекаємо реальні дані, а не Promise
        const loadedData = await Utils.load(DB_KEY, null);

        if(loadedData) {
            this.data = loadedData;
            if (!this.data.schedule) this.data.schedule = {};
            
            if(!loadedData.days) {
                this.data.bank = loadedData.bank || DefaultBank;
                this.data.targets = loadedData.targets;
                this.data.days = [{id: Utils.id(), name: "Мій день", targets: {...loadedData.targets}, meals: loadedData.meals || []}];
            } else {
                this.data.days.forEach(d => {
                    if (!d.targets) d.targets = { ...this.data.targets };
                    
                    // НОВЕ: Примусово згортаємо всі прийоми їжі, які вже були в базі
                    if (d.meals) {
                        d.meals.forEach(m => {
                            if (typeof m.isCollapsed === 'undefined') m.isCollapsed = true;
                        });
                    }
                });
            }
            this.data.bank = {...DefaultBank, ...this.data.bank};
        } else {
            this.addDay("Мій день", true);
            this.data.schedule = {};
        }
        
        if (!this.data.schedule) this.data.schedule = {};
        
        const todayNum = new Date().getDay(); 
        const mapDay = todayNum === 0 ? 7 : todayNum; 
        const schedDayId = this.data.schedule[mapDay.toString()];

        if (schedDayId && this.data.days.find(d => String(d.id) === String(schedDayId))) {
            this.state.currentDayId = Number(schedDayId); 
        } else if(!this.state.currentDayId && this.data.days.length > 0) {
            this.state.currentDayId = this.data.days[0].id;
        }
        
        this.setupHardReset();
        this.render();
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        this.setupSpacebarNavigation();
        
        this.attachDragScroll('#dayBar'); // <--- Цей рядок у тебе вже є
        
        // --- ДОДАЄМО DRAG & DROP ДЛЯ ДНІВ ---
        const dayBarContainer = document.getElementById('dayBar');
        if (dayBarContainer) {
            Sortable.create(dayBarContainer, {
                animation: 200,
                direction: 'horizontal',
                draggable: '.day-tab', 
                delay: 300, 
                delayOnTouchOnly: false, 
                fallbackTolerance: 5,
                chosenClass: 'sortable-chosen-day', // <--- ДОДАНО ЦЕЙ РЯДОК
                ghostClass: 'sortable-ghost-day',
                onStart: function () {
                    window.isSortingDay = true; 
                },
                onEnd: (evt) => {
                    window.isSortingDay = false; 
                    if (evt.oldIndex !== evt.newIndex) {
                        this.reorderDays(evt.oldIndex, evt.newIndex);
                        if(window.Haptics) window.Haptics.light();
                    }
                }
            });
        }
    }, // <-- Це кінець функції init()

    // --- ПЛАВНИЙ ПК-СКРОЛ ТА СВАЙП ---
    attachDragScroll(selector) {
        const sliders = document.querySelectorAll(selector);
        sliders.forEach(slider => {
            if (slider.dataset.scrollAttached === 'true') return; 
            slider.dataset.scrollAttached = 'true';
            
            slider.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    slider.scrollLeft += e.deltaY;
                }
            });

            let isDown = false;
            let startX;
            let scrollLeft;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.cursor = 'grabbing';
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.cursor = 'pointer';
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.cursor = 'pointer';
            });
            slider.addEventListener('mousemove', (e) => {
                // КРИТИЧНИЙ ФІКС: Блокуємо скрол, якщо йде сортування вкладки
                if (!isDown || window.isSortingDay) return; 
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 1.5; 
                slider.scrollLeft = scrollLeft - walk;
            });
        });
    },

    setupHardReset() {
        const brandBlock = document.getElementById('brandBlock');
        if(!brandBlock) return;
        
        const brandIcon = brandBlock.querySelector('.brand-icon');
        brandBlock.onclick = () => {
            brandIcon.classList.remove('hint-active');
            void brandIcon.offsetWidth; 
            brandIcon.classList.add('hint-active');
        };
        brandBlock.ondblclick = async () => {
            if(await Modal.confirm("⚠ HARD RESET?<br><br><span style='color:var(--text-dim)'>Видалити абсолютно всі дані харчування?</span>", "КРИТИЧНО", "red")) {
                localStorage.removeItem(DB_KEY);
                location.reload();
            }
        };
    },
    // НОВА ФУНКЦІЯ: Обробка Enter для ВСІХ модалок
    handleGlobalKeydown(e) {
        if (e.key === 'Enter') {
            const isVisible = (id) => {
                const el = document.getElementById(id);
                return el && window.getComputedStyle(el).display !== 'none';
            };
            
            if (isVisible('dayEditModal')) { e.preventDefault(); this.saveDayName(); }
            else if (isVisible('scheduleModal')) { e.preventDefault(); this.saveSchedule(); }
            else if (isVisible('waterModal')) { e.preventDefault(); this.saveWater(); }
            else if (isVisible('targetsModal')) { e.preventDefault(); this.saveTargets(); }
            else if (isVisible('foodModal')) { 
                // Не зберігаємо на Enter, якщо ми просто вводимо назву для пошуку продукту
                if(document.activeElement && document.activeElement.id !== 'inpName') {
                    e.preventDefault(); this.saveFood(); 
                }
            }
            else if (isVisible('bankEditModal')) { e.preventDefault(); this.saveBankItem(); }
            // Додай цей рядок перед else if (isVisible('scheduleModal'))
            else if (isVisible('orderModal')) { e.preventDefault(); this.closeModal(); }
        }
    },

    setupSpacebarNavigation() {
        // Групи інпутів, між якими треба стрибати через пробіл
        const groups = [
            ['inpWeight', 'inpP', 'inpF', 'inpC', 'inpK'], // Модалка продукту
            ['bankInpP', 'bankInpF', 'bankInpC', 'bankInpK'], // Модалка бази (пропускаємо назву, щоб там пробіл працював як пробіл)
            ['tgP', 'tgF', 'tgC', 'tgK'], // Модалка цілей
            ['inpWaterL', 'inpWaterMl'],  // Вода
            ['inpSodium', 'inpPotassium'] // Електроліти
        ];

        groups.forEach(group => {
            group.forEach((id, index) => {
                const el = document.getElementById(id);
                if(el) {
                    el.addEventListener('keydown', (e) => {
                        if (e.key === ' ') {
                            e.preventDefault(); // Зупиняємо друк пробілу
                            const nextId = group[index + 1];
                            if (nextId) {
                                const nextEl = document.getElementById(nextId);
                                if (nextEl) {
                                    nextEl.focus();
                                    nextEl.select(); // Одразу виділяємо текст для швидкої заміни
                                }
                            }
                        }
                    });
                }
            });
        });
    },
    toggleFab(show) {
        const fab = document.getElementById('sys-fab');
        if(fab) fab.style.display = show ? 'flex' : 'none';
    },

    lockScroll() {
        if (document.body.classList.contains('modal-active')) return; 
        this.state.lockedScrollY = window.scrollY; 
        document.body.classList.add('modal-active'); // Тепер фіксер бачить модалку!
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.state.lockedScrollY}px`;
        document.body.style.width = '100%';
    },

    unlockScroll() {
        if (!document.body.classList.contains('modal-active')) return;
        const scrollY = this.state.lockedScrollY || 0;
        
        document.body.classList.remove('modal-active');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        
        // ФІКС 1: Змушуємо браузер перерахувати макет перед скролом!
        void document.body.offsetHeight; 
        
        window.scrollTo({ left: 0, top: scrollY, behavior: 'instant' });
    },
    
    // ДОДАНО: Таймер для відкладеного збереження
    saveTimer: null,
    
    save() {
        // UI (прогрес-бари, калорії) оновлюємо миттєво
        this.updateStats();
        
        // Важкий I/O запис на диск телефону відкладаємо
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            Utils.save(DB_KEY, this.data);
            this.saveTimer = null;
        }, 800); // Чекаємо 800мс після останнього кліку/вводу
    },

    // ДОДАНО: Екстрений запис
    forceSave() {
        Utils.save(DB_KEY, this.data);
    },
    
    pushHistory() {
        if(this.history.length > 3) this.history.shift();
        // Використовуємо новий швидкий метод з utils.js
        this.history.push(Utils.deepClone(this.data));
        const undoFloat = document.getElementById('undoFloat');
        if(undoFloat) undoFloat.classList.add('visible');
    },
    
    undo() {
        if(!this.history.length) return;
        // Відновлюємо безпечно клонований стейт
        this.data = Utils.deepClone(this.history.pop());
        
        if(!this.history.length) {
            const undoFloat = document.getElementById('undoFloat');
            if(undoFloat) undoFloat.classList.remove('visible');
        }
        
        if(!this.data.days.find(d => d.id === this.state.currentDayId)) {
            this.state.currentDayId = this.data.days.length > 0 ? this.data.days[0].id : null;
        }
        
        this.save(); 
        this.renderDaysBar(); 
        this.render(false);   
        
        if(window.Haptics) window.Haptics.light();
    },
    getCurrentDay() {
        return this.data.days.find(d => d.id === this.state.currentDayId);
    },

    addDay(name = null, silent=false) {
       if(!silent) this.pushHistory();
        if(!name) {
            name = Utils.date();
        }
        const id = Utils.id();
        
        // РОЗУМНЕ УСПАДКУВАННЯ: Беремо цілі з попереднього дня (або глобальні)
        const prevDay = this.data.days[this.data.days.length - 1];
        const newTargets = prevDay && prevDay.targets ? { ...prevDay.targets } : { ...this.data.targets };

        const newDay = {
            id: id, name: name, 
            targets: newTargets, // Тепер день має власні цілі
            meals: [
                {id: id+1, name:"Сніданок", foods:[], isCollapsed: true},
                {id: id+2, name:"Обід", foods:[], isCollapsed: true},
                {id: id+3, name:"Вечеря", foods:[], isCollapsed: true}
            ]
        };
        this.data.days.push(newDay);
        this.state.currentDayId = id;
        if(!silent) { 
            this.save(); 
            this.render(); 
            
            // ПРО-ФІКС: Плавний автоскрол до новоствореного дня
            setTimeout(() => {
                const bar = document.getElementById('dayBar');
                if(bar) bar.scrollTo({ left: bar.scrollWidth, behavior: 'smooth' });
            }, 50); // Мікрозатримка, щоб DOM встиг намалювати нову кнопку
        }
    },
    duplicateDay() {
        const day = this.getCurrentDay();
        if(!day) return;
        this.pushHistory();
        const id = Utils.id();
        const newDay = JSON.parse(JSON.stringify(day));
        newDay.id = id;
        newDay.name = day.name + " (Копія)";
        newDay.meals.forEach((m, index) => m.id = id + index + 1);
        this.data.days.push(newDay);
        this.state.currentDayId = id;
        this.save(); 
        this.render();
        
        // Автоскрол і для дублювання теж
        setTimeout(() => {
            const bar = document.getElementById('dayBar');
            if(bar) bar.scrollTo({ left: bar.scrollWidth, behavior: 'smooth' });
        }, 50);
    },
    copyDayData() {
        const day = this.getCurrentDay();
        if (!day) return;
        
        // Зберігаємо клоновані дані в буфер
        this.state.dayBuffer = Utils.deepClone({ 
            meals: day.meals, 
            targets: day.targets, 
            name: day.name 
        });
        this.closeModal();
        
        const toast = document.createElement('div');
        toast.innerText = "📅 День скопійовано в буфер";
        toast.style.cssText = "position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#222; color:var(--theme); padding:10px 20px; border-radius:20px; z-index:9999; border:1px solid var(--theme); font-family:sans-serif; font-size:0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    },

    async pasteDayData() {
        if (!this.state.dayBuffer) return;
        if (!(await Modal.confirm(`⚠️ Перезаписати цей день даними з "${this.state.dayBuffer.name}"?<br><br><span style="color:var(--text-muted); font-size:0.85rem;">Усі поточні прийоми їжі будуть видалені.</span>`, "ВСТАВКА ДНЯ", "gold"))) return;
        
        this.pushHistory();
        const day = this.getCurrentDay();
        
        // Клонуємо прийоми їжі та генеруємо нові унікальні ID, щоб уникнути конфліктів у DOM
        const clonedMeals = Utils.deepClone(this.state.dayBuffer.meals);
        clonedMeals.forEach(m => {
            m.id = Utils.id() + Math.floor(Math.random() * 1000);
        });
        
        day.meals = clonedMeals;
        day.targets = Utils.deepClone(this.state.dayBuffer.targets);
        
        this.save();
        this.render();
        this.closeModal();
        if (window.Haptics) window.Haptics.success();
    },

    switchDay(id) {
        this.state.currentDayId = id;
        this.render();
    },

    navigateDay(dir) {
        // Знаходимо індекс поточного дня
        const idx = this.data.days.findIndex(d => d.id === this.state.currentDayId);
        if (idx < 0) return;
        
        const newIdx = idx + dir;
        
        // Перевіряємо, чи існує такий день
        if (newIdx >= 0 && newIdx < this.data.days.length) {
            this.switchDay(this.data.days[newIdx].id);
            if (window.Haptics) window.Haptics.light();
            
            // Центруємо активну вкладку у верхній панелі
            setTimeout(() => {
                const bar = document.getElementById('dayBar');
                const activeTab = bar.children[newIdx];
                if (activeTab && bar) {
                    const scrollPos = activeTab.offsetLeft - (bar.offsetWidth / 2) + (activeTab.offsetWidth / 2);
                    bar.scrollTo({ left: scrollPos, behavior: 'smooth' });
                }
            }, 50);
        }
    },
    promptRenameDay() {
        if(document.activeElement) document.activeElement.blur(); 
        
        const day = this.getCurrentDay();
        if(!day) return;
        
        this.lockScroll();
        this.toggleFab(false);
        
        let title = day.name;
        let sub = "";
        
        if (day.name.includes('|')) {
            const parts = day.name.split('|');
            title = parts[0];
            sub = parts[1] || "";
        } else {
            title = day.name;
            sub = "";
        }
        
        document.getElementById('inpDayTitle').value = title;
        document.getElementById('inpDaySub').value = sub;
        
        this.renderDaySorter();
        this.updateHubButtonsUI(); // Оновлюємо колір кнопок Хабу при відкритті
        
        document.getElementById('dayEditModal').style.display = 'flex';
        
        setTimeout(() => document.getElementById('inpDayTitle').focus(), 150);
    },
    saveDayName() {
        const day = this.getCurrentDay();
        const t = document.getElementById('inpDayTitle').value.trim();
        const s = document.getElementById('inpDaySub').value.trim();
        
        if(!t) return; // Головна назва обов'язкова
        
        this.pushHistory();
        // Зберігаємо в базу жорстко через розділювач
        day.name = s ? `${t}|${s}` : t;
        
        this.save();
        this.renderDaysBar();
        this.render(false);
        this.closeModal();
    },

    setHubDay(type) {
        this.pushHistory();
        const dayId = this.state.currentDayId;
        
        if (!this.data.hub) this.data.hub = { train: null, rest: null };
        
        if (type === 'train') {
            if (this.data.hub.train === dayId) this.data.hub.train = null;
            else { 
                this.data.hub.train = dayId; 
                if (this.data.hub.rest === dayId) this.data.hub.rest = null; 
            }
        } else {
            if (this.data.hub.rest === dayId) this.data.hub.rest = null;
            else { 
                this.data.hub.rest = dayId; 
                if (this.data.hub.train === dayId) this.data.hub.train = null; 
            }
        }
        
        this.save();
        this.updateHubButtonsUI();
        if(window.Haptics) window.Haptics.light();
    },

    updateHubButtonsUI() {
        const btnT = document.getElementById('btnHubTrain');
        const btnR = document.getElementById('btnHubRest');
        if (!btnT || !btnR) return;
        
        const dayId = this.state.currentDayId;
        const hub = this.data.hub || { train: null, rest: null };
        
        if (hub.train === dayId) {
            btnT.style.borderColor = 'var(--theme)'; btnT.style.color = 'var(--theme)'; btnT.style.background = 'rgba(212, 175, 55, 0.15)';
        } else {
            btnT.style.borderColor = '#444'; btnT.style.color = '#aaa'; btnT.style.background = 'transparent';
        }
        
        if (hub.rest === dayId) {
            btnR.style.borderColor = 'var(--theme)'; btnR.style.color = 'var(--theme)'; btnR.style.background = 'rgba(212, 175, 55, 0.15)';
        } else {
            btnR.style.borderColor = '#444'; btnR.style.color = '#aaa'; btnR.style.background = 'transparent';
        }
    },
    moveDay(dir) {
        // Знаходимо індекс поточного дня у масиві
        const idx = this.data.days.findIndex(d => d.id === this.state.currentDayId);
        if (idx < 0) return;
        
        const newIdx = idx + dir;
        
        // Запобіжник: щоб не вийти за межі списку (лівіше першого або правіше останнього)
        if (newIdx < 0 || newIdx >= this.data.days.length) return;
        
        this.pushHistory(); // Зберігаємо стан для Undo
        
        // Міняємо місцями елементи в масиві
        const temp = this.data.days[idx];
        this.data.days[idx] = this.data.days[newIdx];
        this.data.days[newIdx] = temp;
        
        this.save();
        this.renderDaysBar(); // Оновлюємо верхню панель у реальному часі
        
        if(window.Haptics) window.Haptics.light();
    },
    openSchedule() {
        if(document.activeElement) document.activeElement.blur(); // Жорстко ховаємо клавіатуру
        this.lockScroll();
        this.toggleFab(false);
        
        const container = document.getElementById('scheduleContainer');
        if(!container) return; // Захист від помилки DOM
        
        const daysOfWeek = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота', 'Неділя'];
        let html = '';
        const schedule = this.data.schedule || {};

        daysOfWeek.forEach((dName, idx) => {
            const dayNum = (idx + 1).toString();
            const selectedId = schedule[dayNum] || '';

            let options = `<option value="">-- Вільно --</option>`;
            this.data.days.forEach(d => {
                const isSelected = String(d.id) === String(selectedId) ? 'selected' : '';
                let t = d.name.includes('|') ? d.name.replace('|', ' (') + ')' : d.name;
                options += `<option value="${d.id}" ${isSelected}>${t}</option>`;
            });

            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1a1a1a; padding:12px; border-radius:12px; border:1px solid #333;">
                <span style="color:#fff; font-weight:700; font-size:0.9rem; width:100px;">${dName}</span>
                <select id="sched_day_${dayNum}" style="flex:1; background:#000; color:var(--theme); border:1px solid #444; padding:8px; border-radius:8px; outline:none; font-family:var(--font-mono); font-size:0.8rem; font-weight:700;">
                    ${options}
                </select>
            </div>`;
        });

        container.innerHTML = html;
        document.getElementById('scheduleModal').style.display = 'flex';
    },

    saveSchedule() {
        this.pushHistory();
        if(!this.data.schedule) this.data.schedule = {};

        for(let i=1; i<=7; i++) {
            const val = document.getElementById('sched_day_' + i).value;
            if(val) this.data.schedule[i.toString()] = val;
            else delete this.data.schedule[i.toString()];
        }

        // Жорстке збереження всієї структури data
        Utils.save(DB_KEY, this.data);
        
        const todayNum = new Date().getDay();
        const mapDay = todayNum === 0 ? 7 : todayNum;
        const schedDayId = this.data.schedule[mapDay.toString()];
        
        // ФІКС: Порівнюємо як рядки String()
        if (schedDayId && this.data.days.find(d => String(d.id) === String(schedDayId))) {
            this.switchDay(Number(schedDayId));
        }

        this.closeModal();
        if(window.Haptics) window.Haptics.success();
    },
    async deleteDay() {
        if(this.data.days.length <= 1) {
            await Modal.alert("Останній день видалити неможливо.", "ПОМИЛКА", "red");
            return;
        }
        if(!(await Modal.confirm("Видалити цей день назавжди?", "ВИДАЛЕННЯ ДНЯ", "red"))) return;
        
        this.pushHistory();
        this.data.days = this.data.days.filter(d => d.id !== this.state.currentDayId);
        this.state.currentDayId = this.data.days[0].id;
        this.save(); 
        this.render();
        this.closeModal(); // <--- ДОДАНО
    },

    getWaterFromInputs() {
        const lVal = document.getElementById('inpWaterL').value.replace(',', '.');
        const mlVal = document.getElementById('inpWaterMl').value.replace(',', '.');
        const l = parseInt(lVal) || 0;
        const ml = parseInt(mlVal) || 0;
        return l + (ml / 1000);
    },

    editWater() {
        if(document.activeElement) document.activeElement.blur();
        
        // Жорстко очищаємо екран від будь-яких інших вікон
        document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
        
        this.lockScroll();
        this.toggleFab(false);
        
        const day = this.getCurrentDay();
        if (!day) return;
        const w = day.water || 0;
        
        const l = Math.floor(w);
        const ml = Math.round((w - l) * 1000);
        
        document.getElementById('inpWaterL').value = l === 0 ? '' : l;
        document.getElementById('inpWaterMl').value = ml === 0 ? '' : ml;
        document.getElementById('inpSodium').value = day.na || '';
        document.getElementById('inpPotassium').value = day.k_el || '';
        
        const modal = document.getElementById('waterModal');
        modal.style.display = 'flex';
        modal.style.zIndex = '10000'; // Виносимо на самий передній план
    },
    
    adjustWater(amount) {
        let current = this.getWaterFromInputs();
        current += amount;
        if (current < 0) current = 0;
        
        const l = Math.floor(current);
        const ml = Math.round((current - l) * 1000);
        
        document.getElementById('inpWaterL').value = l === 0 ? '' : l;
        document.getElementById('inpWaterMl').value = ml === 0 ? '' : ml;
        
        if(window.Haptics) window.Haptics.light();
    },
    
    saveWater() {
        const day = this.getCurrentDay();
        const val = this.getWaterFromInputs();
        const na = parseInt(document.getElementById('inpSodium').value) || 0;
        const k_el = parseInt(document.getElementById('inpPotassium').value) || 0;

        this.pushHistory();
        day.water = val;
        day.na = na;
        day.k_el = k_el;
        
        this.save();
        this.updateStats();
        this.closeModal();
        if(window.Haptics) window.Haptics.success();
    },
    openOrderEditor() {
        if(document.activeElement) document.activeElement.blur();
        
        // ФІКС: Жорстко ховаємо модалку налаштувань (вона зникне, а редактор з'явиться)
        const dayModal = document.getElementById('dayEditModal');
        if (dayModal) dayModal.style.display = 'none';

        this.lockScroll();
        this.toggleFab(false);
        this.renderOrderEditor();
        document.getElementById('orderModal').style.display = 'flex';
    },

    renderOrderEditor() {
        const day = this.getCurrentDay();
        const container = document.getElementById('orderContainer');
        if(!day || !container) return;

        this.clearSortables();

        let html = '';
        if(day.meals.length === 0) {
            html = `<div style="text-align:center; color:#666; padding:20px;">Немає прийомів їжі</div>`;
            container.innerHTML = html;
            return;
        }

        day.meals.forEach((m, mIdx) => {
            const mealNum = mIdx + 1; 
            html += `
            <div class="meal-sort-item" style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${m.foods.length > 0 ? '10px' : '0'};">
                    <b style="color:var(--theme); font-size:0.95rem; text-transform:uppercase;">
                        <span style="color:#666;">${mealNum}.</span> ${m.name}
                    </b>
                    
                    <div style="display:flex; gap:16px; align-items:center;">
                        <div onclick="App.copyMeal(${m.id})" style="color:var(--theme); cursor:pointer; font-size:1.1rem;" title="Копіювати">📋</div>
                        <div onclick="App.deleteMealBlock(${m.id})" style="color:var(--danger); cursor:pointer; font-size:1.1rem; opacity:0.8;" title="Видалити">✕</div>
                        <div style="width:1px; height:16px; background:#444;"></div>
                        <div class="drag-handle-meal" style="cursor:grab; font-size:1.8rem; color:#888; line-height:0.8;">≡</div>
                    </div>
                </div>`;
            
            if (m.foods.length > 0) {
                html += `<div class="food-sort-list" id="food-sort-${m.id}" style="display:flex; flex-direction:column; gap:6px; padding-left:12px; border-left:2px solid #333;">`;
                m.foods.forEach((f, fIdx) => {
                    const foodNum = fIdx + 1;
                    html += `
                    <div class="food-sort-item" style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:10px; border-radius:8px; border:1px solid #222;">
                        <span style="color:#ccc; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:10px;">
                            <span style="color:#555; font-family:var(--font-mono);">${mealNum}.${foodNum}</span> ${f.n}
                        </span>
                        <div class="drag-handle-food" style="cursor:grab; font-size:1.5rem; color:#555; padding:0 10px; line-height:0.8;">≡</div>
                    </div>`;
                });
                html += `</div>`;
            }
            html += `</div>`;
        });
        
        // Якщо є щось у буфері, показуємо кнопку "Вставити" прямо в редакторі
        if (this.state.mealBuffer) {
            html += `<button class="btn-main-add" style="margin-top:5px; border-color:var(--theme); color:var(--theme); background:rgba(212, 175, 55, 0.05);" onclick="App.pasteMeal()">📥 ВСТАВИТИ: ${this.state.mealBuffer.name.toUpperCase()}</button>`;
        }
        
        container.innerHTML = html;

        // Зберігаємо екземпляр сортування прийомів їжі
        const mealSortable = Sortable.create(container, {
            handle: '.drag-handle-meal',
            animation: 250,
            ghostClass: 'sortable-ghost',
            delay: 150, 
            delayOnTouchOnly: true,
            onEnd: (evt) => {
                if (evt.oldIndex !== evt.newIndex) {
                    this.reorderMeals(evt.oldIndex, evt.newIndex);
                    if(window.Haptics) window.Haptics.light();
                    this.renderOrderEditor(); 
                }
            }
        });
        this._sortables.push(mealSortable);

        // Зберігаємо екземпляри сортування продуктів
        day.meals.forEach(m => {
            if (m.foods.length > 1) {
                const foodContainer = document.getElementById(`food-sort-${m.id}`);
                const foodSortable = Sortable.create(foodContainer, {
                    handle: '.drag-handle-food',
                    animation: 250,
                    ghostClass: 'sortable-ghost',
                    delay: 150,
                    delayOnTouchOnly: true,
                    onEnd: (evt) => {
                        if (evt.oldIndex !== evt.newIndex) {
                            this.reorderFoods(m.id, evt.oldIndex, evt.newIndex);
                            if(window.Haptics) window.Haptics.light();
                            this.renderOrderEditor(); 
                        }
                    }
                });
                this._sortables.push(foodSortable);
            }
        });
    },
    reorderMeals(oldIdx, newIdx) {
        const day = this.getCurrentDay();
        if (!day) return;
        
        this.pushHistory();
        // Вирізаємо елемент зі старої позиції і вставляємо на нову
        const movedMeal = day.meals.splice(oldIdx, 1)[0];
        day.meals.splice(newIdx, 0, movedMeal);
        
        this.save();
        this.render(false);
    },

    renderDaySorter() {
        const container = document.getElementById('daySortContainer');
        if(!container) return;
        
        let html = '';
        this.data.days.forEach(d => {
            let title = d.name;
            if (title.includes('|')) title = title.replace('|', ' - ');
            
            // Виділяємо поточний день золотої рамкою
            const isCurrent = d.id === this.state.currentDayId;
            const borderStr = isCurrent ? 'border: 1px solid var(--theme);' : 'border: 1px solid #333;';
            
            html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1a1a1a; padding:12px 15px; border-radius:10px; ${borderStr}">
                <span style="color:#fff; font-weight:600; font-size:0.9rem; pointer-events:none;">${title}</span>
                <div class="drag-handle-day" style="cursor:grab; font-size:1.5rem; color:#666; line-height:0.8; padding:0 10px;">≡</div>
            </div>`;
        });
        container.innerHTML = html;

        // 1. ЖОРСТКЕ ОЧИЩЕННЯ ПОПЕРЕДНЬОГО ІНСТАНСУ SORTABLE
        if (this._daySorter) {
            this._daySorter.destroy();
            this._daySorter = null;
        }

        // 2. СТВОРЕННЯ НОВОГО ТА ЗБЕРЕЖЕННЯ ПОСИЛАННЯ В СТЕЙТ
        this._daySorter = Sortable.create(container, {
            handle: '.drag-handle-day',
            animation: 250,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                if (evt.oldIndex !== evt.newIndex) {
                    this.reorderDays(evt.oldIndex, evt.newIndex);
                    
                    // 3. ПРИМУСОВЕ ПЕРЕМАЛЬОВУВАННЯ ВІЗУАЛУ МОДАЛКИ
                    // Щоб золота рамка поточного дня та сам список відображались коректно
                    this.renderDaySorter(); 
                    
                    if(window.Haptics) window.Haptics.light();
                }
            }
        });
    },
    reorderDays(oldIdx, newIdx) {
        // Запобіжник: якщо перетягнули на ту ж позицію або замість кнопки "+"
        if (oldIdx === newIdx || newIdx >= this.data.days.length || oldIdx >= this.data.days.length) return;
        
        this.pushHistory();
        // Вирізаємо день зі старої позиції і вставляємо на нову
        const movedDay = this.data.days.splice(oldIdx, 1)[0];
        this.data.days.splice(newIdx, 0, movedDay);
        
        this.save();
        this.renderDaysBar();
    },
    reorderFoods(mId, oldIdx, newIdx) {
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === mId);
        if (!meal) return;
        
        this.pushHistory();
        const movedFood = meal.foods.splice(oldIdx, 1)[0];
        meal.foods.splice(newIdx, 0, movedFood);
        
        this.save();
        this.render(false);
    },
    render(animate = true) {
        this.renderDaysBar();
        const day = this.getCurrentDay();
        if(!day) return;

        const titleEl = document.getElementById('currentDayTitleMain');
        const subEl = document.getElementById('currentDaySubtitle');
        if(titleEl && subEl) {
            let titleText = day.name;
            let subText = "";
            
            if (day.name.includes('|')) {
                const parts = day.name.split('|');
                titleText = parts[0];
                subText = parts[1] || "";
            } else {
                titleText = day.name;
                subText = "";
            }
            
            titleEl.innerText = titleText;
            if (subText) {
                subEl.innerText = subText;
                subEl.style.display = 'inline-block';
            } else {
                subEl.style.display = 'none';
            }
        }
        
        const list = document.getElementById('mealList');
        let mealsHtml = ''; 
        
        day.meals.forEach((m, index) => {
            let mCal = 0, mP = 0, mF = 0, mC = 0;

            const foodsHtml = m.foods.map((f, i) => {
                const ref = this.data.bank[f.n] || {p:f.p, f:f.f, c:f.c, k:f.k, unit:f.unit}; 
                let k, p, fat, c;
                
                if(this.data.bank[f.n]) {
                    const r = ref.unit ? f.w : f.w/100;
                    k = Math.round((ref.k || 0) * r);
                    p = Math.round((ref.p || 0) * r);
                    fat = Math.round((ref.f || 0) * r);
                    c = Math.round((ref.c || 0) * r);
                } else {
                     k = f.k; p = f.p; fat = f.f; c = f.c;
                }
                mCal += k; mP += p; mF += fat; mC += c;

                return `
                <div class="food-row" onclick="App.editFood(${m.id}, ${i})">
                    <div class="fr-info">
                        <h4>${f.n}</h4>
                        <p>Б${p} Ж${fat} В${c}</p>
                    </div>
                    <div class="fr-vals">
                        <div class="fr-w">${f.w}${ref.unit?'':'г'}</div>
                        <div class="fr-k">${k}</div>
                    </div>
                </div>`;
            }).join('');

            // ЗАЛИШАЄМО ТІЛЬКИ ОДИН РАЗ
            const animClass = animate ? 'animate-pop' : '';
            const delayStr = animate ? `animation-delay: ${index * 0.05}s;` : '';

            // Розрахунок % для візуального мікро-бара
            const mTotalMacro = (mP*4) + (mF*9) + (mC*4);
            let pP = 0, pF = 0, pC = 0;
            if (mTotalMacro > 0) {
                pP = (mP*4 / mTotalMacro) * 100;
                pF = (mF*9 / mTotalMacro) * 100;
                pC = (mC*4 / mTotalMacro) * 100;
            }

            mealsHtml += `
            <div class="meal-block ${animClass}" style="${delayStr}">
                <div class="meal-header" onclick="App.toggleMealCollapse(${m.id}, event)" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                    
                    <div style="flex:1; min-width:0;"> 
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div class="mh-collapse-icon" style="transform: ${m.isCollapsed !== false ? 'rotate(-90deg)' : 'rotate(0)'}; color:#666; font-size:0.75rem; transition:0.2s; width:12px; text-align:center;">▼</div>
                            <h4 class="mh-title" style="margin:0; font-weight:800; font-size:0.95rem; color:#fff; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</h4>
                        </div>
                        
                        <div class="mh-meta" style="display:flex; align-items:center; gap:10px; margin-top:6px; padding-left:20px; flex-wrap:wrap;">
                            
                            <div style="display:flex; background:rgba(212, 175, 55, 0.05); border:1px solid rgba(212, 175, 55, 0.3); border-radius:6px; overflow:hidden;">
                                <input type="text" inputmode="numeric" class="meal-time-input" style="border:none; border-radius:0; background:transparent; padding:4px 6px;" value="${m.time || ''}" placeholder="00:00" oninput="App.formatTimeInput(this, ${m.id})" onclick="if(event) event.stopPropagation()" title="Таймінг прийому">
                                ${(m.time && m.time.length === 5) ? `<div onclick="App.syncMealTimeToAll('${m.name}', '${m.time}', event)" style="padding:0 8px; display:flex; align-items:center; color:var(--theme); cursor:pointer; font-size:0.8rem; border-left:1px solid rgba(212, 175, 55, 0.3);" title="Синхронізувати">🔄</div>` : ''}
                            </div>

                            <div class="mh-kcal" style="font-family:var(--font-mono); font-weight:700; font-size:0.85rem; color:var(--theme);">${mCal} ккал</div>
                            <span style="font-size:0.65rem; color:#666; font-weight:600;">Б${mP} Ж${mF} В${mC}</span>
                            
                            <div style="width:50px; display:flex; height:3px; background:#222; border-radius:2px; overflow:hidden; margin-top:2px;">
                                <div style="width:${pP}%; background:var(--p-color);"></div>
                                <div style="width:${pF}%; background:var(--f-color);"></div>
                                <div style="width:${pC}%; background:var(--c-color);"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:6px; align-items:center; padding-left:10px; flex-shrink:0;">
                        <div class="edit-meal-btn" onclick="App.scaleMeal(${m.id}, event)" style="padding:8px; font-size:1.1rem; color:#aaa;" title="Масштабувати порції">⚖️</div>
                        <div class="edit-meal-btn" onclick="App.promptRenameMeal(${m.id}, event)" style="padding:8px; font-size:1.2rem; color:#888;">✎</div>
                    </div>
                    
                </div>
                
                <div style="display: ${m.isCollapsed !== false ? 'none' : 'block'}; border-top:1px solid rgba(255,255,255,0.03);">
                    <div>${foodsHtml}</div>
                    <button class="btn-action" onclick="App.addFood(${m.id})">+ ПРОДУКТ</button>
                </div>
            </div>`;
        });

        let pasteBtnHtml = '';
        if (this.state.mealBuffer) {
            const animClass = animate ? 'animate-pop' : '';
            const delayStr = animate ? `animation-delay: ${day.meals.length * 0.05}s;` : '';
            pasteBtnHtml = `<button class="btn-main-add ${animClass}" style="margin-top:10px; border-color:var(--theme); color:var(--theme); background:rgba(212, 175, 55, 0.05); ${delayStr}" onclick="App.pasteMeal()">📥 ВСТАВИТИ: ${this.state.mealBuffer.name.toUpperCase()}</button>`;
        }

        list.innerHTML = mealsHtml + pasteBtnHtml;
        this.updateStats();
    },
    renderDaysBar() {
        const bar = document.getElementById('dayBar');
        if(!bar) return;
        
        // ФІКС: Запам'ятовуємо поточну позицію скролу
        const currentScroll = bar.scrollLeft;
        
        bar.innerHTML = '';
        
        this.data.days.forEach(d => {
            const el = document.createElement('div');
            el.className = `day-tab ${d.id === this.state.currentDayId ? 'active' : ''}`;
            el.style.cursor = 'pointer'; 
            
            let t = d.name;
            let s = ''; 
            if (d.name.includes('|')) {
                const parts = d.name.split('|');
                t = parts[0];
                s = parts[1] || '';
            }
            
            const subHtml = s ? `<small style="pointer-events:none;">${s}</small>` : '';
            el.innerHTML = `<span style="pointer-events:none;">${t}</span>${subHtml}`;
            
            el.onclick = () => {
                if(this.state.currentDayId !== d.id) {
                    if(window.Haptics) window.Haptics.light();
                    App.switchDay(d.id);
                }
            };
            bar.appendChild(el);
        });
        
        const addBtn = document.createElement('div');
        addBtn.className = 'day-add-btn';
        addBtn.innerText = '+';
        addBtn.style.cursor = 'pointer';
        addBtn.onclick = () => App.addDay();
        bar.appendChild(addBtn);

        // ФІКС: Відновлюємо позицію скролу після оновлення DOM
        bar.scrollLeft = currentScroll;
    },
    updateStats() {
        const day = this.getCurrentDay();
        if(!day) return;
        let t = {p:0, f:0, c:0, k:0};
        day.meals.forEach(m => m.foods.forEach(f => {
            const ref = this.data.bank[f.n];
            if(ref) {
                const r = ref.unit ? f.w : f.w/100;
                t.p += (ref.p||0)*r; t.f += (ref.f||0)*r; t.c += (ref.c||0)*r; t.k += (ref.k||0)*r;
            } else {
                t.p += f.p||0; t.f += f.f||0; t.c += f.c||0; t.k += f.k||0;
            }
        }));
        const tg = day.targets || this.data.targets;
        
        const dispK = document.getElementById('disp-k');
        if(dispK) {
            dispK.innerText = Math.round(t.k);
            if(t.k > tg.k) dispK.style.color = 'var(--danger)'; else dispK.style.color = '#fff';
        }
        
        const dispT = document.getElementById('disp-target');
        if(dispT) dispT.innerText = tg.k;
        
        const dispW = document.getElementById('disp-w');
        if(dispW) dispW.innerText = (day.water || 0).toFixed(2);
        
// --- СМАРТ АНАЛІТИКА ВАГИ ---
        try {
            if (typeof GlobalVitals !== 'undefined') {
                const latestWeight = GlobalVitals.getLatestWeight();
                const trend = typeof GlobalVitals.getWeightTrend === 'function' ? GlobalVitals.getWeightTrend() : { delta: null };
                const dispWAvg = document.getElementById('disp-weight-avg');
                const dispWDelta = document.getElementById('disp-weight-delta');
                const badge = document.getElementById('trend-badge');
                
                if (dispWAvg && dispWDelta && badge) {
                    if (latestWeight !== null) {
                        dispWAvg.innerText = latestWeight.toFixed(1); // Показуємо останню РЕАЛЬНУ вагу
                        if (trend.delta !== null) {
                            const d = trend.delta;
                            if (d <= -0.1) {
                                dispWDelta.innerText = `▼${Math.abs(d).toFixed(1)}kg`;
                                dispWDelta.style.color = 'var(--success)'; 
                                badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                            } else if (d >= 0.1) {
                                dispWDelta.innerText = `▲${d.toFixed(1)}kg`;
                                dispWDelta.style.color = 'var(--danger)'; 
                                badge.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                            } else {
                                dispWDelta.innerText = `▶${Math.abs(d).toFixed(1)}kg`;
                                dispWDelta.style.color = 'var(--theme)'; 
                                badge.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                            }
                        } else {
                            dispWDelta.innerText = "kg";
                            dispWDelta.style.color = "#666";
                            badge.style.borderColor = '#1f1f1f';
                        }
                    } else {
                        dispWAvg.innerText = "--";
                        dispWDelta.innerText = "kg";
                        badge.style.borderColor = '#1f1f1f';
                    }
                }
            }
        } catch(e) { console.error(e); }

        const dispNa = document.getElementById('disp-na');
        const dispK_el = document.getElementById('disp-k-el');
        if(dispNa) dispNa.innerText = day.na || 0;
        if(dispK_el) dispK_el.innerText = day.k_el || 0;
        
        // ОНОВЛЕННЯ ЦІЛІ В HERO
        const heroTarget = document.getElementById('disp-k-hero-target');
        if(heroTarget) heroTarget.innerText = tg.k;

        // РОЗРАХУНОК ВІДСОТКІВ
        const totalMacroKcal = (t.p * 4) + (t.f * 9) + (t.c * 4);
        let pPct = 0, fPct = 0, cPct = 0;
        if (totalMacroKcal > 0) {
            pPct = Math.round(((t.p * 4) / totalMacroKcal) * 100);
            fPct = Math.round(((t.f * 9) / totalMacroKcal) * 100);
            cPct = Math.round(((t.c * 4) / totalMacroKcal) * 100);
        }
        
        if (totalMacroKcal > 0 && (pPct + fPct + cPct) !== 100) {
            pPct += 100 - (pPct + fPct + cPct); 
        }

        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
        
        setVal('lbl-p-bot', pPct + '%');
        setVal('lbl-f-bot', fPct + '%');
        setVal('lbl-c-bot', cPct + '%');

        setVal('tgt-p', Math.round(tg.p));
        setVal('tgt-f', Math.round(tg.f));
        setVal('tgt-c', Math.round(tg.c));

        const stackP = document.getElementById('stack-p');
        const stackF = document.getElementById('stack-f');
        const stackC = document.getElementById('stack-c');
        if(stackP && stackF && stackC) {
            stackP.style.width = pPct + '%';
            stackF.style.width = fPct + '%';
            stackC.style.width = cPct + '%';
        }

        const updateBar = (id, currentVal, targetVal) => {
            const barEl = document.getElementById('bar-'+id);
            const textEl = document.getElementById('disp-'+id);
            if(barEl && textEl) {
                const fillPct = Math.min(100, (currentVal / (targetVal || 1)) * 100);
                barEl.style.width = fillPct + '%';
                textEl.innerText = Math.round(currentVal);
                
                // ПРО-ФІКС: Зміна кольору при перевищенні цілі
                if (currentVal > targetVal && targetVal > 0) {
                    barEl.style.backgroundColor = 'var(--danger)';
                    barEl.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
                } else {
                    // Повертаємо дефолтні кольори, якщо ми в межах цілі
                    barEl.style.backgroundColor = `var(--${id}-color)`;
                    barEl.style.boxShadow = 'none';
                }
            }
        };

        updateBar('p', t.p, tg.p);
        updateBar('f', t.f, tg.f);
        updateBar('c', t.c, tg.c);
    },
    searchFood(q) {
        const list = document.getElementById('sugg-list');
        list.innerHTML = '';
        if(q.length < 1) { list.style.display='none'; return; }
        
        // ОПТИМІЗАЦІЯ: Кешуємо запит один раз, щоб не робити це в циклі
        const query = q.toLowerCase(); 
        const matches = Object.keys(this.data.bank).filter(k => k.toLowerCase().includes(query));
        
        if(matches.length) {
            list.style.display = 'block';
            matches.slice(0, 5).forEach(n => {
                const b = this.data.bank[n];
                const el = document.createElement('div');
                el.className = 'sugg-item';
                el.innerHTML = `${n} <span>${b.k} ккал</span>`;
                el.onclick = () => App.selectSuggestion(n);
                list.appendChild(el);
            });
        } else { list.style.display='none'; }
    },

    recalcModal() {
        if (!this.state.tempFood) return; 

        const val = document.getElementById('inpWeight').value;
        if(val === '') return; 
        
        const w = parseFloat(val) || 0;
        const ref = this.state.tempFood;

        const ratio = ref.unit ? w : w / 100;

        document.getElementById('inpP').value = Math.round((ref.p || 0) * ratio);
        document.getElementById('inpF').value = Math.round((ref.f || 0) * ratio);
        document.getElementById('inpC').value = Math.round((ref.c || 0) * ratio);
        document.getElementById('inpK').value = Math.round((ref.k || 0) * ratio);
    },

    reverseCalc(type) {
        if (!this.state.tempFood) return;
        const ref = this.state.tempFood;
        const inputEl = document.getElementById(type === 'p' ? 'inpP' : type === 'f' ? 'inpF' : type === 'c' ? 'inpC' : 'inpK');
        const val = parseFloat(inputEl.value);
        
        if(isNaN(val)) return;

        let targetRefVal = ref[type]; 
        if (!targetRefVal || targetRefVal <= 0) return; // Захист від ділення на нуль

        // Вираховуємо потрібну вагу для досягнення введеного макроса
        let newWeight = ref.unit ? (val / targetRefVal) : ((val * 100) / targetRefVal);
        newWeight = Math.round(newWeight * 10) / 10; 

        // 1. Оновлюємо вагу
        document.getElementById('inpWeight').value = newWeight;
        
        // 2. Оновлюємо інші поля, АЛЕ НЕ ТЕ, в якому зараз курсор (type)
        const ratio = ref.unit ? newWeight : newWeight / 100;
        if (type !== 'p') document.getElementById('inpP').value = Math.round((ref.p || 0) * ratio);
        if (type !== 'f') document.getElementById('inpF').value = Math.round((ref.f || 0) * ratio);
        if (type !== 'c') document.getElementById('inpC').value = Math.round((ref.c || 0) * ratio);
        if (type !== 'k') document.getElementById('inpK').value = Math.round((ref.k || 0) * ratio);
    },
    selectSuggestion(name) {
        const f = this.data.bank[name];
        
        this.state.tempFood = { ...f };

        document.getElementById('inpName').value = name;
        document.getElementById('inpP').value = f.p;
        document.getElementById('inpF').value = f.f;
        document.getElementById('inpC').value = f.c;
        document.getElementById('inpK').value = f.k;
        document.getElementById('sugg-list').style.display='none';
        document.getElementById('inpWeight').placeholder = f.unit ? "Кількість (шт)" : "Вага (г)";
        
        const defW = f.unit ? 1 : 100;
        document.getElementById('inpWeight').value = defW;
        this.recalcModal();

        document.getElementById('inpWeight').focus();
    },

    addFood(mid) {
        this.state.mid = mid; this.state.fidx = -1;
        this.state.tempFood = null; 
        this.openModal('ДОДАТИ ПРОДУКТ', {}, false);
        setTimeout(() => document.getElementById('inpName').focus(), 100);
    },
    
    editFood(mid, idx) {
        this.state.mid = mid; this.state.fidx = idx;
        const f = this.getCurrentDay().meals.find(m=>m.id===mid).foods[idx];
        
        const ref = this.data.bank[f.n];
        let editItem = { ...f }; 
        
        if (ref) {
            this.state.tempFood = ref;
            const ratio = ref.unit ? f.w : f.w / 100;
            editItem.p = Math.round(ref.p * ratio);
            editItem.f = Math.round(ref.f * ratio);
            editItem.c = Math.round(ref.c * ratio);
            editItem.k = Math.round(ref.k * ratio);
        } else {
            const wRatio = (f.unit ? f.w : f.w / 100) || 1;
            this.state.tempFood = {
                p: f.p / wRatio,
                f: f.f / wRatio,
                c: f.c / wRatio,
                k: f.k / wRatio,
                unit: f.unit || true
            };
        }
        
        this.openModal('РЕДАГУВАТИ', editItem, true);
    },

    openModal(title, f, del) {
        if(document.activeElement) document.activeElement.blur(); 
        this.lockScroll(); 
        this.toggleFab(false); 
        
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('inpName').value = f.n||'';
        document.getElementById('inpWeight').value = f.w||'';
        document.getElementById('inpP').value = f.p||0;
        document.getElementById('inpF').value = f.f||0;
        document.getElementById('inpC').value = f.c||0;
        document.getElementById('inpK').value = f.k||0;
        document.getElementById('btnDeleteFood').style.display = del ? 'block':'none';
        
        // --- ГЕНЕРАЦІЯ QUICK ADD ---
        const qbContainer = document.getElementById('quickBankContainer');
        if (qbContainer && !del) { // Показуємо тільки при створенні нового (не при редагуванні)
            // Беремо перші 8 продуктів з твоєї бази (найпопулярніші)
            const topFoods = Object.keys(this.data.bank).slice(0, 8);
            qbContainer.innerHTML = `<div class="quick-bank-grid">
                ${topFoods.map(n => `<div class="qb-chip" onclick="App.selectSuggestion('${n.replace(/'/g, "\\'")}')">${n}</div>`).join('')}
            </div>`;
            qbContainer.style.display = 'block';
        } else if (qbContainer) {
            qbContainer.style.display = 'none';
        }
        // ---------------------------

        document.getElementById('foodModal').style.display = 'flex';
        document.getElementById('sugg-list').style.display = 'none';
    },
    
    closeModal() { 
        // ФІКС 2: Блокуємо iOS-фіксер довше, щоб клавіатура точно встигла сховатись
        window.blockKeyboardScrollFix = true;
        setTimeout(() => { window.blockKeyboardScrollFix = false; }, 400);

        if(document.activeElement) document.activeElement.blur(); 
        
        const modalIds = ['foodModal', 'bankModal', 'bankEditModal', 'targetsModal', 'waterModal', 'dayEditModal', 'scheduleModal', 'orderModal'];
        modalIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        document.querySelectorAll('.modal-overlay, .modal').forEach(el => el.style.display='none');
        this.toggleFab(true); 
        
        // ФІКС 3: Відпускаємо екран із мікрозатримкою (щоб iOS завершив анімацію клавіатури)
        setTimeout(() => {
            this.unlockScroll(); 
        }, 20);
    },

    saveFood() {
        const n = document.getElementById('inpName').value;
        const wVal = document.getElementById('inpWeight').value.replace(',', '.');
        const w = parseFloat(wVal);
        if(!n || isNaN(w)) return;
        const meal = this.getCurrentDay().meals.find(m=>m.id===this.state.mid);
        let item;
        if(this.data.bank[n]) { item = {n, w}; } 
        else {
            const p = parseFloat(document.getElementById('inpP').value)||0;
            const f = parseFloat(document.getElementById('inpF').value)||0;
            const c = parseFloat(document.getElementById('inpC').value)||0;
            let k = parseFloat(document.getElementById('inpK').value);
            if(!k && (p||f||c)) k = Math.round(p*4 + f*9 + c*4);
            item = {n, w, p, f, c, k, unit: true}; 
        }
        this.pushHistory();
        if(this.state.fidx === -1) meal.foods.push(item);
        else meal.foods[this.state.fidx] = item;
        
        // ФІКС СКРОЛУ: Змінено порядок!
        this.save(); 
        this.render(false); // Рендеримо без анімації (щоб не мигало)
        this.closeModal();  // Закриваємо модалку останнім кроком
    },

    deleteFood() {
        this.pushHistory();
        this.getCurrentDay().meals.find(m=>m.id===this.state.mid).foods.splice(this.state.fidx, 1);
        
        // ФІКС СКРОЛУ: Змінено порядок!
        this.save(); 
        this.render(false); 
        this.closeModal(); 
    },

    copyMeal(mid) {
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === mid);
        if (meal) {
            this.state.mealBuffer = JSON.parse(JSON.stringify(meal));
            this.render(); 
            // ФІКС: Оновлюємо модалку редактора, щоб з'явилась кнопка "Вставити"
            if (document.getElementById('orderModal').style.display === 'flex') this.renderOrderEditor();
            
            const toast = document.createElement('div');
            toast.innerText = "🍽 Скопійовано! Тепер можна вставити.";
            toast.style.cssText = "position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#222; color:var(--theme); padding:10px 20px; border-radius:20px; z-index:9999; border:1px solid var(--theme); font-family:sans-serif; font-size:0.9rem; box-shadow: 0 4px 15px rgba(0,0,0,0.5);";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }
    },

    async pasteMeal() {
        if (!this.state.mealBuffer) return;
        
        const day = this.getCurrentDay();
        const copiedMeal = this.state.mealBuffer;
        
        const existingMealIndex = day.meals.findIndex(
            m => m.name.trim().toLowerCase() === copiedMeal.name.trim().toLowerCase()
        );
        
        if (existingMealIndex !== -1) {
            const existingMeal = day.meals[existingMealIndex];
            
            if (existingMeal.foods && existingMeal.foods.length > 0) {
                if (!(await Modal.confirm(`⚠️ Прийом "${existingMeal.name}" вже містить продукти. Перезаписати його скопійованим?`, "УВАГА", "gold"))) {
                    return; 
                }
            }
            
            this.pushHistory();
            existingMeal.foods = JSON.parse(JSON.stringify(copiedMeal.foods));
            
        } else {
            this.pushHistory();
            const newMeal = JSON.parse(JSON.stringify(copiedMeal));
            newMeal.id = Date.now() + Math.floor(Math.random() * 1000);
            day.meals.push(newMeal);
        }

        this.save();
        this.render();
        // ФІКС: Оновлюємо модалку редактора, щоб показати новий вставлений прийом їжі
        if (document.getElementById('orderModal').style.display === 'flex') this.renderOrderEditor();
        if (window.Haptics) window.Haptics.success();
    },
    // Збереження часу (записується прямо при зміні інпуту)
    saveMealTime(mid, timeStr) {
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === mid);
        if (meal) {
            this.pushHistory();
            meal.time = timeStr;
            this.save();
        }
    },

    // Смарт-маска для 24-годинного формату
    async syncMealTimeToAll(mealName, timeStr, e) {
        if(e) e.stopPropagation();
        if (!timeStr || timeStr.length < 5) return; 
        
        if (!(await Modal.confirm(`Застосувати час <b style="color:var(--theme)">${timeStr}</b> для всіх прийомів з назвою <b style="color:var(--theme)">"${mealName}"</b> у всіх днях?`, "СИНХРОНІЗАЦІЯ", "gold"))) return;
        
        this.pushHistory();
        let count = 0;
        this.data.days.forEach(d => {
            d.meals.forEach(m => {
                if (m.name.trim().toLowerCase() === mealName.trim().toLowerCase()) {
                    m.time = timeStr;
                    count++;
                }
            });
        });
        
        this.save();
        this.render(false);
        if (window.Haptics) window.Haptics.success();
    },
    toggleMealCollapse(mid, e) {
        if (e && (e.target.tagName === 'INPUT' || e.target.closest('.edit-meal-btn') || e.target.closest('.mh-del') || e.target.closest('[onclick*="copyMeal"]'))) {
            return;
        }
        
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === mid);
        if (meal) {
            // ФІКС: Якщо стан невідомий (стара база), вважаємо, що зараз згорнуто, отже розгортаємо.
            meal.isCollapsed = (meal.isCollapsed === undefined || meal.isCollapsed === true) ? false : true;
            this.render(false);
            if(window.Haptics) window.Haptics.light();
        }
    },
    addMealBlock() {
        this.pushHistory();
        const id = Utils.id();
        const day = this.getCurrentDay();
        // Розумна автонумерація (Прийом їжі 1, 2, 3...)
        const nextNum = day.meals.length + 1; 
        
        day.meals.push({id, name:`Прийом їжі ${nextNum}`, foods:[], isCollapsed: false});
        this.save(); this.render();
    },
    
    async deleteMealBlock(id) {
        if(!(await Modal.confirm("Видалити цей прийом їжі повністю?", "ВИДАЛЕННЯ", "red"))) return;
        this.pushHistory();
        const day = this.getCurrentDay();
        day.meals = day.meals.filter(m=>m.id!==id);
        this.save(); 
        this.render();
        // ФІКС: Оновлюємо модалку редактора, якщо вона відкрита
        if (document.getElementById('orderModal').style.display === 'flex') this.renderOrderEditor();
    },
    
    async promptRenameMeal(id, e) {
        if(e) { e.preventDefault(); e.stopPropagation(); } // Зупиняємо подію самого натискання

        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === id);
        if(!meal) return;
        
        // 1. Створюємо невидимий щит, який перекриває ВЕСЬ екран
        const ghostShield = document.createElement('div');
        ghostShield.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;';
        document.body.appendChild(ghostShield);

        // 2. Викликаємо модалку вводу
        const newName = await Modal.prompt(`Введіть нову назву для: ${meal.name.toUpperCase()}`, "РЕДАКТУВАННЯ ПРИЙОМУ", meal.name);
        
        // 3. Найважливіше: знімаємо щит із затримкою 400мс ПІСЛЯ закриття модалки,
        // щоб він "з'їв" усі фантомні кліки від iOS/Android.
        setTimeout(() => ghostShield.remove(), 400);

        if (newName && newName.trim() !== "" && newName.trim() !== meal.name) {
            this.pushHistory();
            meal.name = newName.trim();
            this.save();
            this.render(false);
        }
    },

    // НОВА ПРО-ФУНКЦІЯ: Масштабування прийому їжі
    // НОВА ПРО-ФУНКЦІЯ: Масштабування цілого прийому їжі
    async scaleMeal(mid, e) {
        if(e) { e.preventDefault(); e.stopPropagation(); }
        const day = this.getCurrentDay();
        const meal = day.meals.find(m => m.id === mid);
        if(!meal || meal.foods.length === 0) return;

        // Той самий щит від Ghost Clicks
        const ghostShield = document.createElement('div');
        ghostShield.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;';
        document.body.appendChild(ghostShield);

        const coefStr = await Modal.prompt(`Масштабувати порції: ${meal.name.toUpperCase()}\nВведіть коефіцієнт (наприклад 1.5 для +50%, або 0.8 для -20%):`, "МАСШТАБ (⚖️)", "1.0");
        
        setTimeout(() => ghostShield.remove(), 400);

        if(!coefStr) return;
        const coef = parseFloat(coefStr.replace(',', '.'));
        if(isNaN(coef) || coef <= 0 || coef === 1) return;

        this.pushHistory();
        meal.foods.forEach(f => {
            f.w = Math.round(f.w * coef * 10) / 10; // Округлюємо до 1 десятої
            
            // Якщо макроси жорстко закешовані у продукті, множимо і їх
            if(f.p !== undefined) f.p = Math.round(f.p * coef);
            if(f.f !== undefined) f.f = Math.round(f.f * coef);
            if(f.c !== undefined) f.c = Math.round(f.c * coef);
            if(f.k !== undefined) f.k = Math.round(f.k * coef);
        });

        this.save();
        this.render(false);
        if(window.Haptics) window.Haptics.success();
    },

    renderBank(filter = "") {
        const l = document.getElementById('bankList');
        const query = filter.toLowerCase(); // Кешуємо пошуковий запит
        
        l.innerHTML = Object.entries(this.data.bank)
            .filter(([n]) => n.toLowerCase().includes(query))
            // ОПТИМІЗАЦІЯ: Правильне лексикографічне сортування замість дефолтного
            .sort((a, b) => a[0].localeCompare(b[0])) 
            .map(([n,v]) => `
            <div class="bank-row" onclick="App.openBankEdit('${n.replace(/'/g, "\\'")}')">
                <div class="bank-info">
                    <b>${n}</b>
                    <span>${v.unit ? 'ШТ/ПОРЦ' : '100г'} | Б${v.p} Ж${v.f} В${v.c} | ${v.k} ккал</span>
                </div>
                <div class="edit-icon" style="color:var(--text-muted)">✎</div>
            </div>`).join('');
    },
    
    openBank() {
        if(document.activeElement) document.activeElement.blur();
        this.lockScroll(); 
        this.toggleFab(false); 
        this.renderBank();
        document.getElementById('bankModal').style.display='flex';
    },
    
    openBankEdit(name) {
        if(document.activeElement) document.activeElement.blur();
        this.lockScroll(); 
        this.toggleFab(false); 
        this.state.editName = name;
        if(name) {
            const d = this.data.bank[name];
            document.getElementById('bankInpName').value = name;
            document.getElementById('bankInpP').value = d.p;
            document.getElementById('bankInpF').value = d.f;
            document.getElementById('bankInpC').value = d.c;
            document.getElementById('bankInpK').value = d.k;
            document.getElementById('bankInpUnit').checked = d.unit || false;
            document.getElementById('btnDelBank').style.display = 'block';
        } else {
            document.getElementById('bankInpName').value = '';
            document.getElementById('bankInpP').value = '';
            document.getElementById('bankInpF').value = '';
            document.getElementById('bankInpC').value = '';
            document.getElementById('bankInpK').value = '';
            document.getElementById('bankInpUnit').checked = false;
            document.getElementById('btnDelBank').style.display = 'none';
        }
        document.getElementById('bankEditModal').style.display='flex';
    },
    
    saveBankItem() {
        const n = document.getElementById('bankInpName').value.trim();
        if(!n) return;
        const p = parseFloat(document.getElementById('bankInpP').value)||0;
        const f = parseFloat(document.getElementById('bankInpF').value)||0;
        const c = parseFloat(document.getElementById('bankInpC').value)||0;
        let k = parseFloat(document.getElementById('bankInpK').value);
        if(!k) k = Math.round(p*4 + f*9 + c*4);
        const unit = document.getElementById('bankInpUnit').checked;

        if(this.state.editName && this.state.editName !== n) delete this.data.bank[this.state.editName];
        this.data.bank[n] = {p,f,c,k,unit};
        
        // ФІКС СКРОЛУ
        this.save(); 
        this.renderBank();
        this.render(false);
        this.closeModal(); 
    },
    
    async delFromBank() {
        if(await Modal.confirm(`Видалити "${this.state.editName}" з бази назавжди?`, "ВИДАЛЕННЯ", "red")) {
            delete this.data.bank[this.state.editName];
            
            // ФІКС СКРОЛУ
            this.save(); 
            this.renderBank();
            this.render(false);
            this.closeModal();
        }
    },

    openTargets() {
        if(document.activeElement) document.activeElement.blur();
        
        this.lockScroll(); 
        this.toggleFab(false); 
        
        const day = this.getCurrentDay();
        const t = day.targets || this.data.targets;
        
        document.getElementById('tgP').value = t.p;
        document.getElementById('tgF').value = t.f;
        document.getElementById('tgC').value = t.c;
        document.getElementById('tgK').value = t.k;

        let weight = null;
        if (typeof GlobalVitals !== 'undefined' && GlobalVitals.getLatestWeight()) {
            weight = GlobalVitals.getLatestWeight();
        } else if (this.data.userWeight) {
            weight = this.data.userWeight;
        }
        
        const wDisplay = document.getElementById('modalCurrentWeight');
        if (wDisplay) wDisplay.innerText = weight ? `${weight.toFixed(1)} kg` : "-- kg";

        if (typeof this.calcTargetKcal === 'function') this.calcTargetKcal(false);

        document.getElementById('targetsModal').style.display = 'flex';
    },
    async applyPreset(type) {
        let weight = null;
        
        // 1. Пробуємо дістати вагу з глобального хабу
        if (typeof GlobalVitals !== 'undefined') {
            weight = GlobalVitals.getLatestWeight();
        }
        
        // 2. Якщо немає, шукаємо локальну
        if (!weight) weight = this.data.userWeight; 

        // 3. Якщо ваги ніде немає — запитуємо 1 раз
        if (!weight) {
            const inputWeight = await Modal.prompt("Для смарт-розрахунку введіть вашу вагу (кг):", "АНТРОПОМЕТРІЯ", "85");
            if (!inputWeight) return; 
            weight = parseFloat(inputWeight.replace(',', '.'));
            if (isNaN(weight) || weight <= 0) return await Modal.alert("Некоректна вага!", "ПОМИЛКА", "red");
            
            this.data.userWeight = weight; 
            if (typeof GlobalVitals !== 'undefined') {
                const todayStr = GlobalVitals.formatDate(new Date());
                GlobalVitals.save(todayStr, 'w', weight.toString());
            }
            this.save();
        }
        // БОДІБІЛДЕРСЬКІ КОЕФІЦІЄНТИ (на 1 кг маси тіла)
        let pMult, fMult, cMult;

        switch(type) {
            case 'mass': pMult = 2.5; fMult = 0.8; cMult = 5.0; break; // ПРОФІЦИТ (Синтез на максимумі, багато вуглів для помпи)
            case 'base': pMult = 2.5; fMult = 0.8; cMult = 3.5; break; // ПІДТРИМКА (Міст/Круїз)
            case 'cut':  pMult = 3.0; fMult = 0.6; cMult = 2.0; break; // ДЕФІЦИТ (Антикатаболіка, мінімум жирів)
            case 'zero': pMult = 3.3; fMult = 1.0; cMult = 0.5; break; // ЯМА (Безвуглеводка, жири трохи вище для енергії)
        }

        document.getElementById('tgP').value = Math.round(weight * pMult);
        document.getElementById('tgF').value = Math.round(weight * fMult);
        document.getElementById('tgC').value = Math.round(weight * cMult);
        this.calcTargetKcal();
        
        if(window.Haptics) window.Haptics.light();
    },
    calcFromWeight() {
        if (typeof GlobalVitals === 'undefined') return;
        const weight = GlobalVitals.getLatestWeight();
        if (!weight) return;

        // ЖОРСТКА БАЗА ДЛЯ БОДІБІЛДИНГУ:
        // Білок: 2.5г на 1кг
        // Жири: 0.8г на 1кг
        // Вуглеводи: 3.5г на 1кг (база, потім коригується пресетами)
        
        const p = Math.round(weight * 2.5);
        const f = Math.round(weight * 0.8);
        const c = Math.round(weight * 3.5);

        document.getElementById('tgP').value = p;
        document.getElementById('tgF').value = f;
        document.getElementById('tgC').value = c;
        this.calcTargetKcal();
        
        if(window.Haptics) window.Haptics.success();
    },

    async promptWeight() {
        let current = "";
        if (typeof GlobalVitals !== 'undefined') {
            current = GlobalVitals.getLatestWeight() || "";
        } else {
            current = this.data.userWeight || "";
        }

        const inputWeight = await Modal.prompt("Введіть вашу поточну вагу (кг):", "ОНОВЛЕННЯ ВАГИ", current.toString());
        if (!inputWeight) return;
        
        const weight = parseFloat(inputWeight.replace(',', '.'));
        if (isNaN(weight) || weight <= 0) return await Modal.alert("Некоректна вага!", "ПОМИЛКА", "red");

        if (typeof GlobalVitals !== 'undefined') {
            const todayStr = GlobalVitals.formatDate(new Date());
            GlobalVitals.save(todayStr, 'w', weight.toString());
        }
        this.data.userWeight = weight;
        this.save();
        this.updateStats();
        if(window.Haptics) window.Haptics.success();
    },
    calcTargetKcal(isKcalManualInput = false) {
        const p = parseFloat(document.getElementById('tgP').value) || 0;
        const f = parseFloat(document.getElementById('tgF').value) || 0;
        const c = parseFloat(document.getElementById('tgC').value) || 0;
        const kEl = document.getElementById('tgK');
        
        let k;
        if (!isKcalManualInput) {
            k = Math.round(p * 4 + f * 9 + c * 4);
            kEl.value = k;
        } else {
            k = parseFloat(kEl.value) || 0;
        }

        const actualMacroKcal = (p * 4) + (f * 9) + (c * 4);
        let pPct = 0, fPct = 0, cPct = 0;
        const baseKcalForPct = Math.max(actualMacroKcal, k);

        if (baseKcalForPct > 0) {
            pPct = Math.round(((p * 4) / baseKcalForPct) * 100);
            fPct = Math.round(((f * 9) / baseKcalForPct) * 100);
            cPct = Math.round(((c * 4) / baseKcalForPct) * 100);
            if ((pPct + fPct + cPct) !== 100 && actualMacroKcal > 0) {
                pPct += 100 - (pPct + fPct + cPct); 
            }
        }

        let weight = null;
        if (typeof GlobalVitals !== 'undefined' && GlobalVitals.getLatestWeight()) {
            weight = GlobalVitals.getLatestWeight();
        } else if (this.data.userWeight) {
            weight = this.data.userWeight;
        }

        const calcMult = (grams) => weight && weight > 0 ? (grams / weight).toFixed(1) : "--";

        const updateLabel = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        updateLabel('lblModalPctP', `${pPct}%`);
        updateLabel('lblModalPctF', `${fPct}%`);
        updateLabel('lblModalPctC', `${cPct}%`);
        updateLabel('lblModalMultP', `${calcMult(p)}`);
        updateLabel('lblModalMultF', `${calcMult(f)}`);
        updateLabel('lblModalMultC', `${calcMult(c)}`);
    },
    
    saveTargets() {
        const day = this.getCurrentDay();
        this.pushHistory();
        
        const newT = {
            p: parseFloat(document.getElementById('tgP').value)||0,
            f: parseFloat(document.getElementById('tgF').value)||0,
            c: parseFloat(document.getElementById('tgC').value)||0,
            k: parseFloat(document.getElementById('tgK').value)||0
        };
        
        day.targets = newT;
        this.data.targets = { ...newT }; // Оновлюємо глобальні як резерв
        
        this.save(); 
        
        const dispT = document.getElementById('disp-target');
        if(dispT) {
            // Жорстко перевіряємо, чи є цілі у конкретного дня, якщо ні - беремо глобальні
            const currentKcal = day.targets && day.targets.k ? day.targets.k : (this.data.targets ? this.data.targets.k : 0);
            dispT.innerText = currentKcal;
        }
        
        this.render(false); 
        this.updateStats();
        
        this.closeModal();
    },

    async applyTargetsToAll() {
        if(!(await Modal.confirm("Застосувати ці макроси до ВСІХ створених днів?", "СИНХРОНІЗАЦІЯ", "gold"))) return;
        
        this.pushHistory();
        const newT = {
            p: parseFloat(document.getElementById('tgP').value)||0,
            f: parseFloat(document.getElementById('tgF').value)||0,
            c: parseFloat(document.getElementById('tgC').value)||0,
            k: parseFloat(document.getElementById('tgK').value)||0
        };

        this.data.targets = { ...newT };
        this.data.days.forEach(d => { d.targets = { ...newT }; });
        
        this.save();
        this.updateStats();
        this.closeModal();
        if(window.Haptics) window.Haptics.success();
    },
    exportData() {
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        a.download = "protocol_nutrition.json"; a.click();
    },
    
    importData(inp) {
        if (!inp.files || inp.files.length === 0) return;
        
        const file = inp.files[0];
        const r = new FileReader();
        
        r.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                
                // Базова валідація: перевіряємо, чи це дійсно наш бекап
                if (!parsed || typeof parsed !== 'object' || !parsed.days || !parsed.bank) {
                    throw new Error("Некоректна структура даних");
                }
                
                this.pushHistory();
                this.data = parsed;
                this.save();
                
                // Успішне завантаження
                location.reload();
            } catch (err) {
                console.error("Помилка імпорту:", err);
                // Якщо є система модальних вікон - використовуємо її, інакше стандартний alert
                if (typeof Modal !== 'undefined') {
                    await Modal.alert("Помилка читання файлу. Переконайтесь, що це валідний бекап системи.", "ПОМИЛКА ІМПОРТУ", "red");
                } else {
                    alert("Помилка читання файлу. Некоректний формат JSON.");
                }
            } finally {
                // Обов'язково скидаємо input, щоб подія onchange спрацювала при наступному виборі цього ж файлу
                inp.value = '';
            }
        };
        
        r.readAsText(file);
    }
};
// ЗАПОБІЖНИК: Гарантований запис при згортанні/закритті додатку
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && App.saveTimer) {
        clearTimeout(App.saveTimer);
        App.saveTimer = null;
        App.forceSave();
    }
});

window.addEventListener('beforeunload', () => {
    if (App.saveTimer) {
        clearTimeout(App.saveTimer);
        App.saveTimer = null;
        App.forceSave();
    }
});
document.addEventListener('DOMContentLoaded', () => App.init());
