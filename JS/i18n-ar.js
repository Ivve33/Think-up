document.documentElement.setAttribute('lang', 'ar');
document.documentElement.setAttribute('dir', 'rtl');

const htmlPages = [
  "about",
  "auth",
  "contact",
  "course-details",
  "course-sessions",
  "create-session",
  "dashboard",
  "explore",
  "homePage",
  "join-session",
  "major-details",
  "session-history",
  "session-room",
  "session-summary",
  "university-details",
];

const textMap = new Map([
  ["Home", "الرئيسية"],
  ["About", "من نحن"],
  ["Contact", "تواصل معنا"],
  ["Sign Up", "إنشاء حساب"],
  ["Login", "تسجيل الدخول"],
  ["Log Out", "تسجيل الخروج"],
  ["Back", "رجوع"],
  ["Back to Home", "العودة للرئيسية"],
  ["Back to Dashboard", "العودة للوحة التحكم"],
  ["Back to Explore", "العودة للاستكشاف"],
  ["Back to Courses", "العودة للمقررات"],
  ["Back to Sessions", "العودة للجلسات"],
  ["Back to Schedule", "العودة للجدول"],
  ["Browse Sessions", "تصفح الجلسات"],
  ["Browse courses", "تصفح المقررات"],
  ["Dashboard", "لوحة التحكم"],
  ["Profile", "الملف الشخصي"],
  ["Course", "المقرر"],
  ["Courses", "المقررات"],
  ["Loading...", "جار التحميل..."],
  ["Loading session...", "جار تحميل الجلسة..."],
  ["Loading courses...", "جار تحميل المقررات..."],
  ["Loading majors...", "جار تحميل التخصصات..."],
  ["Finding universities...", "جار البحث عن الجامعات..."],
  ["Fetching colleges...", "جار جلب الكليات..."],
  ["Connection Error.", "خطأ في الاتصال."],
  ["Missing URL parameters.", "معلمات الرابط مفقودة."],
  ["Major not found.", "لم يتم العثور على التخصص."],
  ["No universities found.", "لم يتم العثور على جامعات."],
  ["No majors found.", "لم يتم العثور على تخصصات."],
  ["No matches found.", "لا توجد نتائج مطابقة."],
  ["Error loading data.", "حدث خطأ أثناء تحميل البيانات."],
  ["Error loading majors.", "حدث خطأ أثناء تحميل التخصصات."],
  ["Error loading colleges.", "حدث خطأ أثناء تحميل الكليات."],
  ["No colleges added yet.", "لم تتم إضافة كليات بعد."],
  ["Invalid University ID", "معرف الجامعة غير صالح"],
  ["University Not Found", "لم يتم العثور على الجامعة"],
  ["Live", "مباشرة"],
  ["Open", "متاحة"],
  ["Full", "مكتملة"],
  ["Total Today", "إجمالي اليوم"],
  ["Quick Stats", "إحصاءات سريعة"],
  ["Today at a glance", "لمحة عن اليوم"],
  ["Upcoming sessions", "الجلسات القادمة"],
  ["My summaries", "ملخصاتي"],
  ["Quick Actions", "إجراءات سريعة"],
  ["Recent Activity", "النشاط الأخير"],
  ["My Sessions", "جلساتي"],
  ["Upcoming", "القادمة"],
  ["Past", "السابقة"],
  ["Hosted", "التي استضفتها"],
  ["Newest first", "الأحدث أولا"],
  ["Oldest first", "الأقدم أولا"],
  ["No sessions found", "لم يتم العثور على جلسات"],
  ["Nothing here yet", "لا يوجد شيء هنا بعد"],
  ["Session Title", "عنوان الجلسة"],
  ["Session Type", "نوع الجلسة"],
  ["Session Action", "إجراء الجلسة"],
  ["Action", "إجراء"],
  ["Confirm", "تأكيد"],
  ["Close", "إغلاق"],
  ["Join Session", "الانضمام للجلسة"],
  ["Create Session", "إنشاء جلسة"],
  ["Start Session", "بدء الجلسة"],
  ["End Session", "إنهاء الجلسة"],
  ["Leave", "مغادرة"],
  ["Cancel", "إلغاء"],
  ["Copy Link", "نسخ الرابط"],
  ["Copied", "تم النسخ"],
  ["Copy failed", "فشل النسخ"],
  ["Go to Lobby", "الانتقال إلى غرفة الانتظار"],
  ["View Summary", "عرض الملخص"],
  ["Show Transcript", "عرض النص الكامل"],
  ["Hide Transcript", "إخفاء النص الكامل"],
  ["Download PDF", "تنزيل PDF"],
  ["Share with Participants", "مشاركة مع المشاركين"],
  ["Re-watch Recording", "إعادة مشاهدة التسجيل"],
  ["Actions", "الإجراءات"],
  ["Participants", "المشاركون"],
  ["Host", "المضيف"],
  ["Time", "الوقت"],
  ["Date", "التاريخ"],
  ["Duration", "المدة"],
  ["Seats", "المقاعد"],
  ["Visibility", "الظهور"],
  ["Public", "عام"],
  ["Private", "خاص"],
  ["Ready", "جاهز"],
  ["AI Status", "حالة الذكاء الاصطناعي"],
  ["AI Summary", "ملخص الذكاء الاصطناعي"],
  ["Share Summary", "مشاركة الملخص"],
  ["Session Complete", "اكتملت الجلسة"],
  ["Session Ended", "انتهت الجلسة"],
  ["Session Cancelled", "ألغيت الجلسة"],
  ["Something went wrong", "حدث خطأ ما"],
  ["Invalid invite link", "رابط الدعوة غير صالح"],
  ["Session not found", "لم يتم العثور على الجلسة"],
  ["Session is full", "الجلسة مكتملة"],
  ["This session has ended", "انتهت هذه الجلسة"],
  ["Session cancelled", "تم إلغاء الجلسة"],
  ["Couldn't join", "تعذر الانضمام"],
  ["Go to dashboard", "الانتقال إلى لوحة التحكم"],
  ["Mic", "الميكروفون"],
  ["Muted", "مكتوم"],
  ["Camera", "الكاميرا"],
  ["Off", "متوقف"],
  ["Share", "مشاركة"],
  ["REC", "تسجيل"],
]);

const partialMap = [
  [/^Signed in as:\s*/i, "مسجل الدخول باسم: "],
  [/^Now:\s*/i, "الآن: "],
  [/^Show (\d+) more hours? →$/i, "عرض $1 ساعات أخرى ←"],
  [/^(\d+) Results$/i, "$1 نتيجة"],
  [/^(\d+) sessions?$/i, "$1 جلسة"],
  [/^Level (\d+)$/i, "المستوى $1"],
  [/^Lvl (\d+)$/i, "مستوى $1"],
  [/^Starts in$/i, "تبدأ خلال"],
  [/^Ready to start$/i, "جاهزة للبدء"],
  [/^Starts in (\d+) minutes?\.$/i, "تبدأ خلال $1 دقيقة."],
  [/^Starts in (\d+) hours?\.$/i, "تبدأ خلال $1 ساعة."],
  [/^Starts in (\d+) days?\.$/i, "تبدأ خلال $1 يوم."],
  [/^(\d+) \/ 5 selected$/i, "تم اختيار $1 / 5"],
];

[
  ["Elevating Saudi Education", "نرتقي بالتعليم السعودي"],
  ["Study Smarter,", "ادرس بذكاء،"],
  ["Together", "معا"],
  ["The first AI-powered platform designed specifically for the Saudi academic journey.", "أول منصة مدعومة بالذكاء الاصطناعي ومصممة خصيصا للرحلة الأكاديمية السعودية."],
  ["Get Started", "ابدأ الآن"],
  ["Explore Universities", "استكشف الجامعات"],
  ["Your Path to Excellence", "طريقك إلى التميز"],
  ["Find University", "ابحث عن الجامعة"],
  ["Locate your specific campus within our Saudi network.", "اعثر على جامعتك ضمن شبكتنا السعودية."],
  ["Select Major", "اختر التخصص"],
  ["Drill down into your specific field of study.", "انتقل إلى مجال دراستك المحدد."],
  ["Choose Course", "اختر المقرر"],
  ["Find the exact class session you need to master.", "اعثر على جلسة المقرر التي تحتاجها للتفوق."],
  ["Record your session and receive instant smart notes.", "سجل جلستك واحصل على ملاحظات ذكية فورية."],
  ["Intelligence in every", "ذكاء في كل"],
  ["meeting.", "اجتماع."],
  ["Stop worrying about taking notes. Our AI understands technical Arabic and English academic contexts to give you the perfect summary.", "توقف عن القلق بشأن تدوين الملاحظات. يفهم ذكاؤنا الاصطناعي السياقات الأكاديمية التقنية بالعربية والإنجليزية ليقدم لك الملخص الأنسب."],
  ["Learn More", "اعرف المزيد"],
  ["Data Structures Study", "دراسة هياكل البيانات"],
  ["Key Points:", "النقاط الرئيسية:"],
  ["Time Complexity analysis", "تحليل التعقيد الزمني"],
  ["Linked List vs Arrays", "القوائم المرتبطة مقابل المصفوفات"],
  ["Big-O examples in exams", "أمثلة Big-O في الاختبارات"],
  ["Our Story", "قصتنا"],
  ["Built for students,", "صمم للطلاب،"],
  ["by students.", "بواسطة الطلاب."],
  ["Think-Up was created to solve a real problem — Saudi university students lacked a single place to explore academic paths and collaborate effectively. We built the platform we always wished existed.", "أُنشئت Think-Up لحل مشكلة حقيقية: لم يكن لدى طلاب الجامعات السعودية مكان واحد لاستكشاف المسارات الأكاديمية والتعاون بفاعلية. بنينا المنصة التي تمنينا وجودها دائما."],
  ["Platform Launch", "إطلاق المنصة"],
  ["University of Jeddah · Pilot", "جامعة جدة · تجربة أولية"],
  ["Students Supported", "الطلاب المستفيدون"],
  ["And growing every semester", "والعدد ينمو كل فصل دراسي"],
  ["Our Mission", "مهمتنا"],
  ["Empowering academic", "تمكين الوضوح"],
  ["clarity", "الأكاديمي"],
  ["We believe every student deserves clear, accessible information about their academic journey — in their language, on their terms. Think-Up bridges the gap between universities and students through intelligent tools.", "نؤمن بأن كل طالب يستحق معلومات واضحة وسهلة الوصول حول رحلته الأكاديمية، بلغته وبما يناسبه. تسد Think-Up الفجوة بين الجامعات والطلاب من خلال أدوات ذكية."],
  ["Bilingual content (Arabic & English)", "محتوى ثنائي اللغة (العربية والإنجليزية)"],
  ["AI-powered study session summaries", "ملخصات جلسات دراسية مدعومة بالذكاء الاصطناعي"],
  ["Real-time collaborative study rooms", "غرف دراسة تعاونية مباشرة"],
  ["Structured university & major explorer", "مستكشف منظم للجامعات والتخصصات"],
  ["Why Think-Up?", "لماذا Think-Up؟"],
  ["The Think-Up Team", "فريق Think-Up"],
  ["The Team", "الفريق"],
  ["Meet the", "تعرف على"],
  ["builders", "البناة"],
  ["Full-Stack", "تطوير شامل"],
  ["AI & Backend", "الذكاء الاصطناعي والخلفية"],
  ["LinkedIn Profile", "ملف LinkedIn"],
  ["Co-founder & Developer. Passionate about building tools that make student life easier through smart technology.", "شريك مؤسس ومطور. شغوف ببناء أدوات تجعل حياة الطالب أسهل من خلال التقنية الذكية."],
  ["Co-founder & Developer. Builds end-to-end features across frontend and backend to keep the platform fast and reliable.", "شريك مؤسس ومطور. يبني مزايا متكاملة في الواجهة الأمامية والخلفية للحفاظ على سرعة المنصة وموثوقيتها."],
  ["Co-founder & AI Integration. Specializes in connecting intelligent systems to real-world academic workflows.", "شريك مؤسس ومختص بتكامل الذكاء الاصطناعي. يركز على ربط الأنظمة الذكية بسير العمل الأكاديمي الواقعي."],
  ["What We Stand For", "ما نؤمن به"],
  ["Our", "قيمنا"],
  ["values", "الأساسية"],
  ["Clarity", "الوضوح"],
  ["Collaboration", "التعاون"],
  ["Accessibility", "سهولة الوصول"],
  ["Intelligence", "الذكاء"],
  ["Academic information should be simple, structured, and easy to understand for every student.", "ينبغي أن تكون المعلومات الأكاديمية بسيطة ومنظمة وسهلة الفهم لكل طالب."],
  ["Learning is better together. We build tools that bring students closer, not further apart.", "التعلم أفضل معا. نبني أدوات تقرب الطلاب من بعضهم ولا تفرقهم."],
  ["Full bilingual support ensures no student is left behind due to language barriers.", "الدعم الثنائي الكامل يضمن ألا يتأخر أي طالب بسبب حاجز اللغة."],
  ["Get In Touch", "تواصل معنا"],
  ["We'd love to", "يسعدنا أن"],
  ["hear", "نسمع"],
  ["from you.", "منك."],
  ["Have a question, feedback, or want to partner with Think-Up? Drop us a message and we'll get back to you soon.", "لديك سؤال أو ملاحظة أو ترغب في شراكة مع Think-Up؟ أرسل لنا رسالة وسنرد عليك قريبا."],
  ["Send a message", "أرسل رسالة"],
  ["Fill out the form and our team will respond within 24 hours.", "املأ النموذج وسيرد فريقنا خلال 24 ساعة."],
  ["First Name", "الاسم الأول"],
  ["Last Name", "اسم العائلة"],
  ["Email Address", "البريد الإلكتروني"],
  ["Mobile Number", "رقم الجوال"],
  ["Date of Birth", "تاريخ الميلاد"],
  ["Gender", "الجنس"],
  ["Male", "ذكر"],
  ["Female", "أنثى"],
  ["Preferred Language", "اللغة المفضلة"],
  ["Select language…", "اختر اللغة..."],
  ["Arabic", "العربية"],
  ["English", "English"],
  ["French", "الفرنسية"],
  ["Subject", "الموضوع"],
  ["Select a topic…", "اختر موضوعا..."],
  ["General Inquiry", "استفسار عام"],
  ["Technical Support", "دعم فني"],
  ["Partnership & Collaboration", "شراكة وتعاون"],
  ["Feedback & Suggestions", "ملاحظات واقتراحات"],
  ["Report an Issue", "الإبلاغ عن مشكلة"],
  ["Message", "الرسالة"],
  ["Write your message here…", "اكتب رسالتك هنا..."],
  ["Send Message", "إرسال الرسالة"],
  ["Message sent!", "تم إرسال الرسالة!"],
  ["Thanks for reaching out. We'll get back to you within 24 hours.", "شكرا لتواصلك. سنرد عليك خلال 24 ساعة."],
  ["Send another", "إرسال رسالة أخرى"],
  ["Location", "الموقع"],
  ["University of Jeddah", "جامعة جدة"],
  ["College of Computer Science & Engineering", "كلية علوم وهندسة الحاسب"],
  ["Jeddah, Saudi Arabia", "جدة، المملكة العربية السعودية"],
  ["We reply within 24 hours", "نرد خلال 24 ساعة"],
  ["Support Hours", "ساعات الدعم"],
  ["Sunday – Thursday", "الأحد - الخميس"],
  ["9:00 AM – 5:00 PM (AST)", "9:00 صباحا - 5:00 مساء (AST)"],
  ["FAQ", "الأسئلة الشائعة"],
  ["Common questions", "أسئلة شائعة"],
  ["Is Think-Up free to use?", "هل استخدام Think-Up مجاني؟"],
  ["Yes! Think-Up is completely free for all enrolled university students.", "نعم! Think-Up مجانية تماما لجميع طلاب الجامعات المسجلين."],
  ["Which universities are supported?", "ما الجامعات المدعومة؟"],
  ["Currently University of Jeddah is our pilot. More universities are coming soon.", "حاليا جامعة جدة هي التجربة الأولية، وسيتم إضافة المزيد من الجامعات قريبا."],
  ["How does the AI summary work?", "كيف يعمل ملخص الذكاء الاصطناعي؟"],
  ["After each study session, our AI processes the recording and generates structured notes and key takeaways automatically.", "بعد كل جلسة دراسية، يعالج الذكاء الاصطناعي التسجيل وينشئ ملاحظات منظمة وأهم النقاط تلقائيا."],
  ["Your Central Hub", "مركزك الرئيسي"],
  ["Welcome back,", "مرحبا بعودتك،"],
  ["Manage sessions and access your summaries instantly.", "أدر جلساتك وادخل إلى ملخصاتك فورا."],
  ["Start your next step in seconds.", "ابدأ خطوتك التالية خلال ثوان."],
  ["Browse universities, majors, and courses in your Saudi network.", "تصفح الجامعات والتخصصات والمقررات ضمن شبكتك السعودية."],
  ["My Upcoming Sessions", "جلساتي القادمة"],
  ["View all your scheduled study sessions and join them anytime.", "اعرض كل جلساتك الدراسية المجدولة وانضم إليها في أي وقت."],
  ["Browse all AI-generated summaries from your completed study sessions.", "تصفح كل الملخصات التي أنشأها الذكاء الاصطناعي من جلساتك المكتملة."],
  ["View Summaries", "عرض الملخصات"],
  ["Your latest sessions.", "أحدث جلساتك."],
  ["Your session history will appear here.", "سيظهر سجل جلساتك هنا."],
  ["Select Your Path", "اختر مسارك"],
  ["Universities", "الجامعات"],
  ["Search through our network of Saudi universities and colleges.", "ابحث ضمن شبكتنا من الجامعات والكليات السعودية."],
  ["Search for university (e.g. Jeddah)...", "ابحث عن جامعة (مثلا: جدة)..."],
  ["Browse all courses in your study plan by level.", "تصفح كل المقررات في خطتك الدراسية حسب المستوى."],
  ["Search for a course...", "ابحث عن مقرر..."],
  ["Major Electives", "مقررات التخصص الاختيارية"],
  ["Choose from the following elective courses to complete your study plan.", "اختر من المقررات الاختيارية التالية لإكمال خطتك الدراسية."],
  ["Select Your Major", "اختر تخصصك"],
  ["Search majors...", "ابحث عن التخصصات..."],
  ["Choose Your Specialization", "اختر مسارك التخصصي"],
  ["Select a major to explore its full curriculum.", "اختر تخصصا لاستكشاف خطته الدراسية كاملة."],
  ["Selected Campus", "الحرم الجامعي المحدد"],
  ["Search colleges & majors...", "ابحث عن الكليات والتخصصات..."],
  ["Colleges & Majors", "الكليات والتخصصات"],
  ["Select Your College", "اختر كليتك"],
  ["Choose your faculty to browse available majors.", "اختر كليتك لتصفح التخصصات المتاحة."],
  ["About this University", "عن هذه الجامعة"],
  ["College Name", "اسم الكلية"],
  ["Select your major to continue", "اختر تخصصك للمتابعة"],
  ["Validating your invite…", "جار التحقق من دعوتك..."],
  ["One moment while we check the session.", "لحظة واحدة بينما نتحقق من الجلسة."],
  ["Invite valid", "الدعوة صالحة"],
  ["Joining", "جار الانضمام إلى"],
  ["We couldn't validate this invite link.", "تعذر علينا التحقق من رابط الدعوة هذا."],
  ["Schedule a session", "جدولة جلسة"],
  ["Session Setup", "إعداد الجلسة"],
  ["Create a", "أنشئ"],
  ["Set your title, time, and visibility. Public sessions appear in the weekly schedule and also generate an invite link you can share.", "حدد العنوان والوقت والظهور. تظهر الجلسات العامة في الجدول الأسبوعي وتنشئ أيضا رابط دعوة يمكنك مشاركته."],
  ["Session Rules", "قواعد الجلسة"],
  ["60-minute sessions", "جلسات لمدة 60 دقيقة"],
  ["All sessions are 60 minutes — focused and predictable.", "كل الجلسات مدتها 60 دقيقة، مركزة وواضحة."],
  ["2 to 6 people", "من 2 إلى 6 أشخاص"],
  ["Smaller groups stay focused.", "المجموعات الصغيرة تبقى أكثر تركيزا."],
  ["5 is the sweet spot.", "5 هو العدد الأنسب."],
  ["Invite link always works", "رابط الدعوة يعمل دائما"],
  ["Even on public sessions, you get a link to share with friends.", "حتى في الجلسات العامة، تحصل على رابط تشاركه مع أصدقائك."],
  ["Fill in the required information below to create your new session room.", "املأ المعلومات المطلوبة أدناه لإنشاء غرفة جلستك الجديدة."],
  ["Quick Start", "بدء سريع"],
  ["Just give it a title, and you're ready.", "أضف عنوانا فقط وستكون جاهزا."],
  ["Session Title", "عنوان الجلسة"],
  ["A short, clear title for your session (max 60 characters).", "عنوان قصير وواضح لجلستك (60 حرفا كحد أقصى)."],
  ["Choose the session day.", "اختر يوم الجلسة."],
  ["Start Time", "وقت البدء"],
  ["Any time of day — even 4 AM if you want.", "أي وقت في اليوم، حتى 4 صباحا إذا أردت."],
  ["SESSION STARTS", "تبدأ الجلسة"],
  ["All sessions are one hour", "كل الجلسات مدتها ساعة واحدة"],
  ["Max Participants", "الحد الأقصى للمشاركين"],
  ["Topic / Notes", "الموضوع / الملاحظات"],
  ["(Optional)", "(اختياري)"],
  ["Live Preview", "معاينة مباشرة"],
  ["Session Preview", "معاينة الجلسة"],
  ["Set your session information to preview it here.", "أدخل معلومات الجلسة لمعاينتها هنا."],
  ["Session Created", "تم إنشاء الجلسة"],
  ["Your invite link is ready", "رابط الدعوة جاهز"],
  ["Course Sessions", "جلسات المقرر"],
  ["Weekly Public Schedule", "الجدول العام الأسبوعي"],
  ["Find or create", "ابحث أو أنشئ"],
  ["study sessions", "جلسات دراسية"],
  ["Studying right now? Start a quick session", "تدرس الآن؟ ابدأ جلسة سريعة"],
  ["Start Now", "ابدأ الآن"],
  ["Weekly Course Sessions", "جلسات المقرر الأسبوعية"],
  ["Upcoming only", "القادمة فقط"],
  ["Today's Sessions", "جلسات اليوم"],
  ["Live Now", "مباشر الآن"],
  ["No sessions yet", "لا توجد جلسات بعد"],
  ["Be the first to create a session for this day.", "كن أول من ينشئ جلسة لهذا اليوم."],
  ["Session History", "سجل الجلسات"],
  ["Personal Dashboard", "لوحة شخصية"],
  ["Track all your", "تتبع كل"],
  ["Total Sessions", "إجمالي الجلسات"],
  ["Hours Studied", "ساعات الدراسة"],
  ["Filter by tab, search by course, and sort by date.", "صف حسب التبويب، وابحث بالمقرر، ورتب حسب التاريخ."],
  ["Search by course", "البحث بالمقرر"],
  ["Search by course name or code...", "ابحث باسم المقرر أو رمزه..."],
  ["Sort", "ترتيب"],
  ["Try changing the tab, search text, or sort option.", "جرّب تغيير التبويب أو نص البحث أو خيار الترتيب."],
  ["Generated After Session End", "ينشأ بعد انتهاء الجلسة"],
  ["Java Programming", "برمجة جافا"],
  ["Session Overview", "نظرة عامة على الجلسة"],
  ["Session Header", "رأس الجلسة"],
  ["Basic session information generated from the room metadata.", "معلومات الجلسة الأساسية الناتجة من بيانات الغرفة."],
  ["AI Generated", "منشأ بالذكاء الاصطناعي"],
  ["Participants Summary", "ملخص المشاركين"],
  ["Host, participant count, and academic backgrounds.", "المضيف، عدد المشاركين، والخلفيات الأكاديمية."],
  ["4 Joined", "4 انضموا"],
  ["Computer Science", "علوم الحاسب"],
  ["Total Participants", "إجمالي المشاركين"],
  ["4 Students", "4 طلاب"],
  ["Majors Represented", "التخصصات الممثلة"],
  ["Main Discussion", "النقاش الرئيسي"],
  ["Questions & Answers", "أسئلة وأجوبة"],
  ["Captured Q&A", "أسئلة وأجوبة مسجلة"],
  ["Important Terms", "مصطلحات مهمة"],
  ["Keywords", "كلمات مفتاحية"],
  ["Action Items", "إجراءات المتابعة"],
  ["Follow-up", "متابعة"],
  ["Transcript", "النص الكامل"],
  ["Optional full transcript generated from the recording.", "نص كامل اختياري منشأ من التسجيل."],
  ["Rate This Session", "قيّم هذه الجلسة"],
  ["Optional quick feedback from 1 to 5 stars.", "تقييم سريع اختياري من 1 إلى 5 نجوم."],
  ["Not rated yet", "لم يتم التقييم بعد"],
  ["Download, share, or re-watch the session.", "نزّل الجلسة أو شاركها أو أعد مشاهدتها."],
  ["AI Source", "مصدر الذكاء الاصطناعي"],
  ["Summary generation pipeline overview.", "نظرة عامة على مسار إنشاء الملخص."],
  ["Use the generated summary link below.", "استخدم رابط الملخص المنشأ أدناه."],
  ["Loading session...", "جار تحميل الجلسة..."],
  ["Everyone currently in the lobby.", "كل الموجودين حاليا في غرفة الانتظار."],
  ["LIVE", "مباشر"],
  ["Connecting to video…", "جار الاتصال بالفيديو..."],
  ["Video unavailable", "الفيديو غير متاح"],
  ["Session Complete", "اكتملت الجلسة"],
  ["Thanks for studying together.", "شكرا للدراسة معا."],
  ["Minutes", "الدقائق"],
  ["Recording", "التسجيل"],
  ["This session was cancelled by the host.", "تم إلغاء هذه الجلسة من قبل المضيف."],
  ["This session will be recorded", "سيتم تسجيل هذه الجلسة"],
  ["By joining, you consent to being recorded.", "بانضمامك، فإنك توافق على التسجيل."],
  ["Decline", "رفض"],
  ["I Agree & Join", "أوافق وأنضم"],
  ["Remove Participant?", "إزالة المشارك؟"],
  ["Yes, Remove", "نعم، إزالة"],
  ["You're the Host", "أنت المضيف"],
  ["The session will continue without you.", "ستستمر الجلسة بدونك."],
  ["Stay", "البقاء"],
  ["Leave Session", "مغادرة الجلسة"],
  ["You're alone in this session", "أنت وحدك في هذه الجلسة"],
  ["End & Leave", "إنهاء ومغادرة"],
  ["End Session?", "إنهاء الجلسة؟"],
  ["This action cannot be undone.", "لا يمكن التراجع عن هذا الإجراء."],
  ["Yes, End Session", "نعم، إنهاء الجلسة"],
  ["Removed from Session", "تمت إزالتك من الجلسة"],
  ["The host has removed you from this session.", "قام المضيف بإزالتك من هذه الجلسة."],
].forEach(([english, arabic]) => textMap.set(english, arabic));

function translateString(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return value;
  if (textMap.has(normalized)) return value.replace(normalized, textMap.get(normalized));

  for (const [pattern, replacement] of partialMap) {
    if (pattern.test(normalized)) {
      return value.replace(normalized, normalized.replace(pattern, replacement));
    }
  }

  return value;
}

function translateTextNodes(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest("[data-lang-switch='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const translated = translateString(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  });
}

function translateAttributes(root = document.body) {
  const attrNames = ["placeholder", "aria-label", "title"];
  const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll("*")] : [];

  elements.forEach((element) => {
    attrNames.forEach((attr) => {
      if (!element.hasAttribute(attr)) return;
      const value = element.getAttribute(attr);
      const translated = translateString(value);
      if (translated !== value) element.setAttribute(attr, translated);
    });
  });
}

function localizeInternalLinks(root = document) {
  root.querySelectorAll("a[href]").forEach((link) => {
    if (link.dataset.langSwitch === "true") return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || /^https?:\/\//i.test(href)) return;
    link.setAttribute("href", href.replace(/(^|\/)([A-Za-z0-9-]+)\.html(?=([?#]|$))/g, (match, slash, page) => {
      return htmlPages.includes(page) ? `${slash}${page}-ar.html` : match;
    }));
  });

  root.querySelectorAll("[onclick]").forEach((el) => {
    const onclick = el.getAttribute("onclick");
    el.setAttribute("onclick", onclick.replace(/([A-Za-z0-9-]+)\.html/g, (match, page) => {
      return htmlPages.includes(page) ? `${page}-ar.html` : match;
    }));
  });
}

function applyArabicUi(root = document.body) {
  translateTextNodes(root);
  translateAttributes(root);
}

applyArabicUi();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) applyArabicUi(node);
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const translated = translateString(node.nodeValue);
        if (translated !== node.nodeValue) node.nodeValue = translated;
      }
    });

    if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
      const translated = translateString(mutation.target.nodeValue);
      if (translated !== mutation.target.nodeValue) mutation.target.nodeValue = translated;
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});
