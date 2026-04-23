// --- КОНФИГУРАЦИЯ FIREBASE ---
const firebaseConfig = { 
    databaseURL: "https://ai-nomad-41a26-default-rtdb.europe-west1.firebasedatabase.app/" 
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const Bridge = {
    platform: 'web',
    init() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            this.platform = 'tg';
            this.setUserData(Telegram.WebApp.initDataUnsafe.user.username || Telegram.WebApp.initDataUnsafe.user.first_name);
            Telegram.WebApp.ready(); Telegram.WebApp.expand();
        } else if (typeof YaGames !== 'undefined') {
            this.platform = 'yandex';
            YaGames.init().then(y => { window.ysdk = y; y.getPlayer().then(_p => this.setUserData(_p.getName())).catch(() => this.checkAuth()); });
        } else { this.checkAuth(); }
    },
    setUserData(n) {
        state.username = n;
        localStorage.setItem('ai_nomad_user', n);
        document.getElementById('auth-overlay').style.display = 'none';
        updateUI();
    },
    checkAuth() {
        const saved = localStorage.getItem('ai_nomad_user');
        if (saved) this.setUserData(saved);
        else document.getElementById('auth-overlay').style.display = 'block';
    },
    showReward(cb) {
        if (this.platform === 'yandex' && window.ysdk) {
            ysdk.adv.showRewardedVideo({ callbacks: { onRewarded: () => cb(true), onError: () => cb(false) } });
        } else {
            if(confirm("Посмотреть рекламу для ТУРБО x10?")) cb(true);
        }
    },
    save(d) { localStorage.setItem('ai_nomad_v_final_build', JSON.stringify(d)); }
};

let state = { 
    username: "", money: 0, reach: 10, gems: 100, level: 1, xp: 0, nextXp: 100, autoIncome: 0, 
    res: { chips: 0, code: 0 }, resCosts: { chips: 500, code: 300 },
    inventory: { helmet: false, server: false },
    farm: { bot1: { count: 0, cost: 100, inc: 5 }, bot2: { count: 0, cost: 800, inc: 30 } },
    turbo: { active: false, time: 0 }, production: { chips: false, code: false }
};

const playSnd = (id) => { const s = document.getElementById(id); if(s){s.currentTime=0; s.play().catch(()=>{});} };
const showToast = (t) => { const el = document.getElementById('toast'); el.innerText = t; el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 2000); };

async function registerManual() {
    const name = document.getElementById('username-input').value.trim();
    if (name.length < 3) return showToast("Ник от 3 символов!");
    const btn = document.getElementById('reg-btn'); btn.disabled = true;
    
    try {
        const snap = await db.ref('users/' + name).once('value');
        if (snap.exists()) {
            showToast("Ник занят!"); btn.disabled = false;
        } else {
            await db.ref('users/' + name).set({ registeredAt: new Date().toISOString() });
            Bridge.setUserData(name);
        }
    } catch(e) { Bridge.setUserData(name); }
}

document.getElementById('generate-btn').onclick = () => {
    playSnd('snd-click');
    let mult = state.turbo.active ? 10 : 1;
    state.money += state.reach * mult;
    state.reach++;
    addXP(15 * (state.inventory.helmet ? 2 : 1));
    updateUI(); Bridge.save(state);
};

function addXP(amt) {
    state.xp += amt;
    while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp; state.level++;
        state.nextXp = Math.floor(state.nextXp * 1.6);
        playSnd('snd-level'); showToast(`УРОВЕНЬ ${state.level}`);
    }
}

function activateTurbo() {
    if(state.turbo.active) return;
    Bridge.showReward((success) => {
        if(success) {
            state.turbo.active = true; state.turbo.time = 30;
            document.getElementById('turbo-timer').style.display = 'block';
            let t = setInterval(() => {
                state.turbo.time--; document.getElementById('turbo-sec').innerText = state.turbo.time;
                if(state.turbo.time <= 0) { clearInterval(t); state.turbo.active = false; document.getElementById('turbo-timer').style.display = 'none'; }
            }, 1000);
        }
    });
}

function buyFarm(id, base, inc) {
    let price = Math.floor(base * Math.pow(1.15, state.farm[id].count));
    if (state.money >= price) {
        state.money -= price; state.farm[id].count++; state.autoIncome += inc;
        addXP(price * 0.1); updateUI(); Bridge.save(state);
    } else showToast("Мало денег!");
}

function startResourceProduction(type, sec) {
    let cost = state.resCosts[type];
    if (state.level < 5) return showToast("Нужен 5 LVL!");
    if (state.money < cost || state.production[type]) return showToast("Мало денег или занято!");
    
    state.money -= cost;
    state.production[type] = true;
    state.resCosts[type] = Math.floor(state.resCosts[type] * 1.2); // Инфляция

    const bar = document.getElementById(`progress-${type}`);
    bar.style.transition = `width ${sec}s linear`;
    setTimeout(() => bar.style.width = "100%", 50);

    setTimeout(() => {
        state.res[type]++;
        state.production[type] = false;
        bar.style.transition = "none"; bar.style.width = "0%";
        updateUI(); Bridge.save(state);
        showToast("✅ Ресурс готов!");
    }, sec * 1000);
    updateUI();
}

function openCase() {
    if (state.gems < 50) return showToast("Нужно 50 💎");
    state.gems -= 50; 
    const strip = document.getElementById('items-strip'); 
    strip.innerHTML = ''; const pool = [];
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
            updateUI(); Bridge.save(state);
        }, 4100);
    }, 50);
}

function updateUI() {
    document.getElementById('display-username').innerText = state.username || "Загрузка...";
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
    if(state.inventory.helmet) document.getElementById('btn-craft-helmet').innerText = "АКТИВНО";
    if(state.inventory.server) document.getElementById('btn-craft-server').innerText = "АКТИВНО";
    document.getElementById('league-name').innerText = state.money > 100000 ? "Золото" : "Бронза";
    document.getElementById('rank').innerText = ["Новичок", "Блогер", "Маг", "Tycoon"][Math.min(Math.floor(state.level/5), 3)];
}

function craftItem(id, ch, cd) {
    if (state.res.chips >= ch && state.res.code >= cd) {
        state.res.chips -= ch; state.res.code -= cd; state.inventory[id] = true; updateUI(); Bridge.save(state);
        showToast("🛠️ ПРЕДМЕТ СКРАФЧЕН!");
    } else showToast("Не хватает ресурсов!");
}

function openLeaderboard() {
    const bots = [ {name:"CryptoKing", money:150000}, {name:"NeuralPunk", money:85000}, {name:"MemeLord", money:45000} ];
    let list = [...bots, { name: state.username, money: state.money, isPlayer: true }].sort((a,b)=>b.money-a.money);
    document.getElementById('leaderboard-list').innerHTML = list.slice(0, 10).map((p,i)=>`
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #333; ${p.isPlayer?'color:var(--neon)':''}">
            <span>${i+1}. ${p.name}</span><span>$${Math.floor(p.money).toLocaleString()}</span>
        </div>`).join('');
    document.getElementById('leaderboard-overlay').style.display='block';
}

function showTab(e, id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active'); e.currentTarget.classList.add('active');
}

function processDonate(amt) { state.gems += amt; updateUI(); Bridge.save(state); closeModal('donate-overlay'); }
function openDonateShop() { document.getElementById('donate-overlay').style.display='block'; }
function closeModal(id) { document.getElementById(id).style.display='none'; }

window.onload = () => {
    Bridge.init();
    const saved = localStorage.getItem('ai_nomad_v_final_build');
    if(saved) {
        state = {...state, ...JSON.parse(saved)};
        if(!state.resCosts) state.resCosts = {chips: 500, code: 300};
    }
    updateUI();
};

setInterval(() => { 
    if(state.autoIncome > 0) { state.money += state.autoIncome; updateUI(); }
    if(state.inventory.server) {
        state.gems += 0.034; // Примерно 1 гем в 30 сек
        const o = document.getElementById('mining-overlay'); o.style.display = 'block';
        const p = document.createElement('div'); p.className = 'mining-particle'; p.innerText = Math.round(Math.random());
        p.style.left = Math.random()*100+"vw"; p.style.animationDuration = "2s";
        o.appendChild(p); setTimeout(()=>p.remove(), 2000);
    }
}, 1000);
