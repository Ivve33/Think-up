/**
 * Think-Up Cloud Functions — Contact Form Handler
 * Receives contact submissions, validates on the server,
 * sanitizes input, and writes to Firestore with admin privileges.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// ════════════════════════════════════════════════════════════
// 🔒 BACKEND VALIDATION HELPERS
// ════════════════════════════════════════════════════════════

// Strip HTML tags and trim whitespace to prevent XSS/injection
function sanitizeString(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/<[^>]*>/g, "")        // remove HTML tags
    .replace(/javascript:/gi, "")    // block javascript: URIs
    .replace(/on\w+=/gi, "");        // block inline event handlers
}

// Validate every field — entry, type, length, format
function validateContactData(data) {
  // Entry check — every required field must exist
  const required = ["fname", "lname", "email", "mobile", "dob", "gender", "language", "subject", "message"];
  for (const field of required) {
    if (!data[field] || data[field].toString().trim() === "") {
      return `Missing required field: ${field}`;
    }
  }

  // Type check — everything must be a string (except dob which is parsed)
  for (const field of required) {
    if (typeof data[field] !== "string") {
      return `Invalid type for field: ${field}`;
    }
  }

  // Format & length — names
  const namePattern = /^[A-Za-z\u0600-\u06FF\s]+$/;
  if (data.fname.length < 2 || data.fname.length > 30) return "First name must be 2–30 characters.";
  if (!namePattern.test(data.fname)) return "First name must contain letters only.";
  if (data.lname.length < 2 || data.lname.length > 30) return "Last name must be 2–30 characters.";
  if (!namePattern.test(data.lname)) return "Last name must contain letters only.";

  // Format — email
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.email.length > 100) return "Email is too long.";
  if (!emailPattern.test(data.email)) return "Invalid email address.";

  // Format — Saudi mobile
  const mobilePattern = /^(05|\+9665)[0-9]{8}$/;
  if (!mobilePattern.test(data.mobile)) return "Invalid Saudi mobile number.";

  // Format & range — date of birth
  const dobDate = new Date(data.dob);
  if (isNaN(dobDate.getTime())) return "Invalid date of birth.";
  const today = new Date();
  if (dobDate >= today) return "Date of birth cannot be in the future.";
  const age = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 13) return "You must be at least 13 years old.";
  if (age > 120) return "Invalid date of birth.";

  // Whitelist — gender, language, subject
  const allowedGenders = ["Male", "Female"];
  if (!allowedGenders.includes(data.gender)) return "Invalid gender value.";

  const allowedLanguages = ["Arabic", "English", "French"];
  if (!allowedLanguages.includes(data.language)) return "Invalid language selection.";

  const allowedSubjects = [
    "General Inquiry",
    "Technical Support",
    "Partnership & Collaboration",
    "Feedback & Suggestions",
    "Report an Issue"
  ];
  if (!allowedSubjects.includes(data.subject)) return "Invalid subject selection.";

  // Length — message
  if (data.message.length < 10) return "Message must be at least 10 characters.";
  if (data.message.length > 1000) return "Message is too long (max 1000 characters).";

  return null; // all good
}

// ════════════════════════════════════════════════════════════
// 📩 SUBMIT CONTACT MESSAGE
// Called from the contact form (Backend Validation entry point)
// ════════════════════════════════════════════════════════════
exports.submitContactMessage = onCall(
  { region: "us-central1", cors: true },
  async (request) => {
    const raw = request.data || {};

    // 1. Sanitize all string fields BEFORE validating
    const clean = {
      fname: sanitizeString(raw.fname),
      lname: sanitizeString(raw.lname),
      email: sanitizeString(raw.email).toLowerCase(),
      mobile: sanitizeString(raw.mobile),
      dob: sanitizeString(raw.dob),
      gender: sanitizeString(raw.gender),
      language: sanitizeString(raw.language),
      subject: sanitizeString(raw.subject),
      message: sanitizeString(raw.message),
    };

    // 2. Validate (entry, type, length, format)
    const validationError = validateContactData(clean);
    if (validationError) {
      throw new HttpsError("invalid-argument", validationError);
    }

    // 3. Save to Firestore with admin privileges
    try {
      const docRef = await admin.firestore().collection("contactMessages").add({
        ...clean,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "new",
      });

      return {
        success: true,
        message: "Your message has been received. We'll respond within 24 hours.",
        id: docRef.id,
      };
    } catch (err) {
      console.error("Failed to save contact message:", err);
      throw new HttpsError("internal", "Could not save your message. Please try again.");
    }
  }
);