const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { ticketId, name, position, signature } = JSON.parse(event.body);

    if (!ticketId || !name || !signature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: ticketId, name, signature' 
        }),
      };
    }

    // ✅ Initialize Firebase Admin using environment variable
    if (!db) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: 'test-bot-49f99',
      });
      db = getFirestore();
    }

    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticket = await ticketRef.get();

    if (!ticket.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Ticket ${ticketId} not found` }),
      };
    }

    await ticketRef.update({
      authorized: true,
      authorisationName: name,
      authorisationPosition: position || '',
      authorisationSignature: signature,
      authorisationSignedAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Ticket ${ticketId} authorised successfully`,
      }),
    };

  } catch (error) {
    console.error('❌ Authorisation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
    };
  }
};
