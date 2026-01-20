// static/js/chat.js
let isChatOpen = false;
let isTyping = false;
let hasShownWelcome = false;
let chatSessionActive = true;

// Toggle chat with animation
function toggleChat() {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return;

    if (!isChatOpen) {
        chatBox.classList.remove('chat-hidden');
        chatBox.classList.add('chat-visible');
        isChatOpen = true;
        chatSessionActive = true; // Reset chat session when opening

        setTimeout(() => {
            const input = document.getElementById("user-input");
            if (input && chatSessionActive) input.focus();

            if (!hasShownWelcome) {
                const welcomeMsg = chatBox.querySelector('.welcome-message .bot-msg');
                if (welcomeMsg && welcomeMsg.classList.contains('typing-animation')) {
                    setTimeout(() => {
                        showWelcomeMessage(welcomeMsg);
                        hasShownWelcome = true;
                    }, 600);
                }
            }
        }, 220);
    } else {
        chatBox.classList.remove('chat-visible');
        chatBox.classList.add('chat-hidden');
        isChatOpen = false;
    }
}

// Show welcome message (replaces the animated placeholder)
function showWelcomeMessage(element) {
    if (!element) return;
    const botHtml = `
        <div class="message-header">
            <div class="bot-avatar">♟️</div>
            <div class="message-info">
                <span class="sender-name">Chess Assistant</span>
                <span class="message-time">Just now</span>
            </div>
        </div>
        <div class="message-content">
            Hi 👋 Welcome to <strong>CHESS CLASS (SRIVASTAVA)</strong> ♟️❤️<br><br>
            I'm your assistant. I can help you with:<br>
            • 📅 Batches & Timings ⏰<br>
            • 💰 Fee Structure 💵<br>
            • 📝 How to Enroll 🚀<br>
            • 🏆 Tournament Info 🎮<br>
            • 📞 Contact Details 📱<br>
            • 👶 Age Eligibility 👨‍🎓<br><br>
            What would you like to know? 🤔
        </div>
    `;
    element.innerHTML = botHtml;
    element.classList.remove('typing-animation');
    const chatBody = document.getElementById("chat-body");
    if (chatBody) {
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    }
}

// Enter key handler
function handleEnter(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send message
async function sendMessage() {
    // Check if chat session is closed (easter egg triggered)
    if (!chatSessionActive || isTyping) return;

    const input = document.getElementById("user-input");
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    const chatBody = document.getElementById("chat-body");
    const sendButton = document.getElementById("send-button");

    // Clear input immediately
    input.value = "";
    
    // Add User Message
    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-msg';
    userMsg.innerHTML = `
        <div class="message-header">
            <div class="bot-avatar user-avatar">You</div>
            <div class="message-info">
                <span class="sender-name">You</span>
                <span class="message-time">${userMsgTime}</span>
            </div>
        </div>
        <div class="message-content">${escapeHtml(message)}</div>
    `;
    if (chatBody) chatBody.appendChild(userMsg);

    if (sendButton) sendButton.disabled = true;
    input.disabled = true;

    // Scroll to bottom
    if (chatBody) chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });

    // Show typing indicator
    isTyping = true;
    const typingMsg = document.createElement('div');
    typingMsg.className = 'message bot-msg typing-indicator-msg';
    typingMsg.innerHTML = `
        <div class="message-header">
            <div class="bot-avatar">♟️</div>
            <div class="message-info">
                <span class="sender-name">Chess Assistant</span>
                <span class="message-time">Typing...</span>
            </div>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    if (chatBody) chatBody.appendChild(typingMsg);
    if (chatBody) chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });

    try {
        // Simulate AI thinking time (random)
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 800));

        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        // Remove typing indicator
        if (typingMsg && typingMsg.parentNode) typingMsg.parentNode.removeChild(typingMsg);

        // Check if chat should close (easter egg triggered)
        if (data.close_chat === true) {
            chatSessionActive = false;
            
            // Add bot response with special styling for easter egg
            const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const botMsg = document.createElement('div');
            botMsg.className = 'message bot-msg easter-egg-msg';
            botMsg.innerHTML = `
                <div class="message-header">
                    <div class="bot-avatar">💥</div>
                    <div class="message-info">
                        <span class="sender-name">Chess Assistant</span>
                        <span class="message-time">${botTime}</span>
                    </div>
                </div>
                <div class="message-content">${(data.reply || "").replace(/\n/g, '<br>')}</div>
            `;
            if (chatBody) chatBody.appendChild(botMsg);
            
            // Disable input and send button
            if (sendButton) sendButton.disabled = true;
            input.disabled = true;
            input.placeholder = "Chat closed - Refresh page to restart";
            
            // Auto-close chat after 4 seconds
            setTimeout(() => {
                if (isChatOpen) {
                    toggleChat();
                }
            }, 4000);
            
            // Scroll to show the message
            if (chatBody) chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
            return;
        }

        // Add normal bot response
        const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const botMsg = document.createElement('div');
        botMsg.className = 'message bot-msg';
        botMsg.innerHTML = `
            <div class="message-header">
                <div class="bot-avatar">♟️</div>
                <div class="message-info">
                    <span class="sender-name">Chess Assistant</span>
                    <span class="message-time">${botTime}</span>
                </div>
            </div>
            <div class="message-content">${(data.reply || "").replace(/\n/g, '<br>')}</div>
        `;
        if (chatBody) chatBody.appendChild(botMsg);

    } catch (error) {
        console.error("Error:", error);
        if (typingMsg && typingMsg.parentNode) typingMsg.parentNode.removeChild(typingMsg);

        const errorTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const errorMsg = document.createElement('div');
        errorMsg.className = 'message bot-msg error-msg';
        errorMsg.innerHTML = `
            <div class="message-header">
                <div class="bot-avatar">⚠️</div>
                <div class="message-info">
                    <span class="sender-name">Chess Assistant</span>
                    <span class="message-time">${errorTime}</span>
                </div>
            </div>
            <div class="message-content">
                ⚠️ I'm having trouble connecting right now. 🔧<br>
                Please try again in a moment or call <strong>8830435532</strong>. 📞
            </div>
        `;
        if (chatBody) chatBody.appendChild(errorMsg);
    } finally {
        isTyping = false;
        if (chatSessionActive) {
            if (sendButton) sendButton.disabled = false;
            input.disabled = false;
            input.focus();
        }
        if (chatBody) chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
    }
}

// Quick action buttons
function quickAction(action) {
    // Check if chat session is active
    if (!chatSessionActive) {
        alert("Chat session closed. Please refresh the page to restart.");
        return;
    }

    const actions = {
        'batches': 'What are the batch timings?',
        'fees': 'What is the fee structure?',
        'enroll': 'How do I enroll as a student?',
        'contact': 'What is the contact information?',
        'age': 'What age groups do you teach?',
        'tournament': 'Tell me about Sunday tournaments',
        'location': 'Where is the center located?'
    };
    const input = document.getElementById('user-input');
    if (!input) return;
    input.value = actions[action] || '';
    input.focus();
    sendMessage();
}

// Clear chat history
function clearChat() {
    // Check if chat session is active
    if (!chatSessionActive) {
        alert("Chat session closed. Please refresh the page to restart.");
        return;
    }

    const chatBody = document.getElementById("chat-body");
    hasShownWelcome = false;
    chatSessionActive = true; // Reset chat session

    const welcomeMsg = `
        <div class="welcome-message">
            <div class="message bot-msg typing-animation">
                <div class="message-header">
                    <div class="bot-avatar">♟️</div>
                    <div class="message-info">
                        <span class="sender-name">Chess Assistant</span>
                        <span class="message-time">Just now</span>
                    </div>
                </div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (chatBody) chatBody.innerHTML = welcomeMsg;

    // Re-enable input if it was disabled
    const input = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    if (input) {
        input.disabled = false;
        input.placeholder = "Type your message here...";
        input.value = "";
    }
    if (sendButton) sendButton.disabled = false;

    setTimeout(() => {
        const element = chatBody.querySelector('.typing-animation');
        if (element) {
            const botHtml = `
                <div class="message-header">
                    <div class="bot-avatar">♟️</div>
                    <div class="message-info">
                        <span class="sender-name">Chess Assistant</span>
                        <span class="message-time">Just now</span>
                    </div>
                </div>
                <div class="message-content">
                    Hi again! 👋 How can I help you with chess coaching today? 🤔
                </div>
            `;
            element.innerHTML = botHtml;
            element.classList.remove('typing-animation');
            hasShownWelcome = true;
        }
    }, 900);
}

// Voice input
function toggleVoice() {
    // Check if chat session is active
    if (!chatSessionActive) {
        alert("Chat session closed. Please refresh the page to restart.");
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('mic-btn')
        ? document.activeElement
        : document.querySelector('.mic-btn');

    if (!micBtn) {
        alert('Microphone button not found.');
        return;
    }

    if (!SpeechRecognition) {
        alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.classList.add('recording');

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('user-input');
        if (input) input.value = transcript;
        micBtn.classList.remove('recording');
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micBtn.classList.remove('recording');
        alert('Voice input error. Please try typing instead.');
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording');
    };

    recognition.start();
}

// Helper: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-focus input when clicking inside chat
document.addEventListener('click', function (e) {
    const chatBox = document.getElementById('chat-box');
    if (chatBox && e.target.closest('#chat-box') && !e.target.closest('button')) {
        const input = document.getElementById('user-input');
        if (input && !input.disabled) input.focus();
    }
});

// DOM loaded preventive key handler
document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('user-input');
    if (input) {
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEnter(e);
            }
        });
        
        // Add input event listener to enable/disable send button
        input.addEventListener('input', function () {
            const sendButton = document.getElementById('send-button');
            if (sendButton) {
                sendButton.disabled = !chatSessionActive || !this.value.trim() || isTyping;
            }
        });
    }
    
    // Add CSS for easter egg message styling
    const style = document.createElement('style');
    style.textContent = `
        .easter-egg-msg {
            animation: shake 0.5s ease-in-out;
            background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
            color: white;
            border: 2px solid #ff4757;
            box-shadow: 0 4px 8px rgba(255, 71, 87, 0.3);
        }
        
        .easter-egg-msg .message-content {
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            font-size: 1.1em;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .chat-closed {
            opacity: 0.7;
            pointer-events: none;
        }
        
        .chat-closed #user-input {
            background-color: #f5f5f5;
            color: #999;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
});

// Prevent form submission on Enter in whole document
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'INPUT' && activeElement.type === 'text') {
            // Let the input's own handler deal with it
            return;
        }
        if (activeElement && activeElement.tagName === 'TEXTAREA') {
            // Allow Enter in textarea (for future expansions)
            return;
        }
    }
});