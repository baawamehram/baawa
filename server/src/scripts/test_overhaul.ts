import 'dotenv/config';
import { generateNextQuestion, ConversationTurn } from '../services/questioning';

async function testOverhaul() {
  console.log('--- STARTING OVERHAUL VERIFICATION ---');

  const mockConversation: ConversationTurn[] = [
    { role: 'assistant', content: 'Hello. I\'m a senior partner here at Baawa. We don\'t do traditional consulting—no bloat, no fluff. We solve perception problems. Tell me, what’s the one thing you’re trying to change about how the world sees your company?' },
    { role: 'user', content: 'We make high-end desk lamps, but people keep comparing us to IKEA.' },
  ];

  try {
    console.log('1. Testing generateNextQuestion (Q3)...');
    const q3 = await generateNextQuestion(mockConversation, 'We want to reach 100k in monthly revenue.');
    console.log('Q3 Result:', q3);
    if (q3.question && !q3.done) {
        console.log('SUCCESS: Generated a question.');
    } else {
        throw new Error('Failed to generate Q3');
    }

    console.log('\n2. Testing "Done" Transition (Simulated)...');
    // We can't easily force the LLM to finish without a very long transcript, 
    // but we can test the extractDoneFlag logic if we export it or test it indirectly.
    // However, since we're using a real LLM call here, let's just observe the tone.
    console.log('LLM Tone Check: Does it sound like Rory? (See Q3 above)');

  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
  }
}

testOverhaul();
