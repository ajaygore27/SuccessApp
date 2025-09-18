// SuccessApp - Main Application Logic
// Combines Daily Task Tracker, Timetable, and Gratitude Journal

// Global state
let currentUser = null; // set after Firebase Auth (Google only)
let currentTab = 'tasks';
let tasks = { signal: [], noise: [] };
let gratitudeEntries = [];

// Timetable blocks data
const timetableBlocks = [
    ["5:00 – 5:20 AM", "Wake up + Brush/Toilet", "Fresh start, light stretching"],
    ["5:20 – 5:50 AM", "Self-Hypnosis", "Deep focus for clarity & calm"],
    ["5:50 – 6:20 AM", "Reading", "Personal growth / Scrum/Agile"],
    ["6:20 – 6:35 AM", "Affirmations", "Positive mindset"],
    ["6:35 – 6:40 AM", "Scribing (journaling)", "Reflection / gratitude"],
    ["6:40 – 6:45 AM", "Short Exercise", "Push-ups, stretches, warm-up"],
    ["6:45 – 7:30 AM", "Walking", "Physical activity + freshness"],
    ["7:30 – 7:50 AM", "Breakfast", "Healthy meal"],
    ["7:50 – 9:20 AM", "Flex Time", "Reading / Scrum practice / relax"],
    ["9:30 – 11:30 AM", "Job Search", "Naukri + LinkedIn + Scrum prep"],
    ["11:30 – 1:00 PM", "Study/Project Work", "Continue Scrum/Agile skill-building"],
    ["1:00 – 1:30 PM", "Buffer + Light Break", "Stretch, hydrate"],
    ["1:30 – 2:00 PM", "Lunch", "Balanced meal"],
    ["2:00 – 3:00 PM", "Mock Interview", "Practice real scenarios"],
    ["3:00 – 3:50 PM", "Rest / Buffer", "Power nap or relax"],
    ["4:00 – 5:00 PM", "Mock Interview", "Skill reinforcement"],
    ["5:00 – 6:30 PM", "Study / Learning / Preparation", "Focused Scrum/Agile deep dive"],
    ["6:30 – 7:15 PM", "Buffer + Relax", "Tea break, light walk"],
    ["7:30 – 9:00 PM", "Focused Study / Preparation", "High-focus zone"],
    ["9:00 – 9:30 PM", "Dinner", "Light, healthy meal"],
    ["9:30 – 10:00 PM", "Evening Walk", "Digestive walk + reflection"],
    ["10:00 – 10:15 PM", "Wind Down", "Journaling / light reading"],
    ["10:15 – 10:30 PM", "Prep for Sleep", "Phone-free zone"],
    ["10:30 PM", "Sleep", "~6.5 hrs rest"]
];

// Timetable state depends on timetableBlocks length
let timetableState = { done: Array(timetableBlocks.length).fill(false), compact: false };

// Gratitude prompts
const gratitudePrompts = [
    "What made you smile today?",
    "Who are you thankful for right now?",
    "What small pleasure did you enjoy today?",
    "What challenge helped you grow?",
    "What in nature are you grateful for?",
    "What skill or ability are you thankful to have?",
    "What memory brings you joy?",
    "What opportunity are you grateful for?"
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Wait for auth state; Google sign-in only
    await ensureAuth();
    updateAuthUI();
    
    // Initialize tab navigation
    initializeTabs();
    
    // Initialize date inputs
    initializeDateInputs();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Load data only if signed in
    if (currentUser) {
        await loadAllData();
    } else {
        clearAllData();
    }
    
    // Set initial tab
    showTab('tasks');

    // Optional: auto-start sign-in flow if URL has ?login=1
    try {
        const params = new URLSearchParams(window.location.search);
        if (!currentUser && typeof auth !== 'undefined' && typeof googleProvider !== 'undefined' && params.get('login') === '1') {
            console.log('[Auth] Auto-start redirect sign-in due to login=1');
            await auth.signInWithRedirect(googleProvider);
        }
    } catch (e) {
        console.warn('[Auth] Auto-login error:', e);
    }
}

// Auth helpers
async function ensureAuth() {
    return new Promise((resolve) => {
        if (typeof auth === 'undefined') {
            currentUser = null;
            return resolve();
        }
        // Handle redirect results once on load (ignore if none)
        auth.getRedirectResult().catch((e) => {
            console.warn('Redirect sign-in result error:', e);
        });
        let resolved = false;
        auth.onAuthStateChanged((user) => {
            // Clean up any existing realtime listeners on user switch
            if (unsubscribeTasks) { unsubscribeTasks(); unsubscribeTasks = null; }
            if (unsubscribeTimetable) { unsubscribeTimetable(); unsubscribeTimetable = null; }
            if (unsubscribeGratitude) { unsubscribeGratitude(); unsubscribeGratitude = null; }
            
            if (user) {
                currentUser = {
                    uid: user.uid,
                    isAnonymous: !!user.isAnonymous,
                    displayName: user.displayName || '',
                    email: user.email || ''
                };
            } else {
                currentUser = null;
                clearAllData();
                // If not on signin page, redirect there
                try {
                    const isSignInPage = /signin\.html($|\?)/.test(window.location.pathname) || window.location.pathname.endsWith('/');
                    if (!isSignInPage) {
                        window.location.href = 'signin.html';
                    }
                } catch {}
            }
            updateAuthUI();
            if (!resolved) { resolved = true; resolve(); }
            // After initial resolve, refresh data on subsequent auth changes
            if (currentUser) {
                loadAllData();
                // If on signin page, go to app
                try {
                    if (/signin\.html($|\?)/.test(window.location.pathname)) {
                        window.location.href = 'index.html';
                    }
                } catch {}
            }
        });
    });
}

function updateAuthUI() {
    const info = document.getElementById('userInfo');
    const msg = document.getElementById('authMessage');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const overlay = document.getElementById('authOverlay');
    if (!info) return;
    if (currentUser && currentUser.uid) {
        info.style.display = 'block';
        const nameOrEmail = currentUser.displayName || currentUser.email || currentUser.uid.slice(0, 6) + '…';
        info.textContent = nameOrEmail;
        if (msg) { msg.textContent = ''; }
        if (signInBtn) signInBtn.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'inline-block';
        if (overlay) overlay.style.display = 'none';
    } else {
        info.style.display = 'block';
        info.textContent = 'Signed out';
        if (msg) { msg.textContent = 'Please sign in to save and sync your data.'; }
        if (signInBtn) signInBtn.style.display = 'inline-block';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (overlay) overlay.style.display = 'flex';
    }
}

// Auth UI actions
document.addEventListener('DOMContentLoaded', () => {
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const overlaySignInBtn = document.getElementById('overlaySignInBtn');
    if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
            try {
                if (typeof auth !== 'undefined' && typeof googleProvider !== 'undefined') {
                    console.log('[Auth] Starting redirect sign-in');
                    await auth.signInWithRedirect(googleProvider);
                }
            } catch (e) {
                const msg = document.getElementById('authMessage');
                if (msg) { msg.textContent = 'Sign-in failed. Check popup/redirect settings.'; }
                alert('Sign-in failed. See console for details.');
                console.error(e);
            }
        });
    }
    if (overlaySignInBtn) {
        overlaySignInBtn.addEventListener('click', async () => {
            const clickTarget = document.getElementById('signInBtn');
            if (clickTarget) clickTarget.click();
        });
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                if (typeof auth !== 'undefined') {
                    await auth.signOut();
                    alert('Signed out');
                    try { window.location.href = 'signin.html'; } catch {}
                }
            } catch (e) {
                alert('Sign-out failed. See console for details.');
                console.error(e);
            }
        });
    }
});

// Tab Navigation
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            showTab(tabName);
        });
    });
}

function showTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Show active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
    
    // Load specific data for the tab
    if (currentUser) {
        switch(tabName) {
            case 'tasks':
                loadTasks();
                break;
            case 'timetable':
                loadTimetable();
                break;
            case 'gratitude':
                loadGratitudeEntries();
                break;
        }
    }
}

// Date Inputs
function initializeDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    
    // Set today's date for all date inputs
    document.getElementById('taskDate').value = today;
    document.getElementById('gratitudeDate').value = today;
    
    // Today button for tasks
    document.getElementById('todayBtn').addEventListener('click', () => {
        document.getElementById('taskDate').value = today;
        loadTasks();
    });
    
    // Date change listeners
    document.getElementById('taskDate').addEventListener('change', loadTasks);
    document.getElementById('gratitudeDate').addEventListener('change', loadGratitudeEntries);
}

// Event Listeners
function initializeEventListeners() {
    // Task input enter key
    document.getElementById('signalInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask('signal');
    });
    
    document.getElementById('noiseInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask('noise');
    });
    
    // Timetable controls
    document.getElementById('markAllDone').addEventListener('click', markAllTimetableDone);
    document.getElementById('resetToday').addEventListener('click', resetTimetableToday);
    document.getElementById('compactToggle').addEventListener('click', toggleTimetableCompact);
    
    // Gratitude calendar button
    document.getElementById('gratitudeCalendarBtn').addEventListener('click', showCalendar);
    
    // Modal close
    document.getElementById('calendarModal').addEventListener('click', (e) => {
        if (e.target.id === 'calendarModal') {
            closeCalendar();
        }
    });
}

function ensureSignedInOrNotify() {
    if (!currentUser || !currentUser.uid) {
        alert('Please sign in with Google to save your data.');
        return false;
    }
    return true;
}

// Data Loading
async function loadAllData() {
    await Promise.all([
        loadTasks(),
        loadTimetable(),
        loadGratitudeEntries()
    ]);
}

function clearAllData() {
    tasks = { signal: [], noise: [] };
    timetableState = { done: Array(timetableBlocks.length).fill(false), compact: false };
    gratitudeEntries = [];
    
    renderTasks();
    renderTimetable();
    renderGratitudeEntries();
}

// Task Management
// Active Firestore listeners so changes sync in realtime across devices
let unsubscribeTasks = null;
let unsubscribeTimetable = null;
let unsubscribeGratitude = null;

async function loadTasks() {
    if (!currentUser) return;
    
    const selectedDate = document.getElementById('taskDate').value;
    const tasksRef = db.collection('users').doc(currentUser.uid)
        .collection('tasks').doc(selectedDate);
    
    try {
        // Detach old listener
        if (unsubscribeTasks) { unsubscribeTasks(); unsubscribeTasks = null; }
        // Attach realtime listener
        unsubscribeTasks = tasksRef.onSnapshot((snapshot) => {
            if (snapshot.exists) {
                tasks = snapshot.data();
            } else {
                tasks = { signal: [], noise: [] };
            }
            renderTasks();
        }, (error) => {
            console.error('Tasks listener error:', error);
        });
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function saveTasks() {
    if (!ensureSignedInOrNotify()) return;
    
    const selectedDate = document.getElementById('taskDate').value;
    const tasksRef = db.collection('users').doc(currentUser.uid)
        .collection('tasks').doc(selectedDate);
    
    try {
        await tasksRef.set(tasks);
    } catch (error) {
        console.error('Error saving tasks:', error);
    }
}

function addTask(type) {
    if (!ensureSignedInOrNotify()) return;
    
    const input = document.getElementById(`${type}Input`);
    const text = input.value.trim();
    
    if (text === '') return;
    
    const task = {
        id: generateId(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks[type].push(task);
    input.value = '';
    
    saveTasks();
    renderTasks();
}

function toggleTask(type, id) {
    if (!ensureSignedInOrNotify()) return;
    const task = tasks[type].find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

function deleteTask(type, id) {
    if (!ensureSignedInOrNotify()) return;
    tasks[type] = tasks[type].filter(t => t.id !== id);
    saveTasks();
    renderTasks();
}

function renderTasks() {
    ['signal', 'noise'].forEach(type => {
        const container = document.getElementById(`${type}Tasks`);
        
        if (tasks[type].length === 0) {
            container.innerHTML = '<li class="empty-state">No tasks yet. Add one above!</li>';
            return;
        }
        
        container.innerHTML = tasks[type].map(task => `
            <li class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-checkbox ${task.completed ? 'completed' : ''}" 
                     onclick="toggleTask('${type}', '${task.id}')"></div>
                <span class="task-text">${escapeHtml(task.text)}</span>
                <button class="delete-btn" onclick="deleteTask('${type}', '${task.id}')">&times;</button>
            </li>
        `).join('');
    });
}

// Timetable Management
async function loadTimetable() {
    if (!currentUser) { renderTimetable(); return; }

    const today = new Date().toISOString().split('T')[0];
    const timetableRef = db.collection('users').doc(currentUser.uid)
        .collection('timetable').doc(today);

    try {
        if (unsubscribeTimetable) { unsubscribeTimetable(); unsubscribeTimetable = null; }
        unsubscribeTimetable = timetableRef.onSnapshot((snapshot) => {
            if (snapshot.exists) {
                timetableState = snapshot.data();
            } else {
                timetableState = { done: Array(timetableBlocks.length).fill(false), compact: false };
            }
            renderTimetable();
        }, (error) => {
            console.warn('Timetable listener error:', error);
            renderTimetable();
        });
    } catch (error) {
        console.warn('Falling back to local timetable (Firestore unavailable):', error);
        timetableState = { done: Array(timetableBlocks.length).fill(false), compact: false };
        renderTimetable();
    }
}

async function saveTimetable() {
    if (!ensureSignedInOrNotify()) { renderTimetable(); return; }
    
    const today = new Date().toISOString().split('T')[0];
    const timetableRef = db.collection('users').doc(currentUser.uid)
        .collection('timetable').doc(today);
    
    try {
        await timetableRef.set(timetableState);
    } catch (error) {
        console.warn('Could not save to Firestore, keeping local only:', error);
    }
}

function toggleTimetableBlock(index) {
    if (!ensureSignedInOrNotify()) return;
    timetableState.done[index] = !timetableState.done[index];
    saveTimetable();
    renderTimetable();
}

function markAllTimetableDone() {
    if (!ensureSignedInOrNotify()) return;
    timetableState.done = timetableState.done.map(() => true);
    saveTimetable();
    renderTimetable();
}

function resetTimetableToday() {
    if (!ensureSignedInOrNotify()) return;
    if (confirm('Reset all tasks for today?')) {
        timetableState.done = timetableState.done.map(() => false);
        saveTimetable();
        renderTimetable();
    }
}

function toggleTimetableCompact() {
    timetableState.compact = !timetableState.compact;
    saveTimetable();
    renderTimetable();
}

function renderTimetable() {
    const container = document.getElementById('timetableList');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const doneCount = document.getElementById('doneCount');
    const leftCount = document.getElementById('leftCount');
    const currentBlock = document.getElementById('currentBlock');
    
    // Calculate progress
    const total = timetableState.done.length;
    const done = timetableState.done.filter(Boolean).length;
    const progress = Math.round(done / total * 100);
    
    // Update progress bar
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}% complete`;
    doneCount.textContent = `${done} done`;
    leftCount.textContent = `${total - done} left`;
    
    // Find current block
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    let currentBlockText = '—';
    
    // Render blocks
    container.innerHTML = timetableBlocks.map((block, index) => {
        const [time, activity, notes] = block;
        const isDone = timetableState.done[index];
        const isNow = isCurrentTimeBlock(time, currentTime);
        
        if (isNow) {
            currentBlockText = activity;
        }
        
        return `
            <div class="timetable-block ${isDone ? 'done' : ''} ${isNow ? 'now' : ''}" 
                 onclick="toggleTimetableBlock(${index})"
                 style="padding: ${timetableState.compact ? '10px 12px' : '15px'}">
                <div class="timetable-time">${time}</div>
                <div>
                    <div class="timetable-activity">${activity}</div>
                    <div class="timetable-notes">${notes}</div>
                </div>
                <div class="timetable-actions">
                    <button class="toggle-btn" onclick="event.stopPropagation(); toggleTimetableBlock(${index})">
                        ${isDone ? 'Completed ✓' : 'Mark Done'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    currentBlock.textContent = currentBlockText;
}

function isCurrentTimeBlock(timeStr, currentMinutes) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return false;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = (match[3] || '').toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const blockStart = hours * 60 + minutes;
    const blockEnd = blockStart + 30; // Assume 30-minute blocks
    
    return currentMinutes >= blockStart && currentMinutes < blockEnd;
}

// Gratitude Journal Management
async function loadGratitudeEntries() {
    if (!currentUser) { renderGratitudeEntries(); return; }
    
    const selectedDate = document.getElementById('gratitudeDate').value;
    const localKey = `gratitude_${selectedDate}`;
    try {
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        gratitudeEntries = local;
        renderGratitudeEntries();
    } catch {}
    
    try {
        if (typeof db !== 'undefined') {
            if (unsubscribeGratitude) { unsubscribeGratitude(); unsubscribeGratitude = null; }
            const gratitudeRef = db.collection('users').doc(currentUser.uid)
                .collection('gratitude').where('date', '==', selectedDate)
                .orderBy('timestamp', 'desc');
            unsubscribeGratitude = gratitudeRef.onSnapshot((snapshot) => {
                const fromDb = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                gratitudeEntries = fromDb;
                localStorage.setItem(localKey, JSON.stringify(fromDb));
                renderGratitudeEntries();
            }, (error) => {
                console.warn('Using local gratitude entries (listener error):', error);
            });
        }
    } catch (error) {
        console.warn('Using local gratitude entries (Firestore unavailable):', error);
    }
}

async function addGratitudeEntry() {
    if (!ensureSignedInOrNotify()) return;
    const text = document.getElementById('gratitudeInput').value.trim();
    const date = document.getElementById('gratitudeDate').value;
    if (text === '') return;
    
    const entry = {
        id: generateId(),
        text,
        date,
        timestamp: new Date().toISOString(),
        prompt: document.getElementById('promptText').textContent
    };
    
    // Update local cache first
    const localKey = `gratitude_${date}`;
    const local = JSON.parse(localStorage.getItem(localKey) || '[]');
    local.unshift(entry);
    localStorage.setItem(localKey, JSON.stringify(local));
    gratitudeEntries = local;
    document.getElementById('gratitudeInput').value = '';
    updateGratitudePrompt();
    renderGratitudeEntries();
    
    // Firestore sync: use the same id so deletes work across refresh
    try {
        if (typeof db !== 'undefined') {
            await db.collection('users').doc(currentUser.uid)
                .collection('gratitude').doc(entry.id).set({ ...entry });
        }
    } catch (error) {
        console.warn('Saved gratitude locally; cloud sync failed:', error);
    }
}

async function deleteGratitudeEntry(id) {
    const date = document.getElementById('gratitudeDate').value;
    const localKey = `gratitude_${date}`;
    const local = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = local.filter(e => e.id !== id);
    localStorage.setItem(localKey, JSON.stringify(updated));
    gratitudeEntries = updated;
    renderGratitudeEntries();
    
    try {
        if (typeof db !== 'undefined') {
            await db.collection('users').doc(currentUser.uid)
                .collection('gratitude').doc(id).delete();
        }
    } catch (error) {
        console.warn('Deleted locally; cloud delete failed:', error);
    }
}

function renderGratitudeEntries() {
    const container = document.getElementById('gratitudeEntries');
    
    if (gratitudeEntries.length === 0) {
        container.innerHTML = '<div class="empty-state">No entries for this date. Add your first gratitude entry!</div>';
        return;
    }
    
    container.innerHTML = gratitudeEntries.map(entry => `
        <div class="gratitude-entry">
            <div class="gratitude-entry-header">
                <span class="gratitude-date">${formatDate(entry.date)}</span>
                <button class="delete-btn" onclick="deleteGratitudeEntry('${entry.id}')">&times;</button>
            </div>
            <div class="gratitude-text">${escapeHtml(entry.text)}</div>
        </div>
    `).join('');
}

function updateGratitudePrompt() {
    const promptText = document.getElementById('promptText');
    const randomPrompt = gratitudePrompts[Math.floor(Math.random() * gratitudePrompts.length)];
    promptText.textContent = randomPrompt;
}

// Calendar Functions
function showCalendar() {
    const modal = document.getElementById('calendarModal');
    const container = document.getElementById('calendarContainer');
    
    // Generate calendar HTML
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    let calendarHTML = `
        <div class="calendar-header">
            <button onclick="previousMonth()">&lt;</button>
            <h4>${currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
            <button onclick="nextMonth()">&gt;</button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
    `;
    
    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = currentMonth.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = date.toISOString().split('T')[0];
        const isToday = dateString === today.toISOString().split('T')[0];
        const isSelected = dateString === document.getElementById('gratitudeDate').value;
        
        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                 onclick="selectCalendarDate('${dateString}')">
                ${day}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    container.innerHTML = calendarHTML;
    modal.style.display = 'block';
}

function closeCalendar() {
    document.getElementById('calendarModal').style.display = 'none';
}

function selectCalendarDate(dateString) {
    document.getElementById('gratitudeDate').value = dateString;
    closeCalendar();
    loadGratitudeEntries();
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Initialize gratitude prompt on load
updateGratitudePrompt();
