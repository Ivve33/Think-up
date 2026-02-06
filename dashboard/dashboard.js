// Dashboard/dashboard.js

// 1. استيراد أدوات الفايربيس
import { auth } from "../Core/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// 2. تعريف العناصر (استخدمنا ID لزر الخروج لضمان الدقة)
const userNameElement = document.getElementById("userName");   
const userLabelElement = document.getElementById("userLabel"); 
const logoutBtn = document.getElementById("logoutBtn"); // ✅ تم التعديل لاستخدام ID

// 3. مراقب حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- المستخدم مسجل دخول ---
        console.log("User is signed in:", user.email);

        let displayName = user.displayName;
        if (!displayName) {
            displayName = user.email.split('@')[0];
        }

        // تحديث النصوص
        if(userNameElement) userNameElement.textContent = displayName;
        if(userLabelElement) userLabelElement.textContent = displayName; // أو "Student"

    } else {
        // --- المستخدم غير مسجل ---
        // طرده لصفحة الدخول فوراً
        window.location.href = "../Login/auth.html";
    }
});

// 4. برمجة زر الخروج
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault(); 
        try {
            await signOut(auth); // أمر الخروج من فايربيس
            // ✅ توجيه للصفحة الرئيسية الصحيحة
            window.location.href = "../Home/homePage.html"; 
        } catch (error) {
            console.error("Error signing out:", error);
            alert("حدث خطأ أثناء تسجيل الخروج");
        }
    });
}