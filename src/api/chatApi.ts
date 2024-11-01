import client from './client';

export const sendMessage = (message: string, sessionId: string): EventSource => {
  const eventSource = new EventSource(
    `${process.env.REACT_APP_API_BASE_URL}/chat/stream?sessionId=${sessionId}&query=${encodeURIComponent(message)}`
  );
  
  // Add error handling for connection issues
  eventSource.addEventListener('error', (error) => {
    console.error('EventSource error:', error);
    eventSource.close();
  });

  return eventSource;
};

export const getChatHistory = async () => {
  try {
    const response = await client.get('/chat/history');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    throw error;
  }
};

export const deleteChatHistoryBySessionIdApi = async (sessionId: string) => {
  try {
    const response = await client.delete(`/chat/delete-history-by-session/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete chat history:', error);
    throw error;
  }
};