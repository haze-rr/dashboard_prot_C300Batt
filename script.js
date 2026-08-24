// --- 1. KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC1M-omuY5dXTVDhtlEJc3yCatCN-Ri1-A",
    databaseURL: "https://data-baterai-projek-kp-default-rtdb.asia-southeast1.firebasedatabase.app",
    // Pastikan databaseURL menggunakan awalan https://
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 2. PERSIAPAN GRAFIK CHART.JS ---
const ctx = document.getElementById('grafikTegangan').getContext('2d');
const chartTegangan = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [], // Sumbu X (Waktu)
        datasets: [{
            label: 'Tegangan Baterai (V)',
            data: [], // Sumbu Y (Tegangan)
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0, 188, 212, 0.2)',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.4 // Membuat garis melengkung halus
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                min: 0,
                max: 4.2,
                afterBuildTicks: function(axis) {
                    let customTicks = [];
                    
                    // 1. Rentang 0V s.d. 2.7V (Lompatan per 0.3V)
                    for (let i = 0; i < 3.0; i += 0.3) {
                        customTicks.push({ value: parseFloat(i.toFixed(1)) });
                    }
                    
                    // 2. Rentang 3.0V s.d. 4.2V (Lompatan per 0.1V yang lebih detail)
                    for (let i = 3.0; i <= 4.21; i += 0.1) {
                        customTicks.push({ value: parseFloat(i.toFixed(1)) });
                    }
                    
                    axis.ticks = customTicks; // Menerapkan garis kustom ke grafik
                }
            }
        },
        animation: false // Dimatikan agar tidak lag saat update real-time
    }
});

// --- 3. MENARIK DATA REAL-TIME (/latest) ---
db.ref('/baterai_c300/latest').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Update Angka di HTML
    document.getElementById('teks-tegangan').innerText = data.tegangan_v.toFixed(2) + " V";
    document.getElementById('teks-arus').innerText = Math.round(data.arus_ma) + " mA";
    
    // Teks dipertahankan seperti format awal yang Anda inginkan
    document.getElementById('teks-level').innerText = "Bar: " + data.level_bar; 

    // --- LOGIKA VISUAL BATERAI NOKIA ---
    const barLevel = data.level_bar; 
    
    // Langkah 1: Reset semua balok menjadi kosong
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`bar-${i}`).className = "battery-bar"; 
    }

    // Langkah 2: Tentukan warna balok berdasarkan status alarm
    let warnaBar = "bar-aman"; 
    if (data.status_alarm === 1) warnaBar = "bar-warning"; 
    if (data.status_alarm === 0) warnaBar = "bar-kritis";  

    // Langkah 3: Isi balok dari kiri ke kanan sesuai angka levelBar
    for (let i = 1; i <= barLevel; i++) {
        document.getElementById(`bar-${i}`).classList.add(warnaBar);
    }

    // =========================================================
    // --- TAMBAHAN KODE STATUS YANG SEMPAT TERHAPUS DI SINI ---
    // =========================================================
    const statusCard = document.getElementById('card-status');
    const teksStatus = document.getElementById('teks-status');

    // Hapus kelas warna sebelumnya
    statusCard.classList.remove('aman', 'warning', 'kritis');

    // Ubah teks dan warna border berdasarkan data alarm ESP32
    if (data.status_alarm === -1) {
        teksStatus.innerText = "NORMAL";
        statusCard.classList.add('aman');
    } else if (data.status_alarm === 1) {
        teksStatus.innerText = "WARNING DROP";
        statusCard.classList.add('warning');
    } else if (data.status_alarm === 0) {
        teksStatus.innerText = "CRITICAL!";
        statusCard.classList.add('kritis');
    }
});

// --- 4. MENARIK DATA HISTORY (/history) ---
// Hanya mengambil 30 data terakhir agar web tidak berat
db.ref('/baterai_c300/history').limitToLast(30).on('value', (snapshot) => {
    const dataHistory = snapshot.val();
    if (!dataHistory) return;

    const labels = [];
    const values = [];

    // Looping data dari Firebase
    Object.keys(dataHistory).forEach((key) => {
        const item = dataHistory[key];
        
        // Buat format waktu (Jam:Menit:Detik) sederhana
        const date = new Date(); 
        const waktuStr = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
        
        labels.push(waktuStr);
        values.push(item.tegangan_v);
    });

    // Perbarui grafik
    chartTegangan.data.labels = labels;
    chartTegangan.data.datasets[0].data = values;
    chartTegangan.update();
});