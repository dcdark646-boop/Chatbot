import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Lock,
  Send,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  Plus,
  LogOut,
  Menu,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatHome = () => {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws");
      const newSocket = io(wsUrl, {
        path: "/ws/" + user.id,
        transports: ["websocket"],
      });

      newSocket.on("connect", () => {
        console.log("WebSocket connected");
      });

      newSocket.on("new_message", (data) => {
        if (data.message && selectedRoom && data.message.room_id === selectedRoom.id) {
          setMessages((prev) => [...prev, data.message]);
        }
        loadRooms();
      });

      newSocket.on("user_status", (data) => {
        setRooms((prev) =>
          prev.map((room) => ({
            ...room,
            members: room.members.map((member) =>
              member.id === data.user_id ? { ...member, online: data.online } : member
            ),
          }))
        );
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRooms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadRooms = async () => {
    try {
      const { data } = await axios.get(`${API}/rooms`, { withCredentials: true });
      setRooms(data);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  const loadMessages = async (roomId) => {
    try {
      const { data } = await axios.get(`${API}/messages/${roomId}`, {
        withCredentials: true,
      });
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      await axios.post(
        `${API}/messages`,
        {
          room_id: selectedRoom.id,
          content: newMessage,
          media_attachments: [],
        },
        { withCredentials: true }
      );
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await axios.get(`${API}/users/search?q=${query}`, {
        withCredentials: true,
      });
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const handleCreateDirectChat = async (otherUser) => {
    try {
      const { data } = await axios.post(
        `${API}/rooms`,
        {
          name: null,
          room_type: "direct",
          member_ids: [otherUser.id],
        },
        { withCredentials: true }
      );
      setShowNewChatDialog(false);
      setSearchQuery("");
      setSearchResults([]);
      await loadRooms();
      setSelectedRoom(data);
      setShowSidebar(false);
    } catch (error) {
      toast.error("Failed to create chat");
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !selectedRoom) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(`${API}/media/upload`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });

      await axios.post(
        `${API}/messages`,
        {
          room_id: selectedRoom.id,
          content: file.name,
          media_attachments: [data],
        },
        { withCredentials: true }
      );

      toast.success("File uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (type) => {
    const input = document.createElement("input");
    input.type = "file";
    if (type === "image") {
      input.accept = "image/*";
    } else if (type === "video") {
      input.accept = "video/*";
    } else if (type === "document") {
      input.accept = ".pdf,.doc,.docx,.txt";
    }
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
    };
    input.click();
  };

  const getOtherMember = (room) => {
    if (!room || room.room_type !== "direct") return null;
    return room.members.find((m) => m.id !== user.id);
  };

  const getRoomDisplayName = (room) => {
    if (room.room_type === "group") return room.name || "Group Chat";
    const other = getOtherMember(room);
    return other?.name || "Unknown";
  };

  const getRoomAvatar = (room) => {
    if (room.room_type === "direct") {
      const other = getOtherMember(room);
      return other?.avatar || `https://ui-avatars.com/api/?name=${other?.name || 'U'}&background=0F172A&color=10B981&rounded=true`;
    }
    return `https://ui-avatars.com/api/?name=${room.name || 'G'}&background=0F172A&color=10B981&rounded=true`;
  };

  const isOnline = (room) => {
    if (room.room_type === "direct") {
      const other = getOtherMember(room);
      return other?.online || false;
    }
    return false;
  };

  const renderMediaAttachment = (attachment) => {
    const isImage = attachment.content_type?.startsWith("image/");
    const isVideo = attachment.content_type?.startsWith("video/");

    if (isImage) {
      return (
        <img
          src={`${BACKEND_URL}${attachment.url}`}
          alt={attachment.filename}
          className="max-w-full max-h-[250px] rounded-lg cursor-pointer"
          onClick={() => window.open(`${BACKEND_URL}${attachment.url}`, "_blank")}
        />
      );
    }

    if (isVideo) {
      return (
        <video
          src={`${BACKEND_URL}${attachment.url}`}
          controls
          className="max-w-full max-h-[250px] rounded-lg"
        />
      );
    }

    return (
      <div className="flex items-center gap-3 bg-slate-700/50 p-3 rounded-lg">
        <FileText className="w-8 h-8 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-100 truncate">
            {attachment.filename}
          </div>
          <div className="text-xs text-slate-400">
            {(attachment.size / 1024).toFixed(1)} KB
          </div>
        </div>
        <a
          href={`${BACKEND_URL}${attachment.url}`}
          download
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button
            size="sm"
            variant="ghost"
            className="text-emerald-400 hover:text-emerald-300"
          >
            <Download className="w-4 h-4" />
          </Button>
        </a>
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-20 w-full md:w-80 lg:w-[22rem] flex-shrink-0 border-r border-slate-800 flex flex-col h-full bg-slate-950 transition-transform duration-300`}
        data-testid="chat-sidebar"
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <span className="font-['Outfit'] font-semibold text-lg">EncryptChat</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-emerald-400 hover:text-emerald-300"
                  data-testid="new-chat-button"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
                <DialogHeader>
                  <DialogTitle className="font-['Outfit']">New Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      className="pl-10 bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-slate-100"
                      data-testid="user-search-input"
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {searchResults.map((searchUser) => (
                        <div
                          key={searchUser.id}
                          onClick={() => handleCreateDirectChat(searchUser)}
                          className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                          data-testid={`search-result-${searchUser.id}`}
                        >
                          <div className="relative">
                            <Avatar>
                              <AvatarImage src={searchUser.avatar} />
                              <AvatarFallback className="bg-slate-700">
                                {searchUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {searchUser.online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{searchUser.name}</div>
                            <div className="text-xs text-slate-400">{searchUser.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-100"
                  data-testid="user-menu-button"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-slate-700 text-sm">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-slate-700">
                <DropdownMenuItem
                  onClick={logout}
                  className="text-slate-100 focus:bg-slate-800 focus:text-slate-100 cursor-pointer"
                  data-testid="logout-button"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Room List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {rooms.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="mb-2">No chats yet</p>
                <p className="text-sm">Click + to start a new chat</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowSidebar(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                    selectedRoom?.id === room.id ? "bg-slate-800" : "hover:bg-slate-800/50"
                  }`}
                  data-testid={`room-item-${room.id}`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={getRoomAvatar(room)} />
                      <AvatarFallback className="bg-slate-700">
                        {getRoomDisplayName(room).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline(room) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">
                        {getRoomDisplayName(room)}
                      </span>
                      <Lock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    </div>
                    {room.last_message && (
                      <p className="text-sm text-slate-400 truncate">
                        {room.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-900 relative">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 backdrop-blur-xl bg-slate-900/80">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-slate-400"
                  onClick={() => setShowSidebar(true)}
                  data-testid="toggle-sidebar-button"
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={getRoomAvatar(selectedRoom)} />
                    <AvatarFallback className="bg-slate-700">
                      {getRoomDisplayName(selectedRoom).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline(selectedRoom) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                  )}
                </div>
                <div>
                  <div className="font-medium font-['Outfit'] flex items-center gap-2">
                    {getRoomDisplayName(selectedRoom)}
                    <Lock className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="text-xs text-slate-400">
                    {isOnline(selectedRoom) ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 sm:p-6" data-testid="messages-area">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                    <Lock className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-slate-400 mb-1">Messages are end-to-end encrypted</p>
                  <p className="text-sm text-slate-500">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
              <div className="space-y-6">
                {messages.map((message) => {
                  const isSent = message.sender_id === user.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSent ? "justify-end" : "justify-start"} chat-bubble-animation`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 relative group shadow-sm ${
                          isSent
                            ? "bg-emerald-600 text-white rounded-br-sm"
                            : "bg-slate-800 text-slate-100 rounded-bl-sm"
                        }`}
                      >
                        {!isSent && (
                          <div className="text-xs font-medium text-emerald-400 mb-1">
                            {message.sender_name}
                          </div>
                        )}
                        {message.media_attachments && message.media_attachments.length > 0 && (
                          <div className="mb-2">
                            {message.media_attachments.map((attachment, idx) => (
                              <div key={idx} className="mb-2">
                                {renderMediaAttachment(attachment)}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="break-words">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            isSent ? "text-emerald-100" : "text-slate-500"
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 sm:p-6 bg-slate-900 border-t border-slate-800">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                      disabled={uploading}
                      data-testid="attach-button"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-900 border-slate-700">
                    <DropdownMenuItem
                      onClick={() => handleFileSelect("image")}
                      className="text-slate-100 focus:bg-slate-800 focus:text-slate-100 cursor-pointer"
                      data-testid="attach-image"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Photo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleFileSelect("video")}
                      className="text-slate-100 focus:bg-slate-800 focus:text-slate-100 cursor-pointer"
                      data-testid="attach-video"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleFileSelect("document")}
                      className="text-slate-100 focus:bg-slate-800 focus:text-slate-100 cursor-pointer"
                      data-testid="attach-document"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Document
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="bg-slate-800 border-none focus-visible:ring-1 focus-visible:ring-emerald-500 text-slate-100 rounded-2xl pr-12"
                    disabled={uploading}
                    data-testid="message-input"
                  />
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || uploading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full"
                  data-testid="send-message-button"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-600/10 mb-4">
                <Lock className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-['Outfit'] font-semibold mb-2">
                Secure Encrypted Chat
              </h2>
              <p className="text-slate-400 mb-4">
                Select a chat to start messaging securely
              </p>
              <Button
                onClick={() => setShowSidebar(true)}
                className="md:hidden bg-emerald-600 hover:bg-emerald-500"
                data-testid="open-sidebar-button"
              >
                View Chats
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {showSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-10"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};

export default ChatHome;
