// Login/auth.js
import { auth } from "../Core/firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile // <-- 1. تمت إضافة دالة تحديث البروفايل
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* =======================
   LOGIN ELEMENTS
======================= */
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

/* =======================
   SIGN UP ELEMENTS
======================= */
const signupForm = document.getElementById("signupForm");
// تأكد أن هذه المعرفات (IDs) موجودة في ملف HTML كما اتفقنا
const firstNameInput = document.getElementById("firstName"); 
const lastNameInput = document.getElementById("lastName");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

/* =======================
   LOGIN LOGIC
======================= */
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // توجيه للداشبورد مباشرة بعد الدخول
      window.location.href = "../dashboard/dashboard.html";
    } catch (err) {
      alert(prettyAuthError(err));
      console.error(err);
    }
  });
}

/* =======================
   SIGN UP LOGIC (التعديل الأساسي هنا)
======================= */
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. جلب القيم من الحقول الجديدة
    const fName = firstNameInput.value.trim();
    const lName = lastNameInput.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;

    // دمج الاسم ليكون ثنائياً
    const fullName = `${fName} ${lName}`;

    try {
      // 2. إنشاء الحساب
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. تحديث اسم المستخدم في فايربيس فوراً
      await updateProfile(user, {
        displayName: fullName
      });

      console.log("تم إنشاء الحساب وحفظ الاسم:", fullName);

      // 4. التوجيه لصفحة الداشبورد لرؤية الاسم
      window.location.href = "../dashboard/dashboard.html";
      
    } catch (err) {
      alert(prettyAuthError(err));
      console.error(err);
    }
  });
}

/* =======================
   ERROR HANDLING
======================= */
function prettyAuthError(err) {
  const code = err?.code || "";

  if (code.includes("auth/invalid-email"))
    return "البريد الإلكتروني غير صحيح.";

  if (code.includes("auth/user-not-found"))
    return "لا يوجد حساب بهذا البريد.";

  if (code.includes("auth/wrong-password"))
    return "كلمة المرور غير صحيحة.";

  if (code.includes("auth/email-already-in-use"))
    return "هذا البريد مستخدم مسبقًا.";

  if (code.includes("auth/weak-password"))
    return "كلمة المرور ضعيفة (على الأقل 8 أحرف).";

  if (code.includes("auth/too-many-requests"))
    return "محاولات كثيرة. حاول لاحقًا.";

  return "حدث خطأ غير متوقع: " + code;
}