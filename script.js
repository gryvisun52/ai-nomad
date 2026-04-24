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

let state = { 
    username: localStorage.getItem('ai_nomad_user') || "",
    money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    reputation: 100, res: { chips: 0, code: 0 }, resCosts: { chips: 500, code: 300 },
    inventory: { helmet: false, server: false },
    farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } },
    lab: { lvl: 0, cost: 500, xpPerSec: 0 },
    turbo: { active: false, time: 0 }, production: { chips: false, code: false }
};

const save = () => {
    localStorage.setItem('ai_nomad_v_master_v3', JSON.stringify(state));
    if(db && state.username) db.ref('players/' + state.username.replace(/[.#$[\]]/g, "_")).set(state);
};

function addXP(amt) {
    let mult = (state.inventory.helmet ? 2 : 1) * (state.turbo.active ? 2.0 : 1);
    state.xp += amt * mult;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp; state.level++;
        state.nextXp = Math.floor(state.nextXp * 1.85) + (state.level * 100);
        showToast(`🔝 LVL UP: ${state.level}`);
    }
}

document.getElementById('generate-btn').onclick = () => {
    let m = state.turbo.active ? 10 : 1;
    state.money += state.reach * m; state.reach++;
    addXP(10); updateUI(); save();
};

function buyFarm(id, base, inc) {
    let price = Math.floor(base * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price; state.farm[id].count++; state.autoIncome += inc;
        addXP(price * 0.05); updateUI(); save();
    } else showToast("Мало денег!");
}

function upgradeLab() {
    if (state.money >= state.lab.cost) {
        state.money -= state.lab.cost; state.lab.lvl++;
        state.lab.xpPerSec = state.lab.lvl * 2;
        state.lab.cost = Math.floor(state.lab.cost * 2.2);
        updateUI(); save();
    } else showToast("Мало денег!");
}

function startResourceProduction(t, bc, s) {
    let cost = state.resCosts[t];
    if (state.level < 5 || state.money < cost || state.production[t]) return;
    state.money -= cost; state.production[t] = true;
    state.resCosts[t] = Math.floor(cost * 1.3);
    const bar = document.getElementById(`progress-${t}`);
    bar.style.transition = `width ${s}s linear`; bar.style.width = "100%";
    setTimeout(() => { 
        state.res[t]++; state.production[t] = false; 
        bar.style.transition = "none"; bar.style.width = "0%"; 
        updateUI(); save(); 
    }, s * 1000);
    updateUI();
}

function openCase() {
    if (state.gems < 50) return showToast("Мало 💎");
    state.gems -= 50; 
    const strip = document.getElementById('items-strip');
    const winText = document.getElementById('win-text');
    strip.innerHTML = ''; strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
    const items = ['⚙️','💾','💎','👑','💩']; const pool = [];
    for(let i=0; i<60; i++) {
        let itm = (Math.random() < 0.02) ? '💎' : items[Math.floor(Math.random()*items.length)];
        pool.push(itm);
        let d = document.createElement('div'); d.className = 'strip-item'; d.innerText = itm; strip.appendChild(d);
    }
    document.getElementById('case-overlay').style.display='flex';
    setTimeout(() => {
        strip.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        const winIdx = 55, itemW = 80;
        const offset = -(winIdx * itemW) + (document.getElementById('spinner-container').offsetWidth/2) - (itemW/2);
        strip.style.transform = `translateX(${offset}px)`;
        setTimeout(() => {
            const p = pool[winIdx]; winText.innerText = p;
            if(p==='⚙️') state.res.chips+=5; if(p==='💾') state.res.code+=5; if(p==='💎') state.gems+=1; if(p==='👑') state.money+=5000;
            updateUI(); save();
        }, 4100);
    }, 100);
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd && !state.inventory[id]) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true;
        showToast("🛠️ СКРАФЧЕНО!"); updateUI(); save();
    }
}

function updateUI() {
    document.getElementById('display-username').innerText = state.username || "Номад";
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gems').innerText = state.gems;
    document.getElementById('level').innerText = state.level;
    document.getElementById('res-chips').innerText = state.res.chips;
    document.getElementById('res-code').innerText = state.res.code;
    document.getElementById('total-auto-income').innerText = state.autoIncome;
    document.getElementById('auto-xp-income').innerText = state.lab.xpPerSec;
    document.getElementById('lab-lvl').innerText = state.lab.lvl;
    document.getElementById('lab-cost').innerText = state.lab.cost.toLocaleString();
    document.getElementById('xp-fill').style.width = (state.xp/state.nextXp*100) + "%";
    document.getElementById('reach').innerText = state.reach;
    document.getElementById('rank-badge').innerText = ["Новичок", "Блогер", "Маг", "Tycoon"][Math.min(Math.floor(state.level/8), 3)];
    
    document.getElementById('make-chip-btn').innerText = `Чип ($${state.resCosts.chips})`;
    document.getElementById('make-code-btn').innerText = `Код ($${state.resCosts.code})`;
    
    Object.keys(state.farm).forEach(id => {
        document.getElementById(`price-${id}`).innerText = Math.floor(state.farm[id].cost * Math.pow(1.15, state.farm[id].count)).toLocaleString();
        document.getElementById(`count-${id}`).innerText = state.farm[id].count;
    });
    if(state.inventory.helmet) document.getElementById('btn-craft-helmet').innerText = "АКТИВНО";
    if(state.inventory.server) document.getElementById('btn-craft-server').innerText = "АКТИВНО";
}

function activateTurbo() { 
    if(state.turbo.active) return;
    if(confirm("ТУРБО x10 на 30с?")) {
        state.turbo.active = true; state.turbo.time = 30;
        document.getElementById('turbo-timer-display').style.display = 'block';
        let t = setInterval(() => {
            state.turbo.time--; document.getElementById('turbo-sec').innerText = state.turbo.time;
            if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; document.getElementById('turbo-timer-display').style.display = 'none'; }
        }, 1000);
    }
}

function authVia(s) { const n = prompt("Ник для " + s); if(n) registerManual(s + "_" + n); }
function registerManual(customName) { 
    const v = customName || document.getElementById('username-input').value.trim(); 
    if(v.length>2) { 
        state.username = v; localStorage.setItem('ai_nomad_user', v); 
        document.getElementById('auth-overlay').style.display = 'none'; 
        if(db) db.ref('players/' + v.replace(/[.#$[\]]/g, "_")).once('value').then(snap => {
            if(snap.exists()) state = {...state, ...snap.val()};
            updateUI(); save();
        });
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
        document.getElementById('leaderboard-list').innerHTML = list.reverse().map((p,i)=>`<div style="display:flex; justify-content:space-between; padding:4px; font-size:0.8rem; border-bottom:1px solid #333"><span>${i+1}. ${p.username}</span><span>$${Math.floor(p.money).toLocaleString()}</span></div>`).join('');
        document.getElementById('leaderboard-overlay').style.display='flex';
    });
}
function closeModal(id) { document.getElementById(id).style.display='none'; }
function showToast(t) { const el = document.getElementById('toast'); el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000); }

window.onload = () => {
    const s = localStorage.getItem('ai_nomad_v_master_v3');
    if(s) state = {...state, ...JSON.parse(s)};
    if(!state.username) document.getElementById('auth-overlay').style.display = 'flex';
    updateUI();
};

let gemT = 0;
setInterval(() => { 
    state.money += state.autoIncome; 
    if(state.lab.xpPerSec > 0) addXP(state.lab.xpPerSec / 10);
    if(state.inventory.server) {
        gemT++; if(gemT >= 30) { state.gems++; gemT=0; showToast("💎 Гем намайнен!"); }
    }
    updateUI(); 
}, 1000);
