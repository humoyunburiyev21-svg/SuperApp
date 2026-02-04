 // --- NAVIGATSIYA LOGIKASI ---
        function goHome() {
            // Hamma "workspace" larni yashiramiz
            document.querySelectorAll('.workspace').forEach(el => el.style.display = 'none');
            // Home ni ko'rsatamiz
            document.getElementById('home-view').style.display = 'block';
        }

        function openTool(toolId) {
            // Home ni yashiramiz
            document.getElementById('home-view').style.display = 'none';
            // Kerakli toolni ochamiz
            document.getElementById(toolId).style.display = 'block';
        }

        // --- MODAL (BIZ HAQIMIZDA) ---
        function openAbout() { document.getElementById('about-modal').style.display = 'flex'; }
        function closeAbout() { document.getElementById('about-modal').style.display = 'none'; }

        // --- THEME (TUZATILGAN: Xotirada saqlash bilan) ---
        
        // 1. Sahifa yuklanganda tekshiramiz
        document.addEventListener("DOMContentLoaded", () => {
            const savedTheme = localStorage.getItem('theme');
            const icon = document.getElementById('theme-icon');
            
            if (savedTheme === 'light') {
                document.body.classList.add('light-mode');
                if(icon) icon.className = 'fas fa-moon';
            }
        });

        // 2. Tugma bosilganda o'zgartiramiz va saqlaymiz
        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            
            // Ikonkani o'zgartirish
            const icon = document.getElementById('theme-icon');
            if(icon) icon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
            
            // Brauzer xotirasiga yozish
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
        }

        // --- FUNCTIONALITY (Oldingi kodlar) ---
        async function generateQR() {
            const text = document.getElementById('qr-text').value;
            if(!text) return alert("Matn kiriting!");
            try {
                const res = await fetch('/api/generate-qr', {
                    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text})
                });
                const data = await res.json();
                document.getElementById('img-simple').src = data.url_simple;
                document.getElementById('btn-simple').href = data.url_simple;
                document.getElementById('img-modern').src = data.url_modern;
                document.getElementById('btn-modern').href = data.url_modern;
                document.getElementById('qr-results-area').style.display = 'flex';
            } catch(e) { alert("Xatolik!"); }
        }

       // --- 4. AI CHAT & VISION (YANGILANGAN) ---
        
        // Rasm tanlaganda kichkina ko'rsatish funksiyasi
        function showPreview() {
            const file = document.getElementById('vision-file').files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('preview-img').src = e.target.result;
                    document.getElementById('image-preview').style.display = 'block';
                }
                reader.readAsDataURL(file);
            }
        }

        async function askAI() {
            const input = document.getElementById('ai-prompt');
            const fileInput = document.getElementById('vision-file');
            const chatBox = document.getElementById('chat-box');
            const previewBox = document.getElementById('image-preview');
            
            const text = input.value;
            const file = fileInput.files[0]; // Tanlangan rasm

            if (!text && !file) return; // Hech narsa yo'q bo'lsa to'xta

            // 1. Ekranga chiqarish
            let userHTML = `<div style="text-align:right; margin:10px 0;">`;
            
            // Agar rasm bo'lsa, uni ham chatga chiqaramiz
            if (file) {
                const imgURL = URL.createObjectURL(file);
                userHTML += `<img src="${imgURL}" style="max-width: 150px; border-radius: 10px; margin-bottom: 5px; border: 2px solid var(--accent);"><br>`;
            }
            
            if (text) {
                userHTML += `<span style="background:var(--accent); color:white; padding:8px 15px; border-radius:15px 15px 0 15px; display:inline-block;">${text}</span>`;
            }
            userHTML += `</div>`;
            chatBox.innerHTML += userHTML;
            
            // Inputlarni tozalash
            input.value = '';
            fileInput.value = ''; // Rasmni xotiradan o'chiramiz
            previewBox.style.display = 'none'; // Prevyuni yashiramiz
            chatBox.scrollTop = chatBox.scrollHeight;

            // 2. Yuklanmoqda...
            const loadId = "load-" + Date.now();
            chatBox.innerHTML += `<p id="${loadId}" style="font-size:12px; color:var(--text-muted);">AI ko'rmoqda va o'ylamoqda...</p>`;

            try {
                let response, data;

                // A) Agar rasm bo'lsa -> VISION API ga yuboramiz
                if (file) {
                    const formData = new FormData();
                    formData.append("prompt", text || "Bu rasmda nima bor?"); // Matn bo'lmasa default so'z
                    formData.append("file", file);
                    
                    response = await fetch('/api/chat-with-image', {
                        method: 'POST',
                        body: formData
                    });
                } 
                // B) Agar faqat matn bo'lsa -> ODDIY CHAT API ga yuboramiz
                else {
                    response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({prompt: text})
                    });
                }

                data = await response.json();
                document.getElementById(loadId).remove();
                
                // Javobni formatlash
                let clean = data.response.replace(/\*\*/g, "").replace(/\*/g, "- ");
                chatBox.innerHTML += `<div style="text-align:left; margin:10px 0;"><span style="background:var(--card-bg); padding:10px; border-radius:0 15px 15px 15px; display:inline-block; border:1px solid rgba(255,255,255,0.1); max-width: 80%;">${clean}</span></div>`;
            
            } catch(e) { 
                document.getElementById(loadId).innerText = "Xatolik yuz berdi."; 
                console.log(e);
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        async function convertImage() {
            const input = document.getElementById('file-upload');
            if(input.files.length === 0) return alert("Rasm tanlang!");
            const formData = new FormData();
            formData.append("file", input.files[0]);
            formData.append("format", document.getElementById('convert-format').value);
            
            try {
                const res = await fetch('/api/convert', {method:'POST', body: formData});
                const data = await res.json();
                if(data.url) {
                    const link = document.getElementById('download-link');
                    link.href = data.url; link.download = "converted_image";
                    document.getElementById('convert-result').style.display = 'block';
                }
            } catch(e) { alert("Xatolik!"); }
        }
// --- TYPEWRITER EFFEKTI (OVOZLI 🔊) ---
        document.addEventListener('DOMContentLoaded', function() {
            const titleElement = document.getElementById('typewriter');
            const cursor = document.querySelector('.cursor');
            
            // 1. Ovoz faylini yuklaymiz
            // Agar fayling static papkada bo'lsa:
            const keySound = new Audio('/static/click.mp3'); 
            keySound.volume = 0.5; // Ovoz balandligi (0.0 dan 1.0 gacha)

            const part1 = "Kelajakni ";
            const part2 = "Kod"; 
            const part3 = " Bilan Yarating";
            
            let i = 0;
            
            function playSound() {
                // Ovozni har safar boshidan chalish uchun
                keySound.currentTime = 0;
                // Brauzer ba'zan avto-ovozni bloklaydi, shuning uchun "catch" qo'shamiz
                keySound.play().catch(e => console.log("Ovoz bloklandi (sahifaga bosing):", e));
            }

            function typeWriter() {
                // 1. Birinchi qism
                if (i < part1.length) {
                    titleElement.insertBefore(document.createTextNode(part1.charAt(i)), cursor);
                    playSound(); // <--- OVOZ CHIQARISH
                    i++;
                    setTimeout(typeWriter, 100); 
                } 
                // 2. Ikkinchi qism (Rangli)
                else if (i < part1.length + part2.length) {
                    let span = titleElement.querySelector('span.accent-text');
                    if (!span) {
                        span = document.createElement('span');
                        span.className = 'accent-text';
                        span.style.background = "linear-gradient(to right, #4ade80, #3b82f6)";
                        span.style.webkitBackgroundClip = "text";
                        span.style.webkitTextFillColor = "transparent";
                        titleElement.insertBefore(span, cursor);
                    }
                    span.textContent += part2.charAt(i - part1.length);
                    playSound(); // <--- OVOZ CHIQARISH
                    i++;
                    setTimeout(typeWriter, 100);
                }
                // 3. Uchinchi qism
                else if (i < part1.length + part2.length + part3.length) {
                    titleElement.insertBefore(document.createTextNode(part3.charAt(i - (part1.length + part2.length))), cursor);
                    playSound(); // <--- OVOZ CHIQARISH
                    i++;
                    setTimeout(typeWriter, 100);
                }
            }
            
            // 1 soniya kutib boshlaymiz
            setTimeout(typeWriter, 1000);
        });
// --- COSMIC DEFENDER (YANGILANGAN VERSIYA v2.0) ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score');
        const levelEl = document.getElementById('level');
        const finalScoreEl = document.getElementById('final-score');
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const livesDisplay = document.getElementById('lives-display');

        // SO'ZLAR DARAJALAR BO'YICHA
        const wordsEasy = ["kod", "SAMDUUF", "bolam", "Elyor", "Yakubova", "Humoyun", "kottasidan", "hali", "Hamidullo", "yiyman", "olma", "nonsiz", "ishsizlik", "darvozabon", "kamsuqum", "toshbaqa", "qanday", "aytolmayman", "yozolmayapman", "ishsizlik", "darvozabon"];
        const wordsMedium = ["kitobxonlik", "jirafa", "maktab", "dastur", "tizim", "server", "python", "java", "html", "script", "loyiha", "tezlik", "ekran", "ovoz", "qaymoq", "saryog'", "mas'ul", "panda"];
        const wordsHard = ["internet", "klavish", "sichqon", "algoritm", "funksiya", "o'zgaruvchi", "interfeys", "dizayn", "grafika", "xavfsizlik", "muvaffaqiyat", "texnologiya", "kelajak", "universitet"];

        let words = [];
        let particles = [];
        let score = 0;
        let level = 1;
        let lives = 3;
        let spawnRate = 2500; // Boshlanishiga sekinroq (2.5 sekund)
        let lastSpawn = 0;
        let animationId;
        let activeWordIndex = -1; 
        let gameActive = false;

        // --- OVOZ GENERATORI (Faylsiz ishlaydi) ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        function playSound(type) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (type === 'laser') {
                // Lazer ovozi (Yuqori chastota pasayib boradi)
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
            } else if (type === 'explosion') {
                // Portlash ovozi (Past chastota)
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.3);
            }
        }

        function resizeCanvas() {
            if(canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        }
        window.addEventListener('resize', resizeCanvas);

        class Word {
            constructor() {
                // LEVELGA QARAB SO'Z TANLASH
                let pool = wordsEasy;
                if (level >= 3) pool = pool.concat(wordsMedium);
                if (level >= 6) pool = pool.concat(wordsHard); // 6-leveldan keyin qiyinlari qo'shiladi
                
                // Faqat levelga mos uzunlikdagi so'zlarni olish ehtimolini oshiramiz
                if (level < 3) pool = wordsEasy;
                else if (level < 6 && Math.random() > 0.3) pool = wordsMedium; 

                this.text = pool[Math.floor(Math.random() * pool.length)];
                this.x = Math.random() * (canvas.width - 150) + 50;
                this.y = -40;
                
                // TEZLIKNI ASTA OSHIRISH
                // Boshida juda sekin (0.3 - 0.6 px/frame)
                this.speed = Math.random() * (0.3 + level * 0.05) + 0.3; 
                
                this.typedIndex = 0;
                this.color = "#ffffff";
            }

            draw() {
                ctx.font = "bold 26px 'Courier New'";
                // Soya berish (o'qish oson bo'lishi uchun)
                ctx.shadowColor = "black";
                ctx.shadowBlur = 4;
                
                // Yozilgan qismi (Yashil)
                ctx.fillStyle = "#4ade80";
                ctx.fillText(this.text.substring(0, this.typedIndex), this.x, this.y);
                
                // Qolgan qismi (Oq)
                ctx.fillStyle = this.color;
                const offset = ctx.measureText(this.text.substring(0, this.typedIndex)).width;
                ctx.fillText(this.text.substring(this.typedIndex), this.x + offset, this.y);
                
                ctx.shadowBlur = 0; // Soyani o'chirish

                if (words.indexOf(this) === activeWordIndex) {
                    // Nishon belgisi
                    ctx.strokeStyle = "#ef4444"; // Qizil nishon
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.x + ctx.measureText(this.text).width / 2, this.y - 8, 30, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }

            update() {
                this.y += this.speed;
            }
        }

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 8; // Tezroq sochiladi
                this.vy = (Math.random() - 0.5) * 8;
                this.alpha = 1;
                this.color = `hsl(${Math.random() * 60 + 10}, 100%, 50%)`; // Olov ranglar
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= 0.03;
            }
        }

        function createExplosion(x, y) {
            playSound('explosion'); // Portlash ovozi
            for (let i = 0; i < 20; i++) {
                particles.push(new Particle(x, y));
            }
        }

        function spawnWord(timestamp) {
            if (timestamp - lastSpawn > spawnRate) {
                words.push(new Word());
                lastSpawn = timestamp;
                // Har bir levelda ozgina tezlashadi, lekin minimal chegara bor
                if (spawnRate > 1000) spawnRate -= 20; 
            }
        }

        function updateLives() {
            let hearts = "";
            for(let i=0; i<lives; i++) hearts += '<i class="fas fa-heart"></i> ';
            livesDisplay.innerHTML = hearts;
            if (lives <= 0) gameOver();
        }

        function drawLaser(targetX, targetY) {
            playSound('laser'); // Lazer ovozi
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height); 
            ctx.lineTo(targetX, targetY);
            ctx.strokeStyle = "#4ade80"; // Yashil lazer
            ctx.lineWidth = 4;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#4ade80";
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        function gameLoop(timestamp) {
            if (!gameActive) return;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'; // Trail effekti
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            spawnWord(timestamp);

            words.forEach((word, index) => {
                word.update();
                word.draw();

                if (word.y > canvas.height) {
                    words.splice(index, 1);
                    if (index === activeWordIndex) activeWordIndex = -1;
                    lives--;
                    updateLives();
                    canvas.style.border = "4px solid red";
                    setTimeout(() => canvas.style.border = "2px solid var(--accent)", 200);
                }
            });

            particles.forEach((p, index) => {
                if (p.alpha <= 0) particles.splice(index, 1);
                else { p.update(); p.draw(); }
            });

            animationId = requestAnimationFrame(gameLoop);
        }

        document.addEventListener('keydown', (e) => {
            if (!gameActive) return;
            const key = e.key.toLowerCase();

            if (activeWordIndex === -1) {
                let targetIndex = -1;
                let maxY = -100;

                // Eng pastdagi so'zni ustuvor deb bilamiz
                words.forEach((word, index) => {
                    if (word.text.charAt(0).toLowerCase() === key && word.y > maxY) {
                        maxY = word.y;
                        targetIndex = index;
                    }
                });

                if (targetIndex !== -1) {
                    activeWordIndex = targetIndex;
                    processInput(key);
                }
            } else {
                processInput(key);
            }
        });

        function processInput(key) {
            const word = words[activeWordIndex];
            if (!word) { activeWordIndex = -1; return; } // Xatolik oldini olish

            if (word.text.charAt(word.typedIndex).toLowerCase() === key) {
                word.typedIndex++;
                drawLaser(word.x + 30, word.y); 
                
                if (word.typedIndex === word.text.length) {
                    createExplosion(word.x + 30, word.y);
                    words.splice(activeWordIndex, 1);
                    activeWordIndex = -1;
                    score += 10;
                    scoreEl.innerText = score;
                    
                    if (score % 30 === 0) { // Har 30 ballda level oshadi
                        level++;
                        levelEl.innerText = level;
                    }
                }
            } 
        }

        function startGame() {
            resizeCanvas();
            startScreen.style.display = 'none';
            gameOverScreen.style.display = 'none';
            
            // Audio Contextni yoqish (Foydalanuvchi tugmani bosganda)
            if (audioCtx.state === 'suspended') audioCtx.resume();

            words = [];
            particles = [];
            score = 0;
            level = 1;
            lives = 3;
            spawnRate = 2500;
            activeWordIndex = -1;
            gameActive = true;
            
            scoreEl.innerText = score;
            levelEl.innerText = level;
            updateLives();
            
            animationId = requestAnimationFrame(gameLoop);
        }

        function gameOver() {
            gameActive = false;
            cancelAnimationFrame(animationId);
            finalScoreEl.innerText = score;
            gameOverScreen.style.display = 'flex';
        }

        function stopGameAndGoHome() {
            gameActive = false;
            cancelAnimationFrame(animationId);
            goHome();
        }