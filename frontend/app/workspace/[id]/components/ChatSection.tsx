"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { apiClient, ChatMessage, ChatRoom } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

interface ChatSectionProps {
  workspaceId: number;
  selectedRoomId?: number;
}

interface TypingUser {
  userId: number;
  nickname: string;
}

interface WSMessage {
  type: string;
  payload?: {
    id?: number;
    message?: string;
    sender_id?: number;
    nickname?: string;
    created_at?: string;
    user_id?: number;
  };
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_CHAT_WS_URL || 'ws://localhost:8080';
const MESSAGES_PER_PAGE = 30;

export default function ChatSection({ workspaceId, selectedRoomId }: ChatSectionProps) {
  const { user } = useAuth();

  // 채팅방 상태
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);

  // 메시지 상태
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [lastSentTime, setLastSentTime] = useState(0);

  // 스크롤 상태
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const isComposingRef = useRef(false);
  const previousScrollHeightRef = useRef<number>(0);

  const SPAM_COOLDOWN = 1000;
  const SCROLL_THRESHOLD = 100;

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  // 스크롤 위치 체크
  const checkScrollPosition = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    setIsAtBottom(distanceFromBottom < SCROLL_THRESHOLD);

    // 디바운스로 버튼 깜빡임 방지
    if (scrollButtonTimeoutRef.current) {
      clearTimeout(scrollButtonTimeoutRef.current);
    }

    const shouldShow = distanceFromBottom > SCROLL_THRESHOLD * 3;
    if (shouldShow) {
      scrollButtonTimeoutRef.current = setTimeout(() => {
        setShowScrollToBottom(true);
      }, 150);
    } else {
      setShowScrollToBottom(false);
    }
  }, []);

  // 채팅방 정보 로드
  const loadRoom = useCallback(async () => {
    if (!selectedRoomId) {
      setSelectedRoom(null);
      setIsLoadingRoom(false);
      return;
    }

    try {
      setIsLoadingRoom(true);
      const response = await apiClient.getChatRooms(workspaceId);
      const room = response.chatrooms.find(r => r.id === selectedRoomId);
      setSelectedRoom(room || null);
    } catch (error) {
      console.error("Failed to load room:", error);
    } finally {
      setIsLoadingRoom(false);
    }
  }, [workspaceId, selectedRoomId]);

  // 초기 메시지 로드
  const loadMessages = useCallback(async (roomId: number) => {
    try {
      setIsLoadingMessages(true);
      setHasMore(true);
      const response = await apiClient.getChatRoomMessages(workspaceId, roomId, MESSAGES_PER_PAGE, 0);
      setMessages(response.messages);
      setHasMore(response.messages.length >= MESSAGES_PER_PAGE);

      // 초기 로드 후 맨 아래로 스크롤
      setTimeout(() => scrollToBottom(false), 50);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [workspaceId]);

  // 이전 메시지 로드 (무한 스크롤)
  const loadMoreMessages = useCallback(async () => {
    if (!selectedRoom || isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);

      // 현재 스크롤 높이 저장
      if (messagesContainerRef.current) {
        previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }

      const response = await apiClient.getChatRoomMessages(
        workspaceId,
        selectedRoom.id,
        MESSAGES_PER_PAGE,
        messages.length
      );

      if (response.messages.length > 0) {
        // 이전 메시지를 앞에 추가
        setMessages(prev => [...response.messages, ...prev]);
        setHasMore(response.messages.length >= MESSAGES_PER_PAGE);

        // 스크롤 위치 유지
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeightRef.current;
            messagesContainerRef.current.scrollTop = scrollDiff;
          }
        });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedRoom, workspaceId, messages.length, isLoadingMore, hasMore]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback(() => {
    checkScrollPosition();

    // 상단에 도달하면 이전 메시지 로드
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current;
      if (scrollTop < 100 && hasMore && !isLoadingMore) {
        loadMoreMessages();
      }
    }
  }, [checkScrollPosition, hasMore, isLoadingMore, loadMoreMessages]);

  // 채팅방 로드
  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  // 선택된 채팅방 변경 시 메시지 로드 및 WebSocket 연결
  useEffect(() => {
    if (!selectedRoom) return;

    loadMessages(selectedRoom.id);
    setTypingUsers([]);
    setShowScrollToBottom(false);
    setIsAtBottom(true);

    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      if (!isMounted) return;

      const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${workspaceId}/${selectedRoom.id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) {
          console.log("Chat WebSocket connected to room:", selectedRoom.id);
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;

        try {
          const data: WSMessage = JSON.parse(event.data);

          switch (data.type) {
            case "message":
              if (data.payload && data.payload.id) {
                const newMsg: ChatMessage = {
                  id: data.payload.id,
                  meeting_id: selectedRoom.id,
                  sender_id: data.payload.sender_id,
                  message: data.payload.message || "",
                  type: "TEXT",
                  created_at: data.payload.created_at || new Date().toISOString(),
                  sender: {
                    id: data.payload.sender_id || 0,
                    email: "",
                    nickname: data.payload.nickname || "",
                  },
                };
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) {
                    return prev;
                  }
                  return [...prev, newMsg];
                });

                // 내가 보낸 메시지거나 맨 아래에 있으면 스크롤
                if (data.payload.sender_id === user?.id) {
                  setTimeout(() => scrollToBottom(true), 50);
                }
              }
              break;

            case "typing":
              if (data.payload?.user_id && data.payload?.nickname) {
                const userId = data.payload.user_id;
                const nickname = data.payload.nickname;
                setTypingUsers((prev) => {
                  if (prev.find((u) => u.userId === userId)) {
                    return prev;
                  }
                  return [...prev, { userId, nickname }];
                });
              }
              break;

            case "stop_typing":
              if (data.payload?.user_id) {
                setTypingUsers((prev) =>
                  prev.filter((u) => u.userId !== data.payload?.user_id)
                );
              }
              break;
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        if (isMounted) {
          console.log("Chat WebSocket disconnected");
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      };

      ws.onerror = () => {
        if (!isMounted) return;
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedRoom, workspaceId, loadMessages, user?.id]);

  // 맨 아래에 있을 때만 새 메시지에 자동 스크롤
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages, isAtBottom]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: isTyping ? "typing" : "stop_typing",
        })
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const maxHeight = 120; // 최대 높이 (약 5줄)
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';

    if (!isTypingRef.current && e.target.value.length > 0) {
      isTypingRef.current = true;
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingStatus(false);
      }
    }, 2000);
  };

  const handleSend = async () => {
    if (!message.trim() || isSending || !selectedRoom) return;

    const now = Date.now();
    if (now - lastSentTime < SPAM_COOLDOWN) {
      return;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          payload: {
            message: message.trim(),
          },
        })
      );
      setMessage("");
      setLastSentTime(now);
      resetTextareaHeight();
    } else {
      try {
        setIsSending(true);
        const newMessage = await apiClient.sendChatRoomMessage(workspaceId, selectedRoom.id, message.trim());
        setMessages((prev) => [...prev, newMessage]);
        setMessage("");
        setLastSentTime(now);
        resetTextareaHeight();
        setTimeout(() => scrollToBottom(true), 50);
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isMyMessage = (msg: ChatMessage) => {
    return msg.sender_id === user?.id;
  };

  if (isLoadingRoom) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!selectedRoom) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-black/40">
        <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-lg">채팅방을 선택하세요</p>
        <p className="text-sm mt-1">왼쪽 사이드바에서 채팅방을 선택하세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      {/* Room Header */}
      <div className="px-8 py-5 border-b border-black/5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-black">{selectedRoom.title}</h2>
          <p className="text-sm text-black/40 mt-0.5">
            {messages.length}개의 메시지
            {typingUsers.length > 0 && (
              <span className="ml-2 text-black/60 animate-pulse">
                · {typingUsers.map((u) => u.nickname).join(", ")} 입력 중...
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-8 py-6"
        onScroll={handleScroll}
      >
        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Beginning of conversation */}
        {!hasMore && messages.length > 0 && (
          <div className="flex justify-center py-6 mb-4">
            <p className="text-sm text-black/30">여기서 이야기가 시작되었습니다</p>
          </div>
        )}

        {isLoadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-black/40">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>아직 메시지가 없습니다</p>
            <p className="text-sm mt-1">첫 메시지를 보내보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => {
              const isMe = isMyMessage(msg);
              const showAvatar =
                index === 0 || messages[index - 1].sender_id !== msg.sender_id;
              const showName = showAvatar && !isMe;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[40%] ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 self-end">
                        {showAvatar && (
                          msg.sender?.profile_img ? (
                            <img
                              src={msg.sender.profile_img}
                              alt={msg.sender.nickname}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-500">
                                {msg.sender?.nickname?.charAt(0) || "?"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col min-w-0 ${isMe ? "items-end" : "items-start"}`}>
                      {showName && (
                        <span className="text-xs text-black/50 mb-1 ml-1">
                          {msg.sender?.nickname || "알 수 없음"}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 ${
                          isMe
                            ? "bg-black text-white"
                            : "bg-gray-100 text-black"
                        }`}
                        style={{
                          borderRadius: isMe
                            ? "20px 20px 4px 20px"
                            : "20px 20px 20px 4px",
                        }}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-all">
                          {msg.message}
                        </p>
                      </div>
                      <span className="text-[10px] text-black/30 mt-0.5 mx-1">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      <button
        onClick={() => scrollToBottom(true)}
        className={`absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white text-sm rounded-full shadow-lg hover:bg-black/80 flex items-center gap-2 transition-all duration-300 ease-out ${
          showScrollToBottom
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        최신 메시지로 이동
      </button>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-8 py-2">
          <div className="flex items-center gap-2 text-sm text-black/50">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>{typingUsers.map((u) => u.nickname).join(", ")} 입력 중</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-black/5">
        <div className="flex items-end gap-3 bg-gray-100 rounded-[24px] px-4 py-2 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-black/10 transition-all">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="메시지 입력..."
            maxLength={2000}
            rows={1}
            className="flex-1 bg-transparent resize-none text-[15px] text-black placeholder:text-black/40 focus:outline-none focus:ring-0 focus:border-0 border-0 outline-none ring-0 py-2 leading-5 overflow-hidden"
            style={{ outline: 'none', boxShadow: 'none' }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              message.trim() && !isSending
                ? "bg-black text-white hover:bg-black/80"
                : "bg-black/10 text-black/30 cursor-not-allowed"
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
