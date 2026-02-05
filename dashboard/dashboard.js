// Dsahbored/dashboard.js

// 1. استيراد أدوات الفايربيس الضرورية
import { auth } from "../Core/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// 2. تعريف عناصر HTML التي سنغير نصوصها
const userNameElement = document.getElementById("userName");   // "Welcome back, [Name]"
const userLabelElement = document.getElementById("userLabel"); // "Signed in as: [Name]"
const logoutBtn = document.querySelector(".btn-outline");      // زر الخروج (Back to Home)

// 3. مراقب حالة تسجيل الدخول (أهم دالة)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- حالة: المستخدم مسجل دخول ---
        console.log("User is signed in:", user.email);

        // محاولة جلب الاسم، إذا لم يوجد نستخدم الاسم الموجود في الإيميل قبل علامة @
        // مثال: student@gmail.com -> سيظهر الاسم Student
        let displayName = user.displayName;
        
        if (!displayName) {
            displayName = user.email.split('@')[0];
        }

        // تحديث النصوص في الواجهة
        userNameElement.textContent = displayName;
        userLabelElement.textContent = displayName;

    } else {
        // --- حالة: المستخدم غير مسجل ---
        // توجيهه فوراً لصفحة الدخول للحماية
        window.location.href = "../Login/auth.html";
    }
});

// 4. (اختياري) تفعيل زر الخروج الفعلي
// حالياً الزر في الـ HTML يوجه لـ Home، لكن الأفضل برمجياً نسوي SignOut
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault(); // منع الانتقال المباشر
        try {
            await signOut(auth);
            window.location.href = "../index.html"; // أو صفحة الهبوط
        } catch (error) {
            console.error("Error signing out:", error);
        }
    });
}