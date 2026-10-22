# Akumen Talent

A student competency tracker for the Akumen 3-month programme: assessments, a rubric matrix, resumes, talent search for job roles, and a full activity log. It is plain HTML, CSS and JavaScript, so it runs on GitHub Pages. In **team mode** it uses a free Supabase project for Microsoft sign-in, shared data, resume files and live updates between teammates.

## Pages

| Page | What it does |
| --- | --- |
| Dashboard | Totals, average rating per criterion and results by course |
| Students | Search and filter records; select a row to see the full profile, then edit or delete |
| Rubric matrix | One row per student with all 13 criteria as columns, colour-coded 1 to 5. Select a score to change it; sort by any column; export to Excel |
| Talent search | Enter a role such as Full Stack Developer to find students whose resume skills and rubric scores qualify |
| Resumes | Every uploaded resume, bulk upload, view and remove |
| Activity log | Who did what and when, including old and new values for edited scores. Filter by user, action and date; export to Excel |
| Settings | Team members and roles, Excel import, backups |

## Logo

The Akumen logo files are in `assets/`: the full logo for the sign-in page, the wordmark for the sidebar (with a white version for dark mode), the symbol for the mobile bar and the browser tab icon.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `style.css`, `app.js` | The app |
| `config.js` | Microsoft (Azure) IDs and Supabase details |
| `.vscode/` | F5 options for VS Code, including a local web server for Microsoft sign-in |
| `schema.sql` | Database setup for Supabase, safe to run again |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

If `config.js` still has its placeholders, the app uses email and password sign-in and keeps records in that browser.

## Using it on multiple devices

Out of the box, the app keeps everything in the browser it runs in, so a second laptop or a phone starts empty. To have the **same students, scores, resumes, team list and activity log on every device**, connect it to a free Supabase project (an online database). Follow **"Set up team mode"** below; it takes about 15 minutes and needs no coding:

1. Create the Supabase project and run `schema.sql`.
2. Paste the Supabase **Project URL** and **anon public** key into `config.js`.
3. Publish the folder on GitHub Pages (or keep using `http://localhost:8080` on one machine while you test).

From then on, everyone signs in on any device and sees the same data, with changes appearing for others within a few seconds. Microsoft sign-in in team mode is optional and can be added later; until it is, people use **email and password** ("First time here? Create your password" on the sign-in page).

## Signing in

The app has three sign-in options. `config.js` decides which one is used.

| `config.js` | Sign-in | Where data is kept |
| --- | --- | --- |
| Everything left as `YOUR_...` | Email and password | This browser only |
| `MS_CLIENT_ID` and `MS_TENANT_ID` filled in | **Microsoft** | This browser only |
| `SB_URL` and `SB_KEY` filled in | **Microsoft**, through Supabase | Shared by the whole team |

### Microsoft sign-in (about 10 minutes, no Supabase)

You need permission to register apps in your organisation's Microsoft Entra ID (Azure). If you can't, ask your IT admin to do steps 1–4 and send you the two IDs.

1. Go to **entra.microsoft.com → Applications → App registrations → New registration**.
2. **Name:** `Akumen Talent`. **Supported account types:** *Accounts in this organizational directory only*.
3. **Redirect URI:** choose **Single-page application (SPA)** and enter `http://localhost:8080/` (with the slash at the end). Select **Register**.
4. On the overview page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
5. Paste them into `config.js`:
   ```js
   const MS_CLIENT_ID = '<Application (client) ID>';
   const MS_TENANT_ID = '<Directory (tenant) ID>';
   ```
6. Open the app at **http://localhost:8080/**. Microsoft sign-in does not work when `index.html` is opened as a file. In VS Code, press **F5** and choose **Open with Microsoft sign-in (Chrome)** (or Edge). This starts a small local web server first, which needs Python installed. Without VS Code, run `python -m http.server 8080` in the folder and open http://localhost:8080/.
7. Select **Sign in with Microsoft**. **The first person to sign in becomes the admin.** Add teammates in **Settings → Team** using the email address they sign in to Microsoft with. Anyone not on the list is turned away.

When you publish on GitHub Pages, open the app registration's **Authentication** page and add your Pages address as another SPA redirect URI, for example `https://<your-username>.github.io/akumen-tracker/`.

No client secret is needed and none is stored: the app uses Microsoft's standard sign-in flow for web pages (authorisation code with PKCE). The team list and the data are still kept in each browser, so each computer has its own copy. For one shared copy for the whole team, use team mode below.

### Email and password

When `config.js` has no Microsoft or Supabase details, the first time the app opens in a browser, it asks you to create the admin account (name, email, password). After that everyone signs in with email and password. The admin adds trainers in **Settings → Team** with a temporary password, and can reset passwords or deactivate accounts there. Accounts, like the records, are kept in that browser on that computer, so each computer has its own list. Passwords are stored hashed, not as plain text. This sign-in records who made each change; it does not stop someone with full access to the computer from reading the browser's stored data. For real protection and shared data, use team mode below.

## Top 5 and Top 10

On **Students** and **Rubric matrix**, the **All students** box can be switched to **Top 5** or **Top 10 by overall score**. Rank badges show positions 1 to 10. Ties are broken by rubric average, then exam average. Students without an overall score (no exam or no ratings yet) are left out of the ranking. The ranking respects the other filters, so choose a course or batch first to see, for example, the top 5 in DevOps. **Export Excel** exports the ranked list.

## Set up team mode: shared data on every device (once, about 15 minutes)

You need a free Supabase account and access to the Microsoft Azure portal (Microsoft Entra ID) for your organisation.

**1. Create the Supabase project and database (required)**

1. Create a project at supabase.com. Note its **Project URL**, which looks like `https://abcdefgh.supabase.co`.
2. Open **SQL Editor → New query**, paste all of `schema.sql` and select **Run**. This creates the team list, the shared data, the activity log and a private `resumes` bucket, with rules so that only active team members can read or change anything.

**2. Register the app with Microsoft (optional)**

1. In the Azure portal open **Microsoft Entra ID → App registrations → New registration**.
2. Name it `Akumen Talent`. Under **Supported account types**, choose **Accounts in this organizational directory only** if your team uses company Microsoft 365 accounts.
3. Under **Redirect URI**, choose **Web** and enter `https://<your-project>.supabase.co/auth/v1/callback`, using your Supabase Project URL. Select **Register**.
4. On the overview page, copy the **Application (client) ID** and the **Directory (tenant) ID**.
5. Open **Certificates & secrets → Client secrets → New client secret**. Copy the secret's **Value** (not the Secret ID). Note its expiry date; you'll need to create a new one before then.
6. Recommended: open **Manifest** and, under `optionalClaims`, add `email` and `xms_edov` to `idToken` and `xms_edov` to `accessToken`, then **Save**. This lets Supabase confirm the email address.

**3. Turn on Microsoft in Supabase (optional)**

1. In Supabase open **Authentication → Sign In / Providers → Azure**, switch it on and enter the client ID and secret value.
2. In **Azure Tenant URL** enter `https://login.microsoftonline.com/<directory-tenant-id>`. This allows only accounts from your organisation.
3. Open **Authentication → URL Configuration**. Set **Site URL** to your GitHub Pages address, for example `https://<your-username>.github.io/akumen-tracker/`, and add the same address under **Redirect URLs**.

**4. Connect the app (required)**

Open **Project Settings → API**, copy the **Project URL** and the **anon public** key into `config.js`:

```js
const SB_URL = 'https://abcdefgh.supabase.co';
const SB_KEY = 'eyJ...';
```

The anon key is designed to be public. Never put the `service_role` key in this file.

**5. Choose how people confirm their email**

Supabase emails a confirmation link to anyone who creates a password, and its free built-in mailer sends only a few emails per hour. Because only people on your team list can see any data, you can switch this off: **Authentication → Sign In / Providers → Email → Confirm email** off. Leave **Allow new users to sign up** on; otherwise new teammates, including those using Microsoft, cannot create their sign-in.

**6. Sign in first**

Open the app and sign in before anyone else, either with **Sign in with Microsoft** (if you did steps 2 and 3) or with **First time here? Create your password**. **The first person to sign in becomes the admin.** Then open **Settings → Team** and add each teammate's email as Trainer or Admin. They can sign in with Microsoft, or create a password on the sign-in page using that email. Anyone not on the list is turned away. To take someone off the team, select **Remove** next to their name; their past activity log entries are kept.

The Microsoft steps (2 and 3) are optional. Without them, the Microsoft button shows an error and everyone uses email and password.

## Roles

| | Trainer | Admin |
| --- | --- | --- |
| View everything, add and edit students, change rubric scores, upload resumes, run talent search | Yes | Yes |
| Delete students, import Excel, restore a backup | No | Yes |
| Add members, change roles, deactivate members | No | Yes |

Roles control what the app shows. The database itself only checks that someone is an active team member, so give Admin only to people you trust with deletions.

## Publish on GitHub Pages

1. Create a GitHub repository, for example `akumen-tracker`. On GitHub's free plan Pages needs a **public** repository. Only the code is public; the student data stays in Supabase behind sign-in.
2. Upload `index.html`, `style.css`, `app.js`, `config.js`, `.nojekyll` and `README.md` to the root of the `main` branch (**Add file → Upload files**). If `.nojekyll` is hidden on your computer, you can skip it.
3. Go to **Settings → Pages**, set **Source** to **Deploy from a branch**, choose **main** and **/ (root)**, then **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/akumen-tracker/`. This must match the Site URL you entered in Supabase.

To update the app later, upload the changed files again. If teammates still see the old version, ask them to refresh with Ctrl+F5.

## Working as a team

- Everyone sees the same students, scores and resumes. When a teammate saves, the change appears for everyone else within a few seconds.
- If two people save at the same moment, the second save is not applied. That person sees a message, the latest data loads, and they repeat their change. Nothing is overwritten silently.
- The **Activity log** records sign-ins, students added, edited (with each changed field, old → new) and deleted, rubric score changes, Excel imports, resume uploads and removals, shortlist exports and team changes. Entries cannot be edited or deleted, even by admins.
- **Download backup** in Settings saves every record and resume to one file. Keep a copy regularly.

## Importing Excel assessments

In **Settings**, select **Download template** for a workbook with separate `AI`, `Data`, and `DevOps` worksheets. The template includes all 13 rubric columns used by `Student_Perfomance_Tracker.xlsx`: Language Proficiency, Speaking Fluency, Presentation Ability, Confidence, Listening Skills, Professional Communication, Technical Knowledge, Analytical Thinking, Troubleshooting Ability, Hands-on Lab Work, Project Implementation, Teamwork & Collaboration, and Learning Attitude. It also includes three exam scores, exam average, cumulative score, employment status, and comments. The uploaded workbook uses these same columns and is supported directly.

Alternatively, upload `.xlsx`, `.xls`, `.xlsm`, or `.csv` with a student-name column (`Student Name`, `Name`, `Name of Student`, and similar are accepted). The header row can appear below a title row. The workbook should have either:

- Separate worksheets named `AI`, `Data`, and/or `DevOps`; or
- A `Course`, `Category`, `Track`, or `Stream` column containing the category; or
- Numeric `AI`, `Data`, and `DevOps` columns containing exam scores (0–100), which create a course record for each category with a score.
- Just a student-name column: each student is added to all three categories with blank assessment scores.

Optional columns include `Batch`, `Evaluator`, `Exam 1`, `Exam 2`, `Exam 3`, `Exam Avg`, `Cumulative Score`, `Employment Status`, and `Comments`. Rubric scores must be whole numbers from 1 to 5. Existing records with the same student name, category/course, and batch are updated with non-empty imported values; other records are added. Blank/non-student rows are skipped. The Excel reader is loaded from a CDN, so an internet connection is required to import Excel files.

### How the importer reads the tracker workbook

- **Merged cells** (for example one Batch or Evaluator cell spanning several students) are applied to every student in the merged range.
- **Exam marks of 0 count as "not taken yet"** and are left out of the exam average, matching the workbook's own Exam Avg formula. A student whose exams are all 0 or blank shows no exam average.
- The exam average is calculated from Exam 1–3. The workbook's Exam Avg column is only used when the individual exam marks are missing.
- **Cumulative / Qumulative Score is not used as the overall %**, because in the tracker it is the sum of the 13 ratings (out of 65). The overall score is calculated from the rubric average and exam average. A column named **Overall Score** or **Overall %** (0–100) is used if present.
- Re-importing updates existing students and fills in a batch that an earlier import left blank, without creating duplicates.

## Editing in the rubric matrix

Every cell in **Rubric matrix** can be edited in place:

- **Rubric criteria (1–5):** select a score and pick a new one.
- **Exam 1, 2 and 3 (0–100):** select the score, type the new value and press Enter (Esc cancels). Leave it blank to clear it. The exam average and overall % update straight away.
- **Comments:** the last column shows each student's trainer comments. Select a comment, or **Add comment**, to edit it.

Every change is written to the activity log with the old and new value. When you change a rating or exam score, the overall % is recalculated from the new scores, replacing any overall score that came from an imported workbook.

## Excel exports

**Export Excel** on Students and Rubric matrix, the activity log export and the assessment template all produce formatted workbooks: a title and export date, coloured group headings (Communication, Technical, Soft skills, Exams, Summary), a bold header row with filters, rating cells coloured from red (1) to green (5), exams to one decimal place, overall as a %, and comments wrapped in a wide column. The Students workbook also has a **Summary** sheet by course, and the template has a **Read me** sheet explaining each column. All of these files can be imported again.

## Duplicates, batches and re-uploading

- A student is one record per **name + course + batch**. Batch spellings such as "Batch 2", "batch-02" and "Batch 02" count as the same batch and are saved as **Batch 02**, so the same batch can't appear twice in the filters.
- Duplicates already in the tracker are merged automatically when the app opens and on every Excel upload. Ratings, exams and comments from all copies are kept, and resumes follow the student. Admins can also run **Settings → Duplicates → Find and merge duplicates**.
- Adding a student by hand who already exists in that course and batch is refused; open the existing record instead.
- When you upload an Excel file, every row is compared with what is already stored. Only new students and real changes are saved, and the message says how many rows were added, updated and already up to date. If nothing in the file is new or different, **the file is not imported**.

## Clear data (admins only)

**Settings → Clear data** removes every student record, rating, exam score and comment for the whole team (optionally all resumes too). You have to type CLEAR to confirm. The activity log is kept and records who cleared the data. Trainers don't see the button, and in team mode the database also refuses a clear from anyone who isn't an admin. **If you set up Supabase before this version, run `schema.sql` again once** (SQL Editor → paste → Run) to add that check.

## Scores

Rubric ratings are from 1 to 5. The rubric average is converted to a percentage and averaged with the exam average to calculate the overall score when the workbook does not supply a cumulative score. A student is marked **Assessed** when all 13 rubric ratings and an exam score are present; partially completed assessments are marked **Needs attention**. Select a student to see every score and comment, or use the Rubric matrix to compare everyone side by side.

## Resumes

Each student can have one resume (PDF, DOCX or TXT, up to 5 MB). Upload it from **Edit student**, or select **Upload resumes** on the Resumes page to add many at once. Bulk uploads are matched by file name: every word of the student's name must appear in the file name (for example, `Anu_Thomas_Resume.pdf`). Files that match no student, or more than one, are listed so you can attach them from **Edit**.

A resume belongs to the student's name and batch, so it is shared by that student's AI, Data and DevOps records. The text is read in the browser so it can be searched; scanned image PDFs have no readable text and cannot be matched. Reading PDF and DOCX files needs an internet connection the first time, because the readers load from a CDN. The search box at the top also searches resume text.

## Finding eligible students

In **Talent search**, enter a role such as `Full Stack Developer`. Known roles (Full Stack, Frontend, Backend, Python, Java, Data Analyst, Data Scientist, AI / ML Engineer, DevOps, Cloud) fill in a skill list and the rubric criteria that matter for that role. You can edit both. Use commas between skills and `|` for alternatives, so `React|Angular|Vue` counts as found if any one appears. Unknown roles are split into separate keywords.

A student is **Eligible** when their resume contains at least the minimum share of skills and every selected rubric criterion is rated at or above the minimum rating. **Near match** means within 20 points of the skill threshold and no more than one point below on any criterion. The fit score combines skill match % and the selected rubric average (as a %) using the chosen weighting, and results are ranked by status, then fit score. Use the Course and Batch boxes on the page to narrow the search. **Export shortlist** saves the shown results, with the reasons each student did or did not qualify, as a CSV.

## Data and privacy

In team mode, records and resumes are stored in your Supabase project and are readable only by signed-in users you have added. Resume files are kept in a private bucket and opened through short-lived links. In single-browser mode nothing leaves the browser, and clearing browser data removes the records, so keep backups in a safe location.
