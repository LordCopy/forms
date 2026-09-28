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
    orderBy,
    deleteDoc,
    doc,
    writeBatch
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

// Modals and Action Buttons
const openArchiveModalBtn = document.getElementById('openArchiveModalBtn');
const openClearModalBtn = document.getElementById('openClearModalBtn');
const openArchiveListBtn = document.getElementById('openArchiveListBtn');

const archiveModal = document.getElementById('archiveModal');
const closeArchiveModalBtn = document.getElementById('closeArchiveModalBtn');
const archiveForm = document.getElementById('archiveForm');
const archiveEventName = document.getElementById('archiveEventName');
const archiveFeedbackPreview = document.getElementById('archiveFeedbackPreview');
const archiveIssuesPreview = document.getElementById('archiveIssuesPreview');
const archiveNotesPreview = document.getElementById('archiveNotesPreview');
const archiveWipeActiveCheckbox = document.getElementById('archiveWipeActiveCheckbox');
const archiveSubmitBtn = document.getElementById('archiveSubmitBtn');

const clearModal = document.getElementById('clearModal');
const closeClearModalBtn = document.getElementById('closeClearModalBtn');
const clearForm = document.getElementById('clearForm');
const clearConfirmInput = document.getElementById('clearConfirmInput');
const clearSubmitBtn = document.getElementById('clearSubmitBtn');

const archiveListModal = document.getElementById('archiveListModal');
const closeArchiveListModalBtn = document.getElementById('closeArchiveListModalBtn');
const archivedList = document.getElementById('archivedList');

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
        fetchAllData();
    } else {
        isAuthReady = false;
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
});

function fetchAllData() {
    fetchMistakes();
    fetchFeedbacks();
    fetchNotes();
}

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

// =========================================================================
// 7. Modals & Data Lifecycle (Archive & Clear All with Confirmation)
// =========================================================================

// Modal Toggle Helpers
function openModal(modal) {
    modal.classList.add('open');
}

function closeModal(modal) {
    modal.classList.remove('open');
}

// Archive Modal Open
if (openArchiveModalBtn) {
    openArchiveModalBtn.addEventListener('click', () => {
        if (archiveFeedbackPreview) archiveFeedbackPreview.textContent = feedbackCountEl.textContent || '0';
        if (archiveIssuesPreview) archiveIssuesPreview.textContent = mistakesCountEl.textContent || '0';
        if (archiveNotesPreview) archiveNotesPreview.textContent = notesCountEl.textContent || '0';
        if (archiveEventName) archiveEventName.value = '';
        openModal(archiveModal);
    });
}

if (closeArchiveModalBtn) {
    closeArchiveModalBtn.addEventListener('click', () => closeModal(archiveModal));
}

// Clear All Modal Open
if (openClearModalBtn) {
    openClearModalBtn.addEventListener('click', () => {
        if (clearConfirmInput) clearConfirmInput.value = '';
        if (clearSubmitBtn) clearSubmitBtn.disabled = true;
        openModal(clearModal);
    });
}

if (closeClearModalBtn) {
    closeClearModalBtn.addEventListener('click', () => closeModal(clearModal));
}

// Type "CONFIRM" unlock logic
if (clearConfirmInput) {
    clearConfirmInput.addEventListener('input', (e) => {
        if (clearSubmitBtn) {
            clearSubmitBtn.disabled = e.target.value.trim().toUpperCase() !== 'CONFIRM';
        }
    });
}

// Archive List Modal Open
if (openArchiveListBtn) {
    openArchiveListBtn.addEventListener('click', () => {
        openModal(archiveListModal);
        fetchArchivedEvents();
    });
}

if (closeArchiveListModalBtn) {
    closeArchiveListModalBtn.addEventListener('click', () => closeModal(archiveListModal));
}

// Close modals on clicking backdrop
[archiveModal, clearModal, archiveListModal].forEach(modal => {
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    }
});

// Close modals on Escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        [archiveModal, clearModal, archiveListModal].forEach(modal => {
            if (modal && modal.classList.contains('open')) closeModal(modal);
        });
    }
});

// Helper: Delete all documents in a collection
async function deleteCollectionDocs(collectionName) {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    const deletePromises = [];
    snapshot.forEach(d => {
        deletePromises.push(deleteDoc(doc(db, collectionName, d.id)));
    });
    await Promise.all(deletePromises);
}

// Helper: Extract all document data from a collection
async function getCollectionData(collectionName) {
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    const items = [];
    snapshot.forEach(d => {
        const item = d.data();
        // Convert timestamp to ISO string for storage/export
        if (item.createdAt && item.createdAt.toDate) {
            item.createdAtISO = item.createdAt.toDate().toISOString();
        }
        items.push({ id: d.id, ...item });
    });
    return items;
}

// 8. Handle Archiving an Event
if (archiveForm) {
    archiveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAuthReady) return;

        const eventName = archiveEventName.value.trim();
        const shouldWipeActive = archiveWipeActiveCheckbox.checked;
        
        archiveSubmitBtn.disabled = true;
        archiveSubmitBtn.innerHTML = `<span>Archiving Event...</span> <span class="btn-icon-bubble">⏳</span>`;

        try {
            // 1. Gather all current active data
            const [feedbacks, mistakes, notes] = await Promise.all([
                getCollectionData('feedbacks'),
                getCollectionData('event_mistakes'),
                getCollectionData('admin_notes')
            ]);

            // Calculate average rating
            let totalRating = 0;
            feedbacks.forEach(f => { totalRating += (parseInt(f.rating, 10) || 0); });
            const avgRating = feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(1) : '0';

            // 2. Save bundle to 'archived_events' collection
            await addDoc(collection(db, 'archived_events'), {
                eventName: eventName,
                archivedAt: serverTimestamp(),
                metrics: {
                    totalFeedbacks: feedbacks.length,
                    averageRating: avgRating,
                    totalIssues: mistakes.length,
                    totalNotes: notes.length
                },
                feedbacks: feedbacks,
                mistakes: mistakes,
                notes: notes
            });

            // 3. If selected, wipe active dashboard records
            if (shouldWipeActive) {
                await Promise.all([
                    deleteCollectionDocs('feedbacks'),
                    deleteCollectionDocs('event_mistakes'),
                    deleteCollectionDocs('admin_notes')
                ]);
            }

            closeModal(archiveModal);
            showStatus(`Event "${eventName}" archived successfully! ${shouldWipeActive ? 'Active board reset.' : ''}`, 'success');
            fetchAllData();

        } catch (error) {
            console.error("Error archiving event:", error);
            showStatus("Failed to archive event. Please try again.", "error");
        } finally {
            archiveSubmitBtn.disabled = false;
            archiveSubmitBtn.innerHTML = `<span>Archive Event</span> <span class="btn-icon-bubble">&rarr;</span>`;
        }
    });
}

// 9. Handle Permanently Wiping Active Data
if (clearForm) {
    clearForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isAuthReady) return;

        clearSubmitBtn.disabled = true;
        clearSubmitBtn.innerHTML = `<span>Wiping Data...</span> <span class="btn-icon-bubble">⏳</span>`;

        try {
            await Promise.all([
                deleteCollectionDocs('feedbacks'),
                deleteCollectionDocs('event_mistakes'),
                deleteCollectionDocs('admin_notes')
            ]);

            closeModal(clearModal);
            showStatus("All active feedbacks, issues, and notes have been cleared.", "success");
            fetchAllData();

        } catch (error) {
            console.error("Error wiping data:", error);
            showStatus("Database error while wiping data.", "error");
        } finally {
            clearSubmitBtn.disabled = false;
            clearSubmitBtn.innerHTML = `<span>Permanently Wipe All Data</span> <span class="btn-icon-bubble">🗑️</span>`;
        }
    });
}

// 10. Fetch and Display Past Archived Events
async function fetchArchivedEvents() {
    try {
        const q = query(collection(db, "archived_events"), orderBy("archivedAt", "desc"));
        const querySnapshot = await getDocs(q);

        archivedList.innerHTML = '';

        if (querySnapshot.empty) {
            archivedList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <p style="font-weight: 700; color: var(--text-main);">No archived events yet</p>
                    <p class="subtitle" style="font-size: 0.9rem; margin-top: 0.25rem;">Use "Archive Event" on the main dashboard to store historical records.</p>
                </div>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = data.archivedAt ? data.archivedAt.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown Date';
            const metrics = data.metrics || { totalFeedbacks: 0, averageRating: '0', totalIssues: 0, totalNotes: 0 };
            
            const card = document.createElement('div');
            card.className = 'archive-card';
            card.innerHTML = `
                <div class="meta">
                    <span style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.15rem; color: var(--text-main);">
                        📦 ${escapeHTML(data.eventName)}
                    </span>
                    <span style="font-size: 0.8rem; font-weight: 600;">${dateStr}</span>
                </div>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: 0.9rem; font-weight: 700;">
                    <span class="rating-stamp">⭐ ${metrics.averageRating}/5 (${metrics.totalFeedbacks} feedbacks)</span>
                    <span class="category-tag logistics">⚡ ${metrics.totalIssues} Issues</span>
                    <span class="category-tag ticketing">📝 ${metrics.totalNotes} Notes</span>
                </div>
                <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                    <button class="btn-secondary export-json-btn" data-id="${docSnap.id}" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.85rem;">
                        📥 Download JSON
                    </button>
                    <button class="btn-danger delete-archive-btn" data-id="${docSnap.id}" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.85rem;">
                        🗑️ Delete
                    </button>
                </div>
            `;
            
            // Attach Export JSON event
            const exportBtn = card.querySelector('.export-json-btn');
            exportBtn.addEventListener('click', () => exportArchiveAsJSON(data));

            // Attach Delete Archive event
            const deleteBtn = card.querySelector('.delete-archive-btn');
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Delete archive "${data.eventName}" permanently?`)) {
                    await deleteDoc(doc(db, 'archived_events', docSnap.id));
                    showStatus(`Archive "${data.eventName}" deleted.`, 'success');
                    fetchArchivedEvents();
                }
            });

            archivedList.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching archived events:", error);
        archivedList.innerHTML = '<div class="empty-state"><p style="color: var(--error); font-weight: 700;">Failed to load archived events.</p></div>';
    }
}

// Export Archive as Downloadable JSON file
function exportArchiveAsJSON(data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.eventName || 'event-archive').toLowerCase().replace(/\s+/g, '-')}-archive.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
