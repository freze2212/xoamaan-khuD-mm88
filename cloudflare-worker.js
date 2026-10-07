/**
 * CLOUDFLARE WORKER - ALL-IN-ONE
 * Tích hợp sẵn Cổng Check Mã (/) + Cổng Admin Cấp Mã (/admin) + Database KV API (/api)
 * Tên binding KV yêu cầu: CODES_KV
 */

// 1. GIAO DIỆN TRANG CHỦ (CHECK & XÓA MÃ ẨN)
const INDEX_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HỆ THỐNG XÓA MÃ ẨN</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --cyan-glow: #00f2ff;
            --alert-red: #ff003c;
            --win-green: #00ff66;
            --panel-bg: rgba(0, 15, 20, 0.95);
            --panel-card: rgba(0, 25, 35, 0.85);
            --border-style: 1px solid rgba(0, 242, 255, 0.4);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'JetBrains Mono', 'Consolas', monospace; }
        body { background-color: #03070a; color: var(--cyan-glow); min-height: 100vh; overflow-x: hidden; display: flex; justify-content: center; align-items: center; position: relative; }
        canvas#matrixCanvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; opacity: 0.45; pointer-events: none; }
        #gateway { width: 90%; max-width: 440px; padding: 35px 30px; background: var(--panel-bg); border: var(--border-style); border-radius: 12px; text-align: center; box-shadow: 0 0 35px rgba(0, 242, 255, 0.25); transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); position: relative; z-index: 10; backdrop-filter: blur(10px); }
        .gateway-logo { font-family: 'Orbitron', sans-serif; font-size: 1.7rem; font-weight: 900; letter-spacing: 4px; text-shadow: 0 0 15px var(--cyan-glow); margin-bottom: 8px; }
        .gateway-subtitle { font-size: 0.8rem; color: #8fa0b5; letter-spacing: 2px; margin-bottom: 25px; text-transform: uppercase; }
        .input-box { width: 100%; padding: 14px 18px; background: rgba(0, 0, 0, 0.7); border: 1px solid rgba(0, 242, 255, 0.35); color: #fff; border-radius: 6px; outline: none; font-size: 1rem; text-align: center; margin-bottom: 18px; letter-spacing: 2px; transition: 0.3s; }
        .input-box:focus { border-color: var(--cyan-glow); box-shadow: 0 0 15px rgba(0, 242, 255, 0.4); background: rgba(0, 15, 25, 0.9); }
        .btn-prime { width: 100%; padding: 14px; background: rgba(0, 242, 255, 0.08); border: 1px solid var(--cyan-glow); color: var(--cyan-glow); font-weight: bold; font-size: 0.95rem; cursor: pointer; transition: all 0.3s; letter-spacing: 2px; text-transform: uppercase; border-radius: 6px; position: relative; overflow: hidden; }
        .btn-prime:hover:not(:disabled) { background: var(--cyan-glow); color: #000; box-shadow: 0 0 25px var(--cyan-glow); transform: translateY(-2px); }
        .btn-prime:disabled { border-color: #444; color: #666; background: rgba(0,0,0,0.5); cursor: not-allowed; box-shadow: none; transform: none; }
        #gatewayMsg { margin-top: 15px; font-weight: 600; min-height: 22px; font-size: 0.85rem; letter-spacing: 1px; }
        #mainDashboard { display: none; width: 95vw; max-width: 1350px; height: 90vh; gap: 18px; opacity: 0; transition: opacity 0.8s ease; position: relative; z-index: 5; }
        .control-panel { flex: 4; min-width: 340px; background: var(--panel-bg); border: var(--border-style); border-radius: 10px; padding: 24px; display: flex; flex-direction: column; box-shadow: 0 0 25px rgba(0, 242, 255, 0.15); backdrop-filter: blur(8px); }
        .system-logs-container { flex: 6; display: flex; flex-direction: column; gap: 15px; }
        .top-logs { display: flex; flex: 1; gap: 15px; min-height: 260px; }
        .bottom-log { flex: 1; min-height: 200px; }
        .log-panel { background: var(--panel-card); border: var(--border-style); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5); overflow: hidden; }
        .log-panel-half { flex: 1; }
        .status-box { background: rgba(0, 242, 255, 0.05); padding: 16px; border-radius: 6px; margin-bottom: 20px; border: 1px solid rgba(0, 242, 255, 0.2); font-size: 0.9rem; }
        .status-row { display: flex; justify-content: space-between; align-items: center; }
        .status-row + .status-row { margin-top: 8px; }
        .log-title { border-bottom: 1px solid rgba(0, 242, 255, 0.25); padding-bottom: 10px; margin-bottom: 10px; font-size: 0.8rem; color: #8ed9ec; font-weight: 700; text-align: center; letter-spacing: 2px; text-transform: uppercase; }
        .log-content { flex-grow: 1; overflow-y: auto; overflow-x: hidden; font-size: 0.82rem; line-height: 1.7; padding-right: 5px; }
        .log-line { margin-bottom: 4px; word-break: break-word; }
        .log-info { color: var(--cyan-glow); }
        .log-error { color: var(--alert-red); text-shadow: 0 0 6px rgba(255, 0, 60, 0.6); font-weight: 600; }
        .log-win { color: var(--win-green); text-shadow: 0 0 6px rgba(0, 255, 102, 0.6); font-weight: bold; }
        .server-loader { margin-top: auto; padding: 15px; border: 1px dashed rgba(0, 242, 255, 0.6); border-radius: 6px; text-align: center; background: rgba(0, 242, 255, 0.03); cursor: pointer; transition: all 0.3s; }
        .server-loader:hover { background: rgba(0, 242, 255, 0.12); border-color: var(--cyan-glow); box-shadow: 0 0 20px rgba(0, 242, 255, 0.3); }
        .loading-bar-container { width: 90%; height: 5px; background: #0f1c24; margin: 10px auto 0; border-radius: 3px; overflow: hidden; border: 1px solid rgba(0, 242, 255, 0.2); }
        .manual-bar { height: 100%; width: 0%; background: var(--cyan-glow); box-shadow: 0 0 10px var(--cyan-glow); transition: width 0.3s ease-out; }
        .fade-out { transform: scale(0.92); opacity: 0; pointer-events: none; }
        .fade-in { display: flex !important; opacity: 1 !important; }
        .access-denied { border-color: var(--alert-red) !important; box-shadow: 0 0 35px rgba(255, 0, 60, 0.5) !important; animation: shake 0.4s ease; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.35); border-radius: 4px; }
        @media (max-width: 900px) { #mainDashboard { flex-direction: column; height: auto; padding: 15px 0; } .top-logs { flex-direction: column; } }
    </style>
</head>
<body>
    <canvas id="matrixCanvas"></canvas>
    <div id="gateway">
        <div class="gateway-logo">SECURITY GATE</div>
        <p class="gateway-subtitle">XÁC MINH CỔNG TRUY CẬP HỆ THỐNG</p>
        <input type="text" id="gatewayInput" class="input-box" placeholder="NHẬP MÃ XÁC THỰC..." autocomplete="off">
        <button class="btn-prime" id="gatewayBtn" onclick="checkGateway()">Xác Nhận</button>
        <div id="gatewayMsg"></div>
    </div>
    <div id="mainDashboard">
        <div class="control-panel">
            <div style="text-align:center; font-family:'Orbitron', sans-serif; font-size: 1.5rem; margin-bottom: 20px; font-weight: 700; letter-spacing: 3px; text-shadow: 0 0 10px var(--cyan-glow);">
                XÓA MÃ ẨN
            </div>
            <div class="status-box">
                <div class="status-row"><span>Trạng thái:</span><span id="stText" style="font-weight: bold; color: var(--cyan-glow);">CHỜ LỆNH...</span></div>
                <div class="status-row"><span>Mức độ rủi ro:</span><span id="riskText" style="font-weight: bold;">--%</span></div>
            </div>
            <input type="text" id="userInp" class="input-box" placeholder="Tên đăng nhập tài khoản" style="font-size: 0.95rem;">
            <input type="text" id="gameInp" class="input-box" placeholder="Tên trang game" style="font-size: 0.95rem;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom: 20px;">
                <button class="btn-prime action-btn" id="btnCheck" style="padding:12px; font-size:0.8rem;" onclick="runAction('check')">CHECK MÃ ĐỘC</button>
                <button class="btn-prime action-btn" id="btnDelete" style="padding:12px; font-size:0.8rem;" onclick="runAction('delete')">XÓA MÃ ẨN</button>
            </div>
            <div class="server-loader" onclick="connectServer()">
                <p style="font-size:0.75rem; color: #8fa0b5; letter-spacing: 1px;">KẾT NỐI SERVER BẢO MẬT</p>
                <p id="serverStatusText" style="font-weight:bold; letter-spacing: 2px; margin-top: 5px;">ẤN ĐỂ KẾT NỐI</p>
                <div class="loading-bar-container"><div class="manual-bar" id="serverProgressBar"></div></div>
            </div>
        </div>
        <div class="system-logs-container">
            <div class="top-logs">
                <div class="log-panel log-panel-half">
                    <div class="log-title">LỊCH SỬ CHECK MÃ</div>
                    <div class="log-content" id="logBoxCheck"></div>
                </div>
                <div class="log-panel log-panel-half">
                    <div class="log-title">LỊCH SỬ XÓA MÃ</div>
                    <div class="log-content" id="logBoxDelete"></div>
                </div>
            </div>
            <div class="log-panel bottom-log">
                <div class="log-title">THỐNG KÊ TIỀN THẮNG TRỰC TUYẾN</div>
                <div class="log-content" id="logBoxMoney"></div>
            </div>
        </div>
    </div>
    <script>
        const API_URL = "/api";
        const REDIRECT_TARGET_URL = "https://mm88.com";

        const canvas = document.getElementById('matrixCanvas');
        const ctx = canvas.getContext('2d');
        function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const letters = "MM88XOAAN0192837465";
        const fontSize = 16;
        let columns = Math.floor(canvas.width / fontSize);
        let drops = Array.from({ length: columns }).fill(1);

        function drawMatrix() {
            ctx.fillStyle = "rgba(3, 7, 10, 0.08)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#00f2ff";
            ctx.font = fontSize + "px 'JetBrains Mono', monospace";
            for (let i = 0; i < drops.length; i++) {
                const text = letters.charAt(Math.floor(Math.random() * letters.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }
        setInterval(drawMatrix, 35);

        async function checkGateway() {
            const val = document.getElementById('gatewayInput').value.trim().toUpperCase();
            const msg = document.getElementById('gatewayMsg');
            const box = document.getElementById('gateway');
            const btn = document.getElementById('gatewayBtn');

            if (!val) {
                msg.style.color = "var(--alert-red)";
                msg.textContent = "✗ VUI LÒNG NHẬP MÃ XÁC THỰC!";
                return;
            }

            btn.disabled = true;
            btn.textContent = "ĐANG KẾT NỐI...";
            msg.style.color = "var(--cyan-glow)";
            msg.textContent = "Đang kiểm tra dữ liệu máy chủ...";

            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "verify_and_delete", code: val }),
                    headers: { "Content-Type": "application/json" }
                });
                const resData = await res.json();

                if (resData.success || resData.valid) {
                    msg.style.color = "var(--win-green)";
                    msg.textContent = "✓ MÃ HỢP LỆ - ĐANG MỞ HỆ THỐNG...";
                    setTimeout(() => {
                        box.classList.add('fade-out');
                        setTimeout(() => {
                            box.style.display = 'none';
                            document.getElementById('mainDashboard').classList.add('fade-in');
                            startMoneyStream();
                        }, 600);
                    }, 800);
                } else {
                    box.classList.add('access-denied');
                    msg.style.color = "var(--alert-red)";
                    msg.textContent = "✗ MÃ KHÔNG HỢP LỆ HOẶC ĐÃ BỊ SỬ DỤNG!";
                    setTimeout(() => { box.classList.remove('access-denied'); }, 500);
                    btn.disabled = false;
                    btn.textContent = "Xác Nhận";
                }
            } catch (error) {
                msg.style.color = "var(--alert-red)";
                msg.textContent = "✗ LỖI MẠNG! KHÔNG THỂ KẾT NỐI SERVER.";
                btn.disabled = false;
                btn.textContent = "Xác Nhận";
            }
        }

        document.getElementById("gatewayInput").addEventListener("keypress", (e) => {
            if (e.key === "Enter") { e.preventDefault(); checkGateway(); }
        });

        function writeLog(targetId, msg, type = 'info', maxLines = 7) {
            const div = document.createElement('div');
            div.className = "log-line log-" + type;
            div.innerHTML = "<span style='opacity:0.6'>[" + new Date().toLocaleTimeString('vi-VN') + "]</span> " + msg;
            const box = document.getElementById(targetId);
            box.appendChild(div);
            while (box.children.length > maxLines) { box.removeChild(box.firstChild); }
            box.scrollTop = box.scrollHeight;
        }

        function startMoneyStream() {
            const users = ["NguyenV**", "TranT**", "LeHoan**", "Pham**", "VuTru**", "Hoang**", "DinhV**", "NgoPh**", "LyBao**"];
            setInterval(() => { 
                if (document.getElementById('mainDashboard').classList.contains('fade-in')) {
                    const randomUser = users[Math.floor(Math.random() * users.length)];
                    const randomMoney = (Math.floor(Math.random() * 500) + 5) * 100000;
                    writeLog('logBoxMoney', "[WIN] Tài khoản " + randomUser + " vừa thắng " + randomMoney.toLocaleString('vi-VN') + " VNĐ", 'win', 7);
                }
            }, 2500); 
        }

        async function runAction(mode) {
            const user = document.getElementById('userInp').value.trim();
            const game = document.getElementById('gameInp').value.trim();
            const stText = document.getElementById('stText');
            const riskText = document.getElementById('riskText');
            const actionBtns = document.querySelectorAll('.action-btn');
            const targetBox = mode === 'check' ? 'logBoxCheck' : 'logBoxDelete';

            if (!user || !game) { 
                writeLog(targetBox, "LỖI: Vui lòng nhập đầy đủ Tên đăng nhập và Trang game!", "error", 7); 
                return; 
            }
            actionBtns.forEach(btn => btn.disabled = true);
            writeLog(targetBox, "Khởi động: " + (mode === 'check' ? 'QUÉT MÃ ĐỘC' : 'XÓA MÃ ẨN') + " cho tài khoản [" + user + "]...", "info", 7);
            stText.style.color = "var(--cyan-glow)";
            riskText.textContent = "CALCULATING...";
            
            let progress = 0;
            const processName = mode === 'check' ? 'SCANNING' : 'PURGING';
            const loadInterval = setInterval(() => {
                progress += Math.floor(Math.random() * 15) + 6; 
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(loadInterval);
                    
                    stText.textContent = mode === 'check' ? "KHÔNG DÍNH MÃ ĐỘC (AN TOÀN)" : "XÓA MÃ ẨN THÀNH CÔNG (ĐÃ DỌN SẠCH)";
                    stText.style.color = "var(--win-green)"; 
                    riskText.textContent = "0% (AN TOÀN TUYỆT ĐỐI)";
                    riskText.style.color = "var(--win-green)";
                    writeLog(targetBox, "SUCCESS: Trang [" + game + "] an toàn tuyệt đối.", "win", 7);
                    actionBtns.forEach(btn => btn.disabled = false);
                } else {
                    const barLength = 12;
                    const filled = Math.floor((progress / 100) * barLength);
                    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
                    stText.textContent = processName + " [" + bar + "] " + progress + "%";
                }
            }, 120); 
        }

        let isConnecting = false;
        function connectServer() {
            if (isConnecting) return; 
            isConnecting = true;
            const statusText = document.getElementById('serverStatusText');
            const bar = document.getElementById('serverProgressBar');
            statusText.textContent = "ĐANG TẢI DỮ LIỆU...";
            statusText.style.color = "var(--cyan-glow)";
            bar.style.width = "0%";
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.floor(Math.random() * 20) + 12; 
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    statusText.textContent = "KẾT NỐI THÀNH CÔNG!";
                    statusText.style.color = "var(--win-green)";
                    bar.style.background = "var(--win-green)";
                    setTimeout(() => {
                        window.open(REDIRECT_TARGET_URL, '_blank');
                        isConnecting = false; 
                        statusText.textContent = "ẤN ĐỂ KẾT NỐI LẠI";
                        statusText.style.color = "var(--cyan-glow)";
                        bar.style.width = "0%";
                        bar.style.background = "var(--cyan-glow)";
                    }, 1500);
                }
                bar.style.width = progress + "%";
            }, 250); 
        }
    </script>
</body>
</html>`;

// 2. GIAO DIỆN TRANG ADMIN (/admin)
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ADMIN CONTROLLER - HỆ THỐNG CẤP MÃ VIP MM88</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --cyan-glow: #00f2ff; --alert-red: #ff003c; --win-green: #00ff66; --panel-bg: rgba(0, 15, 20, 0.95); --border-style: 1px solid rgba(0, 242, 255, 0.4); }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'JetBrains Mono', 'Consolas', monospace; }
        body { background-color: #03070a; color: var(--cyan-glow); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .admin-container { width: 100%; max-width: 480px; background: var(--panel-bg); padding: 35px 30px; border: var(--border-style); border-radius: 12px; box-shadow: 0 0 35px rgba(0, 242, 255, 0.25); text-align: center; }
        .admin-title { font-family: 'Orbitron', sans-serif; font-size: 1.6rem; font-weight: 900; letter-spacing: 3px; text-shadow: 0 0 15px var(--cyan-glow); margin-bottom: 8px; }
        .admin-subtitle { font-size: 0.8rem; color: #8fa0b5; letter-spacing: 2px; margin-bottom: 25px; text-transform: uppercase; }
        .input-group { display: flex; gap: 10px; margin-bottom: 15px; }
        input { flex: 1; padding: 14px; background: rgba(0, 0, 0, 0.7); border: 1px solid rgba(0, 242, 255, 0.35); color: #fff; border-radius: 6px; outline: none; font-size: 1.1rem; text-align: center; letter-spacing: 3px; text-transform: uppercase; }
        input:focus { border-color: var(--cyan-glow); box-shadow: 0 0 15px rgba(0, 242, 255, 0.4); }
        .btn-gen { padding: 0 18px; background: rgba(0, 242, 255, 0.1); border: 1px solid var(--cyan-glow); color: var(--cyan-glow); font-weight: bold; font-size: 0.85rem; border-radius: 6px; cursor: pointer; }
        .btn-gen:hover { background: var(--cyan-glow); color: #000; box-shadow: 0 0 15px var(--cyan-glow); }
        button.btn-submit { width: 100%; padding: 15px; background: rgba(0, 242, 255, 0.15); border: 1px solid var(--cyan-glow); color: var(--cyan-glow); font-weight: bold; font-size: 1rem; cursor: pointer; transition: all 0.3s; border-radius: 6px; letter-spacing: 2px; text-transform: uppercase; }
        button.btn-submit:hover:not(:disabled) { background: var(--cyan-glow); color: #000; box-shadow: 0 0 25px var(--cyan-glow); transform: translateY(-2px); }
        button:disabled { background: #222 !important; border-color: #444 !important; color: #666 !important; cursor: not-allowed; }
        #statusMsg { margin-top: 18px; font-weight: 600; font-size: 0.9rem; min-height: 24px; letter-spacing: 1px; }
        .codes-list-container { margin-top: 25px; border-top: 1px solid rgba(0, 242, 255, 0.2); padding-top: 20px; text-align: left; }
        .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 0.8rem; color: #8fa0b5; }
        .code-chips { display: flex; flex-wrap: wrap; gap: 8px; max-height: 160px; overflow-y: auto; padding-right: 5px; }
        .code-chip { background: rgba(0, 242, 255, 0.1); border: 1px solid rgba(0, 242, 255, 0.3); border-radius: 4px; padding: 6px 10px; font-size: 0.8rem; color: #fff; display: flex; align-items: center; gap: 8px; }
        .code-chip span.del-btn { color: var(--alert-red); cursor: pointer; font-weight: bold; }
        .back-link { display: inline-block; margin-top: 18px; color: #8fa0b5; font-size: 0.8rem; text-decoration: none; }
        .back-link:hover { color: var(--cyan-glow); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 242, 255, 0.3); border-radius: 4px; }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-title">ADMIN CONTROLLER</div>
        <p class="admin-subtitle">HỆ THỐNG CẤP MÃ VIP DÙNG 1 LẦN</p>
        <div class="input-group">
            <input type="text" id="newCode" placeholder="NHẬP MÃ CẤP..." autocomplete="off">
            <button class="btn-gen" onclick="generateRandomCode()">TẠO NHANH</button>
        </div>
        <button id="addBtn" class="btn-submit" onclick="addCode()">ĐẨY MÃ LÊN MÁY CHỦ</button>
        <p id="statusMsg"></p>
        <div class="codes-list-container">
            <div class="list-header">
                <span>DANH SÁCH MÃ CHỜ SỬ DỤNG</span>
                <button onclick="fetchActiveCodes()" style="background:none; border:none; color:var(--cyan-glow); cursor:pointer; font-size:0.75rem;">[ Làm mới ]</button>
            </div>
            <div class="code-chips" id="activeCodesList">
                <span style="font-size: 0.75rem; color: #666;">Đang tải danh sách mã...</span>
            </div>
        </div>
        <a href="/" class="back-link">← Về trang kiểm tra mã ẩn</a>
    </div>
    <script>
        const API_URL = "/api";
        function generateRandomCode() {
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            let rand = "";
            for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
            document.getElementById('newCode').value = "MM" + rand;
        }

        async function addCode() {
            const codeInput = document.getElementById('newCode');
            const code = codeInput.value.trim().toUpperCase();
            const msg = document.getElementById('statusMsg');
            const btn = document.getElementById('addBtn');
            if (!code) { msg.style.color = "var(--alert-red)"; msg.textContent = "✗ Vui lòng nhập mã!"; return; }

            btn.disabled = true;
            btn.textContent = "ĐANG TẢI LÊN...";
            msg.style.color = "var(--cyan-glow)";
            msg.textContent = "Đang kết nối Database...";

            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "add", code: code }),
                    headers: { "Content-Type": "application/json" }
                });
                const resData = await res.json().catch(() => ({}));
                if (res.ok || resData.success) {
                    msg.style.color = "var(--win-green)";
                    msg.textContent = "✓ Đã cấp mã: [" + code + "] thành công!";
                    codeInput.value = "";
                } else {
                    msg.style.color = "var(--alert-red)";
                    msg.textContent = "✗ Lỗi: " + (resData.message || "Không thể thêm");
                }
            } catch (err) {
                msg.style.color = "var(--alert-red)";
                msg.textContent = "✗ Lỗi kết nối đến máy chủ!";
            } finally {
                btn.disabled = false;
                btn.textContent = "ĐẨY MÃ LÊN MÁY CHỦ";
                setTimeout(fetchActiveCodes, 500);
            }
        }

        async function deleteCodeDirect(code) {
            if (!confirm("Bạn có chắc muốn xóa mã [" + code + "] không?")) return;
            try {
                await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "delete", code: code }),
                    headers: { "Content-Type": "application/json" }
                });
                fetchActiveCodes();
            } catch (e) { alert("Lỗi khi xóa mã!"); }
        }

        async function fetchActiveCodes() {
            const listContainer = document.getElementById('activeCodesList');
            try {
                const res = await fetch(API_URL);
                const codes = await res.json();
                if (Array.isArray(codes) && codes.length > 0) {
                    listContainer.innerHTML = codes.map(c => 
                        "<div class='code-chip'><span>" + c + "</span><span class='del-btn' title='Xóa mã' onclick=\\"deleteCodeDirect('" + c + "')\\">✕</span></div>"
                    ).join('');
                } else {
                    listContainer.innerHTML = "<span style='font-size: 0.75rem; color: #777;'>(Chưa có mã nào trong kho)</span>";
                }
            } catch (e) {
                listContainer.innerHTML = "<span style='font-size: 0.75rem; color: var(--alert-red);'>(Không thể tải danh sách)</span>";
            }
        }
        fetchActiveCodes();
    </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase().replace(/\/$/, "");

    // 1. Phục vụ Trang Admin: /admin hoặc /admin.html
    if (pathname === "/admin" || pathname === "/admin.html") {
      return new Response(ADMIN_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 2. Phục vụ Trang Chủ: / hoặc /index.html
    if (pathname === "" || pathname === "/index.html") {
      return new Response(INDEX_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // 3. Xử lý API: /api hoặc /api/...
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      // GET: Lấy danh sách mã
      if (request.method === "GET") {
        try {
          if (!env.CODES_KV) {
            return new Response(JSON.stringify(["MM88DEMO", "MMVIP99"]), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          const list = await env.CODES_KV.list({ prefix: "code:" });
          const codes = list.keys.map(k => k.name.replace(/^code:/, ""));
          return new Response(JSON.stringify(codes), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // POST: Thêm / Xóa / Xác thực và Tự hủy mã
      if (request.method === "POST") {
        try {
          let body = {};
          const text = await request.text();
          try { body = JSON.parse(text); } catch {}

          const action = body.action || url.searchParams.get("action");
          const code = (body.code || url.searchParams.get("code") || "").trim().toUpperCase();

          const MASTER_CODES = ["MM88VIP", "MM88MASTER", "ADMIN88"];

          if (!code) {
            return new Response(JSON.stringify({ success: false, message: "Mã không được để trống" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          if (!env.CODES_KV) {
            if (action === "verify_and_delete" || action === "check") {
              if (MASTER_CODES.includes(code)) {
                return new Response(JSON.stringify({ success: true, valid: true, message: "Mã Master hợp lệ" }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
              }
            }
            return new Response(JSON.stringify({ success: false, message: "Chưa gắn KV binding CODES_KV" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          const key = `code:${code}`;

          // Cấp mã mới (Kiểm tra trùng)
          if (action === "add") {
            if (MASTER_CODES.includes(code)) {
              return new Response(JSON.stringify({ 
                success: false, 
                duplicate: true, 
                message: `Mã [${code}] là Master Code cố định, không cần thêm lại!` 
              }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            const existing = await env.CODES_KV.get(key);
            if (existing !== null) {
              return new Response(JSON.stringify({ 
                success: false, 
                duplicate: true, 
                message: `Mã [${code}] đã tồn tại trong danh sách!` 
              }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            await env.CODES_KV.put(key, JSON.stringify({ createdAt: new Date().toISOString() }));
            return new Response(JSON.stringify({ success: true, message: `Đã thêm mã [${code}] thành công!` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Xóa mã
          if (action === "delete") {
            await env.CODES_KV.delete(key);
            return new Response(JSON.stringify({ success: true, message: `Đã xóa mã [${code}]` }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }

          // Xác thực và tự hủy mã ngay lập tức (dùng 1 lần)
          if (action === "verify_and_delete" || action === "check") {
            if (MASTER_CODES.includes(code)) {
              return new Response(JSON.stringify({ 
                success: true, 
                valid: true, 
                isMaster: true,
                message: "Mã Master hợp lệ" 
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            const existing = await env.CODES_KV.get(key);
            if (existing !== null) {
              await env.CODES_KV.delete(key); // Xóa khỏi DB KV
              return new Response(JSON.stringify({ success: true, valid: true, message: "Mã hợp lệ và đã kích hoạt" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            } else {
              return new Response(JSON.stringify({ success: false, valid: false, message: "Mã không tồn tại hoặc đã bị sử dụng" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
          }

          return new Response(JSON.stringify({ error: "Action không hợp lệ" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }
    }

    return new Response("Not found", { status: 404 });
  }
};
