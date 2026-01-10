document.addEventListener('DOMContentLoaded', () => {
    const selectButtons = document.querySelectorAll('.select-plan');
    const instructionsPanel = document.getElementById('instructions-panel');
    const openWhatsBtn = document.getElementById('open-wa');
    const markSentBtn = document.getElementById('mark-sent');
    const panelFeedback = document.getElementById('panel-feedback');
    const instructionMsg = document.getElementById('instruction-msg');

    let paymentId = null;
    let chosenPlan = null;
    const whatsappNumber = '8830435532'; 
    const whatsappNumberIntl = '918830435532';

    const setFeedback = (msg, isError=false) => {
        panelFeedback.textContent = msg;
        panelFeedback.style.color = isError ? '#dc3545' : '#28a745';
    };

    async function safeJson(response) {
        const text = await response.text();
        try { return JSON.parse(text); } catch(e) { return { __raw: text }; }
    }

    selectButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            const oldText = btn.textContent;
            btn.textContent = 'Processing...';

            // Find parent card
            const planCard = btn.closest('.chess-card');
            chosenPlan = planCard.dataset.plan;
            const amount = planCard.dataset.amount;

            try {
                const res = await fetch('/student/payment/initiate', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: chosenPlan })
                });

                const data = await safeJson(res);
                if (!res.ok) throw new Error(data && data.error ? data.error : 'Server error');

                if (data && data.success && data.payment_id) {
                    paymentId = data.payment_id;
                    instructionsPanel.classList.remove('hidden');
                    instructionMsg.innerHTML = `<strong>Payment ID: #${paymentId}</strong>. <br> Please pay <strong>₹${amount}</strong> to ${whatsappNumber}, then send us the screenshot.`;
                    setFeedback('');
                    markSentBtn.disabled = false;
                    markSentBtn.textContent = "I have sent the screenshot"; // Reset text
                    
                    instructionsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    throw new Error(data.error || 'Failed to initiate');
                }
            } catch (err) {
                console.error(err);
                alert('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = oldText;
            }
        });
    });

    openWhatsBtn.addEventListener('click', () => {
        if (!paymentId) return;
        const nameElement = document.querySelector('.subtitle strong');
        const name = nameElement ? encodeURIComponent(nameElement.textContent.trim()) : encodeURIComponent('Student');
        const planElement = document.querySelector(`.chess-card[data-plan="${chosenPlan}"]`);
        const amount = planElement ? planElement.dataset.amount : '';
        
        const text = encodeURIComponent(`Hello Chess Academy,\n\nI have made a payment.\nStudent: ${name}\nPlan: ${chosenPlan}\nAmount: ₹${amount}\nPayment ID: ${paymentId}\n\n(Attaching screenshot...)`);
        const url = `https://wa.me/${whatsappNumberIntl}?text=${text}`;
        window.open(url, '_blank');
    });

    markSentBtn.addEventListener('click', async () => {
        if (!paymentId) return;
        markSentBtn.disabled = true;
        markSentBtn.textContent = 'Verifying...';

        try {
            const res = await fetch('/student/payment/mark_sent', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_id: paymentId, whatsapp_number: whatsappNumber })
            });

            const data = await safeJson(res);
            if (!res.ok) throw new Error(data.error || 'Error marking sent');

            if (data && data.success) {
                setFeedback('✓ Successfully submitted. Admin will verify shortly.');
                markSentBtn.textContent = 'Submitted Successfully';
                markSentBtn.style.background = '#28a745';
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err) {
            setFeedback('Error: ' + err.message, true);
            markSentBtn.disabled = false;
            markSentBtn.textContent = 'Try Again';
        }
    });
});
