// assets/js/utils.js

const Utils = {
    // Безпечне завантаження даних
    load(key, defaultData) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) {
            console.warn(`Помилка завантаження даних для ключа "${key}":`, e);
            return defaultData;
        }
    },

    // Збереження даних
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Помилка збереження даних для ключа "${key}":`, e);
            alert("Увага! Пам'ять переповнена, дані не збережено.");
        }
    },

    // Генерація унікального ID
    id() {
        return Date.now();
    },

    // Форматування дати (український формат)
    date(d = new Date()) {
        return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    }
};

// ГЛОБАЛЬНИЙ СЕРВІС ЖИТТЄВИХ ПОКАЗНИКІВ
const GlobalVitals = {
    key: 'protocol_global_vitals',
    
    // Форматування будь-якого Date об'єкта у строгий формат YYYY-MM-DD
    formatDate(dateObj) {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    getAll() {
        return Utils.load(this.key, {});
    },

    get(dateString) {
        const all = this.getAll();
        return all[dateString] || { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
    },

    save(dateString, field, value) {
        const all = this.getAll();
        if (!all[dateString]) {
            all[dateString] = { w: '', bp: '', hr: '', chest: '', waist: '', arm: '', leg: '', calf: '' };
        }
        all[dateString][field] = value;
        Utils.save(this.key, all);
    },

    // Отримання останньої введеної ваги (для Хабу та розрахунків дозувань)
    getLatestWeight() {
        const all = this.getAll();
        const dates = Object.keys(all).sort((a, b) => new Date(b) - new Date(a));
        for (let d of dates) {
            if (all[d].w) return parseFloat(all[d].w);
        }
        return null;
    }
};

class StateManager {
    constructor(key, defaultData) {
        this.key = key;
        this.defaultData = defaultData;
        this.history = [];
    }

    // Завантаження даних
    init() {
        const s = localStorage.getItem(this.key);
        if (s) {
            try {
                return { ...this.defaultData, ...JSON.parse(s) };
            } catch (e) {
                console.error("Error parsing data", e);
                return JSON.parse(JSON.stringify(this.defaultData));
            }
        }
        return JSON.parse(JSON.stringify(this.defaultData));
    }

    // Збереження
    save(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            alert("Пам'ять переповнена! Видаліть щось.");
        }
    }

    // Додати в історію (для Undo)
    push(data) {
        if (this.history.length > 20) this.history.shift();
        this.history.push(JSON.stringify(data));
        return true;
    }

    // Повернути назад
    undo(currentData) {
        if (this.history.length === 0) return null;
        const prevData = JSON.parse(this.history.pop());
        this.save(prevData);
        return prevData;
    }
    
    // Експорт файлу
    export(data, filename) {
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        a.download = filename;
        a.click();
    }
}
