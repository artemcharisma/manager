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

/* =========================================
   PROTOCOL OS - UTILS (OPTIMIZED)
   ========================================= */

class StateManager {
    constructor(storageKey, defaultData, maxHistory = 10) {
        this.key = storageKey;
        this.defaultData = defaultData;
        this.maxHistory = maxHistory;
        this.history = []; // Історія тепер живе ТІЛЬКИ в RAM
    }

    init() {
        try {
            const stored = localStorage.getItem(this.key);
            if (stored) {
                // Завантажуємо актуальний стан
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error("Помилка ініціалізації бази:", e);
        }
        return JSON.parse(JSON.stringify(this.defaultData));
    }

    push(data) {
        // Зберігаємо копію в оперативній пам'яті для Undo
        this.history.push(JSON.stringify(data));
        if (this.history.length > this.maxHistory) {
            this.history.shift(); // Видаляємо найстаріший крок
        }
        // НЕ пишемо history в localStorage, щоб не вбити квоту 5MB!
    }

    undo(currentData) {
        if (this.history.length > 0) {
            const prev = this.history.pop();
            const prevObj = JSON.parse(prev);
            this.save(prevObj); // Зберігаємо скасований стан як актуальний
            return prevObj;
        }
        return null;
    }

    save(data) {
        // Пишемо в базу ТІЛЬКИ фінальний актуальний стан
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error("Quota Exceeded! База даних занадто велика.", e);
            if (window.Modal) {
                window.Modal.alert("Пам'ять пристрою переповнена. Будь ласка, зробіть Backup і видаліть старі тижні.", "ПОМИЛКА ПАМ'ЯТІ", "red");
            }
        }
    }

    export(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
