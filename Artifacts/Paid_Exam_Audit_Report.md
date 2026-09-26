# Paid Exam Subscriptions & Entitlements Audit

## Current Plan Structure

| Plan     | Price | Duration | Exams | Practice | Questions | Materials | Other Content |
| -------- | ----: | -------: | ----: | -------: | --------: | --------: | ------------- |
| 1 Month  |  ₹200 |  30 days |   ALL |      ALL |       ALL |       ALL | ALL           |
| 2 Months |  ₹400 |  60 days |   ALL |      ALL |       ALL |       ALL | ALL           |
| 3 Months |  ₹600 |  90 days |   ALL |      ALL |       ALL |       ALL | ALL           |

*(Note: "ALL" refers to the entire contents of the specific `Quiz` / `ExamSeries` / `PracticeQuiz` that the plan is attached to.)*

## Analysis & Answers

### 1. Do all plans currently unlock the same content?
**Yes.** All plans attached to a Quiz/Exam unlock the exact same underlying content. There is only a single pool of content (sections, questions, materials) per Exam. When a user is granted access to the Exam, they get access to everything inside it, regardless of the plan they purchased.

### 2. Does only the expiry duration change?
**Actually, not even the expiry duration changes.**
The current database architecture for exam purchases is critically flawed regarding durations. When an exam is purchased, the system simply pushes the `ObjectId` of the Exam into the user's `purchasedExams` array. 
Because it only stores the `ObjectId` (and not an object with a `purchaseDate` or `expiryDate`), the system has no way to track when the plan expires. This effectively means **all plans currently grant lifetime access**. The duration is merely a frontend label and is never enforced by the backend.

### 3. Does the 2-month plan provide more content than the 1-month plan?
**No.** It provides the exact same content.

### 4. Does the 3-month plan provide more content than the 2-month plan?
**No.** It provides the exact same content.

### 5. Is content quantity actually connected to the selected plan?
**No.** The `plans` array in the `Quiz` schema only stores:
- `planName`
- `durationMonths`
- `originalPrice`
- `price` (Selling Price)

There are no fields configuring content quotas, question limits, or specific study materials per plan.

### 6. Where in the code/database is this controlled?
- **Admin Configuration:** `PaidPlanDrawer.jsx` handles plan creation. It only provides inputs for Duration, Original Price, Discount, and Selling Price.
- **Database Schema:** `Quiz.js` and `PracticeQuiz.js` models define the `plans` array without any content restrictions.
- **User Entitlement:** `User.js` defines `purchasedExams: [{ type: mongoose.Schema.Types.ObjectId, ref: "ExamSeries" }]`.
- **Enforcement:** Controllers (like `flashcardController.js`) simply check if the `examId` is present in the `user.purchasedExams` array to grant access.

### 7. Is the restriction enforced by the backend?
The restriction of "Does the user own this exam?" is enforced by checking the array.
However, **no restrictions regarding duration or plan-specific content are enforced by the backend** because the backend does not store or process that data for Exam purchases. 

*(Note: There is a separate `Subscription.js` model that handles platform-wide "AI Plans", which successfully tracks `startDate` and `expiryDate`. However, this is disconnected from individual Exam purchases.)*

### 8. What would need to be changed if we want higher-duration plans to provide additional content?
To properly implement content-tiered plans and enforce durations, the architecture requires significant updates:

1. **Database Restructuring:**
   Change `purchasedExams` in `User.js` from an array of simple ObjectIds to an array of Subdocuments, or create a dedicated `ExamEnrollment` model:
   ```javascript
   {
      userId: ObjectId,
      examId: ObjectId,
      planName: String,
      startDate: Date,
      expiryDate: Date,
      contentTier: String // e.g., 'BASIC', 'PRO', 'PREMIUM'
   }
   ```
2. **Content Tagging:**
   Individual questions, flashcards, or practice sets within the Exam would need a `requiredTier` field, allowing the backend to filter content based on the user's purchased tier.
3. **Backend Middleware Check:**
   Every route serving exam content would need to:
   - Check if the current Date is `< expiryDate`.
   - Filter the requested resources against the user's `contentTier`.
4. **Admin UI Overhaul:**
   The `CreateQuiz.jsx` / `PaidPlanDrawer.jsx` would need to allow assigning specific limits (e.g., max 10 Mock Tests) or content tiers to each plan.

## Exact Files Involved

**Frontend:**
- `Client/src/admin/components/PaidPlanDrawer.jsx` *(Admin UI for setting plans)*

**Backend Models:**
- `Server/models/User.js` *(Stores `purchasedExams` as raw ObjectIds)*
- `Server/models/Quiz.js` & `Server/models/PracticeQuiz.js` *(Stores the array of Plans, lacking content configs)*
- `Server/models/ExamSeries.js`

**Backend Controllers:**
- `Server/controllers/purchaseController.js` *(Handles purchase requests but currently only logs them as "Pending Verification")*
- `Server/controllers/quizController.js` *(Handles fetching and updating the Plans array)*
- `Server/controllers/flashcardController.js` *(Example of how access is granted just by checking if the ObjectId is in the array)*
