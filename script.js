const _k = ["AIzaSyDBzJh", "FBpIEZzX9xBbN7v", "KrHjSn3ZZhYv0"];
const firebaseConfig = {
    apiKey: _k.join(''),
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebasedatabase.app",
    projectId: "ai-nomad-41a26",
    appId: "1:698203859523:web:80215d3e746affdc3f42f6"
};

let db = null;
let state = { 
    username: localStorage.getItem('ai_nomad_user') || "",
    money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    res: { chips: 0, code: 0 }, resCosts: { chips: 500, code: 300 },
    inventory: { helmet: false }, farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } },
    production: { chips: false, code: false }
};

function startApp() {
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            if (state.username) loadCloud();
        } catch (e) { console.warn("Cloud offline"); }
    }
    if (!state.username) document.getElementById('auth-overlay').style.display = 'flex';
    updateUI();
}

const save = () => {
    localStorage.setItem('ai_nomad_v_master', JSON.stringify(state));
    if (db && state.username) db.ref('players/' + state.username.replace(/[.#$[\]]/g, "_")).set(state);
};

function loadCloud() {
    db.ref('players/' + state.username.replace(/[.#$[\]]/g, "_")).once('value').then(s => {
        if (s.exists()) {
            state = {...state, ...s.val()};
            if(!state.resCosts) state.resCosts = { chips: 500, code: 300 };
            updateUI();
        }
    });
}

function registerManual() {
    const v = document.getElementById('username-input').value.trim();
    if (v.length > 2) {
        state.username = v;
        localStorage.setItem('ai_nomad_user', v);
        document.getElementById('auth-overlay').style.display = 'none';
        updateUI(); save();
    }
}

document.getElementById('generate-btn').onclick = () => {
    state.money += state.reach; state.reach++; state.xp += 15;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp; state.level++; state.nextXp *= 1.6;
        showToast(`🆙 УРОВЕНЬ ${state.level}`);
    }
    updateUI(); save();
};

function buyFarm(id, b, i) {
    let p = Math.floor(b * Math.pow(1.15, state.farm[id].count));
    if (state.money >= p) {
        state.money -= p; state.farm[id].count++; state.autoIncome += i;
        updateUI(); save();
    } else showToast("Мало денег!");
}

function startResourceProduction(type, base, sec) {
    if (state.level < 5) return showToast("Нужен 5 LVL!");
    let cost = state.resCosts[type] || base;
    if (state.money < cost || state.production[type]) return;
    state.money -= cost; state.production[type] = true;
    state.resCosts[type] = Math.floor(cost * 1.2);
    const bar = document.getElementById(`progress-${type}`);
    bar.style.transition = `width ${sec}s linear`;
    setTimeout(() => bar.style.width = "100%", 50);
    setTimeout(() => {
        state.res[type]++; state.production[type] = false;
        bar.style.transition = "none"; bar.style.width = "0%";
        updateUI(); save();
    }, sec * 1000);
    updateUI();
}

function openCase() {
    if (state.gems < 50) return showToast("Нужно 50 💎");
    state.gems -= 50;
    let rng = Math.random() * 100, p = "";
    if (rng < 1) { p = "💎 (Jackpot!)"; state.gems += 1; }
    else if (rng < 20) { p = "⚙️ Чипы (+5)"; state.res.chips += 5; }
    else if (rng < 40) { p = "💾 Код (+5)"; state.res.code += 5; }
    else { p = "💩 Мусор"; }
    document.getElementById('case-overlay').style.display = 'flex';
    document.getElementById('win-text').innerText = p;
    updateUI(); save();
}

function updateUI() {
    document.getElementById('display-username').innerText = state.username || "Номад";
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gems').innerText = state.gems;
    document.getElementById('level').innerText = state.level;
    document.getElementById('res-chips').innerText = state.res.chips;
    document.getElementById('res-code').innerText = state.res.code;
    document.getElementById('total-auto-income').innerText = state.autoIncome;
    document.getElementById('xp-fill').style.width = (state.xp/state.nextXp*100) + "%";
    document.getElementById('make-chip-btn').innerText = `Чип ($${state.resCosts.chips})`;
    document.getElementById('make-code-btn').innerText = `Код ($${state.resCosts.code})`;
    Object.keys(state.farm).forEach(id => {
        let p = Math.floor(state.farm[id].cost * Math.pow(1.15, state.farm[id].count));
        document.getElementById(`price-${id}`).innerText = p.toLocaleString();
        document.getElementById(`count-${id}`).innerText = state.farm[id].count;
    });
}

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    e.currentTarget.classList.add('active');
}
function closeModal(id) { document.getElementById(id).style.display='none'; }
function showToast(t) { const el = document.getElementById('toast'); el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000); }

window.onload = startApp;
setInterval(() => { if(state.autoIncome > 0) { state.money += state.autoIncome; updateUI(); } }, 1000);
