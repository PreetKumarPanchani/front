// pages/api/tts.js - OpenAI TTS endpoint
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'onyx', speed = 1.0, model = 'tts-1' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    console.log(`TTS request received: "${text.substring(0, 50)}...", voice: ${voice}`);
    
    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Missing OpenAI API key in environment variables');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Call OpenAI TTS API
    console.log('Calling OpenAI TTS API...');
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: 'mp3'
      })
    });
    
    if (!response.ok) {
      console.error(`OpenAI TTS API error: ${response.status} ${response.statusText}`);
      let errorDetails = {};
      try {
        errorDetails = await response.json();
      } catch (e) {
        // If we can't parse JSON, just use text
        errorDetails = { message: await response.text() };
      }
      
      return res.status(response.status).json({ 
        error: 'OpenAI API request failed', 
        details: errorDetails,
        status: response.status 
      });
    }
    
    console.log('Successfully received audio from OpenAI');
    
    // Get audio data as array buffer
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    console.log(`Converted audio to base64 (${base64Audio.length} characters)`);
    
    // Return as base64
    return res.status(200).json({ 
      audioData: base64Audio,
      contentType: 'audio/mp3',
      size: audioBuffer.byteLength,
      text: text
    });
    
  } catch (error) {
    console.error('TTS API error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate speech', 
      details: error.message 
    });
  }
}