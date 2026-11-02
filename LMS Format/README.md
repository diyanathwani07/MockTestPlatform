# Teaching Pariksha Official LMS Format — Sample Word Documents

This folder contains official reference Word documents (`.docx`) for the **Teaching Pariksha LMS Question Import Format** used by the PrepMark MockTest Platform.

---

## 📁 Supported Official Formats

### 1. JHTET Format (Bare Section Headings)
- **Structure**: 5 Sections $\times$ 30 Questions = 150 Questions
- **Section Headings**:
  - `Child Development and Pedagogy`
  - `Mathematics`
  - `Environmental Studies`
  - `Language I Hindi`
  - `Language II English`
- **Question Layout**:
  - Bilingual (Hindi question first, English question second)
  - Standalone question numbers: `1.`, `2.`, `3.`
  - Options: `A.`, `B.`, `C.`, `D.`
  - Answer marker: `Answer B`
  - Solution marker: `Solution.` followed by explanation text

---

### 2. UPTET Format (Numbered Section Headings)
- **Structure**: 4 Sections (30, 30, 30, 60) = 150 Questions
- **Section Headings**:
  - `1) Child Development and Pedagogy`
  - `2) Hindi`
  - `3) English`
  - `4) Mathematics and Science`
- **Question Layout**:
  - Bilingual sections (English question first, Hindi question second)
  - Monolingual Hindi section (Q31–60)
  - Monolingual English section (Q61–90)
  - Math & Science with diagrams and tables (Q91–150)
  - Answer marker: `Answer A`
  - Solution marker: `Solution.`

---

## 📋 Quick Rules for Adding Documents to this Folder

1. File format must be `.docx` (Microsoft Word).
2. Questions should be numbered as `1.`, `2.`, `3.`, etc.
3. Options should start with `A.`, `B.`, `C.`, `D.` (or `A)`, `B)`, etc.).
4. Use `Answer X` (e.g. `Answer C`) for the correct option.
5. Use `Solution.` for the explanation.
6. Embedded Word tables will automatically be converted to Markdown tables during import.
7. Embedded diagrams and images will be detected, preserved, and tagged with `Contains Diagram`.
