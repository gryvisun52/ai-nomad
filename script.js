const firebaseConfig = {
    apiKey: "AIzaSyDBzJhFBpIEZzX9xBbN7vKrHjSn3ZZhYv0",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebasedatabase.app",
    projectId: "ai-nomad-41a26",
    appId: "1:698203859523:web:80215d3e746affdc3f42f6"
};

let db = null;
let state = { 
    username: localStorage.getItem('ai_nomad_user') || "",
    money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    res: { chips: 0, code: 0 }, inventory: { helmet: false },
    farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } }
};

// Инициализация
function startApp() {
    // Проверка, загрузился ли Firebase из CDN
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            console.log("Firebase Connected");
            if (state.username) loadCloud();
        } catch (e) { console.error("Firebase Init Error:", e); }
    } else {
        console.warn("Offline Mode: Firebase scripts blocked");
    }

    if (!state.username) {
        document.getElementById('auth-overlay').style.display = 'flex';
    }
    updateUI();
}

function save() {
    localStorage.setItem('ai_nomad_save', JSON.stringify(state));
    if (db && state.username) {
        const safeName = state.username.replace(/[.#$[\]]/g, "_");
        db.ref('players/' + safeName).set(state);
    }
}

function loadCloud() {
    const safeName = state.username.replace(/[.#$[\]]/g, "_");
    db.ref('players/' + safeName).once('value').then(s => {
        if (s.exists()) {
            state = {...state, ...s.val()};
            updateUI();
        }
    });
}

function registerManual() {
    const val = document.getElementById('username-input').value.trim();
    if (val.length > 2) {
        state.username = val;
        localStorage.setItem('ai_nomad_user', val);
        document.getElementById('auth-overlay').style.display = 'none';
        updateUI();
        save();
    }
}

document.getElementById('generate-btn').onclick = () => {
    state.money += state.reach;
    state.reach++;
    state.xp += 20;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp;
        state.level++;
        state.nextXp *= 1.6;
        showToast("🆙 НОВЫЙ LVL!");
    }
    updateUI();
    save();
};

function buyFarm(id, b, i) {
    let price = Math.floor(b * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price;
        state.farm[id].count++;
        state.autoIncome += i;
        updateUI();
        save();
    } else {
        showToast("Не хватает денег!");
    }
}

function openCase() {
    if (state.gems < 50) return showToast("Мало 💎");
    state.gems -= 50;
    const items = ['⚙️','💾','💎','👑'];
    const p = items[Math.floor(Math.random()*items.length)];
    if(p==='⚙️') state.res.chips+=5;
    if(p==='💾') state.res.code+=5;
    if(p==='💎') state.gems+=5;
    if(p==='👑') state.money+=1000;
    showToast(`Выпало: ${p}`);
    updateUI();
    save();
}

function updateUI() {
    document.getElementById('display-username').innerText = state.username || "Номад";
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gems').innerText = state.gems;
    document.getElementById('level').innerText = state.level;
    document.getElementById('res-chips').innerText = state.res.chips;
    document.getElementById('res-code').innerText = state.res.code;
    document.getElementById('total-auto-income').innerText = state.autoIncome;
    document.getElementById('xp-fill').style.width = Math.min(100, (state.xp/state.nextXp*100)) + "%";
}

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    e.currentTarget.classList.add('active');
}

function showToast(t) {
    const el = document.getElementById('toast');
    el.innerText = t; el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 2000);
}

window.onload = startApp;
setInterval(() => {
    if (state.autoIncome > 0) {
        state.money += state.autoIncome;
        updateUI();
    }
}, 1000);
