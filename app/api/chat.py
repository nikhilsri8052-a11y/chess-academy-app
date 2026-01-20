#Help taken from deepseek to fill the deatials. 
from flask import Blueprint, request, jsonify
import re
import random
import time
from firebase_admin import auth
from app.utils.firebase_init import db
from datetime import datetime

chat_bp = Blueprint("chat", __name__)

# Expanded AI personality responses
GREETINGS = [
    "Hi {name}! 👋 How can I assist you with your chess journey today? ♟️",
    "Hello {name}! Ready to improve your chess skills? What would you like to know?",
    "Hey {name}! ♟️ Welcome back. How can I help you today?",
    "Hi there {name}! I'm your chess assistant. What's on your mind?",
    "Greetings {name}! Ready to talk chess? I'm here to help!",
    "Good to see you {name}! What brings you here today?",
    "Namaste {name}! 🙏 How can I assist with your chess learning?",
]

FAREWELLS = [
    "Happy to help! Feel free to ask anything else about chess coaching. Goodbye! 👋",
    "Glad I could assist! Come back anytime for more chess guidance. ♟️",
    "Hope that helps! Don't hesitate to reach out if you have more questions.",
    "All the best with your chess journey! Let me know if you need anything else.",
    "Thanks for chatting! Remember, practice makes perfect in chess. See you!",
    "Take care {name}! Keep those chess pieces moving! 👋",
    "It was great talking to you! Best of luck with your chess! ♟️",
]

THINKING_PHRASES = [
    "Let me check that for you...",
    "Thinking about the best way to help...",
    "Consulting my chess knowledge...",
    "One moment while I find that information...",
    "Let me look that up for you...",
    "Hmm, let me see...",
    "Good question! Let me pull up the details...",
]

ENCOURAGEMENTS = [
    "That's a great question! 🎯",
    "I love your enthusiasm! 💪",
    "Excellent thinking! 🧠",
    "You're asking all the right questions! 👍",
    "I'm excited to help you with this! 😊",
]

def get_session_id():
    """Get or create a unique session ID for tracking easter egg state"""
    # Try to get user ID from Firebase auth
    session_cookie = request.cookies.get("session")
    if session_cookie:
        try:
            decoded = auth.verify_session_cookie(session_cookie, check_revoked=False)
            return decoded.get("uid")
        except:
            pass
    
    # Fallback: use IP address + user agent as session ID for guests
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    user_agent = request.headers.get('User-Agent', 'unknown')
    return f"guest_{hash(f'{ip}_{user_agent}')}"

def get_easter_egg_state(session_id):
    """Get easter egg state from Firestore"""
    try:
        doc = db.collection("chat_sessions").document(session_id).get()
        if doc.exists:
            data = doc.to_dict()
            # Check if state is still valid (within last 5 minutes)
            if data.get('timestamp'):
                time_diff = (datetime.now() - data['timestamp'].replace(tzinfo=None)).total_seconds()
                if time_diff < 300:  # 5 minutes
                    return data.get('easter_egg_active', False), data.get('easter_egg_stage', 0)
    except Exception as e:
        print(f"Error getting easter egg state: {e}")
    return False, 0

def set_easter_egg_state(session_id, active, stage):
    """Set easter egg state in Firestore"""
    try:
        db.collection("chat_sessions").document(session_id).set({
            'easter_egg_active': active,
            'easter_egg_stage': stage,
            'timestamp': datetime.now()
        }, merge=True)
        print(f"🥚 Easter egg state saved: active={active}, stage={stage}")
    except Exception as e:
        print(f"Error setting easter egg state: {e}")

def get_user_info():
    """Extract user info from session cookie"""
    session_cookie = request.cookies.get("session")
    if session_cookie:
        try:
            decoded = auth.verify_session_cookie(session_cookie, check_revoked=False)
            uid = decoded.get("uid")
            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                return {
                    "name": user_data.get("name", "Student"),
                    "role": user_data.get("role", "guest"),
                    "is_student": user_data.get("role") == "student"
                }
        except Exception as e:
            print(f"Auth Check Error: {e}")
    return {"name": "there", "role": "guest", "is_student": False}

def format_response(text, is_markdown=True):
    """Format response with consistent styling"""
    if is_markdown:
        text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
        text = text.replace('\n• ', '<br>• ')
        text = text.replace('\n\n', '<br><br>')
    return text

def get_random_response(responses):
    """Pick a random response from list"""
    return random.choice(responses)

def calculate_similarity(text, keywords):
    """Calculate how many keywords match"""
    return sum(1 for keyword in keywords if keyword in text)

@chat_bp.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get("message", "").strip()
        message_lower = message.lower()
        
        if not message:
            return jsonify({"reply": "I'd love to help! 🥰 Could you please tell me what you'd like to know about our chess coaching? ♟️", "close_chat": False})

        # Get session ID and easter egg state
        session_id = get_session_id()
        easter_egg_active, easter_egg_stage = get_easter_egg_state(session_id)
        
        user_info = get_user_info()
        user_name = user_info["name"]
        is_student = user_info["is_student"]
        
        # 🥚 SUPER SECRET EASTER EGG LOGIC - CHECK THIS FIRST! 🥚
        
        # Step 1: Activation phrase
        if "i am gudia" in message_lower or "i'm gudia" in message_lower or "iam gudia" in message_lower:
            set_easter_egg_state(session_id, True, 1)
            print(f"🥚 Easter egg activated! Session: {session_id}, Stage: 1")
            return jsonify({
                "reply": "Are gudia the greatest pagal?! 😱🤯 Bapre me bat nahi kar sakta! 🚫🗣️",
                "close_chat": False
            })
        
        # Step 2: The Warning (any message after activation)
        if easter_egg_active and easter_egg_stage == 1:
            set_easter_egg_state(session_id, True, 2)
            print(f"🥚 Easter egg stage 2 - Warning! Session: {session_id}")
            return jsonify({
                "reply": "Bola na bat nahi kar sakta! 😡🤐 One more message and... ⏳💥",
                "close_chat": False
            })
        
        # Step 3: The Explosion & Close (any message after warning)
        if easter_egg_active and easter_egg_stage == 2:
            set_easter_egg_state(session_id, False, 0)
            print(f"🥚 Easter egg BOOM! Closing chat... Session: {session_id}")
            return jsonify({
                "reply": "💥 BOLAAAA NA!!! BAT NAHI KAR SAKTA!!! 💥<br><br>🔒 Chat is closing automatically...<br><br>😉 PS: IYKYK",
                "close_chat": True
            })
        
        # Simulate natural thinking delay
        time.sleep(random.uniform(0.3, 0.9))
        
        # --- GREETINGS (expanded) ---
        greeting_patterns = [
            r'\b(hi|hello|hey|hii|hola|yo|sup|greetings|namaste|namaskar)\b',
            r'\bgood\s*(morning|afternoon|evening|night)\b',
            r'\b(what\'?s\s*up|wassup|howdy)\b',
        ]
        if any(re.search(pattern, message_lower) for pattern in greeting_patterns):
            if is_student:
                replies = [
                    f"Welcome back, {user_name}! 👑 How's your chess practice going? 🤔",
                    f"Hi {user_name}! Ready for today's chess session? 🎯 What can I help you with?",
                    f"Hey {user_name}! Great to see you again! 😊 How can I assist you today?",
                    f"Hello {user_name}! Hope you're having a wonderful day! 🌟 What chess questions do you have?",
                ]
            else:
                greeting = random.choice(GREETINGS)
                replies = [greeting.format(name=user_name)]
            return jsonify({"reply": format_response(random.choice(replies)), "close_chat": False})

        # --- FAREWELL (expanded) ---
        farewell_patterns = [
            r'\b(bye|goodbye|see\s*ya|see\s*you|later|cya|take\s*care)\b',
            r'\b(thanks|thank\s*you|thanku|thx|appreciate|grateful)\b',
            r'\b(gotta\s*go|have\s*to\s*go|leaving)\b',
        ]
        if any(re.search(pattern, message_lower) for pattern in farewell_patterns):
            farewell = get_random_response(FAREWELLS)
            if is_student:
                farewell = f"Keep practicing, {user_name}! 💪 " + farewell
            return jsonify({"reply": format_response(farewell.format(name=user_name)), "close_chat": False})

        # --- HOW ARE YOU / SMALL TALK ---
        if re.search(r'\b(how\s*are\s*you|how\s*r\s*u|are\s*you\s*(ok|okay|fine|good))\b', message_lower):
            replies = [
                f"I'm doing great, {user_name}! 😊 Always ready to talk chess. ♟️ What's on your mind?",
                "I'm excellent! 🤖 Chess strategy keeps my circuits buzzing. ⚡ How can I help you today?",
                "Doing well, thanks for asking! 👍 Ready to assist with anything chess-related.",
                "I'm fantastic! 🎉 Helping people learn chess makes my day. 😄 What would you like to know?",
                "Couldn't be better! 😎 I love talking about chess. ♟️ How are you doing?",
            ]
            return jsonify({"reply": format_response(random.choice(replies)), "close_chat": False})

        # --- WHO ARE YOU / ABOUT BOT ---
        if any(x in message_lower for x in ["who are you", "what are you", "your name", "about you", "tell me about yourself", "who created you"]):
            replies = [
                "I'm your chess assistant for CHESS CLASS (SRIVASTAVA)! 🤖♟️<br><br>"
                "I'm here to help you with:<br>"
                "• Information about our chess classes 📚<br>"
                "• Batch schedules and timings ⏰<br>"
                "• Fee structure and payment details 💰<br>"
                "• Tournament information 🏆<br>"
                "• Enrollment process 📝<br>"
                "• And much more!<br><br>"
                "Think of me as your friendly guide to everything chess coaching in Nagpur! 😊",
                
                f"Hi {user_name}! 👋 I'm an assistant specially designed for Chess Class Srivastava.<br><br>"
                "My job is to make your experience smooth and answer any questions you have about our coaching, "
                "whether it's about batches, fees, tournaments, or how to join. I'm always here to help! 🥰"
            ]
            return jsonify({"reply": format_response(random.choice(replies)), "close_chat": False})

        # --- ABOUT CHESS CLASS SRIVASTAVA ---
        about_keywords = ["about", "who is", "tell me", "information", "details", "srivastava", "shrivastav", "shrivastava"]
        if calculate_similarity(message_lower, about_keywords) >= 1 and any(x in message_lower for x in ["class", "coaching", "center", "academy", "institute"]):
            reply = (
                "🏆 <strong>About CHESS CLASS (SRIVASTAVA)</strong> 🏆<br><br>"
                "We're a chess coaching family in Nagpur! 🙏❤️<br><br>"
                
                "<strong>Our Legacy:</strong><br>"
                "• <strong>10+ years</strong> of excellence in chess education 📅<br>"
                "• <strong>800+ students</strong> trained successfully 👨‍🎓<br>"
                "• <strong>4.9★ rating</strong> from 41+ happy reviews ⭐<br>"
                "• Located in Dharampeth, Nagpur 📍<br><br>"
                
                "<strong>What Makes Us Special:</strong><br>"
                "✨ <em>Community & Growth</em> - Students build lifelong friendships 👫<br>"
                "✨ <em>Expert Instructors</em> - Kind, generous, and highly skilled coaches 👨‍🏫<br>"
                "✨ <em>Personalized Coaching</em> - Tailored strategies for each student 🎯<br>"
                "✨ <em>Comprehensive Resources</em> - PDFs, books, and study materials 📚<br>"
                "✨ <em>Weekly Tournaments</em> - Regular competitive practice 🏅<br><br>"
                
                "<strong>Led by Srivastav Sir</strong> 👑 - A passionate chess mentor dedicated to nurturing talent at every level.<br><br>"
                
                "We provide a welcoming environment where passion meets excellence! 🎯✨<br><br>"
                
                "Want to know about our batches or how to join? 😊"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- INSTRUCTOR / TEACHER / COACH INFO ---
        if any(x in message_lower for x in ["teacher", "instructor", "coach", "sir", "mentor", "trainer", "who teaches", "srivastav sir"]):
            reply = (
                "👨‍🏫 <strong>Meet Our Lead Instructor - Srivastav Sir</strong> 👑<br><br>"
                
                "Srivastav Sir is the heart and soul of our chess academy! ❤️ With over 10 years of teaching experience, "
                "he's guided hundreds of students from beginners to tournament winners. 🏆<br><br>"
                
                "<strong>Teaching Style:</strong><br>"
                "• ❤️ Patient and encouraging<br>"
                "• 🎯 Focuses on individual student needs<br>"
                "• 📚 Provides comprehensive study materials<br>"
                "• 🏆 Proven track record of tournament success<br>"
                "• 🤝 Creates a friendly, supportive environment<br><br>"
                
                "Our reviews speak for themselves - 4.9★ rating from delighted students and parents! ⭐⭐⭐⭐⭐<br><br>"
                
                "Want to learn under his expert guidance? Ask me about enrollment! 😊"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- BATCH DETAILS (expanded) ---
        batch_keywords = ["batch", "timing", "class", "schedule", "time", "when", "availability", "session", "hours", "days"]
        if calculate_similarity(message_lower, batch_keywords) >= 1:
            thinking = get_random_response(THINKING_PHRASES)
            
            if is_student:
                reply = f"{thinking}<br><br>"
                reply += (
                    f"Hey {user_name}! 👋 Here are our batch options:<br><br>"
                    
                    "📍 <strong>Offline Classes (Nagpur Center)</strong> 🏢<br>"
                    "• Advanced Group: Tue, Thu, Sat (5PM – 8PM) ⭐<br>"
                    "• Intermediate Group: Mon, Wed, Fri (5PM – 8PM) 🎯<br><br>"
                    
                    "💻 <strong>Online Live Sessions</strong> 🌐<br>"
                    "• Morning Batch: Mon, Wed, Fri (10AM – 11AM) ☀️<br>"
                    "• Evening Batch: Tue, Thu, Sat (6PM – 7PM) 🌙<br><br>"
                    
                    "Each session includes learning, practice, and fun! 🎯😄<br><br>"
                    "Need to switch batches or have questions? Contact Srivastav Sir at 8830435532! 📞"
                )
            else:
                reply = f"{thinking}<br><br>"
                reply += (
                    "♟️ <strong>Our Chess Class Batches</strong> ⏰<br><br>"
                    
                    "📍 <strong>Offline Coaching (Nagpur Center)</strong> 🏢<br>"
                    "• <em>Beginner Batch</em>: Mon, Wed, Fri (4PM – 5PM) 🌱<br>"
                    "  Perfect for those just starting their chess journey!<br><br>"
                    
                    "• <em>Intermediate Batch</em>: Tue, Thu, Sat (5PM – 6:30PM) 🎯<br>"
                    "  For players with basic knowledge looking to improve<br><br>"
                    
                    "• <em>Advanced Batch</em>: Tue, Thu, Sat (6:30PM – 8PM) ⭐<br>"
                    "  Intense training for competitive players<br><br>"
                    
                    "💻 <strong>Live Online Classes</strong> 🌐<br>"
                    "• <em>Batch A</em>: Tue, Thu, Sat (4PM – 5PM) 🖥️<br>"
                    "• <em>Batch B</em>: Mon, Wed, Fri (6PM – 7PM) 💻<br>"
                    "• <em>Weekend Intensive</em>: Sat, Sun (10AM – 12PM) 🚀<br><br>"
                    
                    "🎯 <strong>What You Get:</strong><br>"
                    "✓ Small batch sizes for personalized attention 👥<br>"
                    "✓ Interactive learning sessions 🎓<br>"
                    "✓ Regular homework and assignments 📝<br>"
                    "✓ Weekly progress tracking 📈<br><br>"
                    
                    "Which batch suits your schedule best? I can help you choose! 😊"
                )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- FEES (expanded) ---
        fee_keywords = ["fee", "fees", "price", "cost", "charge", "payment", "how much", "amount", "money", "pay", "expensive", "afford", "cheap"]
        if calculate_similarity(message_lower, fee_keywords) >= 1:
            reply = (
                "💰 <strong>Fee Structure - Transparent & Affordable</strong> 💸<br><br>"
                
                "📅 <strong>Monthly Plan</strong> 📆<br>"
                "• ₹3,000 per student 💵<br>"
                "• All study materials included 📚<br>"
                "• Sunday tournaments included 🏆<br><br>"
                
                "🎯 <strong>Quarterly Plan (Most Popular! ⭐)</strong> 🚀<br>"
                "• ₹7,500 for 3 months 💰<br>"
                "• <em>No special offers or discounts available</em> 🚫<br>"
                "• All benefits included ✅<br><br>"
                
                "💳 <strong>Payment Methods:</strong><br>"
                "• UPI: 8830435532@paytm 📱<br>"
                "• GPay/PhonePe: 8830435532 💰<br>"
                "• Cash at center 💵<br>"
                "• Bank transfer available 🏦<br><br>"
                
                "📌 <strong>Note:</strong> Fees are payable in advance. After payment, admin will verify details and allot your batch. ⏳<br><br>"
                
                "Ready to enroll? The quarterly plan offers continuous learning! 🎁"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- TOURNAMENTS (expanded) ---
        tournament_keywords = ["tournament", "competition", "contest", "match", "game", "event", "championship", "sunday"]
        if calculate_similarity(message_lower, tournament_keywords) >= 1:
            reply = (
                "🏆 <strong>Weekly Chess Tournaments</strong> 🎮<br><br>"
                
                "📅 <strong>Every Sunday</strong> 📆<br>"
                "• Time: will be specified in notice ⏰<br>"
                "• Format: Swiss System (5 rounds) 🔄<br>"
                "• Time Control: 3+2 minutes ⏱️<br>"
                "• Entry Fee: <strong>FREE for enrolled students!</strong> 🎉🎊<br>"
                "• Prizes: Trophies, Certificates & Chess books 🏅📜📚<br><br>"
                
                "🎯 <strong>Benefits of Playing Tournaments:</strong><br>"
                "• Real competitive experience 🥊<br>"
                "• Track your progress 📈<br>"
                "• Build confidence 💪<br>"
                "• Learn from mistakes 🤔<br>"
                "• Make chess friends! 👫🎉<br><br>"
                
                "Ready to participate in the next tournament? I can help you register! 🎮🚀"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- ENROLLMENT / REGISTRATION PROCESS ---
        enroll_keywords = ["enroll", "join", "admission", "register", "sign up", "become student", "how to join", "start", "registration", "apply", "admission process"]
        if calculate_similarity(message_lower, enroll_keywords) >= 1:
            encouragement = random.choice(ENCOURAGEMENTS)
            reply = (
                f"{encouragement}<br><br>"
                "🎯 <strong>How to Join - Step by Step</strong> 📋<br><br>"
                
                "📋 <strong>Registration Process:</strong><br><br>"
                
                "1️⃣ <strong>Sign Up</strong> 📝<br>"
                "   • Go to the website's <strong>Sign Up page</strong> (top right corner) ↗️<br>"
                "   • Register as a student 👨‍🎓<br>"
                "   • Fill in your details accurately ✍️<br><br>"
                
                "2️⃣ <strong>Fee Payment</strong> 💰<br>"
                "   • Choose your plan (Monthly ₹3,000 or Quarterly ₹7,500) 💵<br>"
                "   • Pay via UPI: <strong>8830435532</strong> 📱<br>"
                "   • Save your payment receipt 🧾<br><br>"
                
                "3️⃣ <strong>Verification & Batch Allotment</strong> ⏳<br>"
                "   • Admin will verify your details 👨‍💼<br>"
                "   • Once verified, you'll be allotted a batch ✅<br>"
                "   • You'll receive confirmation via phone/email 📞📧<br><br>"
                
                "4️⃣ <strong>Start Learning</strong> 🚀<br>"
                "   • Attend your first class 🎓<br>"
                "   • Receive study materials 📚<br>"
                "   • Begin your chess journey! ♟️🎉<br><br>"
                
                "📞 <strong>For Assistance:</strong><br>"
                "Call/WhatsApp: <strong>8830435532</strong> (Srivastav Sir) 📱<br><br>"
                
                "Ready to make your first move? ♟️ Start by signing up on the website! 🚀"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- AGE / ELIGIBILITY ---
        age_keywords = ["age", "old", "child", "kid", "adult", "eligibility", "who can join", "years", "minimum age", "maximum age", "age limit"]
        if calculate_similarity(message_lower, age_keywords) >= 1:
            reply = (
                "👨‍👩‍👧‍👦 <strong>Eligibility - Age Requirements</strong> 🎂<br><br>"
                
                "We accept students aged <strong>0 to 25 years only</strong>. 📅<br><br>"
                
                "<strong>Age Groups:</strong><br>"
                "• <strong>Kids (5-12 years)</strong>: Fun, game-based learning 🎮😄<br>"
                "• <strong>Teens (13-18 years)</strong>: Competitive training 🏆💪<br>"
                "• <strong>Young Adults (19-25 years)</strong>: Advanced coaching 🎓🚀<br><br>"
                
                "<strong>Note:</strong><br>"
                "• Children below 5 years: Can join with parental guidance 👨‍👦<br>"
                "• Above 25 years: Unfortunately not accepted in our regular batches ❌<br><br>"
                
                "✨ <strong>No prior chess experience needed!</strong> 🎉<br>"
                "We teach complete beginners to advanced players. 🌱⭐<br><br>"
                
                "How old are you? I can suggest the perfect batch! 😊🎯"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- STUDENT DASHBOARD / PERSONAL QUERIES ---
        if is_student and any(x in message_lower for x in ["my", "progress", "attendance", "homework", "assignment", "report", "performance", "dashboard", "student portal"]):
            reply = (
                f"👋 Hi {user_name}! 😊<br><br>"
                
                "For personal student information like:<br><br>"
                
                "• 📊 Your attendance record<br>"
                "• 📝 Homework assignments<br>"
                "• 📈 Progress reports<br>"
                "• 💳 Fee payment status<br>"
                "• 🏆 Tournament results<br><br>"
                
                "Please check your <strong>Student Dashboard</strong> or contact "
                "Srivastav Sir directly at <strong>8830435532</strong>. 📞<br><br>"
                
                "He can discuss your chess journey and progress! 📚🎯<br><br>"
                
                "Is there anything else about our classes I can help with? 🤔"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- DISCOUNTS / OFFERS ---
        if any(x in message_lower for x in ["discount", "offer", "special offer", "concession", "coupon", "promo", "promotion", "cheaper"]):
            reply = (
                "💸 <strong>Fee Information</strong> 📋<br><br>"
                
                "Our fee structure is:<br>"
                "• Monthly: ₹3,000 💵<br>"
                "• Quarterly: ₹7,500 💰<br><br>"
                
                "Currently, <strong>no special discounts or offers are available</strong>. 🚫<br><br>"
                
                "We maintain transparent pricing to ensure quality coaching for all students. ✅<br><br>"
                
                "The quarterly plan provides continuous learning at a consistent rate. 📅<br><br>"
                
                "Ready to enroll at our standard rates? 😊🎯"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- LOCATION / NAGPUR ---
        if any(x in message_lower for x in ["nagpur", "location", "dharampeth", "where are you", "city", "address", "center location"]):
            reply = (
                "📍 <strong>We're Located in Nagpur!</strong> 🗺️<br><br>"
                
                "<strong>Address:</strong><br>"
                "Chess Class (Srivastava) ♟️<br>"
                "Flat No. 104, Vithal Rukmini Apartments 🏢<br>"
                "Dharampeth, Nagpur - 440010 📍<br>"
                "Maharashtra, India 🇮🇳<br><br>"
                
                "<strong>🗺️ Landmark:</strong><br>"
                "Near Dharampeth Post Office 📮<br>"
                "10 minutes from Nagpur Railway Station 🚂<br><br>"
                
                "<strong>🚗 Easy to Reach:</strong><br>"
                "• Auto/Cab: 'Vithal Rukmini Apartments, Dharampeth' 🚕<br>"
                "• Parking: Available 🅿️<br><br>"
                
                "📞 Need directions? Call: <strong>8830435532</strong> 📱<br><br>"
                
                "Serving Nagpur's chess community for 10+ years! ⏳🎉<br><br>"
                
                "Planning to visit? Center open Mon-Sat (4PM-8PM) 😊⏰"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- JOKES / FUN ---
        if any(x in message_lower for x in ["joke", "funny", "laugh", "humor", "tell me a joke"]):
            jokes = [
                "Why did the chess piece go to therapy? 🤔<br>Because it had too many checkered past! 😄😂<br><br>Now, let's get serious about your chess learning! What would you like to know?",
                "What's a chess player's favorite game show? 🎯<br>Check or No Check! 😂🎉<br><br>Speaking of checks, have you checked out our batch timings? ⏰",
                "Why don't chess players ever get cold? ❄️<br>Because they're always in the middle of the board! 😄🔥<br><br>Warm up your chess skills with us - want to know more about enrollment?",
            ]
            return jsonify({"reply": format_response(random.choice(jokes)), "close_chat": False})

        # --- COMPLIMENTS TO THE BOT ---
        if any(x in message_lower for x in ["good bot", "helpful", "thank you", "great", "awesome", "nice", "smart", "intelligent", "you're amazing"]):
            replies = [
                f"Aww, thank you {user_name}! 🥰❤️ That makes my circuits happy! ⚡ I'm here anytime you need help with chess coaching. What else can I assist you with?",
                f"Thanks {user_name}! 😊🙏 I'm just doing my best to help you. Is there anything else about our chess classes you'd like to know?",
                "You're very kind! 🙏😊 I'm glad I could help. Feel free to ask anything else about chess coaching!",
            ]
            return jsonify({"reply": format_response(random.choice(replies)), "close_chat": False})

        # --- GENERAL CONVERSATION ---
        if any(x in message_lower for x in ["what can you do", "help me", "what do you know", "capabilities", "features", "options"]):
            reply = (
                "🤖 <strong>I'm Your Chess Assistant - Here's How I Can Help!</strong> 🎯<br><br>"
                
                "I'm an assistant specialized in everything about <strong>Chess Class (Srivastava)</strong>! ♟️❤️<br><br>"
                
                "<strong>📋 I can help you with:</strong><br><br>"
                
                "🕐 <strong>Class Information:</strong><br>"
                "• Batch timings and schedules ⏰<br>"
                "• Online vs offline options 💻🏢<br>"
                "• Age groups and eligibility 👶👨<br><br>"
                
                "💰 <strong>Fee & Payment:</strong><br>"
                "• Fee structure and plans 💵<br>"
                "• Payment methods 📱<br>"
                "• Enrollment process 📝<br><br>"
                
                "📝 <strong>Enrollment:</strong><br>"
                "• How to join 🚀<br>"
                "• Registration steps 📋<br>"
                "• Verification process ✅<br><br>"
                
                "🏆 <strong>Tournaments & Events:</strong><br>"
                "• Weekly tournament info 📅<br>"
                "• Special events 🎉<br>"
                "• Competition details 🏅<br><br>"
                
                "♟️ <strong>Chess Learning:</strong><br>"
                "• Curriculum details 📚<br>"
                "• Study materials 🎒<br>"
                "• Benefits of chess 🧠<br><br>"
                
                "📞 <strong>Contact & Location:</strong><br>"
                "• Address and directions 🗺️<br>"
                "• Phone numbers 📱<br>"
                "• Center timings ⏰<br><br>"
                
                "⭐ <strong>About Us:</strong><br>"
                "• Our story and achievements 📖<br>"
                "• Student reviews ⭐<br>"
                "• Instructor information 👨‍🏫<br><br>"
                
                "💬 I'm available to chat! 😊<br>"
                "Just ask me anything about chess coaching, and I'll do my best to help! ❤️<br><br>"
                
                "What would you like to know first? 🤔"
            )
            return jsonify({"reply": format_response(reply), "close_chat": False})

        # --- FALLBACK ---
        suggestions = [
            "Try asking: <strong>What are the batch timings?</strong> ⏰",
            "You can ask: <strong>How much are the fees?</strong> 💰",
            "How about: <strong>How do I register as a student?</strong> 📝",
            "Curious about: <strong>What age groups do you teach?</strong> 👶👨",
        ]
        
        reply = (
            "🤔 I'm not quite sure what you're asking. ❓<br><br>"
            
            "I help with <strong>Chess Class (Srivastava)</strong> information! ♟️❤️<br><br>"
            
            f"<strong>Some things you can ask:</strong><br>"
            f"• {random.choice(suggestions)}<br>"
            f"• <strong>How do I sign up?</strong> 📝<br>"
            f"• <strong>What's the payment process?</strong> 💰<br>"
            f"• <strong>Do you have Sunday tournaments?</strong> 🏆<br><br>"
            
            "Or type what you want to know! I'll do my best to understand! 😊🤖<br><br>"
            
            "For complex queries, call:<br>"
            "📞 <strong>8830435532</strong> (Srivastav Sir) 📱"
        )
        
        return jsonify({"reply": format_response(reply), "close_chat": False})

    except Exception as e:
        print(f"Chat API Error: {e}")
        import traceback
        traceback.print_exc()
        error_replies = [
            "⚡ Oops! I encountered a small glitch. ⚠️ Could you please try asking again? 🔄",
            "🔧 Technical hiccup on my end! ⚙️ Please rephrase your question or try again in a moment. ⏳",
            "📡 Sorry, I'm having trouble processing that. 🤖 You can also call <strong>8830435532</strong> for immediate assistance! 📞",
        ]
        return jsonify({"reply": format_response(random.choice(error_replies)), "close_chat": False}), 500
