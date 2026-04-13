document.addEventListener('DOMContentLoaded', () => {
    const globalHTML = `
    <div id="sys-fab" ontouchstart="event.preventDefault(); event.stopPropagation(); SysSwitch.toggle()" onclick="event.preventDefault(); event.stopPropagation(); SysSwitch.toggle()">✦</div>
    <div id="sys-overlay" onclick="SysSwitch.close()">
        <div class="sys-panel" onclick="event.stopPropagation()">
            <div class="sys-header">
                <span>PROTOCOL OS</span>
                <div class="sys-close" onclick="SysSwitch.close()">✕</div>
            </div>
            <div class="sys-grid">
                <a href="index.html" class="sys-card"><div class="sys-icon" style="color:#fff">🏠</div><span>HUB</span></a>
                <a href="pharm.html" class="sys-card"><div class="sys-icon" style="color:var(--gold)">🏆</div><span>PHARM</span></a>
                <a href="training.html" class="sys-card"><div class="sys-icon" style="color:var(--blue)">⚖️</div><span>TRAIN</span></a>
                <a href="nutrition.html" class="sys-card"><div class="sys-icon" style="color:var(--green)">🥑</div><span>FOOD</span></a>
            </div>
        </div>
    </div>

    <div id="protocol-modal-overlay">
        <div id="protocol-modal-box">
            <div id="protocol-modal-header">СИСТЕМНЕ ПОВІДОМЛЕННЯ</div>
            <div id="protocol-modal-body">
                <div id="protocol-modal-text">Текст повідомлення</div>
                <div id="protocol-modal-input-wrap">
                    <input type="text" id="protocol-modal-input" placeholder="Введіть дані...">
                </div>
            </div>
            <div id="protocol-modal-footer">
                <button id="modal-btn-cancel" class="modal-ctrl-btn" onclick="Modal.handleCancel()">СКАСУВАТИ</button>
                <button id="modal-btn-ok" class="modal-ctrl-btn" onclick="Modal.handleOK()">ОК</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', globalHTML);
    Modal.init();
});

const SysSwitch = {
    get el() { return document.getElementById('sys-overlay'); },
    toggle() { 
        if(this.el.classList.contains('open')) this.close();
        else this.open();
    },
    open() {
        this.el.style.display = 'flex';
        this.el.offsetHeight; 
        this.el.classList.add('open');
    },
    close() {
        this.el.classList.remove('open');
    }
};

const Haptics = {
    light: () => { if(navigator.vibrate) navigator.vibrate(10); },
    medium: () => { if(navigator.vibrate) navigator.vibrate(25); },
    heavy: () => { if(navigator.vibrate) navigator.vibrate(50); },
    success: () => { if(navigator.vibrate) navigator.vibrate([10, 30, 10]); },
    error: () => { if(navigator.vibrate) navigator.vibrate([50, 50, 50]); }
};

document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.nav-tab') || 
        e.target.closest('.icon-btn') || e.target.closest('.day-tab') ||
        e.target.closest('.phase-btn') || e.target.closest('.smart-card') ||
        e.target.closest('.modal-ctrl-btn') || e.target.closest('.ctrl-btn')) {
        Haptics.light();
    }
});

let modalResolve = null; 

const Modal = {
    overlay: null, box: null, header: null, text: null,
    inputWrap: null, input: null, btnCancel: null, btnOk: null, footer: null,
    _handleKeyDown: null, // Додано для збереження слухача клавіатури

    init() {
        this.overlay = document.getElementById('protocol-modal-overlay');
        this.box = document.getElementById('protocol-modal-box');
        this.header = document.getElementById('protocol-modal-header');
        this.text = document.getElementById('protocol-modal-text');
        this.inputWrap = document.getElementById('protocol-modal-input-wrap');
        this.input = document.getElementById('protocol-modal-input');
        this.btnCancel = document.getElementById('modal-btn-cancel');
        this.btnOk = document.getElementById('modal-btn-ok');
        this.footer = document.getElementById('protocol-modal-footer');
    },

    show({ title, text, type = 'alert', theme = 'gold', placeholder = '' }) {
        if(!this.overlay) this.init(); 
        
        this.header.innerText = title;
        this.text.innerHTML = text;
        this.input.value = ''; 
        this.box.className = `theme-${theme}`;

        if (type === 'alert') {
            this.inputWrap.style.display = 'none';
            this.btnCancel.style.display = 'none';
            this.footer.className = '';
            this.btnOk.className = `modal-ctrl-btn sys-${theme === 'red' ? 'reset' : 'save'}`;
            this.btnOk.innerText = 'ОК';
        } else if (type === 'confirm') {
            this.inputWrap.style.display = 'none';
            this.btnCancel.style.display = 'flex';
            this.footer.className = 'dual-btn';
            this.btnOk.className = `modal-ctrl-btn sys-${theme === 'red' ? 'reset' : 'save'}`;
            this.btnOk.innerText = 'ПІДТВЕРДИТИ'; 
        } else if (type === 'prompt') {
            this.inputWrap.style.display = 'block';
            this.input.placeholder = placeholder;
            this.btnCancel.style.display = 'flex';
            this.footer.className = 'dual-btn';
            this.btnOk.className = 'modal-ctrl-btn sys-save';
            this.btnOk.innerText = 'ОК';
            setTimeout(() => this.input.focus(), 300);
        }

        this.overlay.className = 'active';
        Haptics.medium();
        
        return new Promise((resolve) => { 
            modalResolve = resolve; 
            
            // ДОДАНО: Обробка клавіш Enter та Escape
            this._handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleOK();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (this.btnCancel.style.display !== 'none') {
                        this.handleCancel();
                    } else {
                        this.handleOK(); // Якщо кнопки скасування немає, Escape працює як ОК
                    }
                }
            };
            document.addEventListener('keydown', this._handleKeyDown);
        });
    },

    handleOK() {
        if (this._handleKeyDown) document.removeEventListener('keydown', this._handleKeyDown);
        const type = this.inputWrap.style.display === 'block' ? 'prompt' : (this.btnCancel.style.display === 'flex' ? 'confirm' : 'alert');
        this.close();
        if (type === 'prompt') modalResolve(this.input.value);
        else modalResolve(true);
    },

    handleCancel() {
        if (this._handleKeyDown) document.removeEventListener('keydown', this._handleKeyDown);
        this.close();
        modalResolve(null); 
    },

    close() {
        this.overlay.className = '';
    },

    async alert(text, title = "УВАГА", theme = "gold") { return this.show({ text, title, theme, type: 'alert' }); },
    async confirm(text, title = "ПІДТВЕРДЖЕННЯ", theme = "gold") { return this.show({ text, title, theme, type: 'confirm' }); },
    async prompt(text, title = "ВВЕДЕННЯ", placeholder = "") { return this.show({ text, title, placeholder, type: 'prompt', theme: 'gold' }); }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(err => console.error('Помилка SW:', err));
    });
}

// ЗАКРИТТЯ БУДЬ-ЯКОЇ МОДАЛКИ ПО КЛІКУ НА ПУСТЕ МІСЦЕ (ФОН)
// Якщо клік був саме по темному фону (.modal або .modal-overlay)
    if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay') || e.target.id === 'customPhotoModal') {
        
        // Викликаємо універсальний метод закриття з pharm.js
        if (typeof App !== 'undefined' && typeof App.closeModal === 'function') {
            App.closeModal();
        } else {
            // Фолбек для інших сторінок (food, training)
            e.target.style.display = 'none'; 
            e.target.classList.remove('active');
            if (typeof App !== 'undefined' && typeof App.unlockScroll === 'function') {
                App.unlockScroll(); 
            }
            document.body.classList.remove('modal-active');
        }
    }
    if (e.target.id === 'protocol-modal-overlay') {
        if (typeof Modal !== 'undefined') Modal.handleCancel();
    }
});

// 1. Розумне зняття фокусу (ФІКС ДЛЯ ЗБЕРЕЖЕННЯ КЛАВІАТУРИ В МОДАЛКАХ)
document.addEventListener('touchstart', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.hasAttribute('contenteditable'))) {
        
        // Ігноруємо кліки по кнопках
        if (e.target.closest('button') || e.target.classList.contains('btn-privacy-unlock')) return;
        
        // КРИТИЧНИЙ ФІКС: Якщо тап всередині модального вікна — ігноруємо.
        // Клавіатура НЕ БУДЕ ховатись, якщо ти промазав повз інпут.
        if (e.target.closest('.modal-content') || e.target.closest('.privacy-modal-content')) return;

        // Знімаємо фокус тільки якщо клік був по глобальному фону додатку
        if (e.target !== active && !active.contains(e.target)) {
            active.blur();
        }
    }
}, { passive: true });

// 2. Аналітичний фікс позиції сторінки після клавіатури iOS
const IOSKeyboardFixer = {
    initialScrollY: 0,
    isKeyboardOpen: false,
    init() {
        document.addEventListener('focusin', (e) => {
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.hasAttribute('contenteditable');
            if (isInput && !this.isKeyboardOpen) {
                // КРИТИЧНИЙ ФІКС: Якщо ми в модалці, НЕ перезаписуємо початковий скрол нулем!
                if (!document.body.classList.contains('modal-active') && !document.body.classList.contains('privacy-locked')) {
                    this.initialScrollY = window.scrollY;
                }
                this.isKeyboardOpen = true;
            }
        });

        document.addEventListener('focusout', (e) => {
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.hasAttribute('contenteditable');
            if (isInput) {
                setTimeout(() => {
                    const active = document.activeElement;
                    const stillInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.hasAttribute('contenteditable'));
                    
                    if (!stillInput) {
                        this.isKeyboardOpen = false;
                        
                        const privModal = document.getElementById('privacyModal');
                        const isAnyModalOpen = document.body.classList.contains('modal-active') || 
                                               document.body.classList.contains('privacy-locked') ||
                                               (privModal && privModal.style.display === 'flex');
                        
                        // АБСОЛЮТНИЙ ФІКС: Якщо ми закриваємо модалку через кнопку, цей блок ігнорується
                        if (!isAnyModalOpen && !window.blockKeyboardScrollFix) {
                            window.scrollTo({ top: this.initialScrollY, behavior: 'instant' }); 
                            document.body.style.transform = 'translateZ(0)';
                            setTimeout(() => document.body.style.transform = '', 50);
                        }
                    }
                }, 50);
            }
        });
    }
};
IOSKeyboardFixer.init();

// ДОДАНО: Глобальний запобіжник від втрати даних
// Спрацьовує, якщо користувач згорнув браузер або вимкнув екран телефону
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        const active = document.activeElement;
        // Знімаємо фокус, щоб примусово відпрацював onblur у полях вводу (наприклад, у training.js)
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.hasAttribute('contenteditable'))) {
            active.blur(); 
        }
        // Примусове збереження поточного стейту
        if (typeof App !== 'undefined' && typeof App.save === 'function') {
            App.save();
        }
    }
});
