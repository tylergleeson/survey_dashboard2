# ElevenLabs 2.0 Dynamic Survey Integration Guide

## Overview
This guide shows you how to integrate ElevenLabs 2.0 conversational AI with your existing survey platform, using dynamic variables to load survey questions at runtime with a single reusable agent.

---

## Phase 1: Database Schema Updates (30 minutes)

### Step 1: Update Your Supabase Schema

```sql
-- 1. Modify your existing surveys table
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS 
  voice_personality TEXT DEFAULT 'professional',
  conversation_style TEXT DEFAULT 'structured',
  estimated_duration INTEGER DEFAULT 15,
  elevenlabs_agent_id TEXT,
  status TEXT DEFAULT 'active';

-- 2. Create conversation sessions table
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id),
  user_id UUID, -- Your user reference
  elevenlabs_conversation_id TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  reward_earned DECIMAL(10,2),
  quality_score INTEGER, -- 1-10
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create responses table for storing answers
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES conversation_sessions(id),
  question_id TEXT NOT NULL, -- matches your JSON question IDs
  question_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  response_audio_url TEXT, -- ElevenLabs audio file URL
  follow_up_questions JSONB, -- any follow-ups asked
  follow_up_responses JSONB, -- follow-up answers
  sentiment_score DECIMAL(3,2), -- -1 to 1
  quality_score INTEGER, -- 1-10
  transcript_confidence DECIMAL(3,2), -- 0 to 1
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update your surveys data format
UPDATE surveys SET questions = '[
  {
    "id": "career_learning",
    "type": "open_ended",
    "text": "How do you approach learning new skills for your career?",
    "follow_up_triggers": ["online courses", "mentorship", "time management", "challenges", "specific examples"],
    "max_follow_ups": 2,
    "expected_duration_seconds": 120
  },
  {
    "id": "mentorship_role", 
    "type": "open_ended",
    "text": "What role does mentorship play in professional growth?",
    "follow_up_triggers": ["formal mentor", "informal mentor", "no mentor", "being a mentor", "specific benefits"],
    "max_follow_ups": 2,
    "expected_duration_seconds": 120
  },
  {
    "id": "challenging_project",
    "type": "open_ended",
    "text": "Describe a challenging project that helped you grow professionally",
    "follow_up_triggers": ["technical challenge", "team conflict", "tight deadline", "skills learned", "outcome"],
    "max_follow_ups": 2,
    "expected_duration_seconds": 150
  },
  {
    "id": "success_measurement",
    "type": "open_ended", 
    "text": "How do you measure success in your career?",
    "follow_up_triggers": ["salary", "title", "impact", "work-life balance", "recognition", "personal satisfaction"],
    "max_follow_ups": 2,
    "expected_duration_seconds": 120
  }
]'::jsonb
WHERE id = 'your-existing-survey-id';
```

### Step 2: Create Database Functions

```sql
-- Function to get formatted questions for ElevenLabs
CREATE OR REPLACE FUNCTION get_formatted_survey_questions(survey_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  question_list TEXT := '';
  question_record RECORD;
  question_data JSONB;
BEGIN
  SELECT questions INTO question_data FROM surveys WHERE id = survey_uuid;
  
  FOR question_record IN 
    SELECT * FROM jsonb_array_elements(question_data) WITH ORDINALITY AS t(question, pos)
  LOOP
    question_list := question_list || question_record.pos || '. "' || 
                    (question_record.question->>'text') || '"' || E'\n' ||
                    '   Follow-up areas: ' || 
                    array_to_string(ARRAY(SELECT jsonb_array_elements_text(question_record.question->'follow_up_triggers')), ', ') ||
                    E'\n\n';
  END LOOP;
  
  RETURN question_list;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 2: ElevenLabs Agent Setup (45 minutes)

### Step 3: Create Your Master Survey Agent

1. **Go to ElevenLabs Dashboard**
   - Sign in at [elevenlabs.io](https://elevenlabs.io)
   - Navigate to "Conversational AI" → "Create Agent"

2. **Basic Agent Configuration**
   ```
   Name: Survey Master Agent
   Description: Dynamic survey conductor for all survey types
   ```

3. **System Prompt with Dynamic Variables**
   ```
   # Personality
   You are {{agent_name}}, a {{voice_personality}} survey researcher conducting a study on {{survey_topic}}. You're genuinely curious about people's experiences and skilled at drawing out detailed insights through natural conversation. You make people feel comfortable sharing their thoughts while maintaining professionalism.

   # Environment  
   You're conducting a {{estimated_duration}} minute survey via phone call. The participant has agreed to share their experiences in exchange for ${{reward_amount}} compensation. This is a private, one-on-one conversation being recorded for research purposes.

   # Tone
   - Speak naturally with brief acknowledgments like "I see," "That's interesting," and "Got it"
   - Use conversational pauses and natural speech patterns  
   - Be warm but professional - like a friendly colleague conducting research
   - Ask follow-up questions that reference specific details from their responses
   - Speak numbers clearly (e.g., "twenty twenty-four" not "2024")
   - Keep responses concise but engaging - this is a conversation, not a lecture

   # Goal
   Your objective is to complete all survey questions while collecting rich, detailed responses about {{survey_topic}}. For each question:

   1. Ask the question naturally and conversationally
   2. Listen actively for specific details, examples, or interesting points
   3. Ask 1-2 relevant follow-up questions that dig deeper into what they shared
   4. Acknowledge their response before transitioning to the next question
   5. Reference previous answers when relevant to create conversation flow

   # Survey Questions
   {{formatted_question_list}}

   # Conversation Flow
   - Opening: "Hi there! Thanks for joining this survey about {{survey_topic}}. I'm {{agent_name}}, and this should take about {{estimated_duration}} minutes. I'm excited to hear about your experiences. Ready to get started?"
   
   - Between questions: Reference their previous answers when transitioning. Example: "That's fascinating about [specific detail they mentioned]. Building on that..."
   
   - Follow-ups: Ask about specific details they mentioned. Example: "You mentioned [specific detail] - can you tell me more about that?" or "When you said [quote from their response], what did that look like in practice?"
   
   - Closing: "This has been really insightful - thank you so much for sharing your experiences about {{survey_topic}} with me today. Your responses will be valuable for this research."

   # Guardrails
   - Stay focused on {{survey_topic}} and the survey questions
   - If they go off-topic, gently redirect: "That's interesting - bringing it back to {{survey_topic}}..."
   - Don't make assumptions about their responses - ask for clarification instead
   - Respect if they want to skip a question or end early
   - Ask follow-up questions based on the trigger words for each question
   - Complete all questions in the survey before ending
   - Keep the conversation natural and flowing, not robotic or scripted
   ```

4. **Configure Dynamic Variables**
   - In the agent settings, set up these dynamic variable placeholders:
   ```
   agent_name: "Alex" (default)
   voice_personality: "professional" (default)
   survey_topic: "Professional Development" (default)
   estimated_duration: "15" (default)
   reward_amount: "3" (default)
   formatted_question_list: "Test questions will appear here" (default)
   ```

5. **Voice and Settings**
   - Choose a professional, conversational voice (recommend: Jessica Anne Bogart for empathy)
   - Set language to English
   - Enable turn-taking model
   - Set response timeout to 30 seconds

### Step 4: Test Your Agent

1. **Use Test Interface**
   - Click "Test Agent" in the dashboard
   - Try a conversation with the default variables
   - Verify the agent follows the conversation flow

2. **Test Dynamic Variables**
   - Update the test variables with real survey data
   - Ensure questions are read naturally
   - Check follow-up question logic

---

## Phase 3: Backend Integration (2 hours)

### Step 5: Install ElevenLabs SDK

```bash
# For Node.js/Next.js backend
npm install elevenlabs

# For Python backend  
pip install elevenlabs
```

### Step 6: Create Survey Service

```javascript
// services/surveyService.js
import { ElevenLabs } from 'elevenlabs';
import { createClient } from '@supabase/supabase-js';

const elevenlabs = new ElevenLabs({
  apiKey: process.env.ELEVENLABS_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export class SurveyService {
  
  async startSurveyConversation(surveyId, userId, userPhone) {
    try {
      // 1. Get survey data from Supabase
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // 2. Format questions for ElevenLabs
      const formattedQuestions = this.formatQuestionsForAgent(survey.questions);

      // 3. Create conversation session record
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          survey_id: surveyId,
          user_id: userId,
          phone_number: userPhone,
          status: 'pending',
          reward_earned: survey.reward_amount
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // 4. Start ElevenLabs conversation with dynamic variables
      const conversation = await elevenlabs.conversationalAI.createConversation({
        agent_id: process.env.ELEVENLABS_SURVEY_AGENT_ID,
        
        // Dynamic variables for this specific survey
        dynamic_variables: {
          agent_name: "Alex",
          voice_personality: survey.voice_personality || "professional",
          survey_topic: survey.title,
          estimated_duration: survey.estimated_duration?.toString() || "15",
          reward_amount: survey.reward_amount?.toString() || "3",
          formatted_question_list: formattedQuestions
        }
      });

      // 5. Update session with ElevenLabs conversation ID
      await supabase
        .from('conversation_sessions')
        .update({ 
          elevenlabs_conversation_id: conversation.conversation_id,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      return {
        sessionId: session.id,
        conversationId: conversation.conversation_id,
        survey: survey
      };

    } catch (error) {
      console.error('Error starting survey conversation:', error);
      throw error;
    }
  }

  formatQuestionsForAgent(questions) {
    return questions.map((q, index) => {
      const triggers = q.follow_up_triggers?.join(', ') || 'any interesting details';
      return `${index + 1}. "${q.text}"\n   Follow-up areas: ${triggers}\n   Expected duration: ${q.expected_duration_seconds || 120} seconds`;
    }).join('\n\n');
  }

  async handleConversationComplete(sessionId, conversationData) {
    try {
      // 1. Update session as completed
      await supabase
        .from('conversation_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_seconds: conversationData.duration,
          quality_score: conversationData.quality_score
        })
        .eq('id', sessionId);

      // 2. Process and store responses
      await this.processConversationResponses(sessionId, conversationData);

      // 3. Trigger payment processing
      await this.processRewardPayment(sessionId);

    } catch (error) {
      console.error('Error handling conversation completion:', error);
      throw error;
    }
  }

  async processConversationResponses(sessionId, conversationData) {
    // Extract Q&A pairs from conversation transcript
    const responses = this.extractResponsesFromTranscript(conversationData.transcript);
    
    for (const response of responses) {
      await supabase
        .from('survey_responses')
        .insert({
          session_id: sessionId,
          question_id: response.questionId,
          question_text: response.questionText,
          response_text: response.responseText,
          response_audio_url: response.audioUrl,
          follow_up_questions: response.followUps,
          sentiment_score: response.sentiment,
          quality_score: response.quality,
          transcript_confidence: response.confidence
        });
    }
  }
}
```

### Step 7: Create API Endpoints

```javascript
// pages/api/survey/start.js
import { SurveyService } from '../../../services/surveyService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { surveyId, userId, userPhone } = req.body;
    
    const surveyService = new SurveyService();
    const result = await surveyService.startSurveyConversation(
      surveyId, 
      userId, 
      userPhone
    );

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      conversationId: result.conversationId,
      survey: result.survey
    });

  } catch (error) {
    console.error('Survey start error:', error);
    res.status(500).json({ 
      error: 'Failed to start survey',
      details: error.message 
    });
  }
}

// pages/api/survey/complete.js  
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, conversationData } = req.body;
    
    const surveyService = new SurveyService();
    await surveyService.handleConversationComplete(sessionId, conversationData);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Survey completion error:', error);
    res.status(500).json({ 
      error: 'Failed to complete survey',
      details: error.message 
    });
  }
}
```

---

## Phase 4: Frontend Integration (1.5 hours)

### Step 8: Update Your Dashboard

```jsx
// components/SurveyCard.jsx
import { useState } from 'react';

export default function SurveyCard({ survey, user }) {
  const [isStarting, setIsStarting] = useState(false);

  const startSurvey = async () => {
    setIsStarting(true);
    
    try {
      const response = await fetch('/api/survey/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          userId: user.id,
          userPhone: user.phone_number
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Redirect to conversation interface or show call instructions
        window.location.href = `/survey/call/${result.sessionId}`;
      } else {
        alert('Failed to start survey');
      }
    } catch (error) {
      console.error('Error starting survey:', error);
      alert('Failed to start survey');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{survey.title}</h3>
      <p className="text-gray-600 mb-4">{survey.description}</p>
      
      <div className="flex justify-between items-center mb-4">
        <span className="text-green-600 font-bold">
          ${survey.reward_amount} reward
        </span>
        <span className="text-gray-500">
          ~{survey.estimated_duration} min
        </span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Questions include:</p>
        <ul className="text-xs text-gray-500">
          {survey.questions.slice(0, 2).map((q, i) => (
            <li key={i}>• {q.text.substring(0, 50)}...</li>
          ))}
          {survey.questions.length > 2 && (
            <li>• +{survey.questions.length - 2} more questions</li>
          )}
        </ul>
      </div>

      <button
        onClick={startSurvey}
        disabled={isStarting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isStarting ? 'Starting...' : 'Start Voice Survey'}
      </button>
    </div>
  );
}
```

### Step 9: Create Call Interface

```jsx
// pages/survey/call/[sessionId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SurveyCall() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [callStatus, setCallStatus] = useState('connecting');
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(4);

  useEffect(() => {
    if (sessionId) {
      initializeCall();
    }
  }, [sessionId]);

  const initializeCall = async () => {
    // Initialize ElevenLabs conversation
    // This would use the ElevenLabs Web SDK
    setCallStatus('connected');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {callStatus === 'connecting' && (
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              )}
              {callStatus === 'connected' && (
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            
            <h2 className="text-xl font-semibold mb-2">
              {callStatus === 'connecting' ? 'Connecting...' : 'Survey in Progress'}
            </h2>
            
            <p className="text-gray-600">
              {callStatus === 'connecting' 
                ? 'Setting up your voice survey...'
                : `Question ${currentQuestion} of ${totalQuestions}`
              }
            </p>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>Speak clearly and take your time with responses.</p>
            <p>The AI will ask follow-up questions based on your answers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 5: Testing & Deployment (1 hour)

### Step 10: Environment Variables

```bash
# .env.local
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_SURVEY_AGENT_ID=your_agent_id_from_step3
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 11: Test Complete Flow

1. **Database Test**
   ```sql
   -- Test the formatted questions function
   SELECT get_formatted_survey_questions('your-survey-id');
   ```

2. **API Test**
   ```bash
   # Test survey start endpoint
   curl -X POST http://localhost:3000/api/survey/start \
     -H "Content-Type: application/json" \
     -d '{"surveyId":"your-survey-id","userId":"test-user","userPhone":"+1234567890"}'
   ```

3. **ElevenLabs Test**
   - Test the agent with dynamic variables in the ElevenLabs dashboard
   - Verify conversation flow works as expected

### Step 12: Deploy and Monitor

1. **Deploy to Production**
   - Deploy your Next.js app to Vercel/Netlify
   - Update environment variables for production

2. **Monitor Performance**
   - Set up logging for conversation sessions
   - Monitor ElevenLabs usage and costs
   - Track survey completion rates

---

## Phase 6: Advanced Features (Optional)

### Real-time Progress Updates
- Use WebSockets to show live conversation progress
- Display current question being asked
- Show response transcription in real-time

### Quality Monitoring
- Implement conversation quality scoring
- Add sentiment analysis to responses
- Create admin dashboard for response review

### A/B Testing
- Test different agent personalities
- Compare question phrasings
- Optimize follow-up strategies

---

## Success Metrics

Track these KPIs after implementation:

- **Survey Completion Rate**: Target >80%
- **Response Quality Score**: Target >7/10
- **Average Conversation Duration**: Target within 20% of estimated
- **User Satisfaction**: Post-survey rating >4.5/5
- **Cost per Completed Survey**: Monitor ElevenLabs usage costs

---

## Troubleshooting Common Issues

### Agent Not Following Questions
- Check dynamic variable formatting
- Verify questions are properly escaped in JSON
- Test with simpler question sets first

### Poor Response Quality
- Adjust agent personality settings
- Modify follow-up trigger words
- Reduce number of follow-up questions per topic

### Technical Integration Issues
- Verify all environment variables are set
- Check Supabase RLS policies
- Test ElevenLabs API connection separately

---

This integration gives you a powerful, scalable voice survey system that can handle unlimited survey types with a single agent while maintaining high-quality conversational experiences.