// Direct API call to add admin to existing conversation
async function addAdminToConversation() {
  try {
    // Get admin token first
    const adminLoginResponse = await fetch('http://localhost:3007/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@example.com', 
        password: 'Jonfong78!' 
      })
    });

    if (!adminLoginResponse.ok) {
      const errorText = await adminLoginResponse.text();
      console.log('Login response status:', adminLoginResponse.status);
      console.log('Login response body:', errorText);
      throw new Error('Admin login failed: ' + adminLoginResponse.status);
    }

    const loginData = await adminLoginResponse.json();
    if (!loginData.ok) {
      throw new Error('Admin login failed: ' + loginData.reason);
    }

    // Extract session cookie
    const setCookieHeader = adminLoginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('No session cookie received');
    }
    
    // Extract session value from set-cookie header
    const sessionMatch = setCookieHeader.match(/session=([^;]+)/);
    if (!sessionMatch) {
      throw new Error('Could not parse session cookie');
    }
    
    const sessionToken = sessionMatch[1];
    console.log('Admin login successful, got session token');

    // Send a message as admin to trigger conversation participation
    const messageResponse = await fetch('http://localhost:3007/api/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `session=${sessionToken}`
      },
      body: JSON.stringify({ 
        threadId: 'cmiftybkk0001s1adfbc561ei', 
        text: 'Hello! I\'m here to help with your pool inquiry. What specific questions do you have?' 
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.text();
      throw new Error(`Failed to send admin message: ${messageResponse.status} ${errorData}`);
    }

    const messageData = await messageResponse.json();
    console.log('Admin message sent successfully:', messageData);

    return { success: true };

  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}

// Run the function
addAdminToConversation().then(result => {
  console.log('Final result:', result);
  process.exit(result.success ? 0 : 1);
});