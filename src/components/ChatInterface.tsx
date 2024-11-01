import React, { useState, useRef, useEffect } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store";
import {
  getChatHistoryAsync,
  selectMessages,
  selectMessagesByCurrentSessionId,
  selectMessagesBySessionId,
  selectSessionsAndLastMessageList,
  sendMessageAsync,
  setSessionId,
  deleteChatHistoryBySessionId,
} from "../store/chatSlice";
import ReactMarkdown from "react-markdown";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ComponentProps, ReactNode } from "react";
import type { Components } from "react-markdown";
import {
  TextField,
  Button,
  Avatar,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Collapse,
  styled,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SendIcon from "@mui/icons-material/Send";
import ChatIcon from "@mui/icons-material/Chat";
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuidv4 } from "uuid";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FileUploadModal from "./FileUploadModal";
import Tooltip from "@mui/material/Tooltip";

import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";

SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);

type CodeProps = ComponentProps<typeof SyntaxHighlighter> & {
  inline?: boolean;
  className?: string;
  children: ReactNode;
};

const MarkdownComponents: Components = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";

    if (!inline && match) {
      return (
        <SyntaxHighlighter
          language={language}
          style={oneDark as any}
          PreTag="div"
          customStyle={{ margin: 0 }}
          showLineNumbers={props.showLineNumbers}
          wrapLines={props.wrapLines}
          wrapLongLines={props.wrapLongLines}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    }

    return <code className="bg-[#3A3A3A] rounded px-1">{children}</code>;
  },
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
};

const TruncatedListItemText = styled(ListItemText)({
  "& .MuiListItemText-primary": {
    width: "180px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

const ChatInterface: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { status, currentSessionId } = useSelector(
    (state: RootState) => state.chat
  );
  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatsOpen, setChatsOpen] = useState(true);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const sessionAndLastMsgList = useSelector(selectSessionsAndLastMessageList);
  const messagesByCurrentSessionId = useSelector((state: RootState) =>
    selectMessagesBySessionId(state, currentSessionId)
  );
  const messages = useSelector((state: RootState) => state.chat.messages[state.chat.currentSessionId as string], shallowEqual);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const fetchData = () => {
    dispatch(getChatHistoryAsync());
  };

  const handleSend = () => {
    if (input.trim()) {
      dispatch(sendMessageAsync(input));
      setInput("");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(fetchData, []);

  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
  };

  const handleChatsClick = (e: any) => {
    e.stopPropagation();
    setChatsOpen(!chatsOpen);
  };

  const handleChatSelect = (chatId: string) => {
    dispatch(setSessionId(chatId));
    toggleDrawer(false);
  };

  const handleUploadSuccess = (response: any) => {
    // Handle the successful upload response
    console.log("Upload successful:", response);
    // You might want to add the document to the chat or show a success message
  };

  useEffect(() => {
    if (!currentSessionId) {
      dispatch(setSessionId(uuidv4()));
    }
  }, [currentSessionId]);

  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    dispatch(deleteChatHistoryBySessionId(sessionId));
  };

  const DrawerContent = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={() => toggleDrawer(false)}
      onKeyDown={() => toggleDrawer(false)}
    >
      <List>
        <ListItem onClick={handleChatsClick}>
          <ListItemIcon>
            <ChatIcon />
          </ListItemIcon>
          <ListItemText primary="Chats" />
        </ListItem>
        <Collapse in={chatsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {sessionAndLastMsgList.map((chat: any, idx) => (
              <ListItem 
                sx={{ pl: 4, pr: 2, display: 'flex', justifyContent: 'space-between' }} 
                key={idx} 
                onClick={() => handleChatSelect(chat.sessionId)}
              >
                <TruncatedListItemText primary={chat.content} />
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={(e) => handleDeleteChat(e, chat.sessionId)}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </List>
    </Box>
  );

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A]">
      {/* App Bar */}
      <AppBar position="static" sx={{ backgroundColor: "#2A2A2A" }}>
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Welcome
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => toggleDrawer(false)}
      >
        <DrawerContent />
      </Drawer>

      {/* Chat Messages Area */}
      <div className="flex-grow overflow-auto p-4 space-y-4">
        {messagesByCurrentSessionId.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            <div
              className={`rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-[#2A2A2A] text-gray-100"
              } ${message.isStreaming ? "animate-pulse" : ""}`}
            >
              <ReactMarkdown components={MarkdownComponents}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1">
                  ▊
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="p-4 bg-[#2A2A2A]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-2">
            <Tooltip title="Attach file">
              <IconButton
                onClick={() => setUploadModalOpen(true)}
                sx={{
                  backgroundColor: "#3A3A3A",
                  color: "#FFFFFF",
                  "&:hover": {
                    backgroundColor: "#4A4A4A",
                  },
                  height: "50px",
                  width: "50px",
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              disabled={status === "loading"}
              multiline
              maxRows={4}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#3A3A3A",
                  borderRadius: "1.5rem",
                  "& fieldset": {
                    borderColor: "#4A4A4A",
                  },
                  "&:hover fieldset": {
                    borderColor: "#5A5A5A",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#6A6A6A",
                  },
                },
                "& .MuiOutlinedInput-input": {
                  color: "#FFFFFF",
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={status === "loading" || !input.trim()}
              sx={{
                borderRadius: "1.5rem",
                minWidth: "50px",
                height: "50px",
                backgroundColor: "#4A4A4A",
                "&:hover": {
                  backgroundColor: "#5A5A5A",
                },
              }}
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </div>
      <FileUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default ChatInterface;
