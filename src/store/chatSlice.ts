import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  sendMessage,
  getChatHistory,
  deleteChatHistoryBySessionIdApi,
} from "../api/chatApi";
import { AppDispatch, RootState } from "./index";
import _ from "lodash";
import { shallowEqual } from "react-redux";

interface Message {
  content: string;
  role: "system" | "user" | "assistant";
  sessionId?: string;
  isStreaming?: boolean; // Add this to track streaming state
}

interface ChatState {
  messages: Record<string, Message[]>;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  currentSessionId?: string;
  streamingMessage: string;
}

const initialState: ChatState = {
  messages: {},
  status: "idle",
  error: null,
  currentSessionId: undefined,
  streamingMessage: "",
};

export const sendMessageAsync = createAsyncThunk<
  void,
  string,
  {
    state: RootState;
    dispatch: AppDispatch;
    rejectValue: string;
  }
>(
  "chat/sendMessage",
  async (message: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const currentSessionId = getState().chat.currentSessionId as string;
      console.log(currentSessionId)
      // Add user message
      dispatch(addMessage({ content: message, role: 'user', sessionId: currentSessionId }));
      
      // Add streaming message placeholder
      dispatch(addMessage({ 
        content: '', 
        role: 'assistant', 
        isStreaming: true,
        sessionId: currentSessionId,
      }));

      const eventSource = sendMessage(message, currentSessionId);
      let fullResponse = '';

      return new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          try {
            if (event.data === '[DONE]') {
              eventSource.close();
              dispatch(finalizeAssistantMessage(fullResponse));
              dispatch(setStatus('succeeded'));
              resolve();
            } else {
              const content = event.data;
              fullResponse += content;
              dispatch(updateStreamingMessage(fullResponse));
            }
          } catch (error) {
            reject(error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE Error:', error);
          eventSource.close();
          dispatch(setError('Failed to connect to the chat service'));
          dispatch(setStatus('failed'));
          reject(error);
        };
      });
    } catch (error) {
      console.log(error)
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("An unexpected error occurred");
    }
  }
);

export const getChatHistoryAsync = createAsyncThunk<
  Message[],
  void,
  {
    state: RootState;
    rejectValue: string;
  }
>(
  "chat/getChatHistory",
  async (_, { getState, rejectWithValue }) => {
    try {
      const response = await getChatHistory();
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Failed to fetch chat history");
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = getState().chat;
      // Don't fetch if already loading
      return status !== "loading";
    },
  }
);

export const deleteChatHistoryBySessionId = createAsyncThunk(
  "chat/deleteChatHistoryBySessionId",
  async (sessionId: string, { rejectWithValue, dispatch }) => {
    try {
      dispatch(deleteChatHistoryInStateBySessionId(sessionId));
      await deleteChatHistoryBySessionIdApi(sessionId);
      return sessionId;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("Failed to fetch chat history");
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      // @ts-ignore
      state.messages[action.payload.sessionId as string] = [...(state.messages[action.payload.sessionId] || []), action.payload];
    },
    updateStreamingMessage: (state, action: PayloadAction<string>) => {
      const lastIndex = state.messages[state.currentSessionId as string].length - 1;
      if (lastIndex >= 0) {
        state.messages[state.currentSessionId as string] = state.messages[state.currentSessionId as string].map((message, index) => {
          if (index === lastIndex && message.isStreaming) {
            return {
              ...message,
              content: action.payload
            };
          }
          return message;
        });
      }
    },
    finalizeAssistantMessage: (state, action: PayloadAction<string>) => {
      // Remove the streaming message and add the final message
      state.messages[state.currentSessionId as string] = state.messages[
        state.currentSessionId as string
      ].filter((msg) => !msg.isStreaming);
      state.messages[state.currentSessionId as string].push({
        content: action.payload,
        role: "assistant",
        sessionId: state.currentSessionId,
      });
    },
    clearChat: (state) => {
      state.messages[state.currentSessionId as string] = [];
      state.status = "idle";
      state.error = null;
      state.streamingMessage = "";
    },
    setSessionId: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setStatus: (state, action: PayloadAction<ChatState["status"]>) => {
      state.status = action.payload;
    },
    deleteChatHistoryInStateBySessionId: (
      state,
      action: PayloadAction<string>
    ) => {
      delete state.messages[state.currentSessionId as string];
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = undefined;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessageAsync.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(sendMessageAsync.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to send message";
      })
      .addCase(getChatHistoryAsync.pending, (state) => {
        state.status = "loading";
      })
      .addCase(
        getChatHistoryAsync.fulfilled,
        (state, action: PayloadAction<Message[]>) => {
          state.status = "succeeded";
          const uqSessionIds = _.uniq(_.map(action.payload, 'sessionId'))
          uqSessionIds.forEach((sessionId) => {
            if (state.messages[sessionId as string]) {
              state.messages[sessionId as string] = [
                ...state.messages[sessionId as string],
                ...action.payload.filter((item) => item.sessionId === sessionId)
              ]
            } else {
              state.messages[sessionId as string] = action.payload.filter((item) => item.sessionId === sessionId)
            }
          })
        }
      )
      .addCase(getChatHistoryAsync.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to get chat history";
      });
  },
});

export const {
  addMessage,
  clearChat,
  setSessionId,
  setError,
  setStatus,
  updateStreamingMessage,
  finalizeAssistantMessage,
  deleteChatHistoryInStateBySessionId,
} = chatSlice.actions;

// Selectors
export const selectMessages = (state: RootState) => state.chat.messages;
export const selectMessagesByCurrentSessionId = (state: RootState) => {
  if (!state.chat.currentSessionId) return []
  return state.chat.messages[state.chat.currentSessionId as string] || [];
};
export const selectStatus = (state: RootState) => state.chat.status;
export const selectError = (state: RootState) => state.chat.error;
export const selectCurrentSessionId = (state: RootState) =>
  state.chat.currentSessionId;
export const selectSessionsAndLastMessageList = (state: RootState) => {
  const uniqueSesionIds = Object.keys(state.chat.messages);
  return uniqueSesionIds.map((id) => ({
    ...state.chat.messages[id][state.chat.messages[id].length - 1]
  }));
};
export const selectMessagesBySessionId = (
  state: RootState,
  _sessionId: string | undefined
) => {
  if (!_sessionId) return [];
  return state.chat.messages[state.chat.currentSessionId as string] || [];
};

export default chatSlice.reducer;
