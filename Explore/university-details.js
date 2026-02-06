// university-details.js

import { db, auth } from "../Core/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// العناصر
const uniNameEl = document.getElementById("uniName");
const uniLocationEl = document.getElementById("uniLocation");
const uniLogoEl = document.getElementById("uniLogo");
const collegesGrid = document.getElementById("collegesGrid");
const backBtn = document.getElementById("dynamicBackBtn");
const searchInput = document.getElementById("searchCollegesInput");

// عناصر التابات
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// جلب الـ ID من الرابط
const urlParams = new URLSearchParams(window.location.search);
const uniId = urlParams.get('id');

// مصفوفة لتخزين الكليات (عشان البحث)
let allColleges = [];

// 1. منطق زر الرجوع (Fix Navigation)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // إذا طالب -> يرجع لصفحة الاستكشاف (عشان يختار جامعة ثانية لو يبي)
        backBtn.textContent = "Back to Explore";
        backBtn.href = "explore.html"; 
    } else {
        // إذا زائر -> يرجع للهوم
        backBtn.textContent = "Back to Home";
        backBtn.href = "../Home/homePage.html";
    }
});

// 2. منطق التبديل بين التابات (Fix Tabs)
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        // إزالة التفعيل من الجميع
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        
        // تفعيل الزر المختار والمحتوى المرتبط به
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-target");
        document.getElementById(targetId).classList.add("active");
    });
});

// 3. الدالة الرئيسية لجلب البيانات
async function initPage() {
    if (!uniId) {
        alert("No university selected!");
        window.location.href = "explore.html";
        return;
    }

    try {
        // أ. جلب بيانات الجامعة
        const docRef = doc(db, "universities", uniId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            uniNameEl.textContent = data.name;
            uniLocationEl.textContent = `📍 ${data.location}`;
            uniLogoEl.src = data.logo;
            
            // ب. جلب الكليات
            fetchColleges(uniId);
        } else {
            uniNameEl.textContent = "University Not Found";
            collegesGrid.innerHTML = "<p>Invalid University ID</p>";
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// 4. دالة جلب الكليات وعرضها
async function fetchColleges(id) {
    try {
        const colRef = collection(db, "universities", id, "colleges");
        const snapshot = await getDocs(colRef);

        collegesGrid.innerHTML = ""; // مسح اللودر
        allColleges = []; // تصفير المصفوفة

        if (snapshot.empty) {
            collegesGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                    <p>No colleges added yet.</p>
                </div>`;
            return;
        }

        // تخزين البيانات ورسمها
        snapshot.forEach(doc => {
            allColleges.push({ id: doc.id, ...doc.data() });
        });

        renderColleges(allColleges);

    } catch (error) {
        console.error("Error fetching colleges:", error);
        collegesGrid.innerHTML = "<p style='color:red'>Error loading colleges.</p>";
    }
}

// 5. دالة رسم الكروت (Rendering)
// 5. دالة رسم الكروت (نسخة مطورة تدعم الصور)
// university-details.js

// ... (باقي الكود فوق كما هو) ...

// 5. دالة رسم الكروت (Updated Layout)
function renderColleges(colleges) {
    collegesGrid.innerHTML = "";
    
    if (colleges.length === 0) {
        collegesGrid.innerHTML = "<p>No matches found.</p>";
        return;
    }

    colleges.forEach(college => {
        // التحقق: هل هي صورة أم إيموجي؟
        const iconValue = college.icon || '🎓';
        let iconContent;

        if (iconValue.startsWith('http')) {
            // كلاس خاص للصورة
            iconContent = `<img src="${iconValue}" alt="${college.name}" class="college-img">`;
        } else {
            // كلاس خاص للإيموجي
            iconContent = `<span class="college-emoji">${iconValue}</span>`;
        }

        // لاحظ التغيير في ترتيب الـ HTML هنا ليطابق التصميم الجديد
        const card = `
            <div class="college-card" onclick="openMajorsModal('${college.id}', '${college.name}', '${iconValue}')">
                
                <div class="college-icon-box">
                    ${iconContent}
                </div>

                <div class="college-info">
                    <h3>${college.name}</h3>
                </div>

                <div class="action-pill">View Courses →</div>
            </div>
        `;
        collegesGrid.insertAdjacentHTML("beforeend", card);
    });
}

// ... (باقي الكود تحت كما هو) ...

// 6. تفعيل البحث الفوري للكليات
if(searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allColleges.filter(col => col.name.toLowerCase().includes(term));
        renderColleges(filtered);
    });
}

// تشغيل الصفحة
document.addEventListener("DOMContentLoaded", initPage);