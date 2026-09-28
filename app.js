import { 
    auth, 
    db, 
    signInAnonymously, 
    onAuthStateChanged, 
    collection, 
    addDoc, 
    serverTimestamp 
} from './firebase-config.js';

const feedbackForm = document.getElementById('feedbackForm');
const submitBtn = document.getElementById('submitBtn');
const statusMessage = document.getElementById('statusMessage');
const ratingLabel = document.getElementById('ratingLabel');
let isAuthReady = false;

const ratingTexts = {
    '1': '⭐ 1 Star — Needs Improvement',
    '2': '⭐⭐ 2 Stars — Fair Experience',
    '3': '⭐⭐⭐ 3 Stars — Good Event',
    '4': '⭐⭐⭐⭐ 4 Stars — Great Vibes!',
    '5': '⭐⭐⭐⭐⭐ 5 Stars — Absolutely Amazing! 🎉'
};

// Update rating label on selection with bouncy pop active class
document.querySelectorAll('input[name="rating"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (ratingLabel) {
            ratingLabel.textContent = ratingTexts[e.target.value] || 'Rating selected';
            ratingLabel.className = 'star-feedback-label active';
        }
    });
});

// 1. Silent Anonymous Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        isAuthReady = true;
        console.log("Authenticated silently as anonymous attendee.");
    } else {
        signInAnonymously(auth).catch((error) => {
            console.error("Auth error:", error);
            showStatus("Failed to establish secure connection. Please refresh.", "error");
        });
    }
});

// Helper to show status messages with playful badges
function showStatus(message, type) {
    const icon = type === 'success' ? '🎉' : '⚠️';
    statusMessage.innerHTML = `<span style="font-size: 1.4rem;">${icon}</span><span>${message}</span>`;
    statusMessage.className = `message ${type}`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        statusMessage.className = 'message';
    }, 5000);
}

// 2. Form Submission Logic
feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isAuthReady) {
        showStatus("Connecting to secure server, please wait a moment...", "error");
        return;
    }

    const experience = document.getElementById('experience').value.trim();
    const improvements = document.getElementById('improvements').value.trim();
    const ratingElement = document.querySelector('input[name="rating"]:checked');
    
    if (!ratingElement) {
        showStatus("Please choose a star rating!", "error");
        return;
    }

    const rating = parseInt(ratingElement.value, 10);

    // Disable button to prevent double submission
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Submitting Feedback...</span> <span class="btn-icon-bubble">⏳</span>`;

    try {
        await addDoc(collection(db, 'feedbacks'), {
            experience: experience,
            improvements: improvements,
            rating: rating,
            createdAt: serverTimestamp()
        });

        showStatus("Thank you! Your feedback has been recorded.", "success");
        feedbackForm.reset();
        
        if (ratingElement) ratingElement.checked = false;
        if (ratingLabel) {
            ratingLabel.textContent = 'Select your rating';
            ratingLabel.className = 'star-feedback-label';
        }
        
    } catch (error) {
        console.error("Error writing document: ", error);
        showStatus("An error occurred while submitting. Please try again.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Send Feedback</span> <span class="btn-icon-bubble">&rarr;</span>`;
    }
});
