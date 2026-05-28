# Architectural & Design Decisions Log

This log documents all major technical decisions, libraries, layout patterns, and code choices for the Game Design Blog.

---

## 1. Chosen Stack & Libraries (Latest 2026 Versions)

| Tool / Library | Version | Delivery Method | Purpose / Choice |
| :--- | :--- | :--- | :--- |
| **Bootstrap** | `5.3.3` | CDN (jsDelivr) | Layout, grid system, responsive utilities, forms. Provides standard utility classes while allowing custom CSS override. |
| **marked.js** | `12.0.0` | CDN (cdnjs) | Compiles Markdown files to clean, secure HTML client-side. Light, fast, and robust. |
| **Quill.js** | `2.0.0` | CDN (cdnjs) | Modern, clean rich text editor for writing posts. Offers a smooth WYSIWYG experience and custom toolbar APIs. |
| **Cropper.js** | `1.6.2` | CDN (cdnjs) | High-performance client-side image cropper. Used to crop screenshots/game covers on the publisher panel before upload. |
| **Inter Font** | Google Fonts | Web CDN | Used as the main body font. Clean, highly legible, modern sans-serif typography. |
| **Lora Font** | Google Fonts | Web CDN | Elegant serif font for headings and long-form article body text to emulate premium editorial journals (like Medium/Substack). |

---

## 2. Minimalist Aesthetic Decisions
The user requested a **very simple visual layout** with **no gradients, noise, or "AI-style" designs**.
- **Color Palette**: High-contrast, near-monochrome palette. White/light-grey backgrounds, dark grey text (`#212529`), and sharp thin borders (`1px solid #e0e0e0`).
- **Cards**: Flat cards. No drop shadows, gradients, or rounded corners of modern "glassmorphic" designs. Instead, sharp, thin lines and neat typography.
- **Accents**: Light grey backgrounds for secondary text/labels. Bright accent colors (e.g., pure red/blue or primary colors) are avoided in favor of solid dark grey/black for active states.

---

## 3. Storage & Publishing Architecture
- **GitHub API Integrations**: Client-side JavaScript interacts with the GitHub REST API (`https://api.github.com`) using a user-provided Personal Access Token.
- **Save Strategy**:
  - Image files are converted to `image/webp` client-side with a `0.8` quality setting using standard browser `canvas.toBlob()`. WebP reduces image file sizes by 70-80% compared to JPG/PNG, preventing Git repo bloat.
  - Video clips are embedded using YouTube/Vimeo links to avoid free tier size limits, but can also be uploaded if they are small (using direct base64 file upload via GitHub API).
  - Posts are committed as individual `.md` files.
  - The index file `posts.json` is updated by fetching the existing file, parsing, appending metadata (title, date, summary, tags, file path), and uploading it back to Git.
