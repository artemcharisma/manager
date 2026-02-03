// assets/js/utils.js

const Utils = {
    // Безпечне завантаження даних (повертає defaultData, якщо нічого немає або помилка)
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

    // Генерація унікального ID (для нових записів)
    id() {
        return Date.now();
    },

    // Форматування дати (український формат)
    date(d = new Date()) {
        return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
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
                // Об'єднуємо збережені дані з дефолтними (щоб нові поля не ламали старі сейви)
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
        if (this.history.length > 20) this.history.shift(); // Тримаємо останні 20 кроків
        this.history.push(JSON.stringify(data));
        return true; // Повертає true, щоб ми знали, що можна показати кнопку Undo
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
