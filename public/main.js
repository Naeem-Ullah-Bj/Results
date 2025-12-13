<script>
// 彩票应用的主要脚本
var localStorageKey = 'lotteryLastData';
var localStorageTimeKey = 'lotteryLastDataTime';
var lastUpdateTimer = null;

function lotteryUpdateLastUpdated() {
    const updateElement = document.getElementById('lotteryUpdateTime');
    if (!updateElement) return;
    
    const lastTime = localStorage.getItem(localStorageTimeKey);
    if (lastTime) {
        const lastTimestamp = parseInt(lastTime);
        updateElement.textContent = getTimeAgo(lastTimestamp);
        
        // Clear existing timer
        if (lastUpdateTimer) {
            clearInterval(lastUpdateTimer);
        }
        
        // Update every 10 seconds to show "X seconds/minutes ago"
        lastUpdateTimer = setInterval(() => {
            updateElement.textContent = getTimeAgo(lastTimestamp);
        }, 10000);
    } else {
        updateElement.textContent = 'Never';
    }
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
        return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
    } else if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (days < 30) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function getShortTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return 'long ago';
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Lottery app initializing...');
    
    // FIRST: Show previous results if available
    const lastData = localStorage.getItem(localStorageKey);
    if (lastData) {
        try {
            const data = JSON.parse(lastData);
            const lastTime = localStorage.getItem(localStorageTimeKey);
            const timeAgo = lastTime ? getShortTimeAgo(parseInt(lastTime)) : '';
            
            console.log('Showing previous results from', timeAgo);
            lotteryProcessData(data, 'Previous Results');
            
        } catch (error) {
            console.error('Error parsing stored data:', error);
        }
    }
    
    // Update the "Last updated" timestamp
    lotteryUpdateLastUpdated();
    
    // SECOND: Always try to fetch fresh data
    lotteryFetchAllData();
    
    // 每10秒自动刷新数据
    setInterval(lotteryFetchAllData, 10000);
});

function lotterySetLoading(loading) {
    const loader = document.getElementById('lotteryLoadingIndicator');
    const overlay = document.getElementById('lotteryLoaderOverlay');
    
    if (loader && overlay) {
        if (loading) {
            overlay.style.display = 'block';
            loader.style.display = 'block';
        } else {
            loader.style.display = 'none';
            overlay.style.display = 'none';
        }
    }
}

async function lotteryFetchAllData() {
    lotterySetLoading(true);
    
    const proxyUrls = [
        "https://api.allorigins.win/raw?url=",
        "https://cors-anywhere.herokuapp.com/",
        "https://api.codetabs.com/v1/proxy/?quest=",
        "https://corsproxy.io/?" + encodeURIComponent("https://www.live4d2u.net/liveosx.json"),
        ""
    ];
    
    const targetUrl = "https://www.live4d2u.net/liveosx.json";
    
    let success = false;
    
    for (let i = 0; i < proxyUrls.length; i++) {
        try {
            const proxyUrl = proxyUrls[i];
            const fullUrl = proxyUrl ? proxyUrl + encodeURIComponent(targetUrl) : targetUrl;
            
            console.log(`Trying source ${i + 1}: ${proxyUrl ? 'with proxy' : 'direct connection'}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal,
                mode: 'cors',
                cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data && Object.keys(data).length > 0 && (data.M || data.D || data.T)) {
                    console.log('Successfully fetched live data from source', i + 1);
                    
                    const currentTime = Date.now();
                    localStorage.setItem(localStorageKey, JSON.stringify(data));
                    localStorage.setItem(localStorageTimeKey, currentTime.toString());
                    
                    lotteryProcessData(data, 'Live');
                    lotteryUpdateLastUpdated();
                    
                    success = true;
                    
                    const warningContainer = document.getElementById('lotteryWarningContainer');
                    warningContainer.innerHTML = '';
                    
                    break;
                }
            }
        } catch (error) {
            console.warn(`Source ${i + 1} failed:`, error.message);
            continue;
        }
    }
    
    if (!success) {
        console.log('All live sources failed, using cached data');
        
        const lastData = localStorage.getItem(localStorageKey);
        const lastTime = localStorage.getItem(localStorageTimeKey);
        
        if (lastData) {
            try {
                const data = JSON.parse(lastData);
                const timeAgo = lastTime ? getShortTimeAgo(parseInt(lastTime)) : '';
                
                const warningMsg = `⚠️ Unable to fetch live data. Showing cached data from ${timeAgo}.`;
                const warningContainer = document.getElementById('lotteryWarningContainer');
                warningContainer.innerHTML = `<div class="lottery-custom-warning">${warningMsg}</div>`;
                
                lotteryProcessData(data, 'Cached');
                
            } catch (e) {
                console.error('Error using cached data:', e);
            }
        }
    }
    
    lotterySetLoading(false);
}

function lotteryScrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function lotteryClearAllData() {
    document.querySelectorAll('.lottery-custom-prize-number, .lottery-custom-number-item, .lottery-custom-jackpot-value, .lottery-custom-extra-value, .lottery-custom-game-number').forEach(el => {
        el.textContent = '----';
    });
    
    document.querySelectorAll('.lottery-custom-draw-date, .lottery-custom-draw-number').forEach(el => {
        if (el.textContent.includes('Loading')) {
            el.textContent = el.textContent.replace('Loading...', '----').replace('Loading', '----');
        }
    });
    
    document.querySelectorAll('.lottery-custom-live-badge').forEach(el => {
        el.style.display = 'none';
    });
    
    localStorage.removeItem(localStorageKey);
    localStorage.removeItem(localStorageTimeKey);
    
    if (lastUpdateTimer) {
        clearInterval(lastUpdateTimer);
        lastUpdateTimer = null;
    }
    
    document.getElementById('lotteryUpdateTime').textContent = 'Never';
    document.getElementById('lotteryDataSource').textContent = '';
    
    const warningContainer = document.getElementById('lotteryWarningContainer');
    warningContainer.innerHTML = '';
}

function lotteryProcessData(data, sourceType = 'Live') {
    try {
        console.log('Processing lottery data from:', sourceType, data);
        
        const dataSourceElement = document.getElementById('lotteryDataSource');
        if (dataSourceElement) {
            if (sourceType === 'Previous Results' || sourceType === 'Cached') {
                const lastTime = localStorage.getItem(localStorageTimeKey);
                const timeAgo = lastTime ? getShortTimeAgo(parseInt(lastTime)) : '';
                dataSourceElement.textContent = `${sourceType} (${timeAgo})`;
            } else {
                dataSourceElement.textContent = `Live Data (just now)`;
            }
        }
        
        // Process all data fields from original code
        // Grand Dragon 4D (G)
        if (data.G) {
            document.getElementById('lottery-gdd') && (document.getElementById('lottery-gdd').textContent = "Date: " + (data.G.DD || "N/A"));
            document.getElementById('lottery-gp1') && (document.getElementById('lottery-gp1').textContent = data.G.P1 || "----");
            document.getElementById('lottery-gp2') && (document.getElementById('lottery-gp2').textContent = data.G.P2 || "----");
            document.getElementById('lottery-gp3') && (document.getElementById('lottery-gp3').textContent = data.G.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-gs' + i) && (document.getElementById('lottery-gs' + i).textContent = data.G['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-gc' + i) && (document.getElementById('lottery-gc' + i).textContent = data.G['C' + i] || "----");
            }
            
            if (document.getElementById('lottery-glive')) {
                document.getElementById('lottery-glive').style.display = (data.G.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Perdana Lottery (P)
        if (data.P) {
            document.getElementById('lottery-pdd') && (document.getElementById('lottery-pdd').textContent = "Date: " + (data.P.DD || "N/A"));
            document.getElementById('lottery-pp1') && (document.getElementById('lottery-pp1').textContent = data.P.P1 || "----");
            document.getElementById('lottery-pp2') && (document.getElementById('lottery-pp2').textContent = data.P.P2 || "----");
            document.getElementById('lottery-pp3') && (document.getElementById('lottery-pp3').textContent = data.P.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-ps' + i) && (document.getElementById('lottery-ps' + i).textContent = data.P['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-pc' + i) && (document.getElementById('lottery-pc' + i).textContent = data.P['C' + i] || "----");
            }
            
            if (document.getElementById('lottery-plive')) {
                document.getElementById('lottery-plive').style.display = (data.P.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Lucky HariHari (H)
        if (data.H) {
            document.getElementById('lottery-hdd') && (document.getElementById('lottery-hdd').textContent = "Date: " + (data.H.DD || "N/A"));
            document.getElementById('lottery-hp1') && (document.getElementById('lottery-hp1').textContent = data.H.P1 || "----");
            document.getElementById('lottery-hp2') && (document.getElementById('lottery-hp2').textContent = data.H.P2 || "----");
            document.getElementById('lottery-hp3') && (document.getElementById('lottery-hp3').textContent = data.H.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-hs' + i) && (document.getElementById('lottery-hs' + i).textContent = data.H['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-hc' + i) && (document.getElementById('lottery-hc' + i).textContent = data.H['C' + i] || "----");
            }
            
            if (document.getElementById('lottery-hlive')) {
                document.getElementById('lottery-hlive').style.display = (data.H.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Magnum 4D (M) - All fields
        if (data.M) {
            document.getElementById('lottery-mdd') && (document.getElementById('lottery-mdd').textContent = "Date: " + (data.M.DD || "N/A"));
            document.getElementById('lottery-mdn') && (document.getElementById('lottery-mdn').textContent = "Draw: " + (data.M.DN || "N/A"));
            document.getElementById('lottery-mp1') && (document.getElementById('lottery-mp1').textContent = data.M.P1 || "----");
            document.getElementById('lottery-mp2') && (document.getElementById('lottery-mp2').textContent = data.M.P2 || "----");
            document.getElementById('lottery-mp3') && (document.getElementById('lottery-mp3').textContent = data.M.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-ms' + i) && (document.getElementById('lottery-ms' + i).textContent = data.M['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-mc' + i) && (document.getElementById('lottery-mc' + i).textContent = data.M['C' + i] || "----");
            }
            
            // Additional fields
            document.getElementById('lottery-ml1') && (document.getElementById('lottery-ml1').textContent = data.M.L1 || "----");
            document.getElementById('lottery-ml2') && (document.getElementById('lottery-ml2').textContent = data.M.L2 || "----");
            document.getElementById('lottery-ml3') && (document.getElementById('lottery-ml3').textContent = data.M.L3 || "----");
            document.getElementById('lottery-ml4') && (document.getElementById('lottery-ml4').textContent = data.M.L4 || "----");
            document.getElementById('lottery-ml5') && (document.getElementById('lottery-ml5').textContent = data.M.L5 || "----");
            document.getElementById('lottery-ml6') && (document.getElementById('lottery-ml6').textContent = data.M.L6 || "----");
            document.getElementById('lottery-ml7') && (document.getElementById('lottery-ml7').textContent = data.M.L7 || "----");
            document.getElementById('lottery-ml8') && (document.getElementById('lottery-ml8').textContent = data.M.L8 || "----");
            document.getElementById('lottery-mlb1') && (document.getElementById('lottery-mlb1').textContent = data.M.LB1 || "----");
            document.getElementById('lottery-mlb2') && (document.getElementById('lottery-mlb2').textContent = data.M.LB2 || "----");
            
            document.getElementById('lottery-mjp1') && (document.getElementById('lottery-mjp1').innerHTML = data.M.JP1 || "RM 0.00");
            document.getElementById('lottery-mjp2') && (document.getElementById('lottery-mjp2').innerHTML = data.M.JP2 || "RM 0.00");
            
            if (data.M.JP1WON >= 1) {
                document.getElementById('lottery-mjp1won') && (document.getElementById('lottery-mjp1won').textContent = 'Won');
            } else if(data.M.JP1WON > 0) {
                document.getElementById('lottery-mjp1won') && (document.getElementById('lottery-mjp1won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-mjp1won') && (document.getElementById('lottery-mjp1won').textContent = '');
            }
            
            if (data.M.JP2WON >= 1) {
                document.getElementById('lottery-mjp2won') && (document.getElementById('lottery-mjp2won').textContent = 'Won');
            } else if(data.M.JP2WON > 0) {
                document.getElementById('lottery-mjp2won') && (document.getElementById('lottery-mjp2won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-mjp2won') && (document.getElementById('lottery-mjp2won').textContent = '');
            }
            
            document.getElementById('lottery-mestjp1') && (document.getElementById('lottery-mestjp1').innerHTML = data.M.ESTJP1 || "RM 0.00");
            document.getElementById('lottery-mestjp2') && (document.getElementById('lottery-mestjp2').innerHTML = data.M.ESTJP2 || "RM 0.00");
            
            if (document.getElementById('lottery-mlive')) {
                document.getElementById('lottery-mlive').style.display = (data.M.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Da Ma Cai (D)
        if (data.D) {
            document.getElementById('lottery-ddd') && (document.getElementById('lottery-ddd').textContent = "Date: " + (data.D.DD || "N/A"));
            document.getElementById('lottery-ddn') && (document.getElementById('lottery-ddn').textContent = "Draw: " + (data.D.DN || "N/A"));
            document.getElementById('lottery-dp1') && (document.getElementById('lottery-dp1').textContent = data.D.P1 || "----");
            document.getElementById('lottery-dp2') && (document.getElementById('lottery-dp2').textContent = data.D.P2 || "----");
            document.getElementById('lottery-dp3') && (document.getElementById('lottery-dp3').textContent = data.D.P3 || "----");
            
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-ds' + i) && (document.getElementById('lottery-ds' + i).textContent = data.D['S' + i] || "----");
                document.getElementById('lottery-dc' + i) && (document.getElementById('lottery-dc' + i).textContent = data.D['C' + i] || "----");
            }
            
            document.getElementById('lottery-djp1') && (document.getElementById('lottery-djp1').innerHTML = data.D.JP1 || "RM 0.00");
            document.getElementById('lottery-djp2') && (document.getElementById('lottery-djp2').innerHTML = data.D.JP2 || "RM 0.00");
            document.getElementById('lottery-djp3') && (document.getElementById('lottery-djp3').innerHTML = data.D.JP3 || "RM 0.00");
            
            if (data.D.JP1WON == 1) {
                document.getElementById('lottery-djp1won') && (document.getElementById('lottery-djp1won').textContent = 'Won');
            } else if(data.D.JP1WON == 2) {
                document.getElementById('lottery-djp1won') && (document.getElementById('lottery-djp1won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-djp1won') && (document.getElementById('lottery-djp1won').textContent = '');
            }
            
            if (data.D.JP2WON == 1) {
                document.getElementById('lottery-djp2won') && (document.getElementById('lottery-djp2won').textContent = 'Won');
            } else if(data.D.JP2WON == 2) {
                document.getElementById('lottery-djp2won') && (document.getElementById('lottery-djp2won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-djp2won') && (document.getElementById('lottery-djp2won').textContent = '');
            }
            
            if (data.D.JP3WON == 1) {
                document.getElementById('lottery-djp3won') && (document.getElementById('lottery-djp3won').textContent = 'Won');
            } else if(data.D.JP3WON == 2) {
                document.getElementById('lottery-djp3won') && (document.getElementById('lottery-djp3won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-djp3won') && (document.getElementById('lottery-djp3won').textContent = '');
            }
            
            document.getElementById('lottery-destjp1') && (document.getElementById('lottery-destjp1').innerHTML = data.D.ESTJP1 || "RM 0.00");
            document.getElementById('lottery-destjp2') && (document.getElementById('lottery-destjp2').innerHTML = data.D.ESTJP2 || "RM 0.00");
            document.getElementById('lottery-destjp3') && (document.getElementById('lottery-destjp3').innerHTML = data.D.ESTJP3 || "RM 0.00");
            
            if (document.getElementById('lottery-dlive')) {
                document.getElementById('lottery-dlive').style.display = (data.D.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Da Ma Cai 3D (D3)
        if (data.D3) {
            document.getElementById('lottery-d3dd') && (document.getElementById('lottery-d3dd').textContent = "Date: " + (data.D3.DD || "N/A"));
            document.getElementById('lottery-d3dn') && (document.getElementById('lottery-d3dn').textContent = "Draw: " + (data.D3.DN || "N/A"));
            document.getElementById('lottery-d3p1') && (document.getElementById('lottery-d3p1').textContent = data.D3.P1 || "----");
            document.getElementById('lottery-d3p2') && (document.getElementById('lottery-d3p2').textContent = data.D3.P2 || "----");
            document.getElementById('lottery-d3p3') && (document.getElementById('lottery-d3p3').textContent = data.D3.P3 || "----");
            document.getElementById('lottery-d3p1b') && (document.getElementById('lottery-d3p1b').textContent = data.D3.P1B || "----");
            document.getElementById('lottery-d3p2b') && (document.getElementById('lottery-d3p2b').textContent = data.D3.P2B || "----");
            document.getElementById('lottery-d3p3b') && (document.getElementById('lottery-d3p3b').textContent = data.D3.P3B || "----");
            
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-d3s' + i) && (document.getElementById('lottery-d3s' + i).textContent = data.D3['S' + i] || "----");
                document.getElementById('lottery-d3c' + i) && (document.getElementById('lottery-d3c' + i).textContent = data.D3['C' + i] || "----");
            }
            
            document.getElementById('lottery-d3jp1') && (document.getElementById('lottery-d3jp1').innerHTML = data.D3.J61 || "RM 0.00");
            document.getElementById('lottery-d3jp2') && (document.getElementById('lottery-d3jp2').innerHTML = data.D3.J62 || "RM 0.00");
            document.getElementById('lottery-d3jp3') && (document.getElementById('lottery-d3jp3').innerHTML = data.D3.J63 || "RM 0.00");
            
            if (data.D3.J61WON == 1) {
                document.getElementById('lottery-d3jp1won') && (document.getElementById('lottery-d3jp1won').textContent = 'Won');
            } else if(data.D3.J61WON == 2) {
                document.getElementById('lottery-d3jp1won') && (document.getElementById('lottery-d3jp1won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-d3jp1won') && (document.getElementById('lottery-d3jp1won').textContent = '');
            }
            
            if (data.D3.J62WON == 1) {
                document.getElementById('lottery-d3jp2won') && (document.getElementById('lottery-d3jp2won').textContent = 'Won');
            } else if(data.D3.J62WON == 2) {
                document.getElementById('lottery-d3jp2won') && (document.getElementById('lottery-d3jp2won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-d3jp2won') && (document.getElementById('lottery-d3jp2won').textContent = '');
            }
            
            if (data.D3.J63WON == 1) {
                document.getElementById('lottery-d3jp3won') && (document.getElementById('lottery-d3jp3won').textContent = 'Won');
            } else if(data.D3.J63WON == 2) {
                document.getElementById('lottery-d3jp3won') && (document.getElementById('lottery-d3jp3won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-d3jp3won') && (document.getElementById('lottery-d3jp3won').textContent = '');
            }
            
            if (document.getElementById('lottery-d3live')) {
                document.getElementById('lottery-d3live').style.display = (data.D3.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Sports Toto (T) - All fields
        if (data.T) {
            document.getElementById('lottery-tdd') && (document.getElementById('lottery-tdd').textContent = "Date: " + (data.T.DD || "N/A"));
            document.getElementById('lottery-tdn') && (document.getElementById('lottery-tdn').textContent = "Draw: " + (data.T.DN || "N/A"));
            document.getElementById('lottery-tp1') && (document.getElementById('lottery-tp1').textContent = data.T.P1 || "----");
            document.getElementById('lottery-tp2') && (document.getElementById('lottery-tp2').textContent = data.T.P2 || "----");
            document.getElementById('lottery-tp3') && (document.getElementById('lottery-tp3').textContent = data.T.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-ts' + i) && (document.getElementById('lottery-ts' + i).textContent = data.T['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-tc' + i) && (document.getElementById('lottery-tc' + i).textContent = data.T['C' + i] || "----");
            }
            
            document.getElementById('lottery-tzodiac') && (document.getElementById('lottery-tzodiac').textContent = data.T.ZODIAC || "----");
            
            document.getElementById('lottery-tjp1') && (document.getElementById('lottery-tjp1').innerHTML = data.T.JP1 || "RM 0.00");
            document.getElementById('lottery-tjp2') && (document.getElementById('lottery-tjp2').innerHTML = data.T.JP2 || "RM 0.00");
            
            if (data.T.JP1WON >= 1) {
                document.getElementById('lottery-tjp1won') && (document.getElementById('lottery-tjp1won').textContent = 'Won');
            } else if(data.T.JP1WON > 0) {
                document.getElementById('lottery-tjp1won') && (document.getElementById('lottery-tjp1won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-tjp1won') && (document.getElementById('lottery-tjp1won').textContent = '');
            }
            
            if (data.T.JP2WON >= 1) {
                document.getElementById('lottery-tjp2won') && (document.getElementById('lottery-tjp2won').textContent = 'Won');
            } else if(data.T.JP2WON > 0) {
                document.getElementById('lottery-tjp2won') && (document.getElementById('lottery-tjp2won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-tjp2won') && (document.getElementById('lottery-tjp2won').textContent = '');
            }
            
            document.getElementById('lottery-testjp1') && (document.getElementById('lottery-testjp1').innerHTML = data.T.ESTJP1 || "RM 0.00");
            document.getElementById('lottery-testjp2') && (document.getElementById('lottery-testjp2').innerHTML = data.T.ESTJP2 || "RM 0.00");
            
            if (document.getElementById('lottery-tlive')) {
                document.getElementById('lottery-tlive').style.display = (data.T.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
            
            // Special Toto Games
            document.getElementById('lottery-ttdd') && (document.getElementById('lottery-ttdd').textContent = "Date: " + (data.T.DD || "N/A"));
            document.getElementById('lottery-ttdn') && (document.getElementById('lottery-ttdn').textContent = "Draw: " + (data.T.DN || "N/A"));
            
            // 5D Games
            document.getElementById('lottery-tt5d1') && (document.getElementById('lottery-tt5d1').textContent = data.T.P5D1 || "--");
            document.getElementById('lottery-tt5d2') && (document.getElementById('lottery-tt5d2').textContent = data.T.P5D2 || "--");
            document.getElementById('lottery-tt5d3') && (document.getElementById('lottery-tt5d3').textContent = data.T.P5D3 || "--");
            document.getElementById('lottery-tt5d4') && (document.getElementById('lottery-tt5d4').textContent = data.T.P5D4 || "--");
            document.getElementById('lottery-tt5d5') && (document.getElementById('lottery-tt5d5').textContent = data.T.P5D5 || "--");
            document.getElementById('lottery-tt5d6') && (document.getElementById('lottery-tt5d6').textContent = data.T.P5D6 || "--");
            
            // 6D Games
            document.getElementById('lottery-tt6d1') && (document.getElementById('lottery-tt6d1').textContent = data.T.P6D1 || "--");
            document.getElementById('lottery-tt6d2a') && (document.getElementById('lottery-tt6d2a').textContent = data.T.P6D2A || "--");
            document.getElementById('lottery-tt6d2b') && (document.getElementById('lottery-tt6d2b').textContent = data.T.P6D2B || "--");
            document.getElementById('lottery-tt6d3a') && (document.getElementById('lottery-tt6d3a').textContent = data.T.P6D3A || "--");
            document.getElementById('lottery-tt6d3b') && (document.getElementById('lottery-tt6d3b').textContent = data.T.P6D3B || "--");
            document.getElementById('lottery-tt6d4a') && (document.getElementById('lottery-tt6d4a').textContent = data.T.P6D4A || "--");
            document.getElementById('lottery-tt6d4b') && (document.getElementById('lottery-tt6d4b').textContent = data.T.P6D4B || "--");
            document.getElementById('lottery-tt6d5a') && (document.getElementById('lottery-tt6d5a').textContent = data.T.P6D5A || "--");
            document.getElementById('lottery-tt6d5b') && (document.getElementById('lottery-tt6d5b').textContent = data.T.P6D5B || "--");
            
            // 650 Games
            document.getElementById('lottery-tt6501') && (document.getElementById('lottery-tt6501').textContent = data.T.P6501 || "--");
            document.getElementById('lottery-tt6502') && (document.getElementById('lottery-tt6502').textContent = data.T.P6502 || "--");
            document.getElementById('lottery-tt6503') && (document.getElementById('lottery-tt6503').textContent = data.T.P6503 || "--");
            document.getElementById('lottery-tt6504') && (document.getElementById('lottery-tt6504').textContent = data.T.P6504 || "--");
            document.getElementById('lottery-tt6505') && (document.getElementById('lottery-tt6505').textContent = data.T.P6505 || "--");
            document.getElementById('lottery-tt6506') && (document.getElementById('lottery-tt6506').textContent = data.T.P6506 || "--");
            document.getElementById('lottery-tt650ex') && (document.getElementById('lottery-tt650ex').textContent = data.T.P650EX || "--");
            document.getElementById('lottery-tt650jp1') && (document.getElementById('lottery-tt650jp1').textContent = data.T.P650JP1 || "--");
            document.getElementById('lottery-tt650jp2') && (document.getElementById('lottery-tt650jp2').textContent = data.T.P650JP2 || "--");
            
            // Show/hide 650 games based on flag
            const tt650d = document.getElementById('tt650d');
            const tt650l = document.getElementById('tt650l');
            if (tt650d && tt650l) {
                if (data.T.P650flag === "off") {
                    tt650d.style.display = 'none';
                    tt650l.style.display = 'none';
                } else {
                    tt650d.style.display = 'block';
                    tt650l.style.display = 'block';
                }
            }
            
            // 655 Games
            document.getElementById('lottery-tt6551') && (document.getElementById('lottery-tt6551').textContent = data.T.P6551 || "--");
            document.getElementById('lottery-tt6552') && (document.getElementById('lottery-tt6552').textContent = data.T.P6552 || "--");
            document.getElementById('lottery-tt6553') && (document.getElementById('lottery-tt6553').textContent = data.T.P6553 || "--");
            document.getElementById('lottery-tt6554') && (document.getElementById('lottery-tt6554').textContent = data.T.P6554 || "--");
            document.getElementById('lottery-tt6555') && (document.getElementById('lottery-tt6555').textContent = data.T.P6555 || "--");
            document.getElementById('lottery-tt6556') && (document.getElementById('lottery-tt6556').textContent = data.T.P6556 || "--");
            document.getElementById('lottery-tt655jp') && (document.getElementById('lottery-tt655jp').textContent = data.T.P655JP || "--");
            
            // 658 Games
            document.getElementById('lottery-tt6581') && (document.getElementById('lottery-tt6581').textContent = data.T.P6581 || "--");
            document.getElementById('lottery-tt6582') && (document.getElementById('lottery-tt6582').textContent = data.T.P6582 || "--");
            document.getElementById('lottery-tt6583') && (document.getElementById('lottery-tt6583').textContent = data.T.P6583 || "--");
            document.getElementById('lottery-tt6584') && (document.getElementById('lottery-tt6584').textContent = data.T.P6584 || "--");
            document.getElementById('lottery-tt6585') && (document.getElementById('lottery-tt6585').textContent = data.T.P6585 || "--");
            document.getElementById('lottery-tt6586') && (document.getElementById('lottery-tt6586').textContent = data.T.P6586 || "--");
            document.getElementById('lottery-tt658jp') && (document.getElementById('lottery-tt658jp').textContent = data.T.P658JP || "--");
            
            // 663 Games
            document.getElementById('lottery-tt6631') && (document.getElementById('lottery-tt6631').textContent = data.T.P6631 || "--");
            document.getElementById('lottery-tt6632') && (document.getElementById('lottery-tt6632').textContent = data.T.P6632 || "--");
            document.getElementById('lottery-tt6633') && (document.getElementById('lottery-tt6633').textContent = data.T.P6633 || "--");
            document.getElementById('lottery-tt6634') && (document.getElementById('lottery-tt6634').textContent = data.T.P6634 || "--");
            document.getElementById('lottery-tt6635') && (document.getElementById('lottery-tt6635').textContent = data.T.P6635 || "--");
            document.getElementById('lottery-tt6636') && (document.getElementById('lottery-tt6636').textContent = data.T.P6636 || "--");
            document.getElementById('lottery-tt663jp') && (document.getElementById('lottery-tt663jp').textContent = data.T.P663JP || "--");
            
            // Show/hide 663 games based on flag
            const tt663d = document.getElementById('tt663d');
            const tt663l = document.getElementById('tt663l');
            if (tt663d && tt663l) {
                if (data.T.P663flag === "off") {
                    tt663d.style.display = 'none';
                    tt663l.style.display = 'none';
                } else {
                    tt663d.style.display = 'block';
                    tt663l.style.display = 'block';
                }
            }
            
            if (document.getElementById('lottery-ttlive')) {
                document.getElementById('lottery-ttlive').style.display = (data.T.COMPLETETOTO === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Singapore 4D (S)
        if (data.S) {
            document.getElementById('lottery-sdd') && (document.getElementById('lottery-sdd').textContent = "Date: " + (data.S.DD || "N/A"));
            document.getElementById('lottery-sdn') && (document.getElementById('lottery-sdn').textContent = "Draw: " + (data.S.DN || "N/A"));
            document.getElementById('lottery-sp1') && (document.getElementById('lottery-sp1').textContent = data.S.P1 || "----");
            document.getElementById('lottery-sp2') && (document.getElementById('lottery-sp2').textContent = data.S.P2 || "----");
            document.getElementById('lottery-sp3') && (document.getElementById('lottery-sp3').textContent = data.S.P3 || "----");
            
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-ss' + i) && (document.getElementById('lottery-ss' + i).textContent = data.S['S' + i] || "----");
                document.getElementById('lottery-sc' + i) && (document.getElementById('lottery-sc' + i).textContent = data.S['C' + i] || "----");
            }
        }
        
        // Singapore Toto (SGT)
        if (data.SGT) {
            document.getElementById('lottery-sgtdd') && (document.getElementById('lottery-sgtdd').textContent = "Date: " + (data.SGT.DD || "N/A"));
            document.getElementById('lottery-sgtdn') && (document.getElementById('lottery-sgtdn').textContent = "Draw: " + (data.SGT.DN || "N/A"));
            
            for (let i = 1; i <= 7; i++) {
                document.getElementById('lottery-sgtp' + i) && (document.getElementById('lottery-sgtp' + i).textContent = data.SGT['P' + i] || "--");
            }
            
            document.getElementById('lottery-sgtjp1') && (document.getElementById('lottery-sgtjp1').textContent = data.SGT.JP1 || "--");
            document.getElementById('lottery-sgtjp2') && (document.getElementById('lottery-sgtjp2').textContent = data.SGT.JP2 || "--");
            document.getElementById('lottery-sgtjp3') && (document.getElementById('lottery-sgtjp3').textContent = data.SGT.JP3 || "--");
            document.getElementById('lottery-sgtjp4') && (document.getElementById('lottery-sgtjp4').textContent = data.SGT.JP4 || "--");
            document.getElementById('lottery-sgtjp5') && (document.getElementById('lottery-sgtjp5').textContent = data.SGT.JP5 || "--");
            document.getElementById('lottery-sgtjp6') && (document.getElementById('lottery-sgtjp6').textContent = data.SGT.JP6 || "--");
            
            document.getElementById('lottery-sgtjpw1') && (document.getElementById('lottery-sgtjpw1').innerHTML = data.SGT.JPW1 || "");
            document.getElementById('lottery-sgtjpw2') && (document.getElementById('lottery-sgtjpw2').innerHTML = data.SGT.JPW2 || "");
            document.getElementById('lottery-sgtjpw3') && (document.getElementById('lottery-sgtjpw3').innerHTML = data.SGT.JPW3 || "");
            document.getElementById('lottery-sgtjpw4') && (document.getElementById('lottery-sgtjpw4').innerHTML = data.SGT.JPW4 || "");
            document.getElementById('lottery-sgtjpw5') && (document.getElementById('lottery-sgtjpw5').innerHTML = data.SGT.JPW5 || "");
            document.getElementById('lottery-sgtjpw6') && (document.getElementById('lottery-sgtjpw6').innerHTML = data.SGT.JPW6 || "");
        }
        
        // Magnum Jackpot Game (MJG)
        if (data.MJG) {
            document.getElementById('lottery-mjgdd') && (document.getElementById('lottery-mjgdd').textContent = "Date: " + (data.MJG.DD || "N/A"));
            document.getElementById('lottery-mjgdn') && (document.getElementById('lottery-mjgdn').textContent = "Draw: " + (data.MJG.DN || "N/A"));
            
            for (let i = 1; i <= 8; i++) {
                document.getElementById('lottery-mjg' + i) && (document.getElementById('lottery-mjg' + i).textContent = data.MJG['P' + i] || "--");
            }
            
            document.getElementById('lottery-mjgjp1') && (document.getElementById('lottery-mjgjp1').innerHTML = data.MJG.JP1 || "RM 0.00");
            document.getElementById('lottery-mjgjp2') && (document.getElementById('lottery-mjgjp2').innerHTML = data.MJG.JP2 || "RM 0.00");
            
            if (data.MJG.JP1WON >= 1) {
                document.getElementById('lottery-mjgjp1won') && (document.getElementById('lottery-mjgjp1won').textContent = 'Won');
            } else if(data.MJG.JP1WON > 0) {
                document.getElementById('lottery-mjgjp1won') && (document.getElementById('lottery-mjgjp1won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-mjgjp1won') && (document.getElementById('lottery-mjgjp1won').textContent = '');
            }
            
            if (data.MJG.JP2WON >= 1) {
                document.getElementById('lottery-mjgjp2won') && (document.getElementById('lottery-mjgjp2won').textContent = 'Won');
            } else if(data.MJG.JP2WON > 0) {
                document.getElementById('lottery-mjgjp2won') && (document.getElementById('lottery-mjgjp2won').textContent = 'Partially Won');
            } else {
                document.getElementById('lottery-mjgjp2won') && (document.getElementById('lottery-mjgjp2won').textContent = '');
            }
            
            if (document.getElementById('lottery-mjglive')) {
                document.getElementById('lottery-mjglive').style.display = (data.MJG.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Sandakan 4D (ST)
        if (data.ST) {
            document.getElementById('lottery-stdd') && (document.getElementById('lottery-stdd').textContent = "Date: " + (data.ST.DD || "N/A"));
            document.getElementById('lottery-stdn') && (document.getElementById('lottery-stdn').textContent = "Draw: " + (data.ST.DN || "N/A"));
            document.getElementById('lottery-stp1') && (document.getElementById('lottery-stp1').textContent = data.ST.P1 || "----");
            document.getElementById('lottery-stp2') && (document.getElementById('lottery-stp2').textContent = data.ST.P2 || "----");
            document.getElementById('lottery-stp3') && (document.getElementById('lottery-stp3').textContent = data.ST.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-sts' + i) && (document.getElementById('lottery-sts' + i).textContent = data.ST['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-stc' + i) && (document.getElementById('lottery-stc' + i).textContent = data.ST['C' + i] || "----");
            }
            
            if (document.getElementById('lottery-stclive')) {
                document.getElementById('lottery-stclive').style.display = (data.ST.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Sabah 88 4D (SB)
        if (data.SB) {
            document.getElementById('lottery-sbdd') && (document.getElementById('lottery-sbdd').textContent = "Date: " + (data.SB.DD || "N/A"));
            document.getElementById('lottery-sbdn') && (document.getElementById('lottery-sbdn').textContent = "Draw: " + (data.SB.DN || "N/A"));
            document.getElementById('lottery-sbp1') && (document.getElementById('lottery-sbp1').textContent = data.SB.P1 || "----");
            document.getElementById('lottery-sbp2') && (document.getElementById('lottery-sbp2').textContent = data.SB.P2 || "----");
            document.getElementById('lottery-sbp3') && (document.getElementById('lottery-sbp3').textContent = data.SB.P3 || "----");
            
            for (let i = 1; i <= 13; i++) {
                document.getElementById('lottery-sbs' + i) && (document.getElementById('lottery-sbs' + i).textContent = data.SB['S' + i] || "----");
            }
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-sbc' + i) && (document.getElementById('lottery-sbc' + i).textContent = data.SB['C' + i] || "----");
            }
            
            document.getElementById('lottery-sb3dp1') && (document.getElementById('lottery-sb3dp1').textContent = data.SB.P13D || "----");
            document.getElementById('lottery-sb3dp2') && (document.getElementById('lottery-sb3dp2').textContent = data.SB.P23D || "----");
            document.getElementById('lottery-sb3dp3') && (document.getElementById('lottery-sb3dp3').textContent = data.SB.P33D || "----");
            
            document.getElementById('lottery-sbjp1') && (document.getElementById('lottery-sbjp1').innerHTML = data.SB.JP1 || "RM 0.00");
            document.getElementById('lottery-sbjp2') && (document.getElementById('lottery-sbjp2').innerHTML = data.SB.JP2 || "RM 0.00");
            
            if (document.getElementById('lottery-sblive')) {
                document.getElementById('lottery-sblive').style.display = (data.SB.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Sabah Lotto (SBLT)
        if (data.SBLT) {
            document.getElementById('lottery-sbltdd') && (document.getElementById('lottery-sbltdd').textContent = "Date: " + (data.SBLT.DD || "N/A"));
            document.getElementById('lottery-sbltdn') && (document.getElementById('lottery-sbltdn').textContent = "Draw: " + (data.SBLT.DN || "N/A"));
            
            document.getElementById('lottery-sblt1') && (document.getElementById('lottery-sblt1').textContent = data.SBLT.LT1 || "--");
            document.getElementById('lottery-sblt2') && (document.getElementById('lottery-sblt2').textContent = data.SBLT.LT2 || "--");
            document.getElementById('lottery-sblt3') && (document.getElementById('lottery-sblt3').textContent = data.SBLT.LT3 || "--");
            document.getElementById('lottery-sblt4') && (document.getElementById('lottery-sblt4').textContent = data.SBLT.LT4 || "--");
            document.getElementById('lottery-sblt5') && (document.getElementById('lottery-sblt5').textContent = data.SBLT.LT5 || "--");
            document.getElementById('lottery-sblt6') && (document.getElementById('lottery-sblt6').textContent = data.SBLT.LT6 || "--");
            document.getElementById('lottery-sblt7') && (document.getElementById('lottery-sblt7').textContent = data.SBLT.LT7 || "--");
            
            document.getElementById('lottery-sbltjp1') && (document.getElementById('lottery-sbltjp1').innerHTML = data.SBLT.LTJP1 || "RM 0.00");
            document.getElementById('lottery-sbltjp2') && (document.getElementById('lottery-sbltjp2').innerHTML = data.SBLT.LTJP2 || "RM 0.00");
            
            // Additional lotto games (6D and 5D)
            document.getElementById('lottery-sblt6g11') && (document.getElementById('lottery-sblt6g11').textContent = data.SBLT.LT6G11 || "--");
            document.getElementById('lottery-sblt6g12') && (document.getElementById('lottery-sblt6g12').textContent = data.SBLT.LT6G12 || "--");
            document.getElementById('lottery-sblt6g13') && (document.getElementById('lottery-sblt6g13').textContent = data.SBLT.LT6G13 || "--");
            document.getElementById('lottery-sblt6g14') && (document.getElementById('lottery-sblt6g14').textContent = data.SBLT.LT6G14 || "--");
            document.getElementById('lottery-sblt6g15') && (document.getElementById('lottery-sblt6g15').textContent = data.SBLT.LT6G15 || "--");
            document.getElementById('lottery-sblt6g16') && (document.getElementById('lottery-sblt6g16').textContent = data.SBLT.LT6G16 || "--");
            document.getElementById('lottery-sblt6g1jp') && (document.getElementById('lottery-sblt6g1jp').textContent = data.SBLT.LT6G1JP || "--");
            
            // Add more SBLT fields as needed...
            
            if (document.getElementById('lottery-sbltlive')) {
                document.getElementById('lottery-sbltlive').style.display = (data.SBLT.COMPLETELOTTO === 0) ? 'inline-flex' : 'none';
            }
        }
        
        // Special CashSweep (SW)
        if (data.SW) {
            document.getElementById('lottery-swdd') && (document.getElementById('lottery-swdd').textContent = "Date: " + (data.SW.DD || "N/A"));
            document.getElementById('lottery-swdn') && (document.getElementById('lottery-swdn').textContent = "Draw: " + (data.SW.DN || "N/A"));
            document.getElementById('lottery-swp1') && (document.getElementById('lottery-swp1').textContent = data.SW.P1 || "----");
            document.getElementById('lottery-swp2') && (document.getElementById('lottery-swp2').textContent = data.SW.P2 || "----");
            document.getElementById('lottery-swp3') && (document.getElementById('lottery-swp3').textContent = data.SW.P3 || "----");
            
            for (let i = 1; i <= 10; i++) {
                document.getElementById('lottery-sws' + i) && (document.getElementById('lottery-sws' + i).textContent = data.SW['S' + i] || "----");
                document.getElementById('lottery-swc' + i) && (document.getElementById('lottery-swc' + i).textContent = data.SW['C' + i] || "----");
            }
            
            if (document.getElementById('lottery-swlive')) {
                document.getElementById('lottery-swlive').style.display = (data.SW.COMPLETE4D === 0) ? 'inline-flex' : 'none';
            }
        }
        
        console.log('Lottery data processed successfully from', sourceType);
        
    } catch (error) {
        console.error('Error processing lottery data:', error);
    }
}

window.lotteryFetchAllData = lotteryFetchAllData;
window.lotteryClearAllData = lotteryClearAllData;
window.lotteryScrollToSection = lotteryScrollToSection;
</script>
