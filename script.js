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
    reputation: 100, res: { chips: 0, code: 0 }, resCosts: { chips: 500, code: 300 },
    inventory: { helmet: false, server: false },
    serverPower: 1, lab: { lvl: 0, cost: 500, xpPerSec: 0 },
    turbo: { active: false, time: 0 }, farm: { bot1: { count: 0 }, bot2: { count: 0 } }
};

let state = JSON.parse(JSON.stringify(defaultState));

const AdManager = {
    lastAdTime: 0, cooldown: 600000, 
    init() {
        if (typeof vkBridge !== 'undefined') vkBridge.send("VKWebAppInit");
        if (typeof YaGames !== 'undefined') YaGames.init().then(y => window.ysdk = y);
    },
    async showReward(type) {
        if (Date.now() - this.lastAdTime < this.cooldown) return showToast("Бонус не готов.");
        let success = false;
        if (typeof vkBridge !== 'undefined') {
            const data = await vkBridge.send("VKWebAppShowNativeAds", {ad_format:"reward"});
            if (data.result) success = true;
        } else if (window.ysdk) {
            window.ysdk.adv.showRewardedVideo({ callbacks: { onRewarded: () => { success = true; this.grantReward(type); } } });
            return;
        } else { if(confirm("Реклама спонсора?")) success = true; }
        if (success) this.grantReward(type);
    },
    grantReward(type) {
        this.lastAdTime = Date.now();
        if (type === 'bonus_xp') addXP(500);
        if (type === 'fix_rep') state.reputation = 100;
        updateUI(); save();
    }
};

const setText = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
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
    let labBonus = 1 + (state.lab.lvl * 0.05);
    state.money += state.reach * (state.turbo.active ? 10 : 1) * labBonus; state.reach++;
    addXP(10); updateUI(); save();
};

function buyFarm(id, base, inc) {
    if (!state.farm[id]) state.farm[id] = { count: 0 };
    let price = Math.floor(base * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price; state.farm[id].count++; state.autoIncome += inc;
        addXP(price * 0.05); updateUI(); save();
    }
}

function upgradeLab() {
    if (state.money >= state.lab.cost) {
        state.money -= state.lab.cost; state.lab.lvl++;
        state.lab.xpPerSec = state.lab.lvl * 3;
        state.lab.cost = Math.floor(state.lab.cost * 3.5);
        updateUI(); save();
    }
}

function startResourceProduction(t, bc, s) {
    if (!state.resCosts) state.resCosts = { chips: 500, code: 300 };
    let cost = state.resCosts[t] || bc;
    if (state.level < 5 || state.money < cost || state.production?.[t]) return;
    state.money -= cost; if(!state.production) state.production = {}; state.production[t] = true;
    state.resCosts[t] = Math.floor(cost * 1.3);
    const bar = document.getElementById(`progress-${t}`);
    if (bar) { bar.style.transition = `width ${s}s linear`; bar.style.width = "100%"; }
    setTimeout(() => { 
        state.res[t]++; state.production[t] = false; 
        if(bar) { bar.style.transition = "none"; bar.style.width = "0%"; }
        updateUI(); save(); 
    }, s * 1000);
}

function openCase() {
    if (state.gems < 50) return showToast("Мало 💎");
    state.gems -= 50; const strip = document.getElementById('items-strip'); strip.innerHTML = '';
    strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
    const items = ['⚙️','💾','💎','👑','💩']; const pool = [];
    for(let i=0; i<60; i++) {
        let itm = (Math.random() < 0.02) ? '💎' : items[Math.floor(Math.random()*items.length)];
        pool.push(itm);
        let d = document.createElement('div'); d.className='strip-item'; d.innerText=itm; strip.appendChild(d);
    }
    document.getElementById('case-overlay').style.display='flex';
    setTimeout(() => {
        strip.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        const winIdx = 55, itemW = 80;
        const offset = -(winIdx * itemW) + (document.getElementById('spinner-container').offsetWidth/2) - (itemW/2);
        strip.style.transform = `translateX(${offset}px)`;
        setTimeout(() => {
            const p = pool[winIdx];
            let name = p === '⚙️' ? "ЧИПЫ (+5)" : p === '💾' ? "КОД (+5)" : p === '💎' ? "БРИЛЛИАНТ (+1)" : p === '👑' ? "JACKPOT" : "МУСОР";
            if(p==='⚙️') state.res.chips+=5; if(p==='💾') state.res.code+=5; if(p==='💎') state.gems+=1; if(p==='👑') state.money+=5000;
            setText('win-text', name); updateUI(); save();
        }, 4100);
    }, 100);
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd && !state.inventory[id]) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true;
        showToast("🛠️ ГОТОВО!"); updateUI(); save();
    }
}

function upgradeServerPower() {
    let cost = 5000 * state.serverPower;
    if (state.money >= cost) { state.money -= cost; state.serverPower++; save(); updateUI(); }
}

function updateUI() {
    if (!state.farm) state.farm = { bot1: { count: 0 }, bot2: { count: 0 } };
    setText('money', Math.floor(state.money).toLocaleString());
    setText('gems', state.gems); setText('level', state.level);
    setText('res-chips', state.res.chips); setText('res-code', state.res.code);
    setText('reputation-display', state.reputation); setText('reach', state.reach);
    
    let labBonus = 1 + (state.lab.lvl * 0.05);
    setText('total-auto-income', Math.floor(state.autoIncome * labBonus).toLocaleString());
    setText('auto-xp-income', state.lab.xpPerSec);
    setText('lab-lvl', state.lab.lvl);
    setText('lab-cost-display', "$" + (state.lab.cost || 500).toLocaleString());
    setText('lab-mult-display', labBonus.toFixed(2));
    
    const xpF = document.getElementById('xp-fill'); if(xpF) xpF.style.width = (state.xp/state.nextXp*100) + "%";
    const fab = document.getElementById('fab-controls'); if(fab) fab.className = state.level < 5 ? 'locked' : '';
    
    const chipP = state.resCosts?.chips || 500;
    const codeP = state.resCosts?.code || 300;
    setText('make-chip-btn', `Чип ($${chipP})`);
    setText('make-code-btn', `Код ($${codeP})`);
    
    setText('price-bot1', "$" + Math.floor(100 * Math.pow(1.15, state.farm.bot1.count)).toLocaleString());
    setText('count-bot1', state.farm.bot1.count);
    setText('price-bot2', "$" + Math.floor(800 * Math.pow(1.15, state.farm.bot2.count)).toLocaleString());
    setText('count-bot2', state.farm.bot2.count);

    if(state.inventory.helmet) { setText('btn-craft-helmet', "АКТИВНО"); document.getElementById('btn-craft-helmet').style.background="#444"; }
    if(state.inventory.server) {
        const cs = document.getElementById('btn-craft-server'); if(cs) cs.style.display = "none";
        const us = document.getElementById('btn-upgrade-server'); if(us) us.style.display = "block";
        setText('server-mining-info', `Удача: ${(state.serverPower * 0.1).toFixed(1)}%`);
    }
}

function registerManual() { 
    const v = document.getElementById('username-input').value.trim(); 
    if(v.length>2) { state.username = v; localStorage.setItem('ai_nomad_user', v); document.getElementById('auth-overlay').style.display='none'; if(db) db.ref('players/' + v.replace(/[.#$[\]]/g, "_")).once('value').then(snap => { if(snap.exists()) state = Object.assign(state, snap.val()); updateUI(); }); } 
}
function showTab(e, id) { document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none'); document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(id).style.display = 'block'; e.currentTarget.classList.add('active'); }
function openLeaderboard() {
    if(!db) return;
    db.ref('players').orderByChild('money').limitToLast(10).once('value').then(snap => {
        let list = []; snap.forEach(p => list.push(p.val()));
        document.getElementById('leaderboard-list').innerHTML = list.reverse().map((p,i)=>`<div style="display:flex; justify-content:space-between; padding:4px; font-size:0.75rem; border-bottom:1px solid #333"><span>${i+1}. ${p.username}</span><span>$${Math.floor(p.money).toLocaleString()}</span></div>`).join('');
        document.getElementById('leaderboard-overlay').style.display='flex';
    });
}
function closeModal(id) { document.getElementById(id).style.display='none'; }
function activateTurbo() { 
    if(state.turbo.active) return;
    if(confirm("ТУРБО x10?")) {
        state.turbo.active = true; state.turbo.time = 30;
        document.getElementById('turbo-timer-display').style.display = 'block';
        let t = setInterval(() => { state.turbo.time--; setText('turbo-sec', state.turbo.time); if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; document.getElementById('turbo-timer-display').style.display = 'none'; } }, 1000);
    }
}
function showToast(t) { const el = document.getElementById('toast'); if(el) {el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000);} }

window.onload = () => {
    const s = localStorage.getItem('ai_nomad_v_master_stable');
    if(s) { 
        const l = JSON.parse(s); state = Object.assign(state, l);
        state.farm = Object.assign(defaultState.farm, l.farm || {});
    }
    if(!state.username) document.getElementById('auth-overlay').style.display = 'flex';
    AdManager.init(); updateUI();
};

setInterval(() => { 
    state.money += state.autoIncome * (1 + (state.lab.lvl * 0.05)); 
    if(state.lab.xpPerSec > 0) addXP(state.lab.xpPerSec / 10);
    if(Math.random() < 0.005) {
        const evs = [{ t: "Виральный пост!", r: 10 }, { t: "Обвинение в ИИ-фейках!", r: -15 }];
        const e = evs[Math.floor(Math.random()*evs.length)];
        state.reputation = Math.max(0, Math.min(100, state.reputation + e.r));
        showToast(e.t);
    }
    if(state.inventory.server && Math.random() < (state.serverPower * 0.001)) { state.gems++; showToast("💎 MINED! +1"); }
    updateUI(); 
}, 1000);
