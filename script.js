// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyDBzJhFBpIEZzX9xBbN7vKrHjSn3ZZhYv0",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebasedatabase.app",
    projectId: "ai-nomad-41a26",
    storageBucket: "ai-nomad-41a26.firebasestorage.app",
    messagingSenderId: "698203859523",
    appId: "1:698203859523:web:80215d3e746affdc3f42f6"
};

// Безопасная инициализация БД
let db;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log("✅ Firebase подключен");
    } else {
        console.error("❌ Библиотеки Firebase не загружены");
    }
} catch (e) {
    console.error("❌ Ошибка Firebase:", e);
}

const Bridge = {
    platform: 'web',
    init() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            this.platform = 'tg'; this.setUserData(Telegram.WebApp.initDataUnsafe.user.first_name);
            Telegram.WebApp.ready(); Telegram.WebApp.expand();
        } else if (typeof YaGames !== 'undefined') {
            this.platform = 'yandex'; YaGames.init().then(y => { window.ysdk = y; y.getPlayer().then(_p => this.setUserData(_p.getName())).catch(() => this.checkAuth()); });
        } else { this.checkAuth(); }
    },
    setUserData(n) {
        state.username = n.replace(/[.#$[\]]/g, "_");
        localStorage.setItem('ai_nomad_user', state.username);
        document.getElementById('auth-overlay').style.display = 'none';
        this.loadFromCloud(state.username);
    },
    checkAuth() {
        const s = localStorage.getItem('ai_nomad_user');
        if (s) this.setUserData(s);
        else document.getElementById('auth-overlay').style.display = 'block';
    },
    loadFromCloud(name) {
        if (!db) return;
        db.ref('players/' + name).once('value').then((snap) => {
            if (snap.exists()) {
                state = { ...state, ...snap.val() };
                updateUI();
                showToast("☁️ Синхронизировано!");
            }
        });
    },
    save() {
        localStorage.setItem('ai_nomad_v17_save', JSON.stringify(state));
        if (state.username && db) db.ref('players/' + state.username).set(state);
    },
    showReward(cb) { if(confirm("Смотреть рекламу для ТУРБО x10?")) cb(true); }
};

let state = { 
    username: "", money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    reputation: 100, isCanceled: false, res: { chips: 0, code: 0 }, 
    resCosts: { chips: 500, code: 300 }, inventory: { helmet: false, server: false },
    farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } },
    turbo: { active: false, time: 0 }, production: { chips: false, code: false }
};

// --- ОСНОВНЫЕ ФУНКЦИИ ---
const playSnd = (id) => { const s = document.getElementById(id); if(s){s.currentTime=0; s.play().catch(()=>{});} };
const showToast = (t) => { const el = document.getElementById('toast'); if(el){el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000);} };

document.getElementById('generate-btn').onclick = () => {
    if(state.isCanceled) return;
    playSnd('snd-click');
    let m = state.turbo.active ? 10 : 1;
    state.money += state.reach * m; state.reach++;
    addXP(15 * (state.inventory.helmet ? 2 : 1) * (state.turbo.active ? 1.5 : 1));
    if(Math.random() > 0.98) { state.reputation -= 10; if(state.reputation < 50) cancelPlayer(); }
    if(Math.random() > 0.97) triggerRandomOffer();
    updateUI(); Bridge.save();
};

function addXP(a) {
    state.xp += a;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp; state.level++; state.nextXp *= 1.6;
        playSnd('snd-level'); showToast(`УРОВЕНЬ ${state.level}`);
    }
}

function triggerRandomOffer() {
    if (state.money < 500) return;
    let reward = Math.floor(state.money * 0.4) + 1000;
    document.getElementById('offer-text').innerText = `Скам-оффер! Платят $${reward.toLocaleString()}, но репутация -40%!`;
    window.currentOfferVal = reward;
    document.getElementById('offer-overlay').style.display = 'block';
}

function acceptOffer() {
    state.money += window.currentOfferVal; state.reputation -= 40;
    if (state.reputation < 50) cancelPlayer();
    closeModal('offer-overlay'); updateUI(); Bridge.save();
}

function cancelPlayer() {
    state.isCanceled = true; state.reputation = Math.max(0, state.reputation);
    document.getElementById('ai-output').innerHTML = "<span style='color:red'>ОТМЕНЕН (5с)</span>";
    setTimeout(() => { state.isCanceled = false; state.reputation = 100; document.getElementById('ai-output').innerText = "Система онлайн"; updateUI(); }, 5000);
}

function buyFarm(id, b, i) {
    let p = Math.floor(b * Math.pow(1.15, state.farm[id].count));
    if (state.money >= p) {
        state.money -= p; state.farm[id].count++; state.autoIncome += i;
        addXP(p * 0.1); updateUI(); Bridge.save();
    } else showToast("Мало денег!");
}

function startResourceProduction(t, bc, s) {
    let cost = state.resCosts[t];
    if (state.level < 5) return showToast("Нужен 5 LVL!");
    if (state.money < cost || state.production[t]) return;
    state.money -= cost; state.production[t] = true;
    state.resCosts[t] = Math.floor(state.resCosts[t] * 1.2);
    const bar = document.getElementById(`progress-${t}`);
    bar.style.transition = `width ${s}s linear`;
    setTimeout(() => bar.style.width = "100%", 50);
    setTimeout(() => {
        state.res[t]++; state.production[t] = false;
        bar.style.transition = "none"; bar.style.width = "0%";
        updateUI(); Bridge.save();
    }, s * 1000);
    updateUI();
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true;
        updateUI(); Bridge.save(); showToast("🛠️ СКРАФЧЕНО!");
    }
}

function openLeaderboard() {
    if(!db) return showToast("БД не подключена");
    db.ref('players').orderByChild('money').limitToLast(10).once('value').then((snap) => {
        let list = []; snap.forEach(p => { list.push(p.val()); });
        list.reverse();
        document.getElementById('leaderboard-list').innerHTML = list.map((p,i)=>`
            <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #333; ${p.username === state.username?'color:var(--neon)':''}">
                <span>${i+1}. ${p.username}</span><span>$${Math.floor(p.money).toLocaleString()}</span>
            </div>`).join('');
        document.getElementById('leaderboard-overlay').style.display='block';
    });
}

function activateTurbo() {
    if(state.turbo.active) return;
    Bridge.showReward((s) => {
        if(s) {
            state.turbo.active = true; state.turbo.time = 30;
            document.getElementById('turbo-timer').style.display = 'block';
            let t = setInterval(() => {
                state.turbo.time--; document.getElementById('turbo-sec').innerText = state.turbo.time;
                if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; document.getElementById('turbo-timer').style.display='none'; }
            }, 1000);
        }
    });
}

function openCase() {
    if (state.gems < 50) return showToast("Нужно 50 💎");
    state.gems -= 50; 
    const strip = document.getElementById('items-strip'); strip.innerHTML = ''; const pool = [];
    const items = ['⚙️','💾','💎','👑','💩'];
    for(let i=0; i<80; i++) {
        let rng = Math.random() * 100;
        let itm = rng < 1 ? '💎' : rng < 15 ? '⚙️' : rng < 30 ? '💾' : rng < 40 ? '👑' : '💩';
        pool.push(itm);
        let d = document.createElement('div'); d.className='strip-item'; d.innerText = itm; strip.appendChild(d);
    }
    document.getElementById('case-overlay').style.display='block';
    document.getElementById('collect-btn').style.display='none';
    strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
    setTimeout(() => {
        strip.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
        const winIdx = 75; const offset = -(winIdx * 80) + (document.getElementById('spinner-container').offsetWidth/2) - 40;
        strip.style.transform = `translateX(${offset}px)`;
        setTimeout(() => {
            playSnd('snd-win'); const p = pool[winIdx];
            let names = {'💎':'БРИЛЛИАНТ (+1)','⚙️':'ЧИПЫ (+5)','💾':'КОД (+5)','👑':'ДЖЕКПОТ ($5000)','💩':'МУСОР'};
            document.getElementById('win-text').innerText = `ВЫИГРЫШ: ${names[p]}`;
            document.getElementById('collect-btn').style.display='inline-block';
            if(p==='⚙️') state.res.chips+=5; if(p==='💾') state.res.code+=5; if(p==='💎') state.gems+=1; if(p==='👑') state.money+=5000;
            updateUI(); Bridge.save();
        }, 4100);
    }, 50);
}

function updateUI() {
    document.getElementById('display-username').innerText = state.username || "Вход...";
    document.getElementById('money').innerText = Math.floor(state.money).toLocaleString();
    document.getElementById('gems').innerText = state.gems;
    document.getElementById('level').innerText = state.level;
    document.getElementById('reputation').innerText = state.reputation;
    document.getElementById('res-chips').innerText = state.res.chips;
    document.getElementById('res-code').innerText = state.res.code;
    document.getElementById('total-auto-income').innerText = state.autoIncome;
    document.getElementById('xp-fill').style.width = (state.xp/state.nextXp*100) + "%";
    document.getElementById('fab-controls').className = state.level < 5 ? 'locked' : '';
    Object.keys(state.farm).forEach(id => {
        document.getElementById(`price-${id}`).innerText = Math.floor(state.farm[id].cost * Math.pow(1.15, state.farm[id].count)).toLocaleString();
        document.getElementById(`count-${id}`).innerText = state.farm[id].count;
    });
    if(state.inventory.helmet) document.getElementById('btn-craft-helmet').innerText = "АКТИВНО";
    if(state.inventory.server) document.getElementById('btn-craft-server').innerText = "АКТИВНО";
}

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); e.currentTarget.classList.add('active');
}
function closeModal(id) { document.getElementById(id).style.display='none'; }
function openDonateShop() { document.getElementById('donate-overlay').style.display='block'; }
function processDonate(amt) { state.gems += amt; updateUI(); Bridge.save(); closeModal('donate-overlay'); }
function registerManual() { const v = document.getElementById('username-input').value.trim(); if(v.length>2) Bridge.setUserData(v); }

window.onload = () => { Bridge.init(); updateUI(); };

setInterval(() => { 
    if(!state.isCanceled) state.money += state.autoIncome; 
    if(state.inventory.server) { 
        const o = document.getElementById('mining-overlay'); o.style.display = 'block';
        const p = document.createElement('div'); p.className = 'mining-particle'; p.innerText = Math.round(Math.random());
        p.style.left = Math.random()*100+"vw"; p.style.animationDuration = "2s";
        o.appendChild(p); setTimeout(()=>p.remove(), 2500);
    }
    updateUI(); 
}, 1000);
