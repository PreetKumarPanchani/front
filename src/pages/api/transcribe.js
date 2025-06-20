// pages/api/transcribe.js - OpenAI Whisper transcription endpoint
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import { createReadStream } from 'fs';

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to generate a unique temp file name
function generateTempFileName() {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  return `whisper-${timestamp}-${randomString}.webm`;
}

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data with file
    const form = new formidable.IncomingForm();
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    // Get the audio file
    const audioFile = files.file;
    
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('Missing OpenAI API key in environment variables');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Create form data for OpenAI API
    const formData = new FormData();
    
    // Add the file from the temp path
    const fileStream = createReadStream(audioFile.filepath);
    formData.append('file', fileStream);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional, specify language
    
    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });
    
    // Clean up temp file
    try {
      fs.unlinkSync(audioFile.filepath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      return res.status(response.status).json({ 
        error: 'OpenAI API request failed', 
        details: errorData,
        status: response.status 
      });
    }
    
    const transcription = await response.json();
    return res.status(200).json(transcription);
    
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ 
      error: 'Failed to process audio', 
      details: error.message 
    });
  }
}