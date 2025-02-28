// ==UserScript==
// @name         Smart Notes Pro: ملاحظات ذكية مع فقاعة جانبية
// @namespace    http://tampermonkey.net/
// @version      2.2.1
// @description  English: A sleek, draggable notes window with a smart bubble that partially hides off-screen and fully reveals on hover. Supports dark mode, rich text editing, advanced keyboard shortcuts, search, sort, import/export (JSON, TXT, MD, HTML, PDF), reminders, and a bilingual interface (English & Arabic).
//              عربي: نافذة ملاحظات أنيقة قابلة للسحب مع فقاعة ذكية تظهر نصفها خارج الشاشة وتخرج بالكامل عند التحويم. يدعم الوضع الليلي، تحرير نص غني، اختصارات لوحة مفاتيح متقدمة، بحث وفرز، استيراد/تصدير (JSON, TXT, MD, HTML, PDF)، تذكيرات، وواجهة بلغتين (العربية والإنجليزية).
// @author       dhomred
// @match        *://*/*
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
// ==/UserScript==

(function() {
    'use strict';
  
    // ------------- Setting up Language and Texts -------------
    const DEFAULT_LANG = 'ar';
    let language = localStorage.getItem('notesLanguage') || DEFAULT_LANG;
    const texts = {
      ar: {
        appTitle: "ملاحظاتي",
        newNote: "ملاحظة جديدة",
        delete: "حذف",
        save: "حفظ",
        export: "تصدير",
        exportPDF: "تصدير PDF",
        import: "استيراد",
        darkMode: "الوضع الليلي",
        lightMode: "الوضع الفاتح",
        minimize: "تصغير",
        confirmDelete: "هل أنت متأكد من حذف هذه الملاحظة؟",
        noNotes: "لا توجد ملاحظات لتصديرها!",
        promptFileName: "أدخل اسم الملف مع الامتداد (مثال: notes.json, notes.txt, notes.md, notes.html, notes.pdf):",
        saved: "تم حفظ التعديلات!",
        savedCtrl: "تم حفظ التعديلات (Ctrl+S)!",
        placeholderTitle: "عنوان الملاحظة",
        placeholderContent: "اكتب ملاحظاتك هنا...",
        notesBubble: "📝 ملاحظات",
        langToggleTitle: "التبديل إلى الإنجليزية",
        searchPlaceholder: "بحث...",
        sortDate: "ترتيب حسب التاريخ",
        sortTitle: "ترتيب حسب العنوان",
        setReminder: "تعيين تذكير",
        reminderPrompt: "أدخل موعد التذكير (مثال: 2025-03-01T14:30):",
        reminderSet: "تم تعيين التذكير لهذه الملاحظة.",
        sync: "مزامنة",
        syncTitle: "مزامنة الملاحظات مع السحابة (غير مفعل)"
      },
      en: {
        appTitle: "My Notes",
        newNote: "New Note",
        delete: "Delete",
        save: "Save",
        export: "Export",
        exportPDF: "Export PDF",
        import: "Import",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        minimize: "Minimize",
        confirmDelete: "Are you sure you want to delete this note?",
        noNotes: "No notes to export!",
        promptFileName: "Enter file name with extension (e.g.: notes.json, notes.txt, notes.md, notes.html, notes.pdf):",
        saved: "Changes saved!",
        savedCtrl: "Changes saved (Ctrl+S)!",
        placeholderTitle: "Note Title",
        placeholderContent: "Type your notes here...",
        notesBubble: "📝 Notes",
        langToggleTitle: "Switch to Arabic",
        searchPlaceholder: "Search...",
        sortDate: "Sort by Date",
        sortTitle: "Sort by Title",
        setReminder: "Set Reminder",
        reminderPrompt: "Enter reminder date/time (e.g.: 2025-03-01T14:30):",
        reminderSet: "Reminder set for this note.",
        sync: "Sync",
        syncTitle: "Sync notes with cloud (not implemented)"
      }
    };
  
    // ------------- Setting up Constants and Initialization -------------
    const STORAGE_KEY = 'userNotes';
    const DARK_MODE_KEY = 'notesDarkMode';
    const MINIMIZE_KEY = 'notesMinimized';
  
    let notes = [];
    let currentNoteId = null;
    let darkMode = localStorage.getItem(DARK_MODE_KEY) === 'true';
    let isMinimized = localStorage.getItem(MINIMIZE_KEY) === 'true';
  
    // Variable to determine the bubble's edge (right or left)
    let bubbleEdge = 'right';
  
    // ------------- Storage Functions -------------
    function loadNotes() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        notes = data ? JSON.parse(data) : [];
      } catch {
        notes = [];
      }
    }
    function saveNotes() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
    function generateId() {
      return Date.now().toString();
    }
  
    // ------------- Injecting CSS via JavaScript -------------
    const css = `
      .notes-app {
          position: fixed;
          width: 400px;
          height: 400px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          z-index: 9999;
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
          background: #f9f9f9;
          color: #000;
          border: 2px solid #333;
          top: 50px;
          right: 20px;
      }
      .notes-app.dark-mode {
          background: #333;
          color: #eee;
          border-color: #eee;
      }
      /* Side Bubble: using 'left' for positioning and setting a minimum width */
      .notes-bubble {
          position: fixed;
          top: 50%;
          background: #4CAF50;
          color: #fff;
          padding: 12px;
          border-radius: 8px 0 0 8px;
          cursor: pointer;
          z-index: 9998;
          transition: left 0.3s ease, background 0.3s ease;
          display: none;
          box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
          white-space: nowrap;
          min-width: 80px;
      }
      /* On hover, the bubble is fully revealed */
      .notes-bubble:hover {
          background: #45a049;
      }
      @media (max-width: 600px) {
          .notes-app {
              width: 95% !important;
              right: 2.5% !important;
              height: 70vh;
          }
      }
      /* Header */
      .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          cursor: move;
          padding: 4px;
      }
      .notes-header .title {
          font-weight: bold;
          font-size: 18px;
      }
      .notes-header button {
          margin-right: 4px;
          cursor: pointer;
      }
      .notes-header button.close-btn {
          border: none;
          background: transparent;
          font-weight: bold;
          font-size: 16px;
      }
      /* Body: Sidebar + Editor */
      .notes-body {
          display: flex;
          flex: 1;
          overflow: hidden;
      }
      .notes-sidebar {
          width: 35%;
          border-right: 1px solid #333;
          overflow-y: auto;
          padding: 4px;
          box-sizing: border-box;
      }
      .notes-app.dark-mode .notes-sidebar {
          border-right: 1px solid #eee;
      }
      .notes-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 4px;
          box-sizing: border-box;
      }
      .notes-editor input,
      .notes-editor textarea {
          width: 100%;
          padding: 4px;
          box-sizing: border-box;
          border: 1px solid #333;
          background-color: #fff;
          color: #000;
          margin-bottom: 4px;
      }
      .notes-app.dark-mode .notes-editor input,
      .notes-app.dark-mode .notes-editor textarea {
          border: 1px solid #eee;
          background-color: #555;
          color: #eee;
      }
      /* Sidebar Items */
      .note-item {
          padding: 4px;
          cursor: pointer;
          border-bottom: 1px solid #333;
      }
      .notes-app.dark-mode .note-item {
          border-bottom: 1px solid #eee;
      }
      .note-item.active {
          background-color: #ddd;
      }
      .notes-app.dark-mode .note-item.active {
          background-color: #777;
      }
      /* Search and Sort Bar */
      .search-sort-container input,
      .search-sort-container select {
          width: 100%;
          margin-bottom: 4px;
          padding: 4px;
          box-sizing: border-box;
      }
      /* Toolbar */
      .toolbar button {
          margin-right: 4px;
          padding: 2px 6px;
          cursor: pointer;
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  
    // ------------- Creating Main Elements -------------
    const appContainer = document.createElement('div');
    appContainer.className = 'notes-app';
    if (darkMode) appContainer.classList.add('dark-mode');
  
    const bubbleBtn = document.createElement('div');
    bubbleBtn.className = 'notes-bubble';
    if (darkMode) bubbleBtn.classList.add('dark-mode');
  
    document.body.appendChild(appContainer);
    document.body.appendChild(bubbleBtn);
  
    const appContent = document.createElement('div');
    appContent.style.display = 'flex';
    appContent.style.flexDirection = 'column';
    appContent.style.height = '100%';
    appContainer.appendChild(appContent);
  
    // ------------- Header and Buttons -------------
    const header = document.createElement('div');
    header.className = 'notes-header';
    const mainTitle = document.createElement('span');
    mainTitle.className = 'title';
    const headerButtons = document.createElement('div');
  
    // Creating buttons: Import, Sync, New, Delete, Save, Export, Dark Mode, Language, Minimize, Close
    const importBtn = document.createElement('button');
    const syncBtn = document.createElement('button');
    const newBtn = document.createElement('button');
    const deleteBtn = document.createElement('button');
    const saveBtn = document.createElement('button');
    const exportBtn = document.createElement('button');
    const darkModeBtn = document.createElement('button');
    const languageBtn = document.createElement('button');
    const minimizeBtn = document.createElement('button');
    const closeBtn = document.createElement('button');
  
    importBtn.textContent = texts[language].import;
    importBtn.title = texts[language].import;
    syncBtn.textContent = texts[language].sync;
    syncBtn.title = texts[language].syncTitle;
    closeBtn.classList.add('close-btn');
  
    headerButtons.append(importBtn, syncBtn, newBtn, deleteBtn, saveBtn, exportBtn, darkModeBtn, languageBtn, minimizeBtn, closeBtn);
    header.append(mainTitle, headerButtons);
    appContent.appendChild(header);
  
    // ------------- Body: Sidebar and Editor -------------
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'notes-body';
  
    const sidebar = document.createElement('div');
    sidebar.className = 'notes-sidebar';
  
    // Search and Sort Bar
    const searchSortContainer = document.createElement('div');
    searchSortContainer.className = 'search-sort-container';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = texts[language].searchPlaceholder;
    const sortSelect = document.createElement('select');
    const optionDate = document.createElement('option');
    optionDate.value = 'date';
    optionDate.textContent = texts[language].sortDate;
    const optionTitle = document.createElement('option');
    optionTitle.value = 'title';
    optionTitle.textContent = texts[language].sortTitle;
    sortSelect.append(optionDate, optionTitle);
    searchSortContainer.append(searchInput, sortSelect);
    sidebar.appendChild(searchSortContainer);
  
    const editor = document.createElement('div');
    editor.className = 'notes-editor';
  
    // Toolbar for Rich Text Formatting and Reminders
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    const boldBtn = document.createElement('button');
    boldBtn.textContent = "B";
    boldBtn.style.fontWeight = 'bold';
    const italicBtn = document.createElement('button');
    italicBtn.textContent = "I";
    italicBtn.style.fontStyle = 'italic';
    const underlineBtn = document.createElement('button');
    underlineBtn.textContent = "U";
    underlineBtn.style.textDecoration = 'underline';
    const reminderBtn = document.createElement('button');
    reminderBtn.textContent = texts[language].setReminder;
    toolbar.append(boldBtn, italicBtn, underlineBtn, reminderBtn);
  
    const noteTitleInput = document.createElement('input');
    noteTitleInput.type = 'text';
  
    const noteTextArea = document.createElement('textarea');
    noteTextArea.style.flex = '1';
    noteTextArea.style.resize = 'none';
  
    editor.append(toolbar, noteTitleInput, noteTextArea);
    bodyContainer.append(sidebar, editor);
    appContent.appendChild(bodyContainer);
  
    // ------------- Updating UI Text Based on Language -------------
    function updateUIText() {
      const t = texts[language];
      mainTitle.textContent = t.appTitle;
      newBtn.textContent = t.newNote;
      deleteBtn.textContent = t.delete;
      saveBtn.textContent = t.save;
      exportBtn.textContent = t.export;
      darkModeBtn.textContent = darkMode ? t.lightMode : t.darkMode;
      minimizeBtn.textContent = t.minimize;
      noteTitleInput.placeholder = t.placeholderTitle;
      noteTextArea.placeholder = t.placeholderContent;
      bubbleBtn.textContent = t.notesBubble;
      languageBtn.textContent = language === 'ar' ? 'EN' : 'عربي';
      languageBtn.title = t.langToggleTitle;
      searchInput.placeholder = t.searchPlaceholder;
      optionDate.textContent = t.sortDate;
      optionTitle.textContent = t.sortTitle;
      reminderBtn.textContent = t.setReminder;
      importBtn.textContent = t.import;
      syncBtn.textContent = t.sync;
    }
  
    // ------------- Note Management Functions -------------
    function renderNotesList() {
      sidebar.querySelectorAll('.note-item')?.forEach(el => el.remove());
      let filteredNotes = notes.filter(note => {
        const searchTerm = searchInput.value.toLowerCase();
        return note.title.toLowerCase().includes(searchTerm) || note.content.toLowerCase().includes(searchTerm);
      });
      if (sortSelect.value === 'title') {
        filteredNotes.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        filteredNotes.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      }
      filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.textContent = note.title || texts[language].placeholderTitle;
        if (note.id === currentNoteId) {
          item.classList.add('active');
        }
        item.addEventListener('click', () => {
          currentNoteId = note.id;
          loadCurrentNote();
          renderNotesList();
        });
        sidebar.appendChild(item);
      });
    }
  
    function loadCurrentNote() {
      const note = notes.find(n => n.id === currentNoteId);
      if (note) {
        noteTitleInput.value = note.title;
        noteTextArea.value = note.content;
      } else {
        noteTitleInput.value = '';
        noteTextArea.value = '';
      }
    }
  
    function saveCurrentNote() {
      if (!currentNoteId) return;
      const note = notes.find(n => n.id === currentNoteId);
      if (note) {
        note.title = noteTitleInput.value;
        note.content = noteTextArea.value;
        saveNotes();
        renderNotesList();
      }
    }
  
    function createNewNote() {
      const newNote = {
        id: generateId(),
        title: texts[language].newNote,
        content: '',
        reminder: null
      };
      notes.push(newNote);
      currentNoteId = newNote.id;
      saveNotes();
      renderNotesList();
      loadCurrentNote();
    }
  
    function deleteCurrentNote() {
      if (!currentNoteId) return;
      if (confirm(texts[language].confirmDelete)) {
        notes = notes.filter(n => n.id !== currentNoteId);
        currentNoteId = notes.length ? notes[0].id : null;
        saveNotes();
        renderNotesList();
        loadCurrentNote();
      }
    }
  
    function exportNotesFunc() {
      if (notes.length === 0) {
        alert(texts[language].noNotes);
        return;
      }
      let fileName = prompt(texts[language].promptFileName, 'notes.json');
      if (!fileName) return;
      if (!fileName.includes('.')) {
        fileName += '.json';
      }
      const ext = fileName.split('.').pop().toLowerCase();
      let content, mimeType;
      switch (ext) {
        case 'json':
          content = JSON.stringify(notes, null, 2);
          mimeType = 'application/json';
          break;
        case 'txt':
          content = notes.map(n => `عنوان: ${n.title}\nالمحتوى:\n${n.content}\n\n-----------------\n`).join('');
          mimeType = 'text/plain';
          break;
        case 'md':
          content = notes.map(n => `## ${n.title}\n\n${n.content}\n\n---\n`).join('');
          mimeType = 'text/markdown';
          break;
        case 'html':
          content = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Exported Notes</title></head><body>' +
                    notes.map(n => `<h2>${n.title}</h2><p>${n.content}</p><hr>`).join('') +
                    '</body></html>';
          mimeType = 'text/html';
          break;
        case 'pdf': {
          const { jsPDF } = window.jspdf || window;
          if (jsPDF) {
            const doc = new jsPDF();
            let y = 10;
            notes.forEach(n => {
              doc.text(n.title, 10, y);
              y += 10;
              doc.text(n.content, 10, y);
              y += 20;
            });
            doc.save(fileName);
            return;
          } else {
            alert("jsPDF library not available.");
            return;
          }
        }
        default:
          content = notes.map(n => `عنوان: ${n.title}\nالمحتوى:\n${n.content}\n\n-----------------\n`).join('');
          mimeType = 'text/plain';
          break;
      }
      const blob = new Blob([content], {type: mimeType});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    // ------------- Import Functions -------------
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    importBtn.addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const content = evt.target.result;
        if (file.name.endsWith('.json')) {
          try {
            const importedNotes = JSON.parse(content);
            notes = notes.concat(importedNotes);
            saveNotes();
            renderNotesList();
          } catch (err) {
            alert("Error parsing JSON file.");
          }
        } else {
          const newNote = {
            id: generateId(),
            title: file.name,
            content: content,
            reminder: null
          };
          notes.push(newNote);
          currentNoteId = newNote.id;
          saveNotes();
          renderNotesList();
          loadCurrentNote();
        }
      };
      reader.readAsText(file);
    });
  
    // ------------- Rich Text Formatting Functions -------------
    function applyFormatting(format) {
      const textarea = noteTextArea;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      let formatted;
      if (format === 'bold') {
        formatted = `**${selectedText}**`;
      } else if (format === 'italic') {
        formatted = `*${selectedText}*`;
      } else if (format === 'underline') {
        formatted = `<u>${selectedText}</u>`;
      }
      textarea.setRangeText(formatted, start, end, 'end');
      textarea.focus();
    }
    boldBtn.addEventListener('click', () => { applyFormatting('bold'); });
    italicBtn.addEventListener('click', () => { applyFormatting('italic'); });
    underlineBtn.addEventListener('click', () => { applyFormatting('underline'); });
    reminderBtn.addEventListener('click', () => {
      const reminder = prompt(texts[language].reminderPrompt, "");
      if (reminder) {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
          note.reminder = reminder;
          saveNotes();
          alert(texts[language].reminderSet);
        }
      }
    });
  
    // ------------- Reminder Functions -------------
    function checkReminders() {
      const now = new Date();
      notes.forEach(note => {
        if (note.reminder) {
          const reminderDate = new Date(note.reminder);
          if (now >= reminderDate) {
            if (Notification.permission === "granted") {
              new Notification(texts[language].appTitle, {
                body: note.title + "\n" + note.content
              });
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                  new Notification(texts[language].appTitle, {
                    body: note.title + "\n" + note.content
                  });
                }
              });
            }
            note.reminder = null;
            saveNotes();
          }
        }
      });
    }
    setInterval(checkReminders, 60000);
  
    // ------------- Dark Mode and Minimize/Maximize Commands -------------
    function toggleDarkMode() {
      darkMode = !darkMode;
      localStorage.setItem(DARK_MODE_KEY, darkMode);
      appContainer.classList.toggle('dark-mode', darkMode);
      bubbleBtn.classList.toggle('dark-mode', darkMode);
      updateUIText();
    }
    function minimizeApp() {
      // Ensure the bubble is temporarily visible for measurement
      bubbleBtn.style.display = 'block';
      const bubbleWidth = bubbleBtn.offsetWidth || 80;
      // Set bubble position based on calculated edge
      if (bubbleEdge === 'right') {
        bubbleBtn.style.left = `${window.innerWidth - bubbleWidth/2}px`;
      } else {
        bubbleBtn.style.left = `-${bubbleWidth/2}px`;
      }
      // Calculate vertical position based on the notes window
      const rect = appContainer.getBoundingClientRect();
      bubbleBtn.style.top = `${rect.top + rect.height/2 - bubbleBtn.offsetHeight/2}px`;
      appContainer.style.display = 'none';
      isMinimized = true;
      localStorage.setItem(MINIMIZE_KEY, 'true');
    }
    function maximizeApp() {
      appContainer.style.display = 'flex';
      bubbleBtn.style.display = 'none';
      isMinimized = false;
      localStorage.setItem(MINIMIZE_KEY, 'false');
    }
    function toggleLanguage() {
      language = (language === 'ar') ? 'en' : 'ar';
      localStorage.setItem('notesLanguage', language);
      updateUIText();
      renderNotesList();
    }
    function syncNotes() {
      alert(texts[language].syncTitle);
    }
  
    // ------------- Draggable Function -------------
    function makeDraggable(element, handle) {
      let offsetX, offsetY, isDragging = false;
      handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.transition = "none";
        if (element === bubbleBtn) {
          element.classList.add('dragging');
        }
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let left = e.clientX - offsetX;
        let top = e.clientY - offsetY;
        const maxLeft = window.innerWidth - element.offsetWidth;
        const maxTop = window.innerHeight - element.offsetHeight;
        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
      });
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          element.style.transition = "all 0.3s ease";
          if (element === bubbleBtn) {
            element.classList.remove('dragging');
            const bubbleWidth = bubbleBtn.offsetWidth;
            const rect = bubbleBtn.getBoundingClientRect();
            // Determine bubble edge based on its center relative to the screen's midpoint
            if (rect.left + bubbleWidth/2 < window.innerWidth/2) {
              bubbleEdge = 'left';
              bubbleBtn.style.left = `-${bubbleWidth/2}px`;
            } else {
              bubbleEdge = 'right';
              bubbleBtn.style.left = `${window.innerWidth - bubbleWidth/2}px`;
            }
          }
          if (element === appContainer) {
            localStorage.setItem('notesPosition', JSON.stringify({
              left: element.style.left,
              top: element.style.top
            }));
          }
        }
      });
    }
    function restorePosition() {
      const savedPosition = localStorage.getItem('notesPosition');
      if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        appContainer.style.left = left;
        appContainer.style.top = top;
      } else {
        appContainer.style.left = '50px';
        appContainer.style.top = '50px';
      }
    }
  
    // ------------- Binding Events -------------
    newBtn.addEventListener('click', createNewNote);
    deleteBtn.addEventListener('click', deleteCurrentNote);
    saveBtn.addEventListener('click', () => {
      saveCurrentNote();
      alert(texts[language].saved);
    });
    exportBtn.addEventListener('click', exportNotesFunc);
    darkModeBtn.addEventListener('click', toggleDarkMode);
    languageBtn.addEventListener('click', toggleLanguage);
    minimizeBtn.addEventListener('click', minimizeApp);
    syncBtn.addEventListener('click', syncNotes);
    closeBtn.addEventListener('click', () => {
      appContainer.remove();
      bubbleBtn.remove();
    });
    bubbleBtn.addEventListener('click', maximizeApp);
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCurrentNote();
        alert(texts[language].savedCtrl);
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createNewNote();
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        deleteCurrentNote();
      }
    });
    searchInput.addEventListener('input', renderNotesList);
    sortSelect.addEventListener('change', renderNotesList);
    makeDraggable(appContainer, header);
    makeDraggable(bubbleBtn, bubbleBtn);
    restorePosition();
  
    // When mouse enters the bubble, reveal it fully; when leaving, revert to half-hidden state
    bubbleBtn.addEventListener('mouseenter', () => {
      const bubbleWidth = bubbleBtn.offsetWidth;
      if (bubbleEdge === 'right') {
        bubbleBtn.style.left = `${window.innerWidth - bubbleWidth}px`;
      } else if (bubbleEdge === 'left') {
        bubbleBtn.style.left = `0px`;
      }
    });
    bubbleBtn.addEventListener('mouseleave', () => {
      const bubbleWidth = bubbleBtn.offsetWidth;
      if (bubbleEdge === 'right') {
        bubbleBtn.style.left = `${window.innerWidth - bubbleWidth/2}px`;
      } else if (bubbleEdge === 'left') {
        bubbleBtn.style.left = `-${bubbleWidth/2}px`;
      }
    });
  
    // ------------- Start Up -------------
    loadNotes();
    renderNotesList();
    if (notes.length > 0) {
      currentNoteId = notes[0].id;
      loadCurrentNote();
    }
    if (isMinimized) {
      appContainer.style.display = 'none';
      bubbleBtn.style.display = 'block';
    } else {
      appContainer.style.display = 'flex';
    }
    updateUIText();
  
    // Set the bubble by default on the right if not dragged
    setTimeout(() => {
      const bubbleWidth = bubbleBtn.offsetWidth;
      bubbleEdge = 'right';
      bubbleBtn.style.left = `${window.innerWidth - bubbleWidth/2}px`;
      bubbleBtn.style.display = 'block';
    }, 0);
  
  })();
  