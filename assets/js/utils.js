// assets/js/utils.js

const Utils = {
    load(key, defaultData) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) {
            console.error(`Error loading ${key}:`, e);
            return defaultData;
        }
    },
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${key}:`, e);
            // Аварійний перехоплювач переповнення LocalStorage
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                if (typeof Modal !== 'undefined' && Modal.alert) {
                    Modal.alert("Пам'ять браузера переповнена (Quota Exceeded). Дані не збережено! Зробіть експорт бекапу та очистіть історію/кеш.", "КРИТИЧНА ПОМИЛКА", "red");
                } else {
                    alert("КРИТИЧНА ПОМИЛКА: Пам'ять переповнена. Дані не збережено! Зробіть бекап.");
                }
            }
        }
    },
    loadSync(key, def) { return this.load(key, def); },
    saveSync(key, data) { return this.save(key, data); },
    id() { return Date.now(); },
    date(d = new Date()) { return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }); },
    
    // Надвисокошвидкісне клонування об'єктів без навантаження на Garbage Collector
    deepClone(obj) {
        if (typeof structuredClone === 'function') {
            try { return structuredClone(obj); } catch(e) { /* fallback */ }
        }
        return JSON.parse(JSON.stringify(obj));
    }
};

const GlobalVitals = {
    key: 'protocol_global_vitals',
    formatDate(dateObj) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    getAll() { return Utils.load(this.key, {}); },
    get(dateString) {
        const all = this.getAll();
        return all[dateString] || { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
    },
    save(dateString, field, value) {
        const all = this.getAll();
        if (!all[dateString]) all[dateString] = { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
        all[dateString][field] = value;
        Utils.save(this.key, all);
    },
    getLatestWeight() {
        const all = this.getAll();
        const dates = Object.keys(all).sort((a, b) => new Date(b) - new Date(a));
        for (let d of dates) { if (all[d].w) return parseFloat(all[d].w); }
        return null;
    },
    // НОВИЙ МЕТОД: Розрахунок середньотижневої дельти
    getWeightTrend() {
        const all = this.getAll();
        const today = new Date();
        today.setHours(0,0,0,0);

        let currentSum = 0, currentCount = 0;
        let prevSum = 0, prevCount = 0;

        // Рахуємо середню вагу за останні 7 днів і за попередні 7 днів (8-14 днів тому)
        for(let i=0; i<7; i++) {
            let d1 = new Date(today); d1.setDate(d1.getDate() - i);
            let v1 = all[this.formatDate(d1)];
            if (v1 && v1.w) { currentSum += parseFloat(v1.w); currentCount++; }

            let d2 = new Date(today); d2.setDate(d2.getDate() - (i + 7));
            let v2 = all[this.formatDate(d2)];
            if (v2 && v2.w) { prevSum += parseFloat(v2.w); prevCount++; }
        }

        const currentAvg = currentCount > 0 ? (currentSum / currentCount) : null;
        const prevAvg = prevCount > 0 ? (prevSum / prevCount) : null;
        const delta = (currentAvg !== null && prevAvg !== null) ? (currentAvg - prevAvg) : null;

        return { currentAvg, prevAvg, delta };
    }
};

class StateManager {
    constructor(storageKey, defaultData, maxHistory = 3) {
        this.key = storageKey;
        this.defaultData = defaultData;
        this.maxHistory = maxHistory;
        this.history = []; 
    }
    init() { return Utils.load(this.key, this.defaultData); }
    
    push(data) {
        // Використовуємо оптимізоване бінарне клонування замість важкого парсингу тексту
        this.history.push(Utils.deepClone(data));
        if (this.history.length > this.maxHistory) this.history.shift();
    }
    
    undo(currentData) {
        if (this.history.length > 0) {
            const prevObj = this.history.pop();
            this.save(prevObj); 
            // Повертаємо клон, щоб уникнути мутацій в історії при подальшій роботі з об'єктом
            return Utils.deepClone(prevObj);
        }
        return null;
    }
    
    save(data) { Utils.save(this.key, data); }
    
    export(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }
}
