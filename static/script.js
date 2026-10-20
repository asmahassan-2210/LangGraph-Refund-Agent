function getApiUrl() {
    // Automatically uses the current browser domain and port (e.g. http://127.0.0.1:8080)
    return window.location.origin;
}

function generateRandomThread() {
    const randomId = 'thread-' + Math.random().toString(36).substring(2, 9);
    document.getElementById('support-thread-id').value = randomId;
}

function setPreset(type) {
    const threadInput = document.getElementById('support-thread-id');
    if (!threadInput.value) {
        generateRandomThread();
    }
    const msgBox = document.getElementById('support-message');
    if (type === 'broken') {
        msgBox.value = "Hi, I received my order ORD-1001 yesterday but the screen is completely shattered. I need a full refund immediately.";
    } else if (type === 'late') {
        msgBox.value = "Hello, order ORD-1005 was supposed to arrive last week according to tracking, but it hasn't shown up. Can I get a refund?";
    } else if (type === 'general') {
        msgBox.value = "Can you check the current status of order ORD-1009 for me please?";
    }
}

async function testConnection() {
    const indicator = document.getElementById('connection-indicator');
    const statusText = document.getElementById('connection-status');
    const baseUrl = getApiUrl();
    
    statusText.textContent = "Connecting...";
    indicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 pulse-dot";

    try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
            const data = await response.json();
            indicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
            statusText.textContent = "FastAPI Connected";
            updateOutput({ status: "healthy", endpoint_health: data });
        } else {
            throw new Error('Server returned status ' + response.status);
        }
    } catch (err) {
        indicator.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
        statusText.textContent = "Connection Failed";
        updateOutput({ error: err.message, hint: "Make sure your FastAPI server is running via python main.py or uvicorn" });
    }
}

async function submitSupportRequest(event) {
    event.preventDefault();
    const threadId = document.getElementById('support-thread-id').value.trim();
    const message = document.getElementById('support-message').value.trim();
    const baseUrl = getApiUrl();

    // Set review thread ID automatically for user convenience
    document.getElementById('review-thread-id').value = threadId;

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Agent Graph...`;

    try {
        const response = await fetch(`${baseUrl}/support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: threadId, message: message })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'API Error occurred');

        updateOutput(data);
        handleBannerState(data);
    } catch (err) {
        updateOutput({ error: err.message });
        showBanner('Error', err.message, 'bg-rose-950 border-rose-800 text-rose-200', 'fa-triangle-exclamation text-rose-400', 'FAILED');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send to Support Agent`;
    }
}

async function submitReview(approved) {
    const threadId = document.getElementById('review-thread-id').value.trim();
    const baseUrl = getApiUrl();

    if (!threadId) {
        alert('Please specify a Thread ID to review.');
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/review/${encodeURIComponent(threadId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved: approved })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Review Error');

        updateOutput(data);
        handleBannerState(data);
    } catch (err) {
        updateOutput({ error: err.message });
        showBanner('Review Error', err.message, 'bg-rose-950 border-rose-800 text-rose-200', 'fa-triangle-exclamation text-rose-400', 'FAILED');
    }
}

function updateOutput(data) {
    document.getElementById('output-pre').textContent = JSON.stringify(data, null, 2);
    document.getElementById('response-timestamp').textContent = new Date().toLocaleTimeString();
}

function handleBannerState(data) {
    if (data.status === 'awaiting_approval') {
        showBanner(
            'Human Review Required', 
            `Thread paused at human_review node. Interrupt details: ${JSON.stringify(data.interrupts || [])}`, 
            'bg-amber-950/80 border-amber-800/80 text-amber-200', 
            'fa-user-clock text-amber-400', 
            'AWAITING APPROVAL'
        );
    } else if (data.status === 'completed') {
        showBanner(
            'Agent Execution Completed', 
            `Decision rendered: ${data.decision || 'N/A'}. Response generated successfully.`, 
            'bg-emerald-950/80 border-emerald-800/80 text-emerald-200', 
            'fa-circle-check text-emerald-400', 
            'COMPLETED'
        );
    }
}

function showBanner(title, desc, cssClasses, iconClass, badgeText) {
    const banner = document.getElementById('status-banner');
    banner.className = `mb-4 p-3 rounded-lg border text-xs flex items-center justify-between ${cssClasses}`;
    document.getElementById('banner-title').textContent = title;
    document.getElementById('banner-desc').textContent = desc;
    document.getElementById('banner-icon').className = `fa-solid ${iconClass} text-base`;
    const badge = document.getElementById('banner-status-badge');
    badge.textContent = badgeText;
    badge.className = `px-2 py-0.5 rounded font-mono text-[10px] uppercase ${badgeText === 'COMPLETED' ? 'bg-emerald-900 text-emerald-200' : badgeText === 'AWAITING_APPROVAL' || badgeText === 'AWAITING APPROVAL' ? 'bg-amber-900 text-amber-200' : 'bg-rose-900 text-rose-200'}`;
    banner.classList.remove('hidden');
}

function clearLogs() {
    document.getElementById('output-pre').textContent = '// Logs cleared.';
    document.getElementById('status-banner').classList.add('hidden');
}

// Run initial health check on load
window.onload = () => {
    generateRandomThread();
    testConnection();
};