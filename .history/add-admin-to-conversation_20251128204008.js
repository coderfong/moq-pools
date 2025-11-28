// Direct API call to add admin to existing conversation
async function addAdminToConversation() {
  try {
    // Get admin token first
    const adminLoginResponse = await fetch('http://localhost:3007/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@example.com', 
        password: 'Jonfong78!' 
      })
    });

    if (!adminLoginResponse.ok) {
      throw new Error('Admin login failed');
    }

    const loginData = await adminLoginResponse.json();
    if (!loginData.ok) {
      throw new Error('Admin login failed: ' + loginData.error);
    }

    const adminToken = loginData.token;
    console.log('Admin login successful');

    // Send a message as admin to trigger conversation participation
    const messageResponse = await fetch('http://localhost:3007/api/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `token=${adminToken}`
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