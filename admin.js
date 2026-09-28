import { 
    auth, 
    db, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged, 
    collection, 
    addDoc, 
    getDocs, 
    serverTimestamp, 
    query, 
    orderBy 
} from './firebase-config.js';

const mistakeForm = document.getElementById('mistakeForm');
const adminStatus = document.getElementById('adminStatus');
const mistakesList = document.getElementById('mistakesList');
const feedbackList = document.getElementById('feedbackList');
const noteForm = document.getElementById('noteForm');
const notesList = document.getElementById('notesList');

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

// Stat Counters
const feedbackCountEl = document.getElementById('feedbackCount');
const mistakesCountEl = document.getElementById('mistakesCount');
const notesCountEl = document.getElementById('notesCount');

let isAuthReady = false;

// Category Badge Helper
function getCategoryClass(category) {
    if (!category) return 'other';
    const c = category.toLowerCase();
    if (c.includes('crowd')) return 'crowd';
    if (c.includes('sound')) return 'sound';
    if (c.includes('logistics')) return 'logistics';
    if (c.includes('ticket')) return 'ticketing';
    return 'other';
}

// 1. Authentication State Listener
onAuthStateChanged(auth, (user) => {
    if (user && !user.isAnonymous) {
        isAuthReady = true;
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        logoutBtn.style.display = 'inline-flex';
        
        console.log("Admin authenticated.");
        // Fetch all datasets
        fetchMistakes();
        fetchFeedbacks();
        fetchNotes();
    } else {
        isAuthReady = false;
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span>Signing in...</span> <span class="btn-icon-bubble">⏳</span>`;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showStatus("Welcome back! Signed in successfully.", "success");
        loginForm.reset();
        document.getElementById('adminPassword').type = 'password';
        document.getElementById('showPasswordToggle').checked = false;
    } catch (error) {
        console.error("Login error:", error);
        showStatus("Invalid credentials. Please verify your email and password.", "error");
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<span>Enter Dashboard</span> <span class="btn-icon-bubble">&rarr;</span>`;
    }
});

// Show Password Toggle
const showPasswordToggle = document.getElementById('showPasswordToggle');
if (showPasswordToggle) {
    showPasswordToggle.addEventListener('change', (e) => {
        const adminPassword = document.getElementById('adminPassword');
        adminPassword.type = e.target.checked ? 'text' : 'password';
    });
}

// Logout Handler
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showStatus("Logged out successfully.", "success");
    } catch (error) {
        console.error("Logout error:", error);
    }
});

function showStatus(message, type) {
    const icon = type === 'success' ? '🎉' : '⚠️';
    adminStatus.innerHTML = `<span style="font-size: 1.25rem;">${icon}</span><span>${message}</span>`;
    adminStatus.className = `message ${type}`;
    setTimeout(() => { adminStatus.className = 'message'; }, 4500);
}

// 2. Handle Mistake Logging
mistakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthReady) return;

    const category = document.getElementById('mistakeCategory').value;
    const notes = document.getElementById('mistakeNotes').value.trim();
    const submitBtn = document.getElementById('mistakeSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Saving Issue...</span> <span class="btn-icon-bubble">⏳</span>`;

    try {
        await addDoc(collection(db, 'event_mistakes'), {
            category: category,
            notes: notes,
            createdAt: serverTimestamp()
        });

        showStatus("Event issue recorded successfully.", "success");
        mistakeForm.reset();
        fetchMistakes();
    } catch (error) {
        console.error("Error logging mistake: ", error);
        showStatus("Database error while logging issue.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Log Issue to Database</span> <span class="btn-icon-bubble">+</span>`;
    }
});

// 3. Fetch and Display Event Mistakes
async function fetchMistakes() {
    try {
        const q = query(collection(db, "event_mistakes"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        mistakesList.innerHTML = '';
        if (mistakesCountEl) mistakesCountEl.textContent = querySnapshot.size;
        
        if (querySnapshot.empty) {
            mistakesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎉</div>
                    <p style="font-weight: 600; color: var(--text-main);">No event issues logged yet!</p>
                    <p class="subtitle" style="font-size: 0.85rem; margin-top: 0.25rem;">Log anything that needs improvement above.</p>
                </div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';
            const catClass = getCategoryClass(data.category);
            
            const card = document.createElement('div');
            card.className = 'mistake-card';
            card.innerHTML = `
                <div class="meta">
                    <span class="category-tag ${catClass}">${data.category}</span>
                    <span style="font-size: 0.78rem;">${dateStr}</span>
                </div>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: var(--text-main); font-weight: 500;">
                    ${escapeHTML(data.notes)}
                </p>
            `;
            mistakesList.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching mistakes: ", error);
        mistakesList.innerHTML = '<div class="empty-state"><p style="color: var(--error); font-weight: 700;">Failed to load issues from database.</p></div>';
    }
}

// 4. Handle Note Logging
noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthReady) return;

    const content = document.getElementById('noteContent').value.trim();
    const submitBtn = document.getElementById('noteSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Posting Note...</span> <span class="btn-icon-bubble">⏳</span>`;

    try {
        await addDoc(collection(db, 'admin_notes'), {
            content: content,
            createdAt: serverTimestamp()
        });

        showStatus("Organizer note posted successfully.", "success");
        noteForm.reset();
        fetchNotes();
    } catch (error) {
        console.error("Error posting note: ", error);
        showStatus("Database error while posting note.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Post Organizer Note</span> <span class="btn-icon-bubble">+</span>`;
    }
});

// 5. Fetch and Display Admin Notes
async function fetchNotes() {
    try {
        const q = query(collection(db, "admin_notes"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        notesList.innerHTML = '';
        if (notesCountEl) notesCountEl.textContent = querySnapshot.size;
        
        if (querySnapshot.empty) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <p style="font-weight: 600; color: var(--text-main);">Notice board is empty</p>
                    <p class="subtitle" style="font-size: 0.85rem; margin-top: 0.25rem;">Post quick memos or updates for the organizing team.</p>
                </div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';
            
            const card = document.createElement('div');
            card.className = 'note-card';
            card.innerHTML = `
                <div class="meta">
                    <span style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 0.8rem; color: var(--accent); background: #EDE9FE; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); border: 1.5px solid var(--border-dark);">
                        ✦ ORGANIZER NOTE
                    </span>
                    <span style="font-size: 0.78rem;">${dateStr}</span>
                </div>
                <p style="margin: 0; font-size: 0.95rem; line-height: 1.5; color: var(--text-main); font-weight: 500;">
                    ${escapeHTML(data.content)}
                </p>
            `;
            notesList.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching notes: ", error);
        notesList.innerHTML = '<div class="empty-state"><p style="color: var(--error); font-weight: 700;">Failed to load notes.</p></div>';
    }
}

// 6. Fetch and Display Attendee Feedback
async function fetchFeedbacks() {
    try {
        const q = query(collection(db, "feedbacks"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        feedbackList.innerHTML = '';
        if (feedbackCountEl) feedbackCountEl.textContent = querySnapshot.size;
        
        if (querySnapshot.empty) {
            feedbackList.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">💌</div>
                    <p style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">No attendee feedback received yet</p>
                    <p class="subtitle" style="font-size: 0.9rem; margin-top: 0.25rem;">Share the public form link with attendees to gather live impressions!</p>
                </div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now';
            
            const rating = parseInt(data.rating, 10) || 0;
            const validRating = Math.min(Math.max(rating, 0), 5);
            const starIcons = '★'.repeat(validRating) + '☆'.repeat(5 - validRating);
            
            const experience = data.experience || 'No comment provided';
            const improvements = data.improvements || 'No suggestions provided';
            
            const card = document.createElement('div');
            card.className = 'feedback-card';
            card.innerHTML = `
                <div class="meta">
                    <span class="rating-stamp">
                        ${starIcons} (${validRating}/5)
                    </span>
                    <span style="font-size: 0.78rem;">${dateStr}</span>
                </div>
                <div style="margin-bottom: 0.9rem;">
                    <strong style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-main);">🎉 Loved:</strong>
                    <p style="margin: 0.35rem 0 0 0; font-size: 0.92rem; color: #334155; line-height: 1.5; font-weight: 500;">
                        ${escapeHTML(experience)}
                    </p>
                </div>
                <div>
                    <strong style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-main);">🚀 Future Ideas:</strong>
                    <p style="margin: 0.35rem 0 0 0; font-size: 0.92rem; color: #334155; line-height: 1.5; font-weight: 500;">
                        ${escapeHTML(improvements)}
                    </p>
                </div>
            `;
            feedbackList.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching feedbacks: ", error);
        feedbackList.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><p style="color: var(--error); font-weight: 700;">Failed to load feedback from database.</p></div>';
    }
}

// XSS Protection Helper
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Event listeners for manual refresh buttons
document.getElementById('refreshMistakesBtn').addEventListener('click', fetchMistakes);
document.getElementById('refreshFeedbackBtn').addEventListener('click', fetchFeedbacks);
document.getElementById('refreshNotesBtn').addEventListener('click', fetchNotes);
