const _k = ["AIzaSyDBzJh", "FBpIEZzX9xBbN7v", "KrHjSn3ZZhYv0"];
const firebaseConfig = {
    apiKey: _k.join(''),
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebasedatabase.app",
    projectId: "ai-nomad-41a26",
    appId: "1:698203859523:web:80215d3e746affdc3f42f6"
};

let db;
try { firebase.initializeApp(firebaseConfig); db = firebase.database(); } catch(e){}

const defaultState = { 
    username: "", money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    res: { chips: 0, code: 0 }, resCosts: { chips: 500, code: 300 },
    inventory: { helmet: false, server: false },
    serverPower: 1, lab: { lvl: 0, cost: 500, xpPerSec: 0 },
    turbo: { active: false, time: 0 }, production: { chips: false, code: false },
    farm: { bot1: { count: 0 }, bot2: { count: 0 } }
};

let state = JSON.parse(JSON.stringify(defaultState));

// Безопасное обновление текста
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

const save = () => {
    localStorage.setItem('ai_nomad_v_master_stable', JSON.stringify(state));
    if(db && state.username) db.ref('players/' + state.username.replace(/[.#$[\]]/g, "_")).set(state);
};

function addXP(amt) {
    let mult = (state.inventory.helmet ? 2 : 1) * (state.turbo.active ? 2.0 : 1);
    state.xp += amt * mult;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp; state.level++;
        state.nextXp = Math.floor(state.nextXp * 1.85) + (state.level * 100);
        showToast(`🆙 LVL UP: ${state.level}`);
    }
}

document.getElementById('generate-btn').onclick = () => {
    let m = state.turbo.active ? 10 : 1;
    let labBonus = 1 + (state.lab.lvl * 0.05);
    state.money += state.reach * m * labBonus; state.reach++;
    addXP(10); updateUI(); save();
};

function buyFarm(id, base, inc) {
    if (!state.farm[id]) state.farm[id] = { count: 0 };
    let price = Math.floor(base * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price;
        state.farm[id].count++;
        state.autoIncome += inc;
        addXP(price * 0.05);
        updateUI(); save();
    } else {
        showToast("Мало денег!");
    }
}

function upgradeLab() {
    if (state.money >= state.lab.cost) {
        state.money -= state.lab.cost; state.lab.lvl++;
        state.lab.xpPerSec = state.lab.lvl * 3;
        state.lab.cost = Math.floor(state.lab.cost * 3.5);
        updateUI(); save();
    } else {
        showToast("Мало денег!");
    }
}

function startResourceProduction(t, bc, s) {
    let cost = state.resCosts[t] || bc;
    if (state.level < 5 || state.money < cost || state.production[t]) return;
    state.money -= cost; state.production[t] = true;
    state.resCosts[t] = Math.floor(cost * 1.3);
    const bar = document.getElementById(`progress-${t}`);
    if (bar) {
        bar.style.transition = `width ${s}s linear`; bar.style.width = "100%";
    }
    setTimeout(() => { 
        state.res[t]++; state.production[t] = false; 
        if(bar) { bar.style.transition = "none"; bar.style.width = "0%"; }
        updateUI(); save(); 
    }, s * 1000);
    updateUI();
}

function openCase() {
    if (state.gems < 50) return showToast("Мало 💎");
    state.gems -= 50; 
    const strip = document.getElementById('items-strip');
    const winText = document.getElementById('win-text');
    const winMsg = document.getElementById('win-msg');
    
    if(!strip || !winText) return;

    strip.innerHTML = ''; strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
    winText.innerText = ""; winMsg.innerText = "КРУТИМ...";

    const items = ['⚙️','💾','💎','👑','💩']; const pool = [];
    for(let i=0; i<60; i++) {
        let rng = Math.random() * 100;
        let itm = rng < 2 ? '💎' : items[Math.floor(Math.random()*items.length)];
        pool.push(itm);
        let d = document.createElement('div'); d.className = 'strip-item'; d.innerText = itm; strip.appendChild(d);
    }
    document.getElementById('case-overlay').style.display='flex';

    setTimeout(() => {
        strip.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        const winIdx = 55, itemW = 80;
        const containerWidth = document.getElementById('spinner-container').offsetWidth;
        const offset = -(winIdx * itemW) + (containerWidth / 2) - (itemW / 2);
        strip.style.transform = `translateX(${offset}px)`;
        
        setTimeout(() => {
            const p = pool[winIdx];
            let name = "";
            if(p==='⚙️'){ name="ЧИПЫ (+5)"; state.res.chips+=5; }
            else if(p==='💾'){ name="КОД (+5)"; state.res.code+=5; }
            else if(p==='💎'){ name="БРИЛЛИАНТ (+1)"; state.gems+=1; }
            else if(p==='👑'){ name="ДЖЕКПОТ ($5000)"; state.money+=5000; }
            else name="МУСОР";
            winMsg.innerText = "ВЫИГРЫШ:"; winText.innerText = name;
            updateUI(); save();
        }, 4100);
    }, 100);
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd && !state.inventory[id]) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true;
        showToast("🛠️ СКРАФЧЕНО!"); updateUI(); save();
    } else if (state.inventory[id]) { showToast("Уже есть!"); } else showToast("Мало ресурсов!");
}

function upgradeServerPower() {
    let cost = 5000 * state.serverPower;
    if (state.money >= cost) {
        state.money -= cost; state.serverPower++;
        showToast("⚡ Разогнано!"); updateUI(); save();
    }
}

function updateUI() {
    if (!state.farm) state.farm = { bot1: { count: 0 }, bot2: { count: 0 } };

    setText('display-username', state.username || "Номад");
    setText('money', Math.floor(state.money).toLocaleString());
    setText('gems', state.gems);
    setText('level', state.level);
    setText('res-chips', state.res.chips);
    setText('res-code', state.res.code);
    setText('reach', state.reach);
    
    let labBonus = 1 + (state.lab.lvl * 0.05);
    setText('total-auto-income', Math.floor(state.autoIncome * labBonus).toLocaleString());
    setText('auto-xp-income', state.lab.xpPerSec);
    setText('lab-lvl', state.lab.lvl);
    setText('lab-cost-display', "$" + (state.lab.cost || 500).toLocaleString());
    setText('lab-mult-display', labBonus.toFixed(2));
    
    const xpFill = document.getElementById('xp-fill');
    if(xpFill) xpFill.style.width = (state.xp/state.nextXp*100) + "%";
    
    const fab = document.getElementById('fab-controls');
    if(fab) fab.className = state.level < 5 ? 'locked' : '';
    
    setText('make-chip-btn', `Чип ($${state.resCosts.chips || 500})`);
    setText('make-code-btn', `Код ($${state.resCosts.code || 300})`);
    
    setText('price-bot1', "$" + Math.floor(100 * Math.pow(1.15, state.farm.bot1?.count || 0)).toLocaleString());
    setText('count-bot1', state.farm.bot1?.count || 0);
    setText('price-bot2', "$" + Math.floor(800 * Math.pow(1.15, state.farm.bot2?.count || 0)).toLocaleString());
    setText('count-bot2', state.farm.bot2?.count || 0);

    if(state.inventory.helmet) setText('btn-craft-helmet', "АКТИВНО");
    
    if(state.inventory.server) {
        const cs = document.getElementById('btn-craft-server');
        if(cs) cs.style.display = "none";
        const us = document.getElementById('btn-upgrade-server');
        if(us) {
            us.style.display = "block";
            us.innerText = `Разгон ($${(5000 * state.serverPower).toLocaleString()})`;
        }
        setText('server-mining-info', `Удача: ${(state.serverPower * 0.1).toFixed(1)}%`);
    }
}

function registerManual() { 
    const v = document.getElementById('username-input').value.trim(); 
    if(v.length>2) { 
        state.username = v; localStorage.setItem('ai_nomad_user', v); document.getElementById('auth-overlay').style.display = 'none'; 
        if(db) db.ref('players/' + v.replace(/[.#$[\]]/g, "_")).once('value').then(snap => { if(snap.exists()) state = {...state, ...snap.val()}; updateUI(); save(); });
    } 
}

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block'; e.currentTarget.classList.add('active');
}

function openLeaderboard() {
    if(!db) return;
    db.ref('players').orderByChild('money').limitToLast(10).once('value').then(snap => {
        let list = []; snap.forEach(p => list.push(p.val()));
        const lb = document.getElementById('leaderboard-list');
        if(lb) lb.innerHTML = list.reverse().map((p,i)=>`<div style="display:flex; justify-content:space-between; padding:4px; font-size:0.8rem; border-bottom:1px solid #333"><span>${i+1}. ${p.username}</span><span>$${Math.floor(p.money).toLocaleString()}</span></div>`).join('');
        document.getElementById('leaderboard-overlay').style.display='flex';
    });
}
function closeModal(id) { document.getElementById(id).style.display='none'; }

function activateTurbo() { 
    if(state.turbo.active) return;
    if(confirm("ТУРБО x10?")) {
        state.turbo.active = true; state.turbo.time = 30;
        const disp = document.getElementById('turbo-timer-display');
        if(disp) disp.style.display = 'block';
        let t = setInterval(() => {
            state.turbo.time--; setText('turbo-sec', state.turbo.time);
            if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; if(disp) disp.style.display = 'none'; }
        }, 1000);
    }
}
function showToast(t) { const el = document.getElementById('toast'); if(el) {el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000);} }

window.onload = () => {
    const s = localStorage.getItem('ai_nomad_v_master_stable');
    if(s) {
        const loaded = JSON.parse(s);
        state = Object.assign({}, defaultState, loaded);
        state.farm = Object.assign({}, defaultState.farm, loaded.farm);
        state.res = Object.assign({}, defaultState.res, loaded.res);
        state.inventory = Object.assign({}, defaultState.inventory, loaded.inventory);
    }
    if(!state.username) document.getElementById('auth-overlay').style.display = 'flex';
    updateUI();
};

setInterval(() => { 
    let labBonus = 1 + (state.lab.lvl * 0.05);
    state.money += state.autoIncome * labBonus; 
    if(state.lab.xpPerSec > 0) addXP(state.lab.xpPerSec / 10);
    if(state.inventory.server) {
        if(Math.random() < (state.serverPower * 0.001)) {
            state.gems++; showToast("💎 MINED! +1");
            const o = document.getElementById('mining-overlay'); o.style.display = 'block';
            const p = document.createElement('div'); p.className = 'mining-particle'; p.innerText = "1";
            p.style.left = Math.random()*100+"vw"; p.style.animationDuration = "2s";
            if(o) o.appendChild(p); setTimeout(()=>p.remove(), 2000);
        }
    }
    updateUI(); 
}, 1000);
