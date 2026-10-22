(() => {
  'use strict';

  const STORAGE_KEY = 'akumen-student-tracker-v1';
  const $ = (id) => document.getElementById(id);
  const rubricGroups = [
    { name: 'Communication skills', fields: [
      { id: 'languageProficiency', name: 'Language Proficiency' },
      { id: 'speakingFluency', name: 'Speaking Fluency' },
      { id: 'presentationAbility', name: 'Presentation Ability' },
      { id: 'confidence', name: 'Confidence' },
      { id: 'listeningSkills', name: 'Listening Skills' },
      { id: 'professionalCommunication', name: 'Professional Communication' }
    ] },
    { name: 'Technical skills', fields: [
      { id: 'technicalKnowledge', name: 'Technical Knowledge' },
      { id: 'analyticalThinking', name: 'Analytical Thinking' },
      { id: 'troubleshootingAbility', name: 'Troubleshooting Ability' },
      { id: 'handsOnLabWork', name: 'Hands-on Lab Work' },
      { id: 'projectImplementation', name: 'Project Implementation' }
    ] },
    { name: 'Soft skills', fields: [
      { id: 'teamworkCollaboration', name: 'Teamwork & Collaboration' },
      { id: 'learningAttitude', name: 'Learning Attitude' }
    ] }
  ];
  const rubricFields = rubricGroups.flatMap((group) => group.fields);
  const fields = rubricFields.map((field) => field.id);
  const examFields = ['exam1', 'exam2', 'exam3'];
  const categoryColumns = [
    { name: 'AI', headers: ['ai', 'artificial intelligence', 'machine learning'] },
    { name: 'Data', headers: ['data', 'data science', 'data analytics'] },
    { name: 'DevOps', headers: ['devops', 'dev ops', 'development operations'] }
  ];
  const form = $('studentForm');
  const dialog = $('studentDialog');
  let students = [];
  let toastTimer;

  /* ---------- Resume + talent search settings ---------- */
  const RESUME_TEXT_LIMIT = 60000;
  const MAX_RESUME_BYTES = 5 * 1024 * 1024;
  const PDF_SOURCES = [
    { lib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js' },
    { lib: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js' }
  ];
  const MAMMOTH_SOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
    'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'
  ];
  const DEFAULT_CRITERIA = ['technicalKnowledge', 'analyticalThinking', 'handsOnLabWork', 'projectImplementation'];
  const QUERY_STOPWORDS = new Set(['developer', 'developers', 'engineer', 'engineers', 'and', 'or', 'with', 'the', 'of', 'for', 'in', 'a', 'an', 'role', 'job', 'skills', 'experience', 'junior', 'senior', 'fresher', 'trainee']);
  const FILE_NOISE = new Set(['resume', 'cv', 'updated', 'final', 'new', 'latest', 'profile', 'copy', 'biodata', 'doc', 'pdf', 'docx']);
  const roleLibrary = [
    { role: 'Full Stack Developer', aliases: ['full stack', 'fullstack', 'mern', 'mean stack'],
      skills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React|Angular|Vue', 'Node.js|Node|Express', 'REST API|RESTful|API', 'SQL|MySQL|PostgreSQL|MongoDB', 'Git|GitHub', 'Docker|AWS|Azure|Deployment'],
      rubrics: ['technicalKnowledge', 'projectImplementation', 'handsOnLabWork', 'troubleshootingAbility', 'analyticalThinking'] },
    { role: 'Frontend Developer', aliases: ['frontend', 'front end', 'ui developer', 'react developer', 'web developer'],
      skills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React|Angular|Vue', 'Responsive design|Responsive', 'Tailwind|Bootstrap|SASS', 'Git|GitHub'],
      rubrics: ['technicalKnowledge', 'projectImplementation', 'handsOnLabWork', 'presentationAbility'] },
    { role: 'Backend Developer', aliases: ['backend', 'back end', 'api developer', 'node developer'],
      skills: ['Node.js|Node|Express|Java|Spring|Python|Django|Flask', 'REST API|RESTful|API', 'SQL|MySQL|PostgreSQL', 'MongoDB|NoSQL|Redis', 'Authentication|JWT|OAuth', 'Git|GitHub', 'Docker|Microservices'],
      rubrics: ['technicalKnowledge', 'analyticalThinking', 'troubleshootingAbility', 'projectImplementation'] },
    { role: 'Python Developer', aliases: ['python developer', 'python programmer', 'django developer'],
      skills: ['Python', 'Django|Flask|FastAPI', 'SQL|MySQL|PostgreSQL', 'REST API|API', 'Pandas|NumPy', 'OOP|Object oriented', 'Git|GitHub'],
      rubrics: ['technicalKnowledge', 'analyticalThinking', 'handsOnLabWork', 'projectImplementation'] },
    { role: 'Java Developer', aliases: ['java developer', 'spring developer'],
      skills: ['Java', 'Spring|Spring Boot', 'Hibernate|JPA', 'SQL|MySQL|Oracle|PostgreSQL', 'REST API|API', 'OOP|Object oriented', 'Maven|Gradle', 'Git|GitHub'],
      rubrics: ['technicalKnowledge', 'analyticalThinking', 'troubleshootingAbility', 'projectImplementation'] },
    { role: 'Data Analyst', aliases: ['data analyst', 'business analyst', 'bi analyst', 'mis analyst', 'reporting analyst'],
      skills: ['Excel|Advanced Excel', 'SQL', 'Power BI|Tableau|Looker', 'Python|R', 'Pandas|NumPy', 'Statistics|Statistical', 'Data visualization|Dashboard|Dashboards', 'Data cleaning|ETL'],
      rubrics: ['analyticalThinking', 'technicalKnowledge', 'presentationAbility', 'professionalCommunication', 'handsOnLabWork'] },
    { role: 'Data Scientist', aliases: ['data scientist', 'data science'],
      skills: ['Python', 'Machine learning|ML', 'Pandas|NumPy', 'Scikit-learn|sklearn', 'Statistics|Statistical', 'SQL', 'Deep learning|TensorFlow|PyTorch|Keras', 'Data visualization|Matplotlib|Seaborn'],
      rubrics: ['analyticalThinking', 'technicalKnowledge', 'projectImplementation', 'handsOnLabWork'] },
    { role: 'AI / ML Engineer', aliases: ['ai engineer', 'ml engineer', 'machine learning', 'artificial intelligence', 'genai', 'generative ai', 'llm', 'ai ml'],
      skills: ['Python', 'Machine learning|ML', 'Deep learning|TensorFlow|PyTorch|Keras', 'NLP|Natural language processing', 'LLM|LangChain|GenAI|Generative AI|OpenAI|Hugging Face|RAG', 'Scikit-learn|sklearn', 'Computer vision|OpenCV', 'MLOps|FastAPI|Flask|Model deployment'],
      rubrics: ['technicalKnowledge', 'analyticalThinking', 'projectImplementation', 'handsOnLabWork', 'troubleshootingAbility'] },
    { role: 'DevOps Engineer', aliases: ['devops', 'dev ops', 'sre', 'site reliability'],
      skills: ['Linux', 'Docker', 'Kubernetes|K8s', 'CI/CD|Jenkins|GitHub Actions|GitLab', 'AWS|Azure|GCP', 'Terraform|Ansible', 'Git|GitHub', 'Shell scripting|Bash|Shell', 'Monitoring|Prometheus|Grafana'],
      rubrics: ['technicalKnowledge', 'troubleshootingAbility', 'handsOnLabWork', 'projectImplementation', 'teamworkCollaboration'] },
    { role: 'Cloud Engineer', aliases: ['cloud engineer', 'cloud', 'aws engineer', 'azure engineer'],
      skills: ['AWS|Azure|GCP', 'Linux', 'Networking|VPC', 'Terraform|CloudFormation', 'Docker|Kubernetes', 'IAM|Security', 'Shell scripting|Bash|Python'],
      rubrics: ['technicalKnowledge', 'troubleshootingAbility', 'handsOnLabWork', 'projectImplementation'] }
  ];
  /* Team mode: on when config.js holds a real Supabase URL and anon key */
  const CLOUD = typeof SB_URL === 'string' && /^https:\/\/[^/]+\.supabase\.co/.test(SB_URL)
    && typeof SB_KEY === 'string' && SB_KEY.length > 20 && !/YOUR_/.test(SB_KEY);
  /* Microsoft sign-in without Supabase: on when config.js holds an Azure application (client) ID */
  const MS_LOCAL = !CLOUD && typeof MS_CLIENT_ID === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(MS_CLIENT_ID.trim());
  const MS_TENANT = MS_LOCAL && typeof MS_TENANT_ID === 'string' && MS_TENANT_ID.trim() && !/YOUR_/.test(MS_TENANT_ID)
    ? MS_TENANT_ID.trim() : 'organizations';
  let sb = null;
  let user = null;
  let rev = 0;
  let dirty = false;
  let pushTimer = null;
  let pushQueue = Promise.resolve();
  let remotePending = false;
  let role = 'admin';
  let me = { email: '', name: 'This browser' };
  let activity = [];
  let activityLoaded = false;
  let team = [];
  let currentView = 'dashboard';
  let matrixSort = { key: 'name', dir: 1 };
  let sheetStudentId = null;
  const ACTIVITY_KEY = 'akumen-activity-v1';
  const VIEWS = ['dashboard', 'students', 'matrix', 'talent', 'resumes', 'activity', 'settings'];
  const resumes = new Map();      // key = name|batch -> { key, file, type, size, at, text, blob }
  let pendingResume = null;       // { file, text, warning } | { remove: true } | null
  let lastAutoSkills = '';
  let talentRows = [];
  let talentConfig = null;

  function initials(name) {
    const parts = String(name || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
    return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function avatarColor(name) {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return `c${(h % 6) + 1}`;
  }
  function avatarHtml(name, size = '') {
    return `<span class="avatar ${size} ${avatarColor(name)}" aria-hidden="true">${escapeHtml(initials(name))}</span>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function statusFor(student) {
    const rated = fields.filter((field) => Number(student[field]) >= 1 && Number(student[field]) <= 5).length;
    if (!rated && student.exam === null) return 'pending';
    if (rated < fields.length || student.exam === null) return 'attention';
    return 'assessed';
  }

  function scoresFor(student) {
    const ratings = fields.map((field) => Number(student[field])).filter((value) => value >= 1 && value <= 5);
    const rubric = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
    const exam = student.exam === null || student.exam === undefined || student.exam === '' ? null : Number(student.exam);
    const calculatedOverall = rubric === null || exam === null
      ? null
      : Math.round(((rubric / 5) * 100 + exam) / 2);
    const overall = student.overallScore ?? calculatedOverall;
    return { rubric, exam, overall };
  }

  function setStat(text) { $('stat').textContent = text || ''; }

  function save() {
    if (CLOUD) {
      dirty = true;
      setStat('Saving…');
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 500);
      return true;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
      setStat('Saved in this browser');
      return true;
    } catch (error) {
      setStat('Not saved — download a backup');
      showToast(`Could not save in this browser: ${error.message}`, true);
      return false;
    }
  }

  function cloudPayload() {
    return { students, resumes: [...resumes.values()].map(({ blob, ...meta }) => meta) };
  }

  function push() {
    pushQueue = pushQueue.then(async () => {
      if (!dirty || !user) return;
      dirty = false;
      const { data, error } = await sb.from('tracker')
        .update({ data: cloudPayload(), rev: rev + 1, updated_by: user.email, updated_at: new Date().toISOString() })
        .eq('id', 1).eq('rev', rev).select('rev');
      if (error) {
        dirty = true;
        setStat('Not saved');
        showToast(`Could not save: ${error.message}`, true);
        return;
      }
      if (!data.length) {
        await pull();
        render();
        showToast('A teammate saved at the same moment, so your last change was not saved. The latest data is now loaded — please repeat your change.', true);
        return;
      }
      rev = data[0].rev;
      setStat('All changes saved');
    }).catch((error) => {
      dirty = true;
      setStat('Offline — not saved');
      showToast(`Could not reach the server, so your last change may not be saved: ${error.message}`, true);
    });
    return pushQueue;
  }

  async function pull() {
    const { data, error } = await sb.from('tracker').select('data, rev, updated_by').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('The shared tracker table is empty. Run schema.sql once in the Supabase SQL Editor.');
    const shared = data.data || {};
    const list = Array.isArray(shared.students) ? shared.students : [];
    const loaded = [];
    for (const item of list) {
      try { loaded.push(normalizeStudent(item)); } catch (error) { /* skip a damaged record */ }
    }
    students = loaded;
    resumes.clear();
    (Array.isArray(shared.resumes) ? shared.resumes : []).forEach((meta) => { if (meta && meta.key) resumes.set(meta.key, { ...meta }); });
    rev = data.rev;
    setStat('All changes saved');
  }

  async function refreshFromServer(by) {
    if (dirty || dialog.open) { remotePending = true; return; }
    remotePending = false;
    try {
      await pull();
      render();
      if (talentConfig) runTalentSearch();
      if (by && by !== me.email) showToast(`Updated by ${by}.`);
      if (currentView === 'activity' || currentView === 'dashboard') loadActivity();
    } catch (error) {
      showToast(`Could not load the latest data: ${error.message}`, true);
    }
  }

  function subscribe() {
    sb.channel('tracker-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tracker', filter: 'id=eq.1' }, (payload) => {
        if (payload.new && payload.new.rev > rev) refreshFromServer(payload.new.updated_by);
      })
      .subscribe();
  }

  function actorLabel() { return me.name && me.name !== me.email ? `${me.name}` : me.email || 'This browser'; }

  async function logAct(action, detail = '') {
    const entry = { created_at: new Date().toISOString(), user_email: me.email || 'local', user_name: me.name || '', action, detail: String(detail).slice(0, 1000) };
    activity.unshift(entry);
    if (CLOUD) {
      if (!user) return;
      try {
        const { error } = await sb.from('activity_log').insert({ user_email: entry.user_email, user_name: entry.user_name, action, detail: entry.detail });
        if (error) throw error;
      } catch (error) { console.warn('Activity log entry not saved', error); }
    } else {
      try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity.slice(0, 3000))); } catch (error) { /* storage full */ }
    }
    if (currentView === 'activity') renderActivity();
    if (currentView === 'dashboard') renderRecent();
  }

  async function loadActivity() {
    if (CLOUD) {
      if (!user) return;
      const { data, error } = await sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(2000);
      if (error) { $('activityRows').innerHTML = `<tr><td colspan="4" class="empty"><strong>The activity log could not load</strong>${escapeHtml(error.message)}</td></tr>`; return; }
      activity = data;
    } else {
      try { activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]'); } catch (error) { activity = []; }
    }
    activityLoaded = true;
    renderActivity();
    renderRecent();
  }

  function whenText(time, short) {
    const d = new Date(time);
    return short
      ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
      : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function personLabel(row) { return row.user_name || (row.user_email === 'local' ? 'This browser' : row.user_email); }

  function actionTone(action) {
    if (/deleted|removed|restored/i.test(action)) return 'b-bad';
    if (/added|uploaded|imported|signed in/i.test(action)) return 'b-ok';
    if (/changed|updated|role|access/i.test(action)) return 'b-accent';
    return '';
  }

  function filteredActivity() {
    const q = $('actSearch').value.trim().toLocaleLowerCase();
    const who = $('actUser').value;
    const act = $('actAction').value;
    const from = $('actFrom').value ? new Date(`${$('actFrom').value}T00:00:00`) : null;
    const to = $('actTo').value ? new Date(`${$('actTo').value}T23:59:59`) : null;
    return activity.filter((row) => {
      const t = new Date(row.created_at);
      return (!who || row.user_email === who) && (!act || row.action === act)
        && (!from || t >= from) && (!to || t <= to)
        && (!q || `${row.detail} ${row.action} ${personLabel(row)}`.toLocaleLowerCase().includes(q));
    });
  }

  function renderActivity() {
    const people = new Map();
    activity.forEach((row) => { if (!people.has(row.user_email)) people.set(row.user_email, personLabel(row)); });
    fillSelect('actUser', [...people.entries()].map(([value, label]) => ({ value, label })), 'All users');
    fillSelect('actAction', [...new Set(activity.map((row) => row.action))].sort().map((value) => ({ value, label: value })), 'All actions');
    const rows = filteredActivity();
    $('actCount').textContent = `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`;
    if (!rows.length) {
      $('activityRows').innerHTML = `<tr><td colspan="4" class="empty"><strong>${activity.length ? 'No entries match these filters' : 'No activity yet'}</strong>${activity.length ? 'Change or clear the filters.' : 'Changes made by anyone on the team will be listed here.'}</td></tr>`;
      return;
    }
    $('activityRows').innerHTML = rows.slice(0, 1000).map((row) => `<tr>
      <td style="white-space:nowrap" class="muted">${escapeHtml(whenText(row.created_at))}</td>
      <td><div class="who">${avatarHtml(personLabel(row), 'sm')}<div><p class="who-name">${escapeHtml(personLabel(row))}</p>${row.user_name && row.user_email !== 'local' ? `<p class="who-sub">${escapeHtml(row.user_email)}</p>` : ''}</div></div></td>
      <td><span class="badge ${actionTone(row.action)}">${escapeHtml(row.action)}</span></td>
      <td class="wrap">${escapeHtml(row.detail)}</td></tr>`).join('');
  }

  /* ---------- styled Excel output (xlsx-js-style; plain SheetJS ignores the styles) ---------- */
  const XL = {
    brand: '3366FF', ink: '0B1437', head: '1E3A8A', line: 'D6DCE8', zebra: 'F6F8FC', muted: '64748B',
    heat: { 1: ['FDE4E4', '9F1239'], 2: ['FDEBD6', '9A3412'], 3: ['FBF3CF', '854D0E'], 4: ['DCF2E3', '166534'], 5: ['BFE8CF', '14532D'] },
    group: ['3366FF', 'EB6834', '1BAF7A', '1E3A8A', '475569', '64748B']
  };
  const xlBorder = () => { const side = { style: 'thin', color: { rgb: XL.line } }; return { top: side, bottom: side, left: side, right: side }; };
  function xlDate() { return new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  /* columns: [{ h, w, kind: 'text'|'wrap'|'num'|'dec'|'pct'|'rating'|'date', group }] ; rows: arrays of values */
  function buildSheet({ title, subtitle, columns, rows, groups, legend }) {
    const XU = XLSX.utils;
    const aoa = [[title], [subtitle || `Exported ${xlDate()} by ${me.name || me.email || 'Akumen Talent'}`], []];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(columns.length - 1, 0) } }, { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(columns.length - 1, 0) } }];
    let headRow = 3;
    if (groups) {
      const row = new Array(columns.length).fill('');
      groups.forEach((g) => { row[g.from] = g.name; if (g.to > g.from) merges.push({ s: { r: 3, c: g.from }, e: { r: 3, c: g.to } }); });
      aoa.push(row);
      headRow = 4;
    }
    aoa.push(columns.map((c) => c.h));
    rows.forEach((r) => aoa.push(r.map((v) => (v === null || v === undefined ? '' : v))));
    const dataEnd = aoa.length - 1;
    if (legend) { aoa.push([]); aoa.push([legend]); merges.push({ s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: Math.max(columns.length - 1, 0) } }); }
    const ws = XU.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = columns.map((c) => ({ wch: c.w || 14 }));
    ws['!rows'] = aoa.map((_, r) => (r === 0 ? { hpt: 26 } : r === headRow ? { hpt: 42 } : r > headRow && r <= dataEnd ? { hpt: 20 } : { hpt: 18 }));
    if (rows.length) ws['!autofilter'] = { ref: XU.encode_range({ s: { r: headRow, c: 0 }, e: { r: dataEnd, c: columns.length - 1 } }) };
    const put = (r, c, style) => { const ref = XU.encode_cell({ r, c }); if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].s = style; return ws[ref]; };
    put(0, 0, { font: { bold: true, sz: 16, color: { rgb: XL.ink } }, alignment: { vertical: 'center' } });
    put(1, 0, { font: { italic: true, sz: 10, color: { rgb: XL.muted } } });
    if (groups) {
      groups.forEach((g, i) => {
        for (let c = g.from; c <= g.to; c += 1) {
          put(3, c, { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: g.color || XL.group[i % XL.group.length] } }, alignment: { horizontal: 'center', vertical: 'center' }, border: xlBorder() });
        }
      });
    }
    columns.forEach((col, c) => {
      put(headRow, c, { font: { bold: true, sz: 10.5, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: XL.head } }, alignment: { horizontal: col.kind === 'text' || col.kind === 'wrap' ? 'left' : 'center', vertical: 'center', wrapText: true }, border: xlBorder() });
      for (let r = headRow + 1; r <= dataEnd; r += 1) {
        const zebra = (r - headRow) % 2 === 0;
        const cell = put(r, c, {});
        const style = { font: { sz: 10.5, color: { rgb: '1F2937' } }, border: xlBorder(), alignment: { vertical: 'center', horizontal: 'center' } };
        if (zebra) style.fill = { patternType: 'solid', fgColor: { rgb: XL.zebra } };
        if (col.kind === 'text') style.alignment.horizontal = 'left';
        if (col.kind === 'wrap') { style.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }; }
        if (col.bold) style.font.bold = true;
        if (cell.t === 'n') {
          if (col.kind === 'dec') cell.z = '0.0';
          if (col.kind === 'avg') cell.z = '0.00';
          if (col.kind === 'pct') cell.z = '0"%"';
          if (col.kind === 'rating' && XL.heat[cell.v]) {
            style.fill = { patternType: 'solid', fgColor: { rgb: XL.heat[cell.v][0] } };
            style.font = { sz: 10.5, bold: true, color: { rgb: XL.heat[cell.v][1] } };
          }
        }
        cell.s = style;
      }
    });
    if (legend) put(aoa.length - 1, 0, { font: { sz: 9.5, italic: true, color: { rgb: XL.muted } }, alignment: { wrapText: true } });
    return ws;
  }

  function writeBook(sheets, filename) {
    const wb = XLSX.utils.book_new();
    wb.Props = { Title: 'Akumen Talent', Author: me.name || 'Akumen Talent', Company: 'Akumen' };
    sheets.forEach(([name, ws]) => XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)));
    XLSX.writeFile(wb, filename, { cellStyles: true });
  }
  const RATING_LEGEND = 'Ratings: 1 Beginning · 2 Developing · 3 Competent · 4 Proficient · 5 Advanced. Exams are out of 100. Overall % = average of (rubric average ÷ 5 × 100) and exam average, unless the workbook supplied an overall score.';

  function renderRecent() {
    if (!$('recentActivity')) return;
    const rows = activity.slice(0, 8);
    $('recentActivity').innerHTML = rows.length ? `<ul class="feed">${rows.map((row) => `<li>${avatarHtml(personLabel(row), 'sm')}<div class="feed-main"><p><strong>${escapeHtml(personLabel(row))}</strong> · ${escapeHtml(row.action.toLocaleLowerCase())}</p><p class="feed-detail">${escapeHtml(row.detail)}</p></div><span class="feed-when">${escapeHtml(whenText(row.created_at, true))}</span></li>`).join('')}</ul>`
      : '<p class="muted">No activity yet. Changes by anyone on the team appear here.</p>';
  }

  function exportActivity() {
    const rows = filteredActivity();
    const aoa = [['When', 'User', 'Email', 'Action', 'Details'], ...rows.map((row) => [whenText(row.created_at), personLabel(row), row.user_email, row.action, row.detail])];
    const name = `akumen-activity-log-${new Date().toISOString().slice(0, 10)}`;
    if (window.XLSX) {
      const ws = buildSheet({
        title: 'Akumen Talent · Activity log',
        columns: [{ h: 'When', w: 22, kind: 'text' }, { h: 'User', w: 24, kind: 'text', bold: true }, { h: 'Email', w: 30, kind: 'text' }, { h: 'Action', w: 24, kind: 'text' }, { h: 'Details', w: 80, kind: 'wrap' }],
        rows: aoa.slice(1)
      });
      writeBook([['Activity', ws]], `${name}.xlsx`);
    } else {
      download(`${name}.csv`, `﻿${aoa.map((r) => r.map(csvCell).join(',')).join('\r\n')}`, 'text/csv;charset=utf-8');
    }
    showToast('Activity log exported.');
  }

  /* ---------- Sign-in ---------- */
  let authMode = 'login';

  function paintAuthGrid() {
    const grid = $('authGrid');
    if (!grid || grid.childElementCount) return;
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    let html = '';
    for (let i = 0; i < 26 * 22; i++) {
      const r = rnd();
      html += `<i class="${r < 0.55 ? '' : r < 0.62 ? 'g1' : r < 0.7 ? 'g2' : r < 0.8 ? 'g3' : r < 0.91 ? 'g4' : 'g5'}"></i>`;
    }
    grid.innerHTML = html;
  }

  /* mode: 'login' (sign in), 'setup' (first admin, this browser), 'signup' (create a password, team mode) */
  function renderAuth(mode = authMode, message = '', isError = false) {
    authMode = mode;
    paintAuthGrid();
    showAuth(message, isError);
    const firstRun = !CLOUD && !localUsers().length;
    $('msSignInBtn').disabled = false;
    $('loginForm').classList.toggle('hid', mode !== 'login');
    $('setupForm').classList.toggle('hid', mode === 'login');
    $('rememberRow').classList.toggle('hid', CLOUD);
    $('authSwitchRow').classList.toggle('hid', !CLOUD);
    $('authSwitch').textContent = mode === 'signup' ? 'Already have a password? Sign in' : 'First time here? Create your password';
    $('setupBtn').textContent = mode === 'signup' ? 'Create password' : 'Create admin account';
    $('authOrText').textContent = mode === 'login' ? 'or use email' : mode === 'signup' ? 'or create a password' : 'or create the admin account';
    if (mode === 'setup') {
      $('authTitle').textContent = 'Set up Akumen Talent';
      $('authSub').textContent = MS_LOCAL
        ? 'Nobody has signed in on this computer yet. Sign in with Microsoft, or create an admin account with a password. Either way, you become the admin.'
        : 'Nobody has signed in on this computer yet. Create the admin account; you can add trainers afterwards in Settings.';
    } else if (mode === 'signup') {
      $('authTitle').textContent = 'Create your password';
      $('authSub').textContent = 'Use the email address your admin added to the team.';
    } else {
      $('authTitle').textContent = 'Sign in';
      $('authSub').textContent = 'Use your Microsoft work account or your Akumen email and password.';
    }
    $('authNote').textContent = firstRun
      ? 'Accounts are kept in this browser until your team switches on shared storage (see the README).'
      : 'Only people added to the Akumen team can sign in. Ask an admin for access.';
  }

  function showAuth(message = '', isError = false) {
    $('appView').classList.add('hid');
    $('authView').classList.remove('hid');
    $('authMessage').textContent = message;
    $('authMessage').className = `auth-msg${isError ? ' err' : ''}`;
  }

  async function enterApp(signedIn) {
    const meta = signedIn.user_metadata || {};
    const email = String(signedIn.email || meta.email || meta.preferred_username || '').toLocaleLowerCase();
    const name = meta.full_name || meta.name || meta.custom_claims?.name || email;
    const { data: membership, error } = await sb.rpc('join_team', { display_name: name });
    if (error || !membership || !membership.active) {
      await sb.auth.signOut();
      renderAuth('login', error
        ? `Access could not be checked: ${error.message}. Make sure schema.sql has been run.`
        : !membership || membership.reason !== 'inactive'
          ? `${email || 'This account'} is not on the Akumen team yet. Ask an admin to add you in Settings → Team.`
          : `${email} has been deactivated. Ask an admin to reactivate it.`, true);
      return;
    }
    user = signedIn;
    me = { email, name };
    role = membership.role;
    $('authView').classList.add('hid');
    $('appView').classList.remove('hid');
    showIdentity();
    setStat('Loading…');
    try {
      await pull();
      const tidy = await tidyAndSave('On sign-in');
      if (tidy.merged) showToast(`${tidy.merged} duplicate student record${tidy.merged === 1 ? ' was' : 's were'} merged.`);
    } catch (loadError) {
      setStat('Load failed');
      showToast(`Could not load shared data: ${loadError.message}`, true);
    }
    render();
    subscribe();
    await loadActivity();
    try {
      const how = sessionStorage.getItem('akumen-signing-in');
      if (how) {
        sessionStorage.removeItem('akumen-signing-in');
        logAct('Signed in', `${name} signed in with ${how === 'email' ? 'email and password' : 'Microsoft'}${membership.first ? ' and became the first admin' : ''}`);
      }
    } catch (storageError) { /* ignore */ }
    route();
  }

  function showIdentity() {
    $('meName').textContent = me.name || me.email;
    $('meEmail').textContent = role === 'admin' ? 'Admin' : 'Trainer';
    $('meName').title = me.email || '';
    const avatar = $('meAvatar');
    avatar.textContent = initials(me.name || me.email || 'A');
    avatar.className = `avatar ${avatarColor(me.name || me.email || 'A')}`;
    $('signOutBtn').classList.remove('hid');
    document.querySelectorAll('[data-admin]').forEach((el) => el.classList.toggle('hid', role !== 'admin'));
    $('modeNote').textContent = CLOUD
      ? 'Team mode. Records, resumes and the activity log are stored in your Supabase project and shared with everyone on the team. Changes appear for teammates within a few seconds.'
      : MS_LOCAL
        ? 'Microsoft sign-in, single-browser storage. People sign in with their Microsoft account, but records, resumes and the activity log are stored in this browser on this computer. To share the same data across the team, add your Supabase details to config.js (see the README).'
        : 'Single-browser mode. Records, resumes, accounts and the activity log are stored in this browser on this computer. To sign in with Microsoft, add your Azure details to config.js; to share data across the team, add Supabase (see the README).';
  }

  async function startCloud() {
    if (!window.supabase || !window.supabase.createClient) {
      showAuth('The sign-in service could not load. Check your internet connection and reload the page.', true);
      return;
    }
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error_description');
    const { data } = await sb.auth.getSession();
    sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT' && user) window.location.reload(); });
    if (window.location.search.includes('code=')) history.replaceState(null, '', window.location.pathname + window.location.hash);
    if (data.session) await enterApp(data.session.user);
    else renderAuth('login', oauthError ? `Microsoft sign-in did not complete: ${oauthError}` : '', Boolean(oauthError));
  }

  /* Email and password through Supabase (team mode) */
  async function cloudLogin(event) {
    event.preventDefault();
    const button = $('loginForm').querySelector('button[type=submit]');
    button.disabled = true;
    renderAuth('login', 'Signing in…');
    const { data, error } = await sb.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPassword').value });
    button.disabled = false;
    if (error) {
      renderAuth('login', /invalid login/i.test(error.message) ? 'Email or password is incorrect.'
        : /not confirmed/i.test(error.message) ? 'Confirm your email first: open the link Supabase sent to your inbox, then sign in.' : error.message, true);
      return;
    }
    $('loginPassword').value = '';
    try { sessionStorage.setItem('akumen-signing-in', 'email'); } catch (storageError) { /* ignore */ }
    await enterApp(data.user);
  }

  async function cloudSignup(event) {
    event.preventDefault();
    const name = $('setupName').value.trim();
    const email = $('setupEmail').value.trim().toLocaleLowerCase();
    const password = $('setupPassword').value;
    if (password.length < 8) { renderAuth('signup', 'Use a password of at least 8 characters.', true); return; }
    if (password !== $('setupConfirm').value) { renderAuth('signup', 'The two passwords do not match.', true); return; }
    $('setupBtn').disabled = true;
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin + window.location.pathname.replace(/index\.html$/i, '') } });
    $('setupBtn').disabled = false;
    if (error) { renderAuth('signup', /registered/i.test(error.message) ? 'That email already has a password. Sign in instead, or ask an admin to reset it in Supabase.' : error.message, true); return; }
    $('setupPassword').value = '';
    $('setupConfirm').value = '';
    if (!data.session) { renderAuth('login', `Check ${email} for a confirmation email from Supabase, open the link, then sign in here.`); $('loginEmail').value = email; return; }
    try { sessionStorage.setItem('akumen-signing-in', 'email'); } catch (storageError) { /* ignore */ }
    await enterApp(data.user);
  }

  async function signInWithMicrosoft() {
    $('msSignInBtn').disabled = true;
    $('authMessage').textContent = 'Opening Microsoft sign-in…';
    $('authMessage').className = 'auth-msg';
    try { sessionStorage.setItem('akumen-signing-in', 'microsoft'); } catch (error) { /* ignore */ }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'azure',
      options: { scopes: 'openid profile email offline_access', redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) {
      $('msSignInBtn').disabled = false;
      showAuth(`Microsoft sign-in could not start: ${error.message}`, true);
    }
  }

  /* ---------- Sign-in without Supabase (accounts kept in this browser) ---------- */
  const USERS_KEY = 'akumen-users-v1';
  const SESSION_KEY = 'akumen-session-v1';

  function localUsers() {
    try { const list = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); return Array.isArray(list) ? list : []; } catch (error) { return []; }
  }
  function saveLocalUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

  function sha256Hex(text) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const bytes = new TextEncoder().encode(text);
    const len = bytes.length;
    const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[len] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 4, len * 8);
    view.setUint32(padded.length - 8, Math.floor(len / 0x20000000));
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < padded.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) >>> 0; });
    }
    return h.map((v) => v.toString(16).padStart(8, '0')).join('');
  }

  async function hashPassword(password, salt, algo) {
    if (algo === 'pbkdf2' && globalThis.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150000 }, key, 256);
      return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let out = `${salt}:${password}`;
    for (let i = 0; i < 5000; i++) out = sha256Hex(out + salt);
    return out;
  }

  async function makeCredentials(password) {
    const salt = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const algo = globalThis.crypto && crypto.subtle ? 'pbkdf2' : 'sha256x';
    return { salt, algo, hash: await hashPassword(password, salt, algo) };
  }

  async function checkPassword(account, password) {
    return (await hashPassword(password, account.salt, account.algo)) === account.hash;
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && data.expires > Date.now() ? data : null;
    } catch (error) { return null; }
  }
  function writeSession(email, remember) {
    const data = JSON.stringify({ email, expires: Date.now() + (remember ? 30 : 1) * 86400000 });
    try { (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, data); } catch (error) { /* ignore */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch (error) { /* ignore */ }
  }

  function showLocalAuth(mode, message = '', isError = false) { renderAuth(mode, message, isError); }

  /* ---------- Microsoft sign-in (authorization code + PKCE, no Supabase) ---------- */
  function b64url(bytes) {
    let text = '';
    bytes.forEach((b) => { text += String.fromCharCode(b); });
    return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomToken(size = 32) { return b64url(crypto.getRandomValues(new Uint8Array(size))); }
  function msRedirectUri() { return window.location.origin + window.location.pathname.replace(/index\.html$/i, ''); }
  function msEndpoint(kind) { return `https://login.microsoftonline.com/${encodeURIComponent(MS_TENANT)}/oauth2/v2.0/${kind}`; }

  function decodeJwt(token) {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function showMsAuth(message = '', isError = false) {
    renderAuth(!CLOUD && !localUsers().length ? 'setup' : 'login', message, isError);
  }

  async function msBegin() {
    if (!/^https?:$/.test(window.location.protocol)) {
      showMsAuth('Microsoft sign-in only works when the app is opened from a web address, such as http://localhost:8080 or your GitHub Pages link, not as a file. In VS Code, choose "Open with Microsoft sign-in" before pressing F5.', true);
      return;
    }
    if (!globalThis.crypto || !crypto.subtle) {
      showMsAuth('This browser cannot start a secure sign-in here. Open the app at http://localhost:8080 or over https.', true);
      return;
    }
    $('msSignInBtn').disabled = true;
    $('authMessage').textContent = 'Opening Microsoft sign-in…';
    $('authMessage').className = 'auth-msg';
    const verifier = randomToken(48);
    const state = randomToken(16);
    const nonce = randomToken(16);
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    sessionStorage.setItem('akumen-ms', JSON.stringify({ verifier, state, nonce, back: window.location.hash }));
    const params = new URLSearchParams({
      client_id: MS_CLIENT_ID.trim(), response_type: 'code', redirect_uri: msRedirectUri(), response_mode: 'query',
      scope: 'openid profile email', state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account'
    });
    window.location.assign(`${msEndpoint('authorize')}?${params}`);
  }

  async function msFinish() {
    const query = new URLSearchParams(window.location.search);
    if (!query.has('code') && !query.has('error')) return null;
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('akumen-ms') || 'null'); } catch (error) { saved = null; }
    sessionStorage.removeItem('akumen-ms');
    history.replaceState(null, '', window.location.pathname + ((saved && saved.back) || ''));
    if (query.has('error')) throw new Error((query.get('error_description') || query.get('error')).split(/\r?\n/)[0]);
    if (!saved || saved.state !== query.get('state')) throw new Error('the response did not match this browser. Please try again.');
    const response = await fetch(msEndpoint('token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID.trim(), grant_type: 'authorization_code', code: query.get('code'),
        redirect_uri: msRedirectUri(), code_verifier: saved.verifier, scope: 'openid profile email'
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id_token) {
      throw new Error(data.error_description ? data.error_description.split(/\r?\n/)[0] : 'Microsoft did not return a sign-in token.');
    }
    const claims = decodeJwt(data.id_token);
    if (claims.nonce !== saved.nonce || claims.aud !== MS_CLIENT_ID.trim() || (claims.exp && claims.exp * 1000 < Date.now() - 300000)) {
      throw new Error('the sign-in could not be verified. Please try again.');
    }
    const email = String(claims.email || claims.preferred_username || claims.upn || '').trim().toLocaleLowerCase();
    return { email, name: claims.name || email };
  }

  async function msAdmit(claims) {
    if (!claims.email) { showMsAuth('Your Microsoft account did not share an email address, so it cannot be matched to the team list.', true); return; }
    let users = localUsers();
    let first = false;
    if (!users.length) {
      users = [{ email: claims.email, name: claims.name, role: 'admin', active: true, added_by: 'first sign-in', created_at: new Date().toISOString() }];
      first = true;
    }
    const account = users.find((u) => u.email === claims.email);
    if (!account) { showMsAuth(`${claims.email} is not on the Akumen team yet. Ask an admin to add you in Settings → Team.`, true); return; }
    if (!account.active) { showMsAuth(`${claims.email} has been deactivated. Ask an admin to reactivate it.`, true); return; }
    account.name = claims.name || account.name;
    account.microsoft = true;
    saveLocalUsers(users);
    writeSession(account.email, true);
    await enterLocal(account, first ? 'first-ms' : true);
  }

  async function startMsLocal() {
    try {
      const claims = await msFinish();
      if (claims) { await msAdmit(claims); return; }
    } catch (error) {
      showMsAuth(`Microsoft sign-in did not complete: ${error.message}`, true);
      return;
    }
    const session = readSession();
    const account = session && localUsers().find((u) => u.email === session.email && u.active);
    if (account) { await enterLocal(account, false); return; }
    renderAuth(localUsers().length ? 'login' : 'setup');
  }

  async function startLocal() {
    if (MS_LOCAL) { await startMsLocal(); return; }
    const users = localUsers();
    const session = readSession();
    const account = session && users.find((u) => u.email === session.email && u.active);
    if (account) { await enterLocal(account, false); return; }
    showLocalAuth(users.length ? 'login' : 'setup');
  }

  async function enterLocal(account, fresh) {
    const users = localUsers();
    const stored = users.find((u) => u.email === account.email);
    if (stored) { stored.last_seen = new Date().toISOString(); saveLocalUsers(users); }
    me = { email: account.email, name: account.name || account.email };
    role = account.role;
    $('authView').classList.add('hid');
    $('appView').classList.remove('hid');
    showIdentity();
    await load();
    await loadActivity();
    if (fresh) {
      logAct('Signed in', `${me.name} signed in${MS_LOCAL ? ' with Microsoft' : ''}${fresh === 'setup' ? ' and created the admin account' : fresh === 'first-ms' ? ' and became the admin' : ''}`);
    }
    route();
  }

  async function localLogin(event) {
    event.preventDefault();
    const email = $('loginEmail').value.trim().toLocaleLowerCase();
    const password = $('loginPassword').value;
    const account = localUsers().find((u) => u.email === email);
    if (account && !account.hash) { renderAuth('login', `${email} signs in with Microsoft. Use the Microsoft button above.`, true); return; }
    const button = $('loginForm').querySelector('button[type=submit]');
    button.disabled = true;
    $('authMessage').textContent = 'Signing in…';
    $('authMessage').className = 'auth-msg';
    const ok = account && await checkPassword(account, password);
    button.disabled = false;
    if (!ok) { showLocalAuth('login', 'Email or password is incorrect.', true); $('loginEmail').value = email; return; }
    if (!account.active) { showLocalAuth('login', 'This account has been deactivated. Ask an admin to reactivate it.', true); return; }
    $('loginPassword').value = '';
    writeSession(account.email, $('loginRemember').checked);
    await enterLocal(account, true);
  }

  async function localSetup(event) {
    event.preventDefault();
    if (localUsers().length) { showLocalAuth('login', 'An admin account already exists. Sign in instead.', true); return; }
    const name = $('setupName').value.trim();
    const email = $('setupEmail').value.trim().toLocaleLowerCase();
    const password = $('setupPassword').value;
    if (password.length < 8) { showLocalAuth('setup', 'Use a password of at least 8 characters.', true); return; }
    if (password !== $('setupConfirm').value) { showLocalAuth('setup', 'The two passwords do not match.', true); return; }
    const account = { email, name, role: 'admin', active: true, added_by: 'first sign-in', created_at: new Date().toISOString(), ...(await makeCredentials(password)) };
    saveLocalUsers([account]);
    $('setupPassword').value = '';
    $('setupConfirm').value = '';
    writeSession(email, false);
    await enterLocal(account, 'setup');
  }

  async function resetLocalPassword(email) {
    const self = email === me.email;
    const password = window.prompt(`${self ? 'New password for your account' : `New password for ${email}`} (at least 8 characters):`);
    if (password === null) return;
    if (password.length < 8) { showToast('Passwords need at least 8 characters.', true); return; }
    const users = localUsers();
    const account = users.find((u) => u.email === email);
    if (!account) return;
    Object.assign(account, await makeCredentials(password));
    saveLocalUsers(users);
    showToast(self ? 'Your password has been changed.' : `Password reset for ${email}. Share it with them privately.`);
    logAct('Team access changed', self ? `${me.name} changed their password` : `Password reset for ${email}`);
  }

  /* ---------- Team members (Settings) ---------- */
  async function loadTeam() {
    $('teamName').classList.remove('hid');
    $('teamPassword').classList.toggle('hid', CLOUD);
    $('teamPassword').required = !CLOUD && !MS_LOCAL;
    $('teamPassword').placeholder = MS_LOCAL ? 'Password (optional, for email sign-in)' : 'Temporary password (8+ characters)';
    if (MS_LOCAL) {
      $('teamNote').textContent = role === 'admin'
        ? 'Only people listed here can sign in with their Microsoft account. Add their work email exactly as they use it with Microsoft. Admins can delete students, import data and manage the team. This list is kept in this browser.'
        : 'Only people listed here can sign in with Microsoft. Ask an admin to add or change members.';
      $('teamForm').classList.toggle('hid', role !== 'admin');
      team = localUsers();
      renderTeam();
      return;
    }
    if (!CLOUD) {
      $('teamNote').textContent = role === 'admin'
        ? 'People listed here sign in with their email and password. Admins can delete students, import data and manage the team. Accounts are kept in this browser, so each computer has its own list.'
        : 'People listed here sign in with their email and password. Ask an admin to add or change members.';
      $('teamForm').classList.toggle('hid', role !== 'admin');
      team = localUsers();
      renderTeam();
      return;
    }
    $('teamNote').textContent = role === 'admin'
      ? 'Only people listed here can sign in with Microsoft. Admins can delete students, import data and manage the team.'
      : 'Only people listed here can sign in. Ask an admin to add or change members.';
    $('teamForm').classList.toggle('hid', role !== 'admin');
    const { data, error } = await sb.from('team_members').select('*').order('created_at', { ascending: true });
    if (error) { $('teamList').innerHTML = `<p class="err">Could not load the team: ${escapeHtml(error.message)}</p>`; return; }
    team = data;
    renderTeam();
  }

  function renderTeam() {
    const admin = role === 'admin';
    const passwords = !CLOUD;
    $('teamList').innerHTML = `<div class="table-card"><table class="data team-table"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Last sign-in</th><th class="act"><span class="sr">Actions</span></th></tr></thead><tbody>${team.map((m) => {
      const self = m.email === me.email;
      return `<tr><td><div class="who">${avatarHtml(m.name || m.email, 'sm')}<div><p class="who-name">${escapeHtml(m.name || m.email)}${self ? ' <span class="muted">(you)</span>' : ''}</p><p class="who-sub">${m.name ? escapeHtml(m.email) : 'Has not signed in yet'}</p></div></div></td>
        <td>${admin && !self ? `<select data-team-role="${escapeHtml(m.email)}" aria-label="Role for ${escapeHtml(m.email)}" style="width:auto"><option value="trainer" ${m.role === 'trainer' ? 'selected' : ''}>Trainer</option><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option></select>` : `<span class="badge plain">${m.role === 'admin' ? 'Admin' : 'Trainer'}</span>`}</td>
        <td>${admin && !self ? `<label class="check"><input type="checkbox" data-team-active="${escapeHtml(m.email)}" ${m.active ? 'checked' : ''}> ${m.active ? 'Active' : 'Deactivated'}</label>` : `<span class="badge ${m.active ? 'b-ok' : 'b-bad'}">${m.active ? 'Active' : 'Deactivated'}</span>`}</td>
        <td class="muted">${m.last_seen ? escapeHtml(whenText(m.last_seen)) : 'Not yet'}</td>
        <td class="act"><span class="row-actions">${passwords && (self || admin) ? `<button type="button" class="btn btn-sm" data-team-reset="${escapeHtml(m.email)}">${self ? 'Change password' : m.hash ? 'Reset password' : 'Set password'}</button>` : ''}${admin && !self ? `<button type="button" class="btn btn-sm btn-danger-ghost" data-team-remove="${escapeHtml(m.email)}"><svg class="ico"><use href="#i-trash"/></svg>Remove</button>` : ''}</span></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function removeMember(email) {
    const member = team.find((m) => m.email === email);
    const label = member?.name ? `${member.name} (${email})` : email;
    if (email === me.email || role !== 'admin') return;
    if (!window.confirm(`Remove ${label} from the team? They will no longer be able to sign in. Their past entries in the activity log are kept.`)) return;
    if (CLOUD) {
      const { error } = await sb.from('team_members').delete().eq('email', email);
      if (error) { showToast(`Could not remove ${email}: ${error.message}`, true); return; }
    } else {
      saveLocalUsers(localUsers().filter((u) => u.email !== email));
    }
    showToast(`${member?.name || email} removed from the team.`);
    logAct('Team member removed', `${label}, ${member?.role === 'admin' ? 'Admin' : 'Trainer'}`);
    await loadTeam();
  }

  async function updateMember(email, changes, description) {
    if (!CLOUD) {
      const users = localUsers();
      const account = users.find((u) => u.email === email);
      if (account) Object.assign(account, changes);
      saveLocalUsers(users);
      showToast('Team updated.');
      logAct('Team access changed', description);
      await loadTeam();
      return;
    }
    const { error } = await sb.from('team_members').update(changes).eq('email', email);
    if (error) { showToast(`Could not update ${email}: ${error.message}`, true); await loadTeam(); return; }
    showToast('Team updated.');
    logAct('Team access changed', description);
    await loadTeam();
  }

  async function load() {
    try {
      (await idb.all()).forEach((record) => resumes.set(record.key, record));
    } catch (error) {
      showToast(`Resume storage is unavailable in this browser: ${error.message}`, true);
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error('Saved data is not a student list.');
        students = parsed.map(normalizeStudent);
      }
    } catch (error) {
      students = [];
      setStat('Saved data could not be read');
      showToast(`Could not load saved student data: ${error.message}`, true);
    }
    const tidy = await tidyAndSave('On load');
    if (tidy.merged) showToast(`${tidy.merged} duplicate student record${tidy.merged === 1 ? ' was' : 's were'} merged.`);
    render();
  }

  function normalizeStudent(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Backup contains an invalid student record.');
    }
    const normalized = {
      id: String(value.id || makeId()),
      name: cleanName(value.name),
      course: String(value.course || '').trim(),
      batch: canonicalBatch(value.batch),
      evaluator: String(value.evaluator || ''),
      exam: value.exam === '' || value.exam === null || value.exam === undefined ? null : Number(value.exam),
      exam1: null,
      exam2: null,
      exam3: null,
      overallScore: value.overallScore === '' || value.overallScore === null || value.overallScore === undefined ? null : Number(value.overallScore),
      employmentStatus: String(value.employmentStatus || ''),
      notes: String(value.notes || ''),
      updatedAt: value.updatedAt || new Date().toISOString()
    };
    for (const examField of examFields) {
      const exam = value[examField] === '' || value[examField] === null || value[examField] === undefined
        ? null : Number(value[examField]);
      if (exam !== null && (!Number.isFinite(exam) || exam < 0 || exam > 100)) {
        throw new Error(`Invalid ${examField} score for ${normalized.name || 'student'}.`);
      }
      normalized[examField] = exam;
    }
    for (const field of fields) {
      const legacyScore = field === 'languageProficiency' ? value.communication
        : field === 'technicalKnowledge' ? value.technical
          : field === 'teamworkCollaboration' ? value.teamwork : undefined;
      const rawScore = value[field] ?? legacyScore;
      const score = rawScore === '' || rawScore === null || rawScore === undefined ? null : Number(rawScore);
      if (score !== null && (!Number.isInteger(score) || score < 1 || score > 5)) {
        throw new Error(`Invalid ${field} rating in backup.`);
      }
      normalized[field] = score;
    }
    if (normalized.exam === null) {
      normalized.exam = examAverage(examFields.map((field) => normalized[field]));
    }
    if (!normalized.name) throw new Error('Every student record must have a name.');
    if (normalized.exam !== null && (!Number.isFinite(normalized.exam) || normalized.exam < 0 || normalized.exam > 100)) {
      throw new Error(`Invalid exam score for ${normalized.name}.`);
    }
    if (normalized.overallScore !== null && (!Number.isFinite(normalized.overallScore) || normalized.overallScore < 0 || normalized.overallScore > 100)) {
      throw new Error(`Invalid overall score for ${normalized.name}.`);
    }
    return normalized;
  }

  function normalizeHeader(value) {
    return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function findValue(row, headers) {
    const wanted = new Set(headers.map(normalizeHeader));
    for (const [key, value] of Object.entries(row)) {
      if (wanted.has(normalizeHeader(key)) && value !== null && value !== undefined && String(value).trim() !== '') {
        return value;
      }
    }
    return undefined;
  }

  function workbookCategory(sheetName) {
    const sheet = normalizeHeader(sheetName);
    return categoryColumns.find((category) =>
      category.headers.some((header) => sheet === header || sheet.includes(header))
    )?.name || '';
  }

  function canonicalCategory(value) {
    const normalized = normalizeHeader(value);
    return categoryColumns.find((category) =>
      category.headers.includes(normalized)
    )?.name || String(value).trim();
  }

  function findCategoryValue(row, category) {
    const headers = category.headers.flatMap((header) =>
      [header, `${header} score`, `${header} marks`, `${header} exam score`]
    );
    return findValue(row, headers);
  }

  function normalizeScore(value, label, min, max) {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const text = String(value).trim();
    if (/^#(?:REF|VALUE|N\/A|DIV\/0|NAME|NUM|NULL)!?$/i.test(text) || text.includes('\uFFFD')) return null;
    const number = Number(text.replace(/%$/, ''));
    if (!Number.isFinite(number) || number < min || number > max) {
      throw new Error(`${label} must be a number from ${min} to ${max}; received "${text}".`);
    }
    if (min === 1 && !Number.isInteger(number)) {
      throw new Error(`${label} must be a whole number from 1 to 5; received "${text}".`);
    }
    return number;
  }

  /* A merged cell (e.g. one Batch cell spanning 13 students) only stores its value in the top-left
     cell. Copy it into every cell of the range so each student row gets the value. */
  function fillMergedCells(sheet) {
    for (const range of sheet['!merges'] || []) {
      const origin = sheet[XLSX.utils.encode_cell(range.s)];
      if (!origin || origin.v === undefined || origin.v === null || String(origin.v).trim() === '') continue;
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          if (r === range.s.r && c === range.s.c) continue;
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!sheet[ref] || sheet[ref].v === undefined || String(sheet[ref].v).trim() === '') {
            sheet[ref] = { ...origin };
          }
        }
      }
    }
  }

  /* Exam average: a mark of 0 means "not taken yet" (the tracker workbook enters 0 for exams that
     have not happened), so zeros and blanks are left out. Null when no exam has been taken. */
  function examAverage(exams) {
    const taken = exams.filter((score) => score !== null && score !== undefined && Number(score) > 0);
    return taken.length ? taken.reduce((sum, score) => sum + Number(score), 0) / taken.length : null;
  }

  function recordsFromWorkbook(workbook) {
    const imported = [];
    const problems = [];
    const skippedSheets = [];
    let skipped = 0;
    const nameHeaders = ['student name', 'student names', 'name of student', 'student full name', 'student', 'full name', 'candidate name', 'candidate', 'learner name', 'participant name', 'name'];
    const courseHeaders = ['course', 'category', 'track', 'stream', 'domain', 'program'];
    const batchHeaders = ['batch', 'cohort', 'class'];
    const evaluatorHeaders = ['evaluator', 'assessor', 'trainer', 'reviewer'];
    const examAliases = [
      ['exam 1', 'exam1', 'exam 1 score', 'exam 1 marks'],
      ['exam 2', 'exam2', 'exam 2 score', 'exam 2 marks'],
      ['exam 3', 'exam3', 'exam 3 score', 'exam 3 marks']
    ];
    const averageExamHeaders = ['exam average', 'exam avg', 'average exam', 'average exam score', 'exam score', 'exam marks', 'assessment score'];
    const rubricAliases = {
      languageProficiency: ['language proficiency'],
      speakingFluency: ['speaking fluency'],
      presentationAbility: ['presentation ability'],
      confidence: ['confidence'],
      listeningSkills: ['listening skills'],
      professionalCommunication: ['professional communication'],
      technicalKnowledge: ['technical knowledge', 'technical skills'],
      analyticalThinking: ['analytical thinking'],
      troubleshootingAbility: ['troubleshooting ability'],
      handsOnLabWork: ['hands on lab work', 'hands-on lab work'],
      projectImplementation: ['project implementation'],
      teamworkCollaboration: ['teamwork collaboration', 'teamwork and collaboration', 'teamwork & collaboration', 'teamwork'],
      learningAttitude: ['learning attitude']
    };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      fillMergedCells(sheet);
      const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
      if (!grid.length) continue;
      if (/^(read ?me|instructions?|guide|how to|summary|change ?log|lists?|notes?)\b/i.test(sheetName.trim())) continue;
      /* The header row is the one with a name column and the most other known headers.
         (Exports have a title and a group row above it, so the first row that mentions "Student" is not always it.) */
      const known = new Set([...courseHeaders, ...batchHeaders, ...evaluatorHeaders, ...examAliases.flat(), ...averageExamHeaders,
        ...Object.values(rubricAliases).flat(), 'comments', 'comment', 'remarks', 'feedback', 'notes', 'employment status', 'overall score', 'overall', 'cumulative score', 'last name', 'surname'].map(normalizeHeader));
      const nameSet = new Set([...nameHeaders, 'first name', 'given name'].map(normalizeHeader));
      let headerIndex = -1;
      let bestScore = 0;
      grid.slice(0, 40).forEach((line, index) => {
        const cells = line.map(normalizeHeader);
        if (!cells.some((h) => nameSet.has(h))) return;
        const score = 1 + new Set(cells.filter((h) => known.has(h))).size;
        if (score > bestScore) { bestScore = score; headerIndex = index; }
      });
      if (headerIndex < 0) {
        skipped += grid.length;
        continue;
      }
      const toHeaders = (line) => line.map((value, index) => {
        const text = String(value ?? '').trim();
        return text || `Column ${index + 1}`;
      });
      const headCells = grid[headerIndex].map(normalizeHeader);
      const scoreHeads = new Set([...examAliases.flat(), ...averageExamHeaders, ...Object.values(rubricAliases).flat()].map(normalizeHeader));
      if (!headCells.some((h) => scoreHeads.has(h))) {
        skippedSheets.push(`${sheetName} (no rubric or exam columns)`);
        continue;
      }
      const hasCourseColumn = headCells.some((h) => courseHeaders.map(normalizeHeader).includes(h)
        || categoryColumns.some((cat) => cat.headers.some((x) => [x, `${x} score`, `${x} marks`].map(normalizeHeader).includes(h))));
      if (!hasCourseColumn && !workbookCategory(sheetName)) {
        skippedSheets.push(`${sheetName} (name the sheet AI, Data or DevOps, or add a Course column)`);
        continue;
      }
      let headers = toHeaders(grid[headerIndex]);
      const sectionLabel = /^(student details?|communication skills|technical skills|soft skills|exams?|scores?|comments?|summary|total|average)$/i;
      for (let lineIndex = headerIndex + 1; lineIndex < grid.length; lineIndex += 1) {
        const line = grid[lineIndex];
        const cells = line.map(normalizeHeader);
        /* A second heading block further down the sheet: switch to its headings and carry on */
        if (cells.some((h) => nameSet.has(h)) && cells.filter((h) => known.has(h)).length >= 2) {
          headers = toHeaders(line);
          continue;
        }
        const row = Object.fromEntries(headers.map((header, index) => [header, line[index] ?? '']));
        const rowNumber = lineIndex + 1;
        try {
        let name = findValue(row, nameHeaders);
        if (name === undefined) {
          const first = findValue(row, ['first name', 'given name']);
          const last = findValue(row, ['last name', 'surname', 'family name']);
          if (first !== undefined || last !== undefined) name = [first, last].filter(Boolean).join(' ');
        }
        if (name !== undefined && (/^ratings:/i.test(String(name).trim()) || String(name).trim().length > 100 || sectionLabel.test(String(name).trim()))) { skipped++; continue; }
        if (name === undefined || !String(name).trim()) {
          if (Object.values(row).some((value) => String(value).trim())) skipped++;
          continue;
        }
        const common = {
          name: String(name).trim(),
          batch: String(findValue(row, batchHeaders) || '').trim(),
          evaluator: String(findValue(row, evaluatorHeaders) || '').trim(),
          notes: String(findValue(row, ['comments', 'comment', 'feedback', 'remarks', 'remarks comments', 'comments remarks', 'trainer comments', 'notes']) || '').trim(),
          employmentStatus: String(findValue(row, ['employment status', 'placement status', 'job status']) || '').trim()
        };
        const categoryValue = findValue(row, courseHeaders) || workbookCategory(sheetName);
        const category = categoryValue ? canonicalCategory(categoryValue) : '';
        const categoryScores = categoryColumns.filter((item) =>
          findCategoryValue(row, item) !== undefined
        );
        const targets = category ? [category] : categoryScores.length
          ? categoryScores.map((item) => item.name)
          : ['AI', 'Data', 'DevOps'];
        if (!targets.length) {
          throw new Error(`Could not find AI, Data, or DevOps for "${common.name}" in the "${sheetName}" sheet. Add a Course/Category column or name the worksheet AI, Data, or DevOps.`);
        }

        for (const target of targets) {
          const exams = examFields.map((examField, index) =>
            normalizeScore(findValue(row, examAliases[index]), `${examField} score for ${common.name}`, 0, 100)
          );
          const reportedExamAverage = normalizeScore(
            findValue(row, averageExamHeaders),
            `Exam average for ${common.name}`,
            0,
            100
          );
          const hasExamColumns = exams.some((score) => score !== null);
          const student = {
            ...common,
            id: makeId(),
            course: target,
            exam: hasExamColumns ? examAverage(exams) : (reportedExamAverage ? reportedExamAverage : null),
            exam1: exams[0],
            exam2: exams[1],
            exam3: exams[2],
            /* "Cumulative Score" in the tracker is the SUM of the 13 ratings (out of 65), not a percentage,
               so it is not used as the overall score. Only an explicit overall/percentage column is. */
            overallScore: normalizeScore(
              findValue(row, ['overall score', 'overall %', 'overall percentage', 'final score %']),
              `Overall score for ${common.name}`,
              0,
              100
            ),
            ...Object.fromEntries(rubricFields.map((field) => [
              field.id,
              normalizeScore(findValue(row, rubricAliases[field.id]), `${field.name} rating for ${common.name}`, 1, 5)
            ])),
            updatedAt: new Date().toISOString()
          };
          imported.push(normalizeStudent(student));
        }
        } catch (error) {
          problems.push(`${sheetName} row ${rowNumber}: ${error.message}`);
        }
      }
    }
    if (!imported.length) {
      throw new Error(`No student rows found. Add a student-name column (for example, Student Name or Name) and at least one row containing a name.${skippedSheets.length ? ` Sheets skipped: ${skippedSheets.join('; ')}.` : ''}`);
    }
    if (!imported.length && problems.length) throw new Error(problems.slice(0, 3).join(' · '));
    return { imported, skipped, problems, skippedSheets };
  }

  async function importExcel(file) {
    try {
      if (!window.XLSX) {
        throw new Error('The Excel reader could not load. Check your internet connection, then reload the page and try again.');
      }
      if (!/\.(xlsx|xls|xlsm|csv)$/i.test(file.name)) {
        throw new Error('Choose an Excel workbook (.xlsx, .xls, .xlsm) or a CSV file.');
      }
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const { imported, skipped, problems, skippedSheets } = recordsFromWorkbook(workbook);
      const previousStudents = students.map((student) => ({ ...student }));
      const preTidy = await tidyStudents();          /* existing data first gets one spelling per batch and no duplicates */
      const blank = (v) => v === null || v === undefined || String(v).trim() === '';
      const sameValue = (a, b) => (blank(a) && blank(b)) || (typeof a === 'number' || typeof b === 'number'
        ? Number(a) === Number(b) : String(a ?? '').trim() === String(b ?? '').trim());
      let added = 0;
      let updated = 0;
      let unchanged = 0;
      const changeNotes = [];
      for (const item of imported) {
        const key = personKey(item);
        const existing = students.find((student) => personKey(student) === key)
          || (item.batch ? students.find((student) => !student.batch && personKey({ ...student, batch: item.batch }) === key) : null);
        if (!existing) {
          students.push(item);
          added++;
          continue;
        }
        const changed = [];
        if (!existing.batch && item.batch) { existing.batch = item.batch; changed.push('batch'); }
        for (const field of ['evaluator', 'notes', 'employmentStatus', ...examFields, ...fields]) {
          if (blank(item[field]) || sameValue(existing[field], item[field])) continue;
          changed.push(field === 'notes' ? 'comments' : field.startsWith('exam') ? `Exam ${field.slice(4)}` : fieldName(field));
          existing[field] = item[field];
        }
        if (!blank(item.overallScore) && !sameValue(existing.overallScore, item.overallScore)) { existing.overallScore = item.overallScore; changed.push('overall score'); }
        if (changed.length) {
          existing.exam = examAverage(examFields.map((field) => existing[field])) ?? existing.exam;
          if (changed.some((c) => c.startsWith('Exam') || rubricFields.some((f) => f.name === c)) && !changed.includes('overall score')) existing.overallScore = blank(item.overallScore) ? null : item.overallScore;
          existing.updatedAt = new Date().toISOString();
          updated++;
          if (changeNotes.length < 40) changeNotes.push(`${existing.name} (${existing.course}${existing.batch ? `, ${existing.batch}` : ''}): ${changed.slice(0, 6).join(', ')}${changed.length > 6 ? '…' : ''}`);
        } else {
          unchanged++;
        }
      }
      if (!added && !updated) {
        students = previousStudents;
        if (preTidy.merged || preTidy.renamed) await tidyAndSave('Before Excel import');
        render();
        const message = `No changes found, so ${file.name} was not imported. All ${unchanged} student row${unchanged === 1 ? ' is' : 's are'} already in the tracker with the same scores and comments.`;
        setImportMessage(message, true);
        showToast(message, true);
        logAct('Excel import skipped', `${file.name}: no new students and no changed values (${unchanged} rows already up to date)`);
        return;
      }
      const tidy = await tidyStudents();
      if (!save()) {
        students = previousStudents;
        render();
        return;
      }
      render();
      const skippedText = skipped ? ` ${skipped} blank or non-student rows skipped.` : '';
      const problemText = problems.length
        ? ` ${problems.length} row${problems.length === 1 ? ' was' : 's were'} not imported because of a value outside the allowed range: ${problems.slice(0, 3).join(' · ')}${problems.length > 3 ? ' …' : ''}`
        : '';
      const sheetText = skippedSheets.length ? ` Sheets not imported: ${skippedSheets.join('; ')}.` : '';
      const merged = tidy.merged + preTidy.merged;
      const dupText2 = merged ? ` ${merged} duplicate${merged === 1 ? '' : 's'} merged.` : '';
      const message = `Import complete: ${Math.max(0, added - tidy.merged)} added, ${updated} updated, ${unchanged} already up to date.${dupText2}${skippedText}${problemText}${sheetText}`;
      setImportMessage(message, Boolean(problems.length));
      showToast(message, Boolean(problems.length));
      logAct('Excel imported', `${file.name}: ${Math.max(0, added - tidy.merged)} added, ${updated} updated, ${unchanged} unchanged${changeNotes.length ? `. Changed: ${changeNotes.join('; ')}` : ''}`);
    } catch (error) {
      const message = `Excel import failed: ${error.message}`;
      setImportMessage(message, true);
      showToast(message, true);
    } finally {
      $('excelInput').value = '';
    }
  }

  function setImportMessage(message, isError = false) {
    const result = $('importResult');
    result.textContent = message;
    result.classList.toggle('is-error', isError);
    result.classList.remove('hid');
  }

  function downloadTemplate() {
    if (!window.XLSX) {
      showToast('The Excel reader could not load. Check your internet connection and reload the page.', true);
      return;
    }
    const columns = [{ h: 'Student Name', w: 26, kind: 'text', bold: true }, { h: 'Batch', w: 16, kind: 'text' }, { h: 'Evaluator', w: 18, kind: 'text' },
      ...rubricFields.map((field) => ({ h: field.name, w: 14.5, kind: 'rating' })),
      { h: 'Exam 1', w: 9, kind: 'dec' }, { h: 'Exam 2', w: 9, kind: 'dec' }, { h: 'Exam 3', w: 9, kind: 'dec' }, { h: 'Exam Avg', w: 10, kind: 'dec' },
      { h: 'Cumulative Score', w: 12, kind: 'num' }, { h: 'Employment Status', w: 18, kind: 'text' }, { h: 'Comments', w: 44, kind: 'wrap' }];
    const groups = [{ name: 'Student', from: 0, to: 2, color: '475569' }];
    let at = 3;
    rubricGroups.forEach((g, i) => { groups.push({ name: g.name, from: at, to: at + g.fields.length - 1, color: XL.group[i] }); at += g.fields.length; });
    groups.push({ name: 'Exams (0–100)', from: at, to: at + 3, color: XL.head }, { name: 'Other', from: at + 4, to: at + 6, color: '64748B' });
    const blank = new Array(columns.length).fill('');
    const guide = buildSheet({
      title: 'How to fill in this workbook', subtitle: 'Akumen Talent assessment template',
      columns: [{ h: 'Column', w: 26, kind: 'text', bold: true }, { h: 'What to enter', w: 90, kind: 'wrap' }],
      rows: [
        ['Sheets', 'One sheet per course (AI, Data, DevOps). Keep the header row as it is; add one row per student.'],
        ['Student Name', 'Full name. A student who appears in more than one course keeps one resume.'],
        ['Batch / Evaluator', 'Optional. Merged cells are fine; the importer copies the value to every row of the merge.'],
        ['Rubric columns', 'Whole numbers 1 to 5: 1 Beginning, 2 Developing, 3 Competent, 4 Proficient, 5 Advanced. Leave blank if not rated.'],
        ['Exam 1–3', 'Scores out of 100. Leave blank (not 0) if the exam was not taken; blanks and zeros are left out of the average.'],
        ['Cumulative Score', 'Optional: sum of the 13 ratings (out of 65). It is not used as a percentage.'],
        ['Comments', 'Trainer comments. They appear in the rubric matrix and on the student page.']
      ]
    });
    writeBook([['Read me', guide], ...categoryColumns.map((category) => [category.name, buildSheet({ title: `Akumen · ${category.name} assessment`, subtitle: 'Fill one row per student. See "Read me" for the rules.', columns, groups, rows: [blank], legend: RATING_LEGEND })])], 'akumen-assessment-template.xlsx');
  }

  function describeChanges(before, after) {
    const labels = { name: 'Name', course: 'Course', batch: 'Batch', evaluator: 'Evaluator', exam1: 'Exam 1', exam2: 'Exam 2', exam3: 'Exam 3', notes: 'Comments' };
    rubricFields.forEach((f) => { labels[f.id] = f.name; });
    const show = (v) => (v === null || v === undefined || v === '' ? '—' : String(v).length > 40 ? `${String(v).slice(0, 40)}…` : v);
    const changes = Object.keys(labels).filter((k) => (before[k] ?? null) !== (after[k] ?? null) && !(before[k] == null && after[k] === ''))
      .map((k) => (k === 'notes' ? 'Comments edited' : `${labels[k]} ${show(before[k])} → ${show(after[k])}`));
    return changes.length ? changes.join('; ') : 'no field changes';
  }

  function makeId() {
    return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /* ---------- one spelling per batch, one record per student + course + batch ---------- */
  function canonicalBatch(value) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    const m = text.match(/^(?:batch|b)\s*[-_#.:]?\s*0*(\d{1,3})\s*[-_]?\s*(.*)$/i) || text.match(/^0*(\d{1,3})()$/);
    if (!m) return text;
    const rest = m[2].trim().replace(/^[-_()\s]+|[)\s]+$/g, '');
    return `Batch ${m[1].padStart(2, '0')}${rest ? ` ${rest.charAt(0).toUpperCase()}${rest.slice(1).toLowerCase()}` : ''}`;
  }
  function cleanName(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
  function personKey(s) { return [cleanName(s.name).toLocaleLowerCase(), cleanName(s.course).toLocaleLowerCase(), canonicalBatch(s.batch).toLocaleLowerCase()].join('|'); }
  function filledCount(s) {
    return fields.filter((f) => s[f] !== null && s[f] !== undefined).length
      + examFields.filter((f) => s[f] !== null && s[f] !== undefined).length + (s.notes ? 1 : 0) + (s.evaluator ? 1 : 0);
  }
  function duplicateOf(candidate) {
    const key = personKey(candidate);
    return students.find((s) => s.id !== candidate.id && personKey(s) === key) || null;
  }

  /* Merges duplicates (same name, course and batch, ignoring spelling such as "Batch 2" / "Batch-02"),
     folds a blank-batch record into the only batched record of the same student and course,
     and rewrites batches to one spelling. Resumes follow their student. Returns what changed. */
  async function tidyStudents() {
    let renamed = 0;
    const moves = [];
    for (const s of students) {
      const before = resumeKey(s);
      const name = cleanName(s.name);
      const batch = canonicalBatch(s.batch);
      if (name !== s.name || batch !== s.batch) {
        s.name = name;
        s.batch = batch;
        renamed++;
        const after = resumeKey(s);
        if (before !== after) moves.push([before, after]);
      }
    }
    const groups = new Map();
    for (const s of students) {
      const k = personKey(s);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(s);
    }
    /* blank batch → the single batched record for the same name + course */
    for (const [k, list] of [...groups]) {
      if (!k.endsWith('|')) continue;
      const targets = [...groups.keys()].filter((other) => other !== k && other.startsWith(k));
      if (targets.length === 1) { groups.get(targets[0]).push(...list); groups.delete(k); }
    }
    let merged = 0;
    const keep = [];
    const removed = new Set();
    for (const list of groups.values()) {
      if (list.length === 1) { keep.push(list[0]); continue; }
      const sorted = [...list].sort((a, b) => filledCount(b) - filledCount(a) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
      const base = sorted[0];
      for (const other of sorted.slice(1)) {
        for (const f of [...fields, ...examFields, 'evaluator', 'employmentStatus', 'notes', 'batch']) {
          if ((base[f] === null || base[f] === undefined || base[f] === '') && other[f] !== null && other[f] !== undefined && other[f] !== '') base[f] = other[f];
        }
        if (base.overallScore === null || base.overallScore === undefined) base.overallScore = other.overallScore ?? null;
        const ok = resumeKey(other);
        if (resumes.has(ok) && !resumes.has(resumeKey(base))) moves.push([ok, resumeKey(base)]);
        removed.add(other.id);
        merged++;
      }
      /* keep the best-written name: one with capitals over an all-lowercase or ALL-CAPS spelling */
      const nameScore = (n) => (n !== n.toLocaleLowerCase() ? 2 : 0) + (n !== n.toLocaleUpperCase() ? 1 : 0);
      base.name = list.map((x) => x.name).sort((x, y) => nameScore(y) - nameScore(x))[0];
      base.exam = examAverage(examFields.map((f) => base[f])) ?? base.exam;
      keep.push(base);
    }
    if (merged) students = students.filter((s) => !removed.has(s.id));
    for (const [from, to] of moves) {
      if (from === to || !resumes.has(from) || resumes.has(to)) continue;
      try {
        await copyResume(from, to);
        if (!keyInUse(from)) await deleteResume(from);
      } catch (error) { /* the record is still fine; the resume stays under its old name */ }
    }
    return { merged, renamed };
  }

  async function tidyAndSave(reason) {
    const { merged, renamed } = await tidyStudents();
    if (merged || renamed) {
      save();
      logAct('Duplicates cleaned', `${reason}: ${merged} duplicate record${merged === 1 ? '' : 's'} merged, ${renamed} name or batch spelling${renamed === 1 ? '' : 's'} made consistent`);
    }
    return { merged, renamed };
  }

  /* ================= Resume storage (IndexedDB) ================= */
  const idb = (() => {
    let opening;
    function open() {
      if (!opening) {
        opening = new Promise((resolve, reject) => {
          if (!window.indexedDB) { reject(new Error('IndexedDB is not supported.')); return; }
          const request = indexedDB.open('akumen-resumes', 1);
          request.onupgradeneeded = () => request.result.createObjectStore('resumes', { keyPath: 'key' });
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
      return opening;
    }
    async function run(mode, action) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('resumes', mode);
        const request = action(tx.objectStore('resumes'));
        tx.oncomplete = () => resolve(request ? request.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Resume storage was interrupted.'));
      });
    }
    return {
      all: () => run('readonly', (store) => store.getAll()),
      put: (record) => run('readwrite', (store) => store.put(record)),
      del: (key) => run('readwrite', (store) => store.delete(key))
    };
  })();

  function resumeKey(student) {
    return [student.name, student.batch].map((part) => String(part || '').trim().toLocaleLowerCase()).join('|');
  }
  function resumeFor(student) { return resumes.get(resumeKey(student)) || null; }
  function keyInUse(key) { return students.some((student) => resumeKey(student) === key); }

  function guessType(name) {
    const ext = String(name).split('.').pop().toLowerCase();
    return ext === 'pdf' ? 'application/pdf'
      : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/plain';
  }

  function safeName(name) {
    return String(name || 'resume').replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80);
  }

  async function storeResume(key, file, text, at) {
    if (CLOUD) {
      const type = file.type || guessType(file.name || '');
      const path = `${makeId()}-${safeName(file.name)}`;
      const { error } = await sb.storage.from('resumes').upload(path, file, { contentType: type, upsert: false });
      if (error) throw error;
      const old = resumes.get(key);
      const record = { key, file: file.name || 'resume', type, size: file.size, at: at || new Date().toISOString(), by: me.name || me.email, text: String(text || '').slice(0, RESUME_TEXT_LIMIT), path };
      resumes.set(key, record);
      if (old && old.path && ![...resumes.values()].some((item) => item.path === old.path)) {
        sb.storage.from('resumes').remove([old.path]).catch(() => {});
      }
      save();
      return record;
    }
    const record = {
      key, file: file.name || 'resume', type: file.type || guessType(file.name || ''), size: file.size,
      at: at || new Date().toISOString(), by: 'This browser', text: String(text || '').slice(0, RESUME_TEXT_LIMIT),
      blob: file instanceof Blob ? file : new Blob([file])
    };
    await idb.put(record);
    resumes.set(key, record);
    return record;
  }

  async function deleteResume(key) {
    if (CLOUD) {
      const old = resumes.get(key);
      resumes.delete(key);
      if (old && old.path && ![...resumes.values()].some((item) => item.path === old.path)) {
        await sb.storage.from('resumes').remove([old.path]);
      }
      save();
      return;
    }
    await idb.del(key);
    resumes.delete(key);
  }

  async function copyResume(fromKey, toKey) {
    const old = resumes.get(fromKey);
    if (!old) return;
    if (CLOUD) { resumes.set(toKey, { ...old, key: toKey }); save(); return; }
    await storeResume(toKey, new File([old.blob], old.file, { type: old.type }), old.text, old.at);
  }

  async function resumeBlob(record) {
    if (record.blob) return record.blob;
    const { data, error } = await sb.storage.from('resumes').download(record.path);
    if (error) throw error;
    return data;
  }

  const scriptLoads = {};
  function loadScript(urls) {
    const id = urls[0];
    if (!scriptLoads[id]) {
      scriptLoads[id] = (async () => {
        for (const url of urls) {
          try {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = url;
              script.onload = resolve;
              script.onerror = () => { script.remove(); reject(new Error(url)); };
              document.head.appendChild(script);
            });
            return url;
          } catch (error) { /* try the next CDN */ }
        }
        delete scriptLoads[id];
        throw new Error('The resume reader could not load. Check your internet connection and try again.');
      })();
    }
    return scriptLoads[id];
  }

  async function extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') return file.text();
    if (ext === 'pdf') {
      const url = await loadScript(PDF_SOURCES.map((source) => source.lib));
      const lib = window.pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = PDF_SOURCES.find((source) => source.lib === url).worker;
      const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = '';
      for (let page = 1; page <= pdf.numPages; page++) {
        const content = await (await pdf.getPage(page)).getTextContent();
        text += content.items.map((item) => item.str).join(' ') + '\n';
      }
      return text;
    }
    if (ext === 'docx') {
      await loadScript(MAMMOTH_SOURCES);
      const result = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value;
    }
    throw new Error(`${file.name}: use a PDF, DOCX or TXT resume.`);
  }

  async function readResume(file) {
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error(`${file.name}: use a PDF, DOCX or TXT resume (old .doc files are not supported).`);
    if (file.size > MAX_RESUME_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
    const text = (await extractText(file)).replace(/\s+/g, ' ').trim();
    return {
      text,
      warning: text.length < 50
        ? `No readable text was found in ${file.name} (it may be a scanned image), so keyword search cannot match it.`
        : ''
    };
  }

  async function viewResume(key) {
    const record = resumes.get(key);
    if (!record) return;
    if (CLOUD) {
      const inline = /pdf|text/.test(record.type);
      const tab = inline ? window.open('', '_blank') : null;
      const { data, error } = await sb.storage.from('resumes')
        .createSignedUrl(record.path, 300, inline ? undefined : { download: record.file });
      if (error) { if (tab) tab.close(); showToast(`Could not open the resume: ${error.message}`, true); return; }
      if (tab) { tab.opener = null; tab.location.href = data.signedUrl; } else window.location.href = data.signedUrl;
      return;
    }
    const url = URL.createObjectURL(record.blob);
    if (/pdf|text/.test(record.type)) {
      window.open(url, '_blank', 'noopener');
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = record.file;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function formatSize(bytes) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function renderResumeField() {
    const id = $('studentId').value;
    const student = id ? students.find((item) => item.id === id) : null;
    const current = student ? resumeFor(student) : null;
    const shared = student ? students.filter((item) => resumeKey(item) === resumeKey(student)).length : 0;
    const box = $('resumeCurrent');
    if (pendingResume && pendingResume.file) {
      box.innerHTML = `<span><strong>${escapeHtml(pendingResume.file.name)}</strong> · ${formatSize(pendingResume.file.size)} · ${pendingResume.text.split(' ').filter(Boolean).length} words read<br><span class="muted">Saved when you save the student.</span></span><button type="button" class="btn btn-sm" id="resumeUndoBtn">Undo</button>`;
    } else if (pendingResume && pendingResume.remove) {
      box.innerHTML = `<span>The resume will be removed when you save the student.</span><button type="button" class="btn btn-sm" id="resumeUndoBtn">Undo</button>`;
    } else if (current) {
      box.innerHTML = `<span><strong>${escapeHtml(current.file)}</strong> · ${formatSize(current.size)} · uploaded ${escapeHtml(new Date(current.at).toLocaleDateString('en-IN'))}${shared > 1 ? `<br><span class="muted">Shared with this student's ${shared} course records in the same batch.</span>` : ''}</span><span class="btns"><button type="button" class="btn btn-sm" id="resumeViewBtn">View</button><button type="button" class="btn btn-sm btn-danger-ghost" id="resumeRemoveBtn">Remove</button></span>`;
    } else {
      box.innerHTML = '<span class="muted">No resume uploaded.</span>';
    }
    $('resumeUndoBtn')?.addEventListener('click', () => { pendingResume = null; $('resumeStatus').textContent = ''; renderResumeField(); });
    $('resumeViewBtn')?.addEventListener('click', () => viewResume(current.key));
    $('resumeRemoveBtn')?.addEventListener('click', () => { pendingResume = { remove: true }; renderResumeField(); });
  }

  async function applyResumeChanges(oldKey, newKey) {
    const shownKey = oldKey || newKey;
    const hadResumeChange = Boolean(pendingResume);
    const removed = Boolean(pendingResume && pendingResume.remove);
    if (pendingResume && pendingResume.remove) {
      if (resumes.has(shownKey)) await deleteResume(shownKey);
    } else if (pendingResume && pendingResume.file) {
      await storeResume(newKey, pendingResume.file, pendingResume.text);
      if (oldKey && oldKey !== newKey && resumes.has(oldKey) && !keyInUse(oldKey)) await deleteResume(oldKey);
    } else if (oldKey && oldKey !== newKey && resumes.has(oldKey) && !resumes.has(newKey)) {
      await copyResume(oldKey, newKey);
      if (!keyInUse(oldKey)) await deleteResume(oldKey);
    }
    if (hadResumeChange) logAct(removed ? 'Resume removed' : 'Resume uploaded', newKey.split('|')[0]);
    pendingResume = null;
  }

  async function bulkUploadResumes(files) {
    const people = new Map();
    students.forEach((student) => { if (!people.has(resumeKey(student))) people.set(resumeKey(student), student); });
    let attached = 0;
    const unmatched = [];
    const ambiguous = [];
    const problems = [];
    setImportMessage(`Reading ${files.length} resume${files.length === 1 ? '' : 's'}…`);
    for (const file of files) {
      const tokens = new Set(normText(file.name.replace(/\.[^.]+$/, '')).trim().split(' ')
        .filter((word) => word && !FILE_NOISE.has(word) && !/^\d+$/.test(word)));
      const nameTokens = (student) => normText(student.name).trim().split(' ').filter(Boolean);
      let hits = [...people.entries()].filter(([, student]) => {
        const words = nameTokens(student);
        return words.length && words.every((word) => tokens.has(word));
      });
      if (hits.length > 1) {
        const exact = hits.filter(([, student]) => nameTokens(student).length === tokens.size);
        if (exact.length) hits = exact;
      }
      if (!hits.length) { unmatched.push(file.name); continue; }
      if (hits.length > 1) { ambiguous.push(file.name); continue; }
      try {
        const { text, warning } = await readResume(file);
        await storeResume(hits[0][0], file, text);
        attached++;
        if (warning) problems.push(warning);
      } catch (error) {
        problems.push(error.message);
      }
    }
    render();
    const parts = [`Resumes attached: ${attached} of ${files.length}.`];
    if (unmatched.length) parts.push(`No matching student name for: ${unmatched.join(', ')}.`);
    if (ambiguous.length) parts.push(`More than one student matches (attach these from Edit): ${ambiguous.join(', ')}.`);
    if (problems.length) parts.push(problems.join(' '));
    setImportMessage(parts.join(' '), attached === 0);
    if (attached) logAct('Resumes uploaded', `${attached} of ${files.length} attached`);
    showToast(parts[0], attached === 0);
  }

  /* ================= Talent search ================= */
  function normText(value) {
    return ` ${String(value || '').toLocaleLowerCase().replace(/[^a-z0-9+#]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  }

  function parseSkills(text) {
    return String(text || '').split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean)
      .map((label) => ({ label, alts: label.split('|').map((alt) => alt.trim()).filter(Boolean) }))
      .filter((skill) => skill.alts.length);
  }

  function findAlt(resumeText, alts) {
    for (const alt of alts) {
      const term = normText(alt).trim();
      if (term && (resumeText.includes(` ${term} `) || resumeText.includes(` ${term}s `))) return alt;
    }
    return null;
  }

  function detectRole(query) {
    const text = normText(query);
    let best = null;
    let bestLength = 0;
    for (const role of roleLibrary) {
      for (const alias of [role.role, ...role.aliases]) {
        const term = normText(alias).trim();
        if (term && text.includes(` ${term} `) && term.length > bestLength) { best = role; bestLength = term.length; }
      }
    }
    return best;
  }

  function skillsFromQuery(query) {
    if (/[,|]/.test(query)) return query;
    return [...new Set(normText(query).trim().split(' ').filter((word) => word.length > 1 && !QUERY_STOPWORDS.has(word)))].join(', ');
  }

  function fieldName(id) { return rubricFields.find((field) => field.id === id)?.name || id; }

  function renderCriteriaChecks() {
    $('criteriaChecks').innerHTML = rubricGroups.map((group) =>
      `<div class="crit-group"><p class="crit-title">${escapeHtml(group.name)}</p>${group.fields.map((field) =>
        `<label class="check"><input type="checkbox" name="crit" value="${field.id}"> ${escapeHtml(field.name)}</label>`
      ).join('')}</div>`
    ).join('');
    setCriteria(DEFAULT_CRITERIA);
  }

  function setCriteria(ids) {
    document.querySelectorAll('#criteriaChecks input[name="crit"]').forEach((box) => { box.checked = ids.includes(box.value); });
  }

  function selectedCriteria() {
    return [...document.querySelectorAll('#criteriaChecks input[name="crit"]:checked')].map((box) => box.value);
  }

  function autofillFromRole(force) {
    const query = $('roleInput').value.trim();
    if (!query) return;
    const current = $('skillsInput').value.trim();
    if (!force && current && current !== lastAutoSkills) return;
    const role = detectRole(query);
    const skills = role ? role.skills.join(', ') : skillsFromQuery(query);
    $('skillsInput').value = skills;
    lastAutoSkills = skills;
    setCriteria(role ? role.rubrics : DEFAULT_CRITERIA);
    $('roleHint').textContent = role
      ? `Using the ${role.role} skill profile and its key rubric criteria. Edit either list if your job needs something different.`
      : 'No saved profile for this role, so each keyword is matched on its own. Add skills or adjust the rubric criteria as needed.';
  }

  function evaluateStudent(student, config) {
    const record = resumeFor(student);
    const text = record && record.text ? normText(record.text) : '';
    const skills = config.skills.map((skill) => ({ ...skill, hit: text ? findAlt(text, skill.alts) : null }));
    const matched = skills.filter((skill) => skill.hit).length;
    const skillPct = config.skills.length ? (matched / config.skills.length) * 100 : 0;
    const criteria = config.criteria.map((id) => ({ id, name: fieldName(id), value: student[id] ?? null }));
    const rated = criteria.filter((item) => item.value !== null);
    const rubricAvg = rated.length ? rated.reduce((sum, item) => sum + item.value, 0) / rated.length : null;
    const rubricPct = rubricAvg === null ? 0 : (rubricAvg / 5) * 100;
    const fit = criteria.length ? Math.round(config.weight * skillPct + (1 - config.weight) * rubricPct) : Math.round(skillPct);
    const reasons = [];
    if (!record) reasons.push('No resume uploaded');
    else if (!text.trim()) reasons.push('Resume has no readable text');
    else if (skillPct < config.minSkill) reasons.push(`Skills ${matched}/${config.skills.length} (needs ${config.minSkill}%)`);
    for (const item of criteria) {
      if (item.value === null) reasons.push(`${item.name} not rated`);
      else if (item.value < config.minRating) reasons.push(`${item.name} ${item.value}/5 (needs ${config.minRating})`);
    }
    let status = 'no';
    if (!reasons.length) status = 'eligible';
    else if (text.trim() && skillPct >= Math.max(0, config.minSkill - 20)
      && criteria.every((item) => item.value !== null && item.value >= config.minRating - 1)) status = 'near';
    return { student, record, skills, matched, skillPct, criteria, rubricAvg, fit, reasons, status };
  }

  const statusRank = { eligible: 0, near: 1, no: 2 };

  function runTalentSearch() {
    if (!$('roleInput').value.trim() && !$('skillsInput').value.trim()) {
      $('talentSummary').textContent = 'Enter a role (for example, Full Stack Developer) or a list of skills.';
      $('talentResults').innerHTML = '';
      return;
    }
    if (!$('skillsInput').value.trim()) autofillFromRole(true);
    const skills = parseSkills($('skillsInput').value);
    if (!skills.length) {
      $('talentSummary').textContent = 'Add at least one skill to match.';
      return;
    }
    talentConfig = {
      role: $('roleInput').value.trim() || 'Custom skills',
      skills,
      criteria: selectedCriteria(),
      minSkill: Number($('minSkill').value),
      minRating: Number($('minRating').value),
      weight: Number($('fitWeight').value)
    };
    const course = $('talentCourse').value;
    const batch = $('talentBatch').value;
    let pool = students.filter((student) => (!course || student.course === course) && (!batch || student.batch === batch));
    let rows = pool.map((student) => evaluateStudent(student, talentConfig));
    const better = (a, b) => statusRank[a.status] - statusRank[b.status] || b.fit - a.fit || a.student.name.localeCompare(b.student.name);
    if ($('dedupe').checked) {
      const best = new Map();
      rows.forEach((row) => {
        const key = resumeKey(row.student);
        if (!best.has(key) || better(row, best.get(key)) < 0) best.set(key, row);
      });
      rows = [...best.values()];
    }
    rows.sort(better);
    const counts = { eligible: rows.filter((r) => r.status === 'eligible').length, near: rows.filter((r) => r.status === 'near').length };
    const withResume = rows.filter((row) => row.record).length;
    const mode = $('showMode').value;
    talentRows = rows.filter((row) => mode === 'all' || row.status === 'eligible' || (mode === 'near' && row.status === 'near'));
    const scope = [course, batch].filter(Boolean).join(' · ');
    $('talentSummary').textContent = `${talentConfig.role}: ${counts.eligible} eligible, ${counts.near} near ${counts.near === 1 ? 'match' : 'matches'} out of ${rows.length} ${$('dedupe').checked ? 'students' : 'records'} checked${scope ? ` (${scope})` : ''}. ${withResume} ${withResume === 1 ? 'has' : 'have'} a resume.`
      + (withResume < rows.length ? ' Students without a resume cannot match on skills.' : '');
    renderTalentResults();
  }

  function renderTalentResults() {
    if (!talentRows.length) {
      $('talentResults').innerHTML = '<div class="panel empty"><strong>No students to show</strong>Lower the minimum skill match or rating, show everyone, or upload more resumes.</div>';
      return;
    }
    const statusBadgeHtml = { eligible: '<span class="badge b-ok">Eligible</span>', near: '<span class="badge b-warn">Near match</span>', no: '<span class="badge">Not eligible</span>' };
    $('talentResults').innerHTML = `<div class="table-card talent-table"><table class="data">
      <thead><tr><th class="num">#</th><th>Student</th><th>Skills found in resume</th><th>Rubric criteria</th><th>Fit score</th><th>Status</th><th class="act"><span class="sr">Resume</span></th></tr></thead>
      <tbody>${talentRows.map((row, index) => `<tr>
        <td class="num muted">${index + 1}</td>
        <td><div class="who">${avatarHtml(row.student.name, 'sm')}<div><p class="who-name">${escapeHtml(row.student.name)}</p><p class="who-sub">${escapeHtml([row.student.course, row.student.batch].filter(Boolean).join(' · ') || '—')}</p></div></div></td>
        <td class="wrap" style="min-width:220px;max-width:300px"><p class="muted" style="margin-bottom:4px"><span class="score" style="color:var(--text)">${row.matched}/${row.skills.length}</span> · ${Math.round(row.skillPct)}%</p>${row.skills.map((skill) => skill.hit
          ? `<span class="chip c-ok" title="Found: ${escapeHtml(skill.hit)}">${escapeHtml(skill.hit)}</span>`
          : `<span class="chip c-miss">${escapeHtml(skill.alts.join(' / '))}</span>`).join('')}</td>
        <td class="wrap" style="min-width:200px;max-width:280px">${row.criteria.length ? `<p class="muted" style="margin-bottom:4px"><span class="score" style="color:var(--text)">${row.rubricAvg === null ? '—' : row.rubricAvg.toFixed(1)}</span> / 5 average</p>${row.criteria.map((item) =>
          `<span class="chip ${item.value === null ? '' : item.value >= talentConfig.minRating ? 'c-ok' : 'c-bad'}">${escapeHtml(item.name)} ${item.value ?? '—'}</span>`).join('')}` : '<span class="muted">No criteria selected</span>'}</td>
        <td><span class="fit"><span class="fit-bar"><span style="width:${row.fit}%"></span></span><span class="score">${row.fit}</span></span></td>
        <td>${statusBadgeHtml[row.status]}${row.reasons.length ? `<p class="reasons">${row.reasons.map(escapeHtml).join('<br>')}</p>` : ''}</td>
        <td class="act">${row.record ? `<button type="button" class="btn btn-sm" data-resume="${escapeHtml(row.record.key)}"><svg class="ico"><use href="#i-eye"/></svg>Resume</button>` : '<span class="muted">No resume</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function exportShortlist() {
    if (!talentRows.length || !talentConfig) { showToast('Run a search first.', true); return; }
    const header = ['Rank', 'Student', 'Course', 'Batch', 'Status', 'Fit score', 'Skill match %', 'Skills found', 'Skills missing',
      ...talentConfig.criteria.map(fieldName), 'Rubric avg (selected)', 'Reasons', 'Resume file'];
    const statusLabel = { eligible: 'Eligible', near: 'Near match', no: 'Not eligible' };
    const lines = talentRows.map((row, index) => [index + 1, row.student.name, row.student.course, row.student.batch, statusLabel[row.status], row.fit,
      Math.round(row.skillPct), row.skills.filter((s) => s.hit).map((s) => s.hit).join('; '), row.skills.filter((s) => !s.hit).map((s) => s.label).join('; '),
      ...row.criteria.map((item) => item.value ?? ''), row.rubricAvg === null ? '' : row.rubricAvg.toFixed(2), row.reasons.join('; '), row.record ? row.record.file : '']);
    const meta = [[`Search: ${talentConfig.role}`], [`Min skill match ${talentConfig.minSkill}% · Min rating ${talentConfig.minRating} · Weight ${Math.round(talentConfig.weight * 100)}% skills / ${Math.round((1 - talentConfig.weight) * 100)}% rubric`], []];
    const slug = normText(talentConfig.role).trim().replace(/ /g, '-').slice(0, 40) || 'search';
    download(`akumen-shortlist-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
      `﻿${[...meta, header, ...lines].map((row) => row.map(csvCell).join(',')).join('\r\n')}`, 'text/csv;charset=utf-8');
    showToast('Shortlist exported.');
    logAct('Shortlist exported', `${talentConfig.role}: ${talentRows.filter((r) => r.status === 'eligible').length} eligible of ${talentRows.length} shown`);
  }

  async function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function showToast(message, isError = false) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.toggle('toast-error', isError);
    toast.classList.add('toast-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast-visible'), 3500);
  }

  /* Ranking: overall score, then rubric average, then exam average, then name */
  function compareRank(a, b) {
    const sa = scoresFor(a);
    const sb2 = scoresFor(b);
    const order = (x, y) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : y - x);
    return order(sa.overall, sb2.overall) || order(sa.rubric, sb2.rubric) || order(sa.exam, sb2.exam) || a.name.localeCompare(b.name);
  }

  function topRanked(list, n) {
    return list.filter((student) => scoresFor(student).overall !== null).sort(compareRank).slice(0, n);
  }

  function filteredStudents() {
    const query = $('searchInput').value.trim().toLocaleLowerCase();
    const course = $('courseFilter').value;
    const batch = $('batchFilter').value;
    const status = $('statusFilter').value;
    const top = Number($('rankFilter').value) || 0;
    const rows = students.filter((student) => {
      const text = [student.name, student.course, student.batch, student.evaluator, resumeFor(student)?.text || ''].join(' ').toLocaleLowerCase();
      return (!query || text.includes(query))
        && (!course || student.course === course)
        && (!batch || student.batch === batch)
        && (!status || statusFor(student) === status);
    });
    return top ? topRanked(rows, top) : rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  function rankBadge(position) {
    return `<span class="rank${position <= 3 ? ` r${position}` : ''}" title="Rank ${position} by overall score">${position}</span>`;
  }

  function fillSelect(id, options, allLabel) {
    const select = $(id);
    const selected = select.value;
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>${options.map((o) =>
      `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}`;
    if (options.some((o) => o.value === selected)) select.value = selected;
  }

  function updateOptions(id, values, label) {
    const unique = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    fillSelect(id, unique.map((value) => ({ value, label: value })), `All ${label}`);
  }

  const groupColor = ['var(--g1)', 'var(--g2)', 'var(--g3)'];
  function renderMetrics() {
    const total = students.length;
    const assessed = students.filter((student) => statusFor(student) === 'assessed').length;
    const attention = students.filter((student) => statusFor(student) === 'attention').length;
    const pending = total - assessed - attention;
    const overall = students.map((student) => scoresFor(student).overall).filter((score) => score !== null);
    const average = overall.length ? Math.round(overall.reduce((sum, score) => sum + score, 0) / overall.length) : null;
    const people = new Set(students.map(resumeKey)).size;
    const withResume = new Set(students.filter((student) => resumeFor(student)).map(resumeKey)).size;
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

    const hour = new Date().getHours();
    const first = String(me.name || '').split(/[\s@]/)[0];
    $('heroGreeting').textContent = `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}${first && first !== 'This' ? `, ${first}` : ''}`;
    $('heroSub').textContent = total
      ? `${people} ${people === 1 ? 'student' : 'students'} across ${new Set(students.map((s) => s.course || 'No course')).size} course${new Set(students.map((s) => s.course || 'No course')).size === 1 ? '' : 's'}. ${attention ? `${attention} record${attention === 1 ? '' : 's'} still need ratings.` : 'Every record with ratings is complete.'}`
      : 'Add students or import your assessment workbook from Settings to get started.';
    const done = pct(assessed, total);
    const circ = 2 * Math.PI * 52;
    $('heroRing').innerHTML = `<svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring-bg"/>${done ? `<circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${(done / 100) * circ} ${circ}" transform="rotate(-90 60 60)"/>` : ''}</svg><div class="ring-label"><strong>${done}%</strong><span>fully assessed</span></div>`;

    const cards = [
      ['i-users', 'Students', people, `${total} assessment record${total === 1 ? '' : 's'}`, null, 'k1'],
      ['i-check', 'Fully assessed', assessed, `${done}% of records`, done, 'k2'],
      ['i-alert', 'Needs attention', attention, 'Partly rated', null, 'k3'],
      ['i-chart', 'Average overall', average === null ? '—' : `${average}%`, `${overall.length} scored`, average, 'k4'],
      ['i-file', 'With a resume', withResume, `of ${people} students`, pct(withResume, people), 'k5']
    ];
    $('metrics').innerHTML = cards.map(([icon, label, value, foot, meter, tone]) => `<article class="kpi ${tone}"><div class="kpi-top"><p class="kpi-label">${label}</p><span class="kpi-ico"><svg class="ico"><use href="#${icon}"/></svg></span></div><p class="kpi-value">${value}</p><p class="kpi-foot">${escapeHtml(foot)}</p>${meter === null ? '' : `<div class="kpi-meter"><span style="width:${meter}%"></span></div>`}</article>`).join('');

    $('criteriaLegend').innerHTML = rubricGroups.map((group, g) => `<span><i style="background:${groupColor[g]}"></i>${escapeHtml(group.name)}</span>`).join('');
    $('criteriaChart').innerHTML = rubricGroups.map((group, g) => `<p class="bar-group">${escapeHtml(group.name)}</p>${group.fields.map((field) => {
      const values = students.map((student) => Number(student[field.id])).filter((v) => v >= 1 && v <= 5);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return `<div class="bar-row" title="${escapeHtml(field.name)}: ${avg === null ? 'not rated' : `${avg.toFixed(2)} / 5 from ${values.length} rating${values.length === 1 ? '' : 's'}`}"><span>${escapeHtml(field.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${avg === null ? 0 : (avg / 5) * 100}%;background:${groupColor[g]}"></div></div><span class="bar-val">${avg === null ? '—' : avg.toFixed(1)}</span></div>`;
    }).join('')}`).join('');

    const top = topRanked(students, 5);
    $('leaderboard').innerHTML = top.length ? top.map((student, index) => {
      const sc = scoresFor(student);
      return `<li data-open-sheet="${escapeHtml(student.id)}" class="clickable" tabindex="0">${rankBadge(index + 1)}${avatarHtml(student.name)}<div class="leader-who"><p class="who-name">${escapeHtml(student.name)}</p><p class="who-sub">${escapeHtml([student.course, student.batch].filter(Boolean).join(' · ') || '—')}</p></div><div class="leader-score"><strong>${sc.overall}%</strong><span>${sc.rubric === null ? '' : `${sc.rubric.toFixed(1)}/5`}</span></div></li>`;
    }).join('') : '<li class="muted leader-empty">Rank appears once students have an overall score.</li>';

    const parts = [['Assessed', assessed, 's-ok'], ['Needs attention', attention, 's-warn'], ['Not assessed', pending, 's-none']];
    $('statusSplit').innerHTML = total ? `<div class="split" role="img" aria-label="${parts.map(([l, n]) => `${l} ${n}`).join(', ')}">${parts.filter(([, n]) => n).map(([l, n, c]) => `<span class="${c}" style="flex:${n}" title="${l}: ${n}"></span>`).join('')}</div><ul class="split-legend">${parts.map(([l, n, c]) => `<li><i class="${c}"></i>${l}<strong>${n}</strong><span>${pct(n, total)}%</span></li>`).join('')}</ul>` : '<p class="muted">No records yet.</p>';

    const courses = [...new Set(students.map((s) => s.course || 'No course'))].sort();
    $('courseBreakdown').innerHTML = courses.length ? courses.map((course) => {
      const list = students.filter((s) => (s.course || 'No course') === course);
      const scores = list.map((s) => scoresFor(s).overall).filter((v) => v !== null);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const ok = list.filter((s) => statusFor(s) === 'assessed').length;
      return `<div class="course-card"><div class="course-top"><strong>${escapeHtml(course)}</strong><span class="course-avg">${avg === null ? '—' : `${avg}%`}</span></div><p class="who-sub">${list.length} record${list.length === 1 ? '' : 's'} · ${ok} assessed</p><div class="kpi-meter"><span style="width:${avg ?? 0}%"></span></div></div>`;
    }).join('') : '<p class="muted">Add students or import an Excel workbook to see a course breakdown.</p>';
  }

  function renderRubricForm() {
    $('rubricFields').innerHTML = rubricGroups.map((group) =>
      `<section class="rubric-group"><h4>${escapeHtml(group.name)}</h4><div class="rubric-inputs">${group.fields.map((field) =>
        `<div><label class="lab" for="rubric-${field.id}">${escapeHtml(field.name)}</label><select id="rubric-${field.id}"><option value="">Not rated</option><option value="1">1 · Beginning</option><option value="2">2 · Developing</option><option value="3">3 · Competent</option><option value="4">4 · Proficient</option><option value="5">5 · Advanced</option></select></div>`
      ).join('')}</div></section>`
    ).join('');
  }

  function statusBadge(student) {
    const status = statusFor(student);
    return status === 'assessed' ? '<span class="badge b-ok">Assessed</span>'
      : status === 'attention' ? '<span class="badge b-warn">Needs attention</span>'
        : '<span class="badge">Not assessed</span>';
  }

  function renderRows() {
    const rows = filteredStudents();
    const top = Number($('rankFilter').value) || 0;
    $('resultCount').textContent = top ? `${rows.length} shown` : `${rows.length} of ${students.length}`;
    if (!rows.length) {
      $('studentRows').innerHTML = `<tr><td colspan="9" class="empty">
        <strong>${students.length ? 'No students match these filters' : 'No students yet'}</strong>
        ${students.length ? (Number($('rankFilter').value) ? 'Top 5 and Top 10 only include students with an overall score. Change or clear the filters.' : 'Change or clear the filters.') : 'Add a student, or import your assessment workbook from Settings.'}
        ${students.length ? '' : '<br><button type="button" class="btn btn-primary" data-open-add>Add student</button>'}
      </td></tr>`;
      return;
    }
    $('studentRows').innerHTML = rows.map((student, index) => {
      const scores = scoresFor(student);
      const resume = resumeFor(student);
      return `<tr class="clickable" data-open="${escapeHtml(student.id)}">
        <td><div class="who">${top ? rankBadge(index + 1) : ''}${avatarHtml(student.name)}<div><p class="who-name">${escapeHtml(student.name)}</p><p class="who-sub">${resume ? 'Resume on file' : 'No resume'}</p></div></div></td>
        <td>${student.course ? `<span class="badge plain">${escapeHtml(student.course)}</span>` : '<span class="muted">—</span>'}</td>
        <td>${escapeHtml(student.batch || '—')}</td>
        <td>${escapeHtml(student.evaluator || '—')}</td>
        <td class="num">${scores.rubric === null ? '—' : `<span class="score">${scores.rubric.toFixed(1)}</span><span class="muted"> / 5</span>`}</td>
        <td class="num">${scores.exam === null ? '—' : `${Math.round(scores.exam)}%`}</td>
        <td class="num">${scores.overall === null ? '—' : `<span class="score">${scores.overall}%</span>`}</td>
        <td>${statusBadge(student)}</td>
        <td class="act"><span class="row-actions">${resume ? `<button type="button" class="icon-btn" data-action="resume" data-id="${escapeHtml(student.id)}" aria-label="View resume" title="View resume"><svg class="ico"><use href="#i-file"/></svg></button>` : ''}<button type="button" class="icon-btn" data-action="edit" data-id="${escapeHtml(student.id)}" aria-label="Edit ${escapeHtml(student.name)}" title="Edit"><svg class="ico"><use href="#i-edit"/></svg></button></span></td>
      </tr>`;
    }).join('');
  }

  /* ---------- student detail sheet ---------- */
  function openSheet(student) {
    sheetStudentId = student.id;
    const scores = scoresFor(student);
    const resume = resumeFor(student);
    $('sheetAvatar').textContent = initials(student.name);
    $('sheetAvatar').className = `avatar lg ${avatarColor(student.name)}`;
    $('sheetName').textContent = student.name;
    $('sheetMeta').textContent = [student.course, student.batch, student.evaluator && `Evaluator: ${student.evaluator}`].filter(Boolean).join(' · ') || 'No course or batch';
    $('sheetBody').innerHTML = `
      <div>${statusBadge(student)}${student.employmentStatus ? ` <span class="badge b-accent">${escapeHtml(student.employmentStatus)}</span>` : ''}</div>
      <div class="stat-row">
        <div class="stat"><p>Rubric avg</p><p>${scores.rubric === null ? '—' : `${scores.rubric.toFixed(1)}<span class="muted"> / 5</span>`}</p></div>
        <div class="stat"><p>Exam avg</p><p>${scores.exam === null ? '—' : `${Math.round(scores.exam)}%`}</p></div>
        <div class="stat"><p>Overall</p><p>${scores.overall === null ? '—' : `${scores.overall}%`}</p></div>
      </div>
      ${rubricGroups.map((group) => `<section class="sheet-sect"><h3>${escapeHtml(group.name)}</h3>${group.fields.map((field) => {
        const v = student[field.id];
        return `<div class="rate"><span>${escapeHtml(field.name)}</span><span class="dots" aria-label="${v ?? 'not rated'} of 5">${[1, 2, 3, 4, 5].map((n) => `<i class="${v !== null && n <= v ? 'on' : ''}"></i>`).join('')}</span><b>${v ?? '—'}</b></div>`;
      }).join('')}</section>`).join('')}
      <section class="sheet-sect"><h3>Exams</h3><div class="stat-row">${examFields.map((f, i) => `<div class="stat"><p>Exam ${i + 1}</p><p>${student[f] ?? '—'}</p></div>`).join('')}</div></section>
      <section class="sheet-sect"><h3>Resume</h3>${resume ? `<div class="resbox"><span><strong>${escapeHtml(resume.file)}</strong><br><span class="muted">${formatSize(resume.size)} · uploaded ${escapeHtml(new Date(resume.at).toLocaleDateString('en-IN'))}${resume.by ? ` by ${escapeHtml(resume.by)}` : ''}</span></span><span class="btns"><button type="button" class="btn btn-sm" data-resume="${escapeHtml(resume.key)}"><svg class="ico"><use href="#i-eye"/></svg>View</button></span></div>` : '<p class="muted">No resume uploaded. Choose Edit student to attach one.</p>'}</section>
      <section class="sheet-sect"><h3>Comments</h3>${student.notes ? `<p class="note">${escapeHtml(student.notes)}</p>` : '<p class="muted">No comments.</p>'}</section>`;
    if (!$('sheet').open) $('sheet').showModal();
  }

  function matrixRows() {
    const q = $('matrixSearch').value.trim().toLocaleLowerCase();
    const course = $('matrixCourse').value;
    const batch = $('matrixBatch').value;
    const value = (s) => {
      const k = matrixSort.key;
      if (k === 'name') return s.name.toLocaleLowerCase();
      const sc = scoresFor(s);
      if (k === 'exam') return sc.exam;
      if (k === 'rubric') return sc.rubric;
      if (k === 'overall') return sc.overall;
      return s[k];
    };
    const top = Number($('matrixRank').value) || 0;
    const pool = students.filter((s) => (!q || s.name.toLocaleLowerCase().includes(q)) && (!course || s.course === course) && (!batch || s.batch === batch));
    return (top ? topRanked(pool, top) : pool)
      .sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        if (va === vb) return a.name.localeCompare(b.name);
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        return (va > vb ? 1 : -1) * matrixSort.dir;
      });
  }

  function heatCell(v) {
    return v === null || v === undefined ? '<span class="heat h0">—</span>' : `<span class="heat h${v}">${v}</span>`;
  }

  function renderMatrix() {
    const rows = matrixRows();
    const groupClass = ['grp-comm', 'grp-tech', 'grp-soft'];
    const arrow = (key) => (matrixSort.key === key ? (matrixSort.dir === 1 ? ' ▲' : ' ▼') : '');
    const sortTh = (key, label, cls = '') => `<th class="${cls}${matrixSort.key === key ? ' sorted' : ''}" data-sort="${key}" scope="col" title="Sort by ${escapeHtml(label)}" aria-sort="${matrixSort.key === key ? (matrixSort.dir === 1 ? 'ascending' : 'descending') : 'none'}">${escapeHtml(label)}${arrow(key)}</th>`;
    const top = Number($('matrixRank').value) || 0;
    const ranks = new Map(top ? topRanked(rows, top).map((s, i) => [s.id, i + 1]) : []);
    $('matrixCount').textContent = top ? `${rows.length} shown` : `${rows.length} of ${students.length}`;
    const head = `<thead><tr><th class="stick" rowspan="2" data-sort="name" scope="col" style="cursor:pointer">Student${arrow('name')}</th>${rubricGroups.map((g, i) => `<th colspan="${g.fields.length}" class="${groupClass[i]} grp-start" scope="colgroup">${escapeHtml(g.name)}</th>`).join('')}<th colspan="3" class="grp-exam grp-start" scope="colgroup">Exams (0–100)</th><th colspan="3" class="grp-sum first-sum" scope="colgroup">Summary</th><th rowspan="2" class="grp-note note-col" scope="col">Comments</th></tr>
      <tr>${rubricGroups.map((g) => g.fields.map((f, i) => sortTh(f.id, f.name, i === 0 ? 'grp-start' : '')).join('')).join('')}${examFields.map((f, i) => sortTh(f, `Exam ${i + 1}`, i === 0 ? 'grp-start' : '')).join('')}${sortTh('exam', 'Exam avg', 'first-sum')}${sortTh('rubric', 'Rubric avg')}${sortTh('overall', 'Overall')}</tr></thead>`;
    const body = rows.length ? rows.map((s) => {
      const sc = scoresFor(s);
      return `<tr><td class="stick"><div class="who" style="min-width:0">${ranks.has(s.id) ? rankBadge(ranks.get(s.id)) : ''}${avatarHtml(s.name, 'sm')}<div><p class="who-name"><a href="#students" data-open-sheet="${escapeHtml(s.id)}">${escapeHtml(s.name)}</a></p><p class="who-sub">${escapeHtml([s.course, s.batch].filter(Boolean).join(' · ') || '—')}</p></div></div></td>${rubricGroups.map((g) => g.fields.map((f, i) =>
        `<td class="${i === 0 ? 'grp-start' : ''}" data-cell="${escapeHtml(s.id)}|${f.id}"><button type="button" class="cell-btn" aria-label="${escapeHtml(s.name)}, ${escapeHtml(f.name)}: ${s[f.id] ?? 'not rated'}. Change score">${heatCell(s[f.id])}</button></td>`).join('')).join('')}
        ${examFields.map((f, i) => `<td class="exam-cell${i === 0 ? ' grp-start' : ''}" data-exam="${escapeHtml(s.id)}|${f}"><button type="button" class="cell-btn" aria-label="${escapeHtml(s.name)}, Exam ${i + 1}: ${s[f] ?? 'no score'}. Change score">${s[f] === null || s[f] === undefined ? '<span class="muted">—</span>' : `<span class="exam-val">${Math.round(s[f] * 10) / 10}</span>`}</button></td>`).join('')}
        <td class="sum num first-sum">${sc.exam === null ? '—' : `${Math.round(sc.exam)}%`}</td><td class="sum num">${sc.rubric === null ? '—' : sc.rubric.toFixed(1)}</td><td class="sum num">${sc.overall === null ? '—' : `${sc.overall}%`}</td>
        <td class="note-col" data-note="${escapeHtml(s.id)}"><button type="button" class="note-btn" aria-label="${s.notes ? 'Edit' : 'Add'} comments for ${escapeHtml(s.name)}" title="${escapeHtml(s.notes || 'Add comments')}">${s.notes ? `<span class="note-text">${escapeHtml(s.notes)}</span>` : '<span class="note-add"><svg class="ico"><use href="#i-comment"/></svg>Add comment</span>'}</button></td></tr>`;
    }).join('') : `<tr><td colspan="24" class="empty" style="text-align:left;padding-left:24px!important"><strong>${students.length ? 'No students match these filters' : 'No students yet'}</strong>${students.length ? 'Change or clear the filters.' : 'Add students or import an Excel workbook to fill the matrix.'}</td></tr>`;
    $('matrixTable').innerHTML = head + `<tbody>${body}</tbody>`;
  }

  function editMatrixCell(td) {
    if (td.querySelector('select')) return;
    const [id, field] = td.dataset.cell.split('|');
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const old = student[field];
    td.innerHTML = `<select class="cell-select" aria-label="${escapeHtml(fieldName(field))} for ${escapeHtml(student.name)}"><option value="">—</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${old === n ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    const select = td.querySelector('select');
    select.focus();
    let done = false;
    const finish = (commit) => {
      if (done) return;
      done = true;
      const value = select.value === '' ? null : Number(select.value);
      if (commit && value !== old) {
        student[field] = value;
        student.overallScore = null;
        student.updatedAt = new Date().toISOString();
        save();
        logAct('Rubric score changed', `${student.name} (${student.course || 'no course'}): ${fieldName(field)} ${old ?? '—'} → ${value ?? '—'}`);
        renderMetrics();
        renderRows();
      }
      renderMatrix();
      if (commit && value !== old) {
        const cell = document.querySelector(`[data-cell="${CSS.escape(`${id}|${field}`)}"]`);
        if (cell) { cell.classList.add('cell-saved'); cell.querySelector('button')?.focus(); }
      }
    };
    select.addEventListener('change', () => finish(true));
    select.addEventListener('blur', () => finish(false));
    select.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
  }

  function refreshAfterEdit(id, attr, key) {
    renderMetrics();
    renderRows();
    renderMatrix();
    const cell = document.querySelector(`[${attr}="${CSS.escape(`${id}${key ? `|${key}` : ''}`)}"]`);
    if (cell) { cell.classList.add('cell-saved'); cell.querySelector('button')?.focus(); }
  }

  function editExamCell(td) {
    if (td.querySelector('input')) return;
    const [id, field] = td.dataset.exam.split('|');
    const student = students.find((s) => s.id === id);
    if (!student) return;
    const label = `Exam ${examFields.indexOf(field) + 1}`;
    const old = student[field] ?? null;
    td.innerHTML = `<input class="cell-input" type="number" min="0" max="100" step="any" inputmode="decimal" value="${old ?? ''}" aria-label="${label} for ${escapeHtml(student.name)}, 0 to 100">`;
    const input = td.querySelector('input');
    input.focus();
    input.select();
    let done = false;
    const finish = (commit) => {
      if (done) return;
      const raw = input.value.trim();
      const value = raw === '' ? null : Number(raw);
      if (commit && value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
        showToast('Exam scores must be between 0 and 100.', true);
        input.focus();
        return;
      }
      done = true;
      if (commit && value !== old) {
        student[field] = value;
        student.exam = examAverage(examFields.map((f) => student[f]));
        student.overallScore = null;
        student.updatedAt = new Date().toISOString();
        save();
        logAct('Exam score changed', `${student.name} (${student.course || 'no course'}): ${label} ${old ?? '—'} → ${value ?? '—'}`);
        refreshAfterEdit(id, 'data-exam', field);
      } else {
        renderMatrix();
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => {
      const v = input.value.trim() === '' ? null : Number(input.value);
      if (v !== null && (!Number.isFinite(v) || v < 0 || v > 100)) { showToast('Exam scores must be between 0 and 100. The change was not saved.', true); done = true; renderMatrix(); return; }
      finish(true);
    });
  }

  let commentStudentId = null;
  function openCommentEditor(id) {
    const student = students.find((s) => s.id === id);
    if (!student) return;
    commentStudentId = id;
    $('commentWho').textContent = [student.name, student.course, student.batch].filter(Boolean).join(' · ');
    $('commentText').value = student.notes || '';
    $('commentDialog').showModal();
    $('commentText').focus();
  }
  function saveComment() {
    const student = students.find((s) => s.id === commentStudentId);
    $('commentDialog').close();
    if (!student) return;
    const value = $('commentText').value.trim();
    if (value === (student.notes || '')) return;
    const had = Boolean(student.notes);
    student.notes = value;
    student.updatedAt = new Date().toISOString();
    save();
    logAct('Comments edited', `${student.name} (${student.course || 'no course'}): comments ${value ? (had ? 'updated' : 'added') : 'cleared'}`);
    refreshAfterEdit(student.id, 'data-note', '');
    if (sheetStudentId === student.id && $('sheet').open) openSheet(student);
  }

  function exportMatrix() {
    if (!window.XLSX) { showToast('The Excel writer could not load. Check your internet connection and reload.', true); return; }
    const rows = matrixRows();
    const r1 = (v, d = 10) => (v === null || v === undefined ? '' : Math.round(v * d) / d);
    const columns = [{ h: 'Student', w: 26, kind: 'text', bold: true }, { h: 'Course', w: 10, kind: 'text' }, { h: 'Batch', w: 16, kind: 'text' }, { h: 'Evaluator', w: 16, kind: 'text' },
      ...rubricFields.map((f) => ({ h: f.name, w: 14.5, kind: 'rating' })),
      { h: 'Exam 1', w: 9, kind: 'dec' }, { h: 'Exam 2', w: 9, kind: 'dec' }, { h: 'Exam 3', w: 9, kind: 'dec' },
      { h: 'Exam avg', w: 10, kind: 'dec', bold: true }, { h: 'Rubric avg (of 5)', w: 11, kind: 'avg', bold: true }, { h: 'Overall %', w: 10, kind: 'pct', bold: true },
      { h: 'Status', w: 15, kind: 'text' }, { h: 'Comments', w: 50, kind: 'wrap' }];
    const groups = [{ name: 'Student', from: 0, to: 3, color: '475569' }];
    let at = 4;
    rubricGroups.forEach((g, i) => { groups.push({ name: g.name, from: at, to: at + g.fields.length - 1, color: XL.group[i] }); at += g.fields.length; });
    groups.push({ name: 'Exams (0–100)', from: at, to: at + 2, color: XL.head }, { name: 'Summary', from: at + 3, to: at + 6, color: '0B1437' }, { name: 'Comments', from: at + 7, to: at + 7, color: '64748B' });
    const data = rows.map((s) => {
      const sc = scoresFor(s);
      const st = statusFor(s);
      return [s.name, s.course, s.batch, s.evaluator, ...fields.map((f) => s[f] ?? ''), ...examFields.map((f) => r1(s[f])),
        r1(sc.exam), r1(sc.rubric, 100), sc.overall ?? '', st === 'assessed' ? 'Assessed' : st === 'attention' ? 'Needs attention' : 'Not assessed', s.notes || ''];
    });
    const filters = [$('matrixCourse').value && `course ${$('matrixCourse').value}`, $('matrixBatch').value && `batch ${$('matrixBatch').value}`, $('matrixRank').value && `top ${$('matrixRank').value}`, $('matrixSearch').value.trim() && `name contains "${$('matrixSearch').value.trim()}"`].filter(Boolean);
    const ws = buildSheet({ title: 'Akumen Talent · Rubric matrix', subtitle: `${rows.length} record${rows.length === 1 ? '' : 's'}${filters.length ? ` · ${filters.join(', ')}` : ''} · exported ${xlDate()} by ${me.name || me.email}`, columns, groups, rows: data, legend: RATING_LEGEND });
    writeBook([['Rubric matrix', ws]], `akumen-rubric-matrix-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Rubric matrix exported.');
  }

  function renderResumes() {
    const people = new Map();
    students.forEach((s) => { if (!people.has(resumeKey(s))) people.set(resumeKey(s), s); });
    const list = [...resumes.values()].filter((r) => people.has(r.key)).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    if (!list.length) {
      $('resumeRows').innerHTML = `<tr><td colspan="7" class="empty"><strong>No resumes yet</strong>Upload resumes in bulk, or attach one from a student's Edit form.<br><button type="button" class="btn btn-primary" data-bulk-resume><svg class="ico"><use href="#i-upload"/></svg>Upload resumes</button></td></tr>`;
      return;
    }
    $('resumeRows').innerHTML = list.map((r) => {
      const s = people.get(r.key);
      const words = String(r.text || '').split(' ').filter(Boolean).length;
      return `<tr><td><div class="who">${avatarHtml(s.name, 'sm')}<div><p class="who-name">${escapeHtml(s.name)}</p><p class="who-sub">${escapeHtml(s.batch || 'No batch')}</p></div></div></td>
        <td>${escapeHtml(r.file)}</td><td class="num">${formatSize(r.size)}</td><td>${escapeHtml(r.by || '—')}</td>
        <td class="muted">${escapeHtml(new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))}</td>
        <td class="num">${words ? words.toLocaleString('en-IN') : '<span class="badge b-warn">No text</span>'}</td>
        <td class="act"><span class="row-actions"><button type="button" class="icon-btn" data-resume="${escapeHtml(r.key)}" aria-label="View resume" title="View"><svg class="ico"><use href="#i-eye"/></svg></button><button type="button" class="icon-btn" data-remove-resume="${escapeHtml(r.key)}" aria-label="Remove resume" title="Remove"><svg class="ico"><use href="#i-trash"/></svg></button></span></td></tr>`;
    }).join('');
  }

  function render() {
    const courses = students.map((student) => student.course);
    const batches = students.map((student) => student.batch);
    ['courseFilter', 'matrixCourse', 'talentCourse'].forEach((id) => updateOptions(id, courses, 'courses'));
    ['batchFilter', 'matrixBatch', 'talentBatch'].forEach((id) => updateOptions(id, batches, 'batches'));
    $('batchList').innerHTML = [...new Set(batches.filter(Boolean))].sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).map((b) => `<option value="${escapeHtml(b)}"></option>`).join('');
    renderMetrics();
    renderRows();
    renderMatrix();
    renderResumes();
    if (sheetStudentId && $('sheet').open) {
      const student = students.find((s) => s.id === sheetStudentId);
      if (student) openSheet(student); else $('sheet').close();
    }
  }

  /* ---------- navigation ---------- */
  function route() {
    const name = window.location.hash.replace('#', '');
    currentView = VIEWS.includes(name) ? name : 'dashboard';
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === currentView));
    document.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === currentView) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${document.querySelector(`[data-nav="${currentView}"]`).textContent.trim()} · Akumen Talent`;
    closeNav();
    if (route.last && route.last !== currentView) $('importResult').classList.add('hid');
    route.last = currentView;
    if (currentView === 'activity' || currentView === 'dashboard') { if (!activityLoaded) loadActivity(); else { renderActivity(); renderRecent(); } }
    if (currentView === 'settings') loadTeam();
    if (currentView === 'matrix') renderMatrix();
    $('appView').querySelector('.main').scrollTop = 0;
    window.scrollTo(0, 0);
  }
  function closeNav() { $('appView').classList.remove('nav-open'); $('scrim').hidden = true; }
  function openNav() { $('appView').classList.add('nav-open'); $('scrim').hidden = false; }

  function applyTheme(theme) {
    if (theme) document.documentElement.dataset.theme = theme; else delete document.documentElement.dataset.theme;
    const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    $('themeIcon').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  }

  function resetForm() {
    form.reset();
    $('studentId').value = '';
    $('dialogTitle').textContent = 'Add student';
    $('saveStudentBtn').textContent = 'Save student';
    $('formError').textContent = '';
    $('resumeStatus').textContent = '';
    $('resumeInput').value = '';
    pendingResume = null;
  }

  function openForm(student) {
    resetForm();
    if (student) {
      $('dialogTitle').textContent = 'Edit student';
      $('saveStudentBtn').textContent = 'Save changes';
      $('studentId').value = student.id;
      $('studentName').value = student.name;
      $('studentCourse').value = student.course;
      $('studentBatch').value = student.batch;
      $('studentEvaluator').value = student.evaluator;
      examFields.forEach((field, index) => {
        $(`studentExam${index + 1}`).value = student[field] ?? '';
      });
      $('studentNotes').value = student.notes;
      for (const field of fields) $(`rubric-${field}`).value = student[field] ?? '';
    }
    renderResumeField();
    if ($('sheet').open) $('sheet').close();
    dialog.showModal();
    $('studentName').focus();
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportStudents() {
    if (!window.XLSX) { exportCsv(); return; }
    const list = filteredStudents();
    const columns = [{ h: 'Student', w: 26, kind: 'text', bold: true }, { h: 'Course', w: 10, kind: 'text' }, { h: 'Batch', w: 16, kind: 'text' }, { h: 'Evaluator', w: 16, kind: 'text' },
      { h: 'Rubric avg (of 5)', w: 11, kind: 'avg', bold: true }, { h: 'Exam avg', w: 10, kind: 'dec', bold: true }, { h: 'Overall %', w: 10, kind: 'pct', bold: true },
      { h: 'Status', w: 15, kind: 'text' }, { h: 'Employment status', w: 18, kind: 'text' }, { h: 'Resume', w: 10, kind: 'text' },
      ...rubricFields.map((f) => ({ h: f.name, w: 14.5, kind: 'rating' })), { h: 'Exam 1', w: 9, kind: 'dec' }, { h: 'Exam 2', w: 9, kind: 'dec' }, { h: 'Exam 3', w: 9, kind: 'dec' },
      { h: 'Comments', w: 50, kind: 'wrap' }];
    const rows = list.map((s) => {
      const sc = scoresFor(s);
      const st = statusFor(s);
      return [s.name, s.course, s.batch, s.evaluator, sc.rubric === null ? '' : Math.round(sc.rubric * 100) / 100, sc.exam === null ? '' : Math.round(sc.exam * 10) / 10, sc.overall ?? '',
        st === 'assessed' ? 'Assessed' : st === 'attention' ? 'Needs attention' : 'Not assessed', s.employmentStatus, resumeFor(s) ? 'Yes' : 'No',
        ...fields.map((f) => s[f] ?? ''), ...examFields.map((f) => (s[f] === null || s[f] === undefined ? '' : Math.round(s[f] * 10) / 10)), s.notes || ''];
    });
    const groups = [{ name: 'Student', from: 0, to: 3, color: '475569' }, { name: 'Summary', from: 4, to: 9, color: '0B1437' }];
    let at = 10;
    rubricGroups.forEach((g, i) => { groups.push({ name: g.name, from: at, to: at + g.fields.length - 1, color: XL.group[i] }); at += g.fields.length; });
    groups.push({ name: 'Exams (0–100)', from: at, to: at + 2, color: XL.head }, { name: 'Comments', from: at + 3, to: at + 3, color: '64748B' });
    const byCourse = [...new Set(students.map((s) => s.course || 'No course'))].sort().map((course) => {
      const items = students.filter((s) => (s.course || 'No course') === course);
      const ov = items.map((s) => scoresFor(s).overall).filter((v) => v !== null);
      return [course, items.length, items.filter((s) => statusFor(s) === 'assessed').length, items.filter((s) => statusFor(s) === 'attention').length, ov.length ? Math.round(ov.reduce((a, b) => a + b, 0) / ov.length) : ''];
    });
    const summary = buildSheet({ title: 'Akumen Talent · Summary by course', columns: [{ h: 'Course', w: 18, kind: 'text', bold: true }, { h: 'Records', w: 10, kind: 'num' }, { h: 'Assessed', w: 10, kind: 'num' }, { h: 'Needs attention', w: 12, kind: 'num' }, { h: 'Average overall %', w: 12, kind: 'pct' }], rows: byCourse });
    writeBook([['Students', buildSheet({ title: 'Akumen Talent · Students', subtitle: `${list.length} of ${students.length} records · exported ${xlDate()} by ${me.name || me.email}`, columns, groups, rows, legend: RATING_LEGEND })], ['Summary', summary]],
      `akumen-students-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Excel file exported.');
    logAct('Exported', `Students workbook (${list.length} records)`);
  }

  function exportCsv() {
    const records = filteredStudents().map((student) => {
      const scores = scoresFor(student);
      return [student.name, student.course, student.batch, student.evaluator, ...fields.map((field) => student[field] ?? ''),
        ...examFields.map((field) => student[field] ?? ''),
        scores.rubric === null ? '' : scores.rubric.toFixed(1), scores.exam ?? '', scores.overall ?? '',
        student.employmentStatus,
        statusFor(student) === 'assessed' ? 'Assessed' : statusFor(student) === 'attention' ? 'Needs attention' : 'Not assessed', student.notes];
    });
    download(`akumen-students-${new Date().toISOString().slice(0, 10)}.csv`,
      `\uFEFF${[[
        'Student', 'Course', 'Batch', 'Evaluator', ...rubricFields.map((field) => field.name),
        'Exam 1', 'Exam 2', 'Exam 3', 'Rubric average', 'Exam average', 'Overall score',
        'Employment status', 'Status', 'Comments'
      ], ...records].map((row) => row.map(csvCell).join(',')).join('\r\n')}`, 'text/csv;charset=utf-8');
    showToast('CSV exported.');
  }

  async function backup() {
    try {
      const resumeList = [];
      for (const record of resumes.values()) {
        resumeList.push({ key: record.key, file: record.file, type: record.type, size: record.size, at: record.at, text: record.text, data: await blobToDataUrl(await resumeBlob(record)) });
      }
      download(`akumen-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify({ format: 'akumen-student-tracker', version: 2, students, resumes: resumeList }, null, 2), 'application/json');
      showToast(`Backup downloaded with ${resumeList.length} resume${resumeList.length === 1 ? '' : 's'}.`);
    } catch (error) {
      showToast(`Backup failed: ${error.message}`, true);
    }
  }

  async function importBackup(file) {
    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      const records = Array.isArray(parsed) ? parsed : parsed && parsed.students;
      if (!Array.isArray(records)) throw new Error('This file does not contain a student backup.');
      const imported = records.map(normalizeStudent);
      if (!window.confirm(`Replace your current ${students.length} student records with ${imported.length} imported records?`)) return;
      students = imported;
      save();
      let restored = 0;
      if (!Array.isArray(parsed) && Array.isArray(parsed.resumes)) {
        for (const key of [...resumes.keys()]) await deleteResume(key);
        for (const item of parsed.resumes) {
          if (!item || !item.key || !item.data) continue;
          const blob = await (await fetch(item.data)).blob();
          await storeResume(item.key, new File([blob], item.file || 'resume', { type: item.type || blob.type }), item.text, item.at);
          restored++;
        }
      }
      render();
      showToast(`${imported.length} student records imported${restored ? ` with ${restored} resumes` : ''}.`);
      logAct('Backup imported', `${imported.length} records, ${restored} resumes`);
    } catch (error) {
      showToast(`Import failed: ${error.message}`, true);
    } finally {
      $('backupInput').value = '';
    }
  }

  async function clearAllData(withResumes) {
    if (role !== 'admin') { showToast('Only an admin can clear data.', true); return; }
    const count = students.length;
    const resumeCount = resumes.size;
    students = [];
    if (withResumes) {
      for (const key of [...resumes.keys()]) {
        try { await deleteResume(key); } catch (error) { /* keep going */ }
      }
    }
    if (!save() && !CLOUD) return;
    if (CLOUD) await push();
    render();
    showToast(`All data cleared: ${count} student record${count === 1 ? '' : 's'}${withResumes ? ` and ${resumeCount} resume${resumeCount === 1 ? '' : 's'}` : ''} removed.`);
    logAct('All data cleared', `${count} student records${withResumes ? ` and ${resumeCount} resumes` : ' (resumes kept)'} removed by ${me.name || me.email}`);
  }

  /* ================= Event wiring ================= */
  dialog.addEventListener('close', () => { if (remotePending) refreshFromServer(); });
  $('sheet').addEventListener('close', () => { sheetStudentId = null; if (remotePending) refreshFromServer(); });
  $('closeSheetBtn').addEventListener('click', () => $('sheet').close());
  $('sheet').addEventListener('click', (event) => {
    if (event.target === $('sheet')) { $('sheet').close(); return; }
    const button = event.target.closest('button[data-resume]');
    if (button) viewResume(button.dataset.resume);
  });
  $('sheetEditBtn').addEventListener('click', () => {
    const student = students.find((item) => item.id === sheetStudentId);
    if (student) openForm(student);
  });
  $('sheetDeleteBtn').addEventListener('click', () => {
    const student = students.find((item) => item.id === sheetStudentId);
    if (!student || role !== 'admin') return;
    if (!window.confirm(`Delete ${student.name} (${student.course || 'no course'})? This cannot be undone.`)) return;
    students = students.filter((item) => item.id !== student.id);
    save();
    const key = resumeKey(student);
    if (resumes.has(key) && !keyInUse(key)) deleteResume(key).catch(() => {});
    $('sheet').close();
    render();
    showToast('Student deleted.');
    logAct('Student deleted', `${student.name} (${student.course || 'no course'}, ${student.batch || 'no batch'})`);
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-add]')) { openForm(); return; }
    if (event.target.closest('[data-bulk-resume]')) { $('bulkResumeInput').click(); return; }
    const sheetLink = event.target.closest('[data-open-sheet]');
    if (sheetLink) {
      event.preventDefault();
      const student = students.find((item) => item.id === sheetLink.dataset.openSheet);
      if (student) openSheet(student);
    }
  });
  $('closeDialogBtn').addEventListener('click', () => dialog.close());
  $('cancelDialogBtn').addEventListener('click', () => dialog.close());

  $('searchInput').addEventListener('input', renderRows);
  $('courseFilter').addEventListener('change', renderRows);
  $('batchFilter').addEventListener('change', renderRows);
  $('statusFilter').addEventListener('change', renderRows);
  $('rankFilter').addEventListener('change', renderRows);
  $('clearFiltersBtn').addEventListener('click', () => {
    ['searchInput', 'courseFilter', 'batchFilter', 'statusFilter', 'rankFilter', 'globalSearch'].forEach((id) => { $(id).value = ''; });
    renderRows();
  });
  $('globalSearch').addEventListener('input', () => {
    $('searchInput').value = $('globalSearch').value;
    if (currentView !== 'students') window.location.hash = '#students';
    renderRows();
  });
  $('studentRows').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    const row = event.target.closest('tr[data-open]');
    const student = students.find((item) => item.id === (button ? button.dataset.id : row?.dataset.open));
    if (!student) return;
    if (!button) { openSheet(student); return; }
    if (button.dataset.action === 'edit') openForm(student);
    if (button.dataset.action === 'resume') viewResume(resumeKey(student));
  });

  $('matrixSearch').addEventListener('input', renderMatrix);
  $('matrixCourse').addEventListener('change', renderMatrix);
  $('matrixBatch').addEventListener('change', renderMatrix);
  $('matrixRank').addEventListener('change', () => {
    if ($('matrixRank').value) matrixSort = { key: 'overall', dir: -1 };
    renderMatrix();
  });
  $('matrixExportBtn').addEventListener('click', exportMatrix);
  $('clearDataBtn').addEventListener('click', () => {
    if (role !== 'admin') return;
    $('clearConfirm').value = '';
    $('clearResumes').checked = false;
    $('clearGo').disabled = true;
    $('clearCount').textContent = `${students.length} student record${students.length === 1 ? '' : 's'} and ${resumes.size} resume${resumes.size === 1 ? '' : 's'}`;
    $('clearDialog').showModal();
    $('clearConfirm').focus();
  });
  $('studentBatch').addEventListener('blur', () => { $('studentBatch').value = canonicalBatch($('studentBatch').value); });
  $('clearConfirm').addEventListener('input', () => { $('clearGo').disabled = $('clearConfirm').value.trim().toUpperCase() !== 'CLEAR'; });
  $('clearForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if ($('clearConfirm').value.trim().toUpperCase() !== 'CLEAR') return;
    $('clearDialog').close();
    await clearAllData($('clearResumes').checked);
  });
  document.querySelectorAll('[data-close-clear]').forEach((b) => b.addEventListener('click', () => $('clearDialog').close()));
  $('dedupeBtn').addEventListener('click', async () => {
    const { merged, renamed } = await tidyAndSave('Manual clean-up');
    render();
    showToast(merged || renamed ? `${merged} duplicate${merged === 1 ? '' : 's'} merged, ${renamed} spelling${renamed === 1 ? '' : 's'} fixed.` : 'No duplicates found.');
  });
  $('commentForm').addEventListener('submit', (event) => { event.preventDefault(); saveComment(); });
  document.querySelectorAll('[data-close-comment]').forEach((b) => b.addEventListener('click', () => $('commentDialog').close()));
  $('matrixTable').addEventListener('click', (event) => {
    const th = event.target.closest('th[data-sort]');
    if (th) {
      const key = th.dataset.sort;
      matrixSort = matrixSort.key === key ? { key, dir: -matrixSort.dir } : { key, dir: key === 'name' ? 1 : -1 };
      renderMatrix();
      return;
    }
    const td = event.target.closest('td[data-cell]');
    if (td && event.target.closest('.cell-btn')) { editMatrixCell(td); return; }
    const examTd = event.target.closest('td[data-exam]');
    if (examTd && event.target.closest('.cell-btn')) { editExamCell(examTd); return; }
    const noteTd = event.target.closest('td[data-note]');
    if (noteTd && event.target.closest('.note-btn')) openCommentEditor(noteTd.dataset.note);
  });

  $('resumeRows').addEventListener('click', async (event) => {
    const view = event.target.closest('button[data-resume]');
    if (view) { viewResume(view.dataset.resume); return; }
    const remove = event.target.closest('button[data-remove-resume]');
    if (!remove) return;
    const key = remove.dataset.removeResume;
    const record = resumes.get(key);
    const owner = students.find((s) => resumeKey(s) === key);
    if (!window.confirm(`Remove ${record?.file || 'this resume'} for ${owner?.name || 'this student'}?`)) return;
    try {
      await deleteResume(key);
      render();
      showToast('Resume removed.');
      logAct('Resume removed', `${owner?.name || key}: ${record?.file || ''}`);
    } catch (error) {
      showToast(`Could not remove the resume: ${error.message}`, true);
    }
  });

  ['actSearch', 'actUser', 'actAction', 'actFrom', 'actTo'].forEach((id) => $(id).addEventListener(id === 'actSearch' ? 'input' : 'change', renderActivity));
  $('activityRefreshBtn').addEventListener('click', loadActivity);
  $('activityExportBtn').addEventListener('click', exportActivity);

  $('teamForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('teamEmail').value.trim().toLocaleLowerCase();
    const memberRole = $('teamRole').value;
    if (!CLOUD) {
      const users = localUsers();
      if (users.some((u) => u.email === email)) { showToast(`${email} is already on the team.`, true); return; }
      const password = $('teamPassword').value;
      if ((!MS_LOCAL || password) && password.length < 8) { showToast('Give the new member a temporary password of at least 8 characters.', true); return; }
      const name = $('teamName').value.trim() || email.split('@')[0];
      users.push({ email, name, role: memberRole, active: true, added_by: me.email, created_at: new Date().toISOString(), ...(password ? await makeCredentials(password) : {}) });
      saveLocalUsers(users);
      ['teamEmail', 'teamName', 'teamPassword'].forEach((id) => { $(id).value = ''; });
      showToast(password ? `${name} can now sign in on this computer. Share the password with them privately.` : `${name} can now sign in with Microsoft.`);
      logAct('Team member added', `${name} (${email}) as ${memberRole === 'admin' ? 'Admin' : 'Trainer'}`);
      loadTeam();
      return;
    }
    const memberName = $('teamName').value.trim() || null;
    const { error } = await sb.from('team_members').insert({ email, name: memberName, role: memberRole, active: true, added_by: me.email });
    if (error) { showToast(error.code === '23505' ? `${email} is already on the team.` : `Could not add ${email}: ${error.message}`, true); return; }
    $('teamEmail').value = '';
    $('teamName').value = '';
    showToast(`${memberName || email} can now sign in with Microsoft, or create a password on the sign-in page.`);
    logAct('Team member added', `${email} as ${memberRole === 'admin' ? 'Admin' : 'Trainer'}`);
    loadTeam();
  });
  $('teamList').addEventListener('click', (event) => {
    const reset = event.target.closest('[data-team-reset]');
    if (reset) resetLocalPassword(reset.dataset.teamReset);
    const remove = event.target.closest('[data-team-remove]');
    if (remove) removeMember(remove.dataset.teamRemove);
  });
  $('teamList').addEventListener('change', (event) => {
    const roleSelect = event.target.closest('[data-team-role]');
    if (roleSelect) {
      const email = roleSelect.dataset.teamRole;
      updateMember(email, { role: roleSelect.value }, `${email} is now ${roleSelect.value === 'admin' ? 'an Admin' : 'a Trainer'}`);
    }
    const active = event.target.closest('[data-team-active]');
    if (active) {
      const email = active.dataset.teamActive;
      updateMember(email, { active: active.checked }, `${email} ${active.checked ? 'reactivated' : 'deactivated'}`);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('studentId').value;
    const existing = id ? students.find((item) => item.id === id) : null;
    const before = existing ? { ...existing } : null;
    const student = {
      id: id || makeId(),
      name: $('studentName').value.trim(),
      course: $('studentCourse').value.trim(),
      batch: $('studentBatch').value.trim(),
      evaluator: $('studentEvaluator').value.trim(),
      ...Object.fromEntries(examFields.map((field, index) => {
        const value = $(`studentExam${index + 1}`).value;
        return [field, value === '' ? null : Number(value)];
      })),
      exam: null,
      overallScore: null,
      employmentStatus: existing?.employmentStatus ?? '',
      ...Object.fromEntries(fields.map((field) => {
        const value = $(`rubric-${field}`).value;
        return [field, value === '' ? null : Number(value)];
      })),
      notes: $('studentNotes').value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (existing && existing.overallScore !== null && existing.overallScore !== undefined
      && [...fields, ...examFields].every((f) => (existing[f] ?? null) === (student[f] ?? null))) {
      student.overallScore = existing.overallScore;
    }
    try {
      const normalized = normalizeStudent(student);
      const clash = duplicateOf(normalized);
      if (clash) {
        showToast(`${clash.name} is already in ${clash.course || 'this course'}${clash.batch ? `, ${clash.batch}` : ''}. Open that record to change it instead of adding a second one.`, true);
        return;
      }
      const previousStudents = students;
      if (id) students = students.map((item) => item.id === id ? normalized : item);
      else students.push(normalized);
      if (!save()) {
        students = previousStudents;
        return;
      }
      try {
        await applyResumeChanges(existing ? resumeKey(existing) : null, resumeKey(normalized));
      } catch (error) {
        showToast(`Student saved, but the resume could not be stored: ${error.message}`, true);
      }
      render();
      dialog.close();
      showToast(id ? 'Student updated.' : 'Student added.');
      logAct(id ? 'Student updated' : 'Student added', id
        ? `${normalized.name} (${normalized.course || 'no course'}): ${describeChanges(before, normalized)}`
        : `${normalized.name} (${normalized.course || 'no course'}, ${normalized.batch || 'no batch'})`);
    } catch (error) {
      $('formError').textContent = error.message;
    }
  });

  $('exportBtn').addEventListener('click', exportStudents);
  $('backupBtn').addEventListener('click', backup);
  $('uploadExcelBtn').addEventListener('click', () => $('excelInput').click());
  $('templateBtn').addEventListener('click', downloadTemplate);
  $('excelInput').addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (file) importExcel(file);
  });
  $('importBtn').addEventListener('click', () => $('backupInput').click());
  $('backupInput').addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (file) importBackup(file);
  });
  $('resumeInput').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    $('resumeStatus').textContent = `Reading ${file.name}…`;
    $('resumeStatus').className = 'hint';
    try {
      const { text, warning } = await readResume(file);
      pendingResume = { file, text, warning };
      $('resumeStatus').textContent = warning;
      $('resumeStatus').className = warning ? 'err' : 'hint';
    } catch (error) {
      pendingResume = null;
      $('resumeStatus').textContent = error.message;
      $('resumeStatus').className = 'err';
    } finally {
      $('resumeInput').value = '';
      renderResumeField();
    }
  });
  $('bulkResumeBtn').addEventListener('click', () => $('bulkResumeInput').click());
  $('bulkResumeInput').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    $('bulkResumeInput').value = '';
    if (files.length) await bulkUploadResumes(files);
  });
  $('talentForm').addEventListener('submit', (event) => { event.preventDefault(); runTalentSearch(); });
  $('roleInput').addEventListener('change', () => autofillFromRole(false));
  $('exportShortlistBtn').addEventListener('click', exportShortlist);
  $('clearTalentBtn').addEventListener('click', () => {
    $('roleInput').value = '';
    $('skillsInput').value = '';
    lastAutoSkills = '';
    setCriteria(DEFAULT_CRITERIA);
    $('roleHint').textContent = '';
    $('talentSummary').textContent = '';
    $('talentResults').innerHTML = '';
    talentRows = [];
    talentConfig = null;
  });
  $('talentResults').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-resume]');
    if (button) viewResume(button.dataset.resume);
  });
  $('roleList').innerHTML = roleLibrary.map((item) => `<option value="${escapeHtml(item.role)}"></option>`).join('');

  $('msSignInBtn').addEventListener('click', () => {
    if (CLOUD) signInWithMicrosoft();
    else if (MS_LOCAL) msBegin();
    else renderAuth(authMode, 'Microsoft sign-in is not switched on yet. Add your Azure application and tenant IDs to config.js (README → "Microsoft sign-in"). Until then, use email and password below.', true);
  });
  $('authSwitch').addEventListener('click', () => renderAuth(authMode === 'signup' ? 'login' : 'signup'));
  $('signOutBtn').addEventListener('click', async () => {
    await logAct('Signed out', me.name || me.email);
    if (CLOUD) {
      await push();
      await sb.auth.signOut();
    } else {
      clearSession();
    }
    window.location.reload();
  });
  $('loginForm').addEventListener('submit', (event) => (CLOUD ? cloudLogin(event) : localLogin(event)));
  $('setupForm').addEventListener('submit', (event) => (CLOUD ? cloudSignup(event) : localSetup(event)));
  $('menuBtn').addEventListener('click', openNav);
  $('scrim').addEventListener('click', closeNav);
  $('themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    try { localStorage.setItem('akumen-theme', next); } catch (error) { /* ignore */ }
    applyTheme(next);
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { event.preventDefault(); $('globalSearch').focus(); }
  });
  window.addEventListener('beforeunload', (event) => { if (CLOUD && dirty) { event.preventDefault(); event.returnValue = ''; } });

  applyTheme(document.documentElement.dataset.theme || '');
  renderRubricForm();
  renderCriteriaChecks();
  $('appView').classList.add('hid');
  if (CLOUD) startCloud();
  else startLocal();
})();
