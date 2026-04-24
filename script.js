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
    res: { chips: 0, code: 0 }, resCosts: { chips: 500, code: 300 },
    inventory: { helmet: false, server: false },
    farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } },
    turbo: { active: false, time: 0 }, production: { chips: false, code: false }
};

const save = () => {
    localStorage.setItem('ai_nomad_final_master', JSON.stringify(state));
    if(db && state.username) db.ref('players/' + state.username.replace(/[.#$[\]]/g, "_")).set(state);
};

const showToast = (t) => { const el = document.getElementById('toast'); el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000); };

// --- ГЕЙМПЛЕЙ ---
document.getElementById('generate-btn').onclick = () => {
    let m = state.turbo.active ? 10 : 1;
    state.money += state.reach * m; state.reach++;
    let xpGain = 15 * (state.inventory.helmet ? 2 : 1);
    state.xp += xpGain;
    while (state.xp >= state.nextXp) { state.xp -= state.nextXp; state.level++; state.nextXp *= 1.6; showToast(`LVL UP: ${state.level}`); }
    updateUI(); save();
};

function buyFarm(id, base, inc) {
    let price = Math.floor(base * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price; state.farm[id].count++; state.autoIncome += inc;
        updateUI(); save();
    } else showToast("Мало денег!");
}

function startResourceProduction(t, bc, s) {
    let cost = state.resCosts[t];
    if (state.level < 5) return showToast("Нужен 5 LVL!");
    if (state.money < cost || state.production[t]) return;
    state.money -= cost; state.production[t] = true;
    state.resCosts[t] = Math.floor(cost * 1.2);
    const bar = document.getElementById(`progress-${t}`);
    bar.style.transition = `width ${s}s linear`; setTimeout(() => bar.style.width = "100%", 50);
    setTimeout(() => { state.res[t]++; state.production[t] = false; bar.style.transition = "none"; bar.style.width = "0%"; updateUI(); save(); }, s * 1000);
    updateUI();
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd && !state.inventory[id]) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true;
        showToast("🛠️ СКРАФЧЕНО!"); updateUI(); save();
    } else showToast("Не хватает ресурсов!");
}

function openCase() {
    if (state.gems < 50) return showToast("Нужно 50 💎");
    state.gems -= 50; const strip = document.getElementById('items-strip'); strip.innerHTML = ''; const pool = [];
    for(let i=0; i<80; i++) {
        let rng = Math.random() * 100;
        let itm = rng < 1 ? '💎' : rng < 15 ? '⚙️' : rng < 30 ? '💾' : rng < 40 ? '👑' : '💩';
        pool.push(itm); let d = document.createElement('div'); d.className='strip-item'; d.innerText = itm; strip.appendChild(d);
    }
    document.getElementById('case-overlay').style.display='block'; document.getElementById('win-text').innerText = "";
    strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
    setTimeout(() => {
        strip.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        const winIdx = 75; const offset = -(winIdx * 80) + (document.getElementById('spinner-container').offsetWidth/2) - 40;
        strip.style.transform = `translateX(${offset}px)`;
        setTimeout(() => {
            const p = pool[winIdx];
            let names = {'💎':'БРИЛЛИАНТ (+1)','⚙️':'ЧИПЫ (+5)','💾':'КОД (+5)','👑':'ДЖЕКПОТ ($5000)','💩':'МУСОР'};
            document.getElementById('win-text').innerText = names[p];
            document.getElementById('collect-btn').style.display='inline-block';
            if(p==='⚙️') state.res.chips+=5; if(p==='💾') state.res.code+=5; if(p==='💎') state.gems+=1; if(p==='👑') state.money+=5000;
            updateUI(); save();
        }, 4100);
    }, 50);
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
    document.getElementById('fab-controls').className = state.level < 5 ? 'locked' : '';
    document.getElementById('make-chip-btn').innerText = `Чип ($${state.resCosts.chips})`;
    document.getElementById('make-code-btn').innerText = `Код ($${state.resCosts.code})`;
    Object.keys(state.farm).forEach(id => {
        let p = Math.floor(state.farm[id].cost * Math.pow(1.15, state.farm[id].count));
        document.getElementById(`price-${id}`).innerText = p.toLocaleString();
        document.getElementById(`count-${id}`).innerText = state.farm[id].count;
    });
    if(state.inventory.helmet) { document.getElementById('btn-craft-helmet').innerText = "АКТИВНО"; document.getElementById('btn-craft-helmet').disabled = true; }
    if(state.inventory.server) { document.getElementById('btn-craft-server').innerText = "АКТИВНО"; document.getElementById('btn-craft-server').disabled = true; }
    document.getElementById('rank').innerText = ["Новичок", "Блогер", "Маг", "Tycoon"][Math.min(Math.floor(state.level/5), 3)];
}

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block'; e.currentTarget.classList.add('active');
}
function registerManual() { const v = document.getElementById('username-input').value.trim(); if(v.length>2) { state.username = v; localStorage.setItem('ai_nomad_user', v); document.getElementById('auth-overlay').style.display = 'none'; updateUI(); save(); } }
function closeModal(id) { document.getElementById(id).style.display='none'; }
function activateTurbo() { if(!state.turbo.active) { state.turbo.active = true; state.turbo.time = 30; document.getElementById('turbo-timer').style.display='block'; let t = setInterval(() => { state.turbo.time--; document.getElementById('turbo-sec').innerText = state.turbo.time; if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; document.getElementById('turbo-timer').style.display='none'; } }, 1000); } }

window.onload = () => {
    const s = localStorage.getItem('ai_nomad_final_master');
    if(s) state = {...state, ...JSON.parse(s)};
    if(!state.username) document.getElementById('auth-overlay').style.display = 'flex';
    updateUI();
};
setInterval(() => { state.money += state.autoIncome; updateUI(); }, 1000);
