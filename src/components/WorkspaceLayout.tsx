import React, { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
    Hash, Plus, Mic, Settings, LogOut, 
    Video, PenTool, Volume2, ChevronDown, UserPlus,
    MessageSquare, Bell, Search, Phone
} from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

// Feature Components
import { TranslationChat } from './chat/TranslationChat';
import { MiroWhiteboard } from './whiteboard/MiroWhiteboard';
import { VideoConference } from './video/VideoConference';
import { VoiceSettings } from './settings/VoiceSettings';

// --- Types & Mock Data ---
type ChannelType = 'text' | 'voice' | 'meeting' | 'announcement';

interface Channel {
    id: string;
    name: string;
    type: ChannelType;
    unread?: number;
}

const CHANNELS: Channel[] = [
    { id: 'c1', name: 'announcements', type: 'announcement', unread: 0 },
    { id: 'c2', name: 'general', type: 'text', unread: 0 },
    { id: 'c3', name: 'design-team', type: 'text', unread: 2 },
    { id: 'c4', name: 'dev-backend', type: 'text', unread: 0 },
    { id: 'v1', name: 'Water Cooler', type: 'voice' },
    { id: 'v2', name: 'Focus Room', type: 'voice' },
    { id: 'm1', name: 'Project Sync', type: 'meeting' },
];

const MEMBERS = [
    { id: 'm1', name: 'Kim Min-su', role: 'Owner', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Minsu' },
    { id: 'm2', name: 'Sarah Lee', role: 'Admin', status: 'busy', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: 'm3', name: 'James Chen', role: 'Member', status: 'online', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James' },
    { id: 'm4', name: 'Designer Han', role: 'Member', status: 'offline', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Han' },
];

interface WorkspaceLayoutProps {
    onLogout: () => void;
    workspaceName?: string;
}

export function WorkspaceLayout({ onLogout, workspaceName = "Q4 Marketing" }: WorkspaceLayoutProps) {
    const [currentChannel, setCurrentChannel] = useState<Channel>(CHANNELS[1]); // Default: general
    const [isInMeeting, setIsInMeeting] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isChatOpenInMeeting, setIsChatOpenInMeeting] = useState(true);

    if (showSettings) {
        return <VoiceSettings onBack={() => setShowSettings(false)} />;
    }

    // --- Meeting Mode ---
    if (isInMeeting) {
        return (
            <div className="flex h-screen w-full relative bg-slate-950">
                <VideoConference 
                    onLeave={() => setIsInMeeting(false)} 
                    toggleChat={() => setIsChatOpenInMeeting(!isChatOpenInMeeting)}
                    isChatOpen={isChatOpenInMeeting}
                />
                
                {/* Slide-in Chat during Meeting */}
                <div 
                    className={`bg-white border-l transition-all duration-300 ease-in-out absolute right-0 top-0 bottom-0 z-20 ${
                        isChatOpenInMeeting ? 'w-96 translate-x-0 shadow-2xl' : 'w-0 translate-x-full overflow-hidden'
                    }`}
                >
                    {isChatOpenInMeeting && <TranslationChat />}
                </div>
            </div>
        );
    }

    // --- Standard Workspace Mode ---
    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans">
            
            {/* ① Sidebar (Discord Style) */}
            <aside className="w-[280px] bg-slate-900 text-slate-300 flex flex-col shrink-0 relative z-20">
                {/* Sidebar Header */}
                <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                    <span className="font-bold text-white truncate">{workspaceName}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </div>

                <ScrollArea className="flex-1 px-2 py-4">
                    {/* Text Channels */}
                    <div className="mb-6">
                        <div className="px-2 mb-1 flex items-center justify-between group">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">Text Channels</span>
                            <Plus className="w-4 h-4 cursor-pointer text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {CHANNELS.filter(c => ['text', 'announcement'].includes(c.type)).map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setCurrentChannel(channel)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 text-sm transition-all group ${
                                    currentChannel.id === channel.id 
                                    ? 'bg-indigo-500/10 text-white font-medium' 
                                    : 'hover:bg-slate-800 hover:text-slate-100'
                                }`}
                            >
                                {channel.type === 'announcement' ? (
                                    <Bell className="w-4 h-4 text-slate-500 shrink-0" />
                                ) : (
                                    <Hash className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                                <span className="truncate">{channel.name}</span>
                                {channel.unread ? (
                                    <Badge variant="destructive" className="ml-auto h-4 px-1.5 text-[10px]">{channel.unread}</Badge>
                                ) : null}
                            </button>
                        ))}
                    </div>

                    {/* Voice / Meeting Channels */}
                    <div className="mb-6">
                        <div className="px-2 mb-1 flex items-center justify-between group">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">Voice & Meetings</span>
                            <Plus className="w-4 h-4 cursor-pointer text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {CHANNELS.filter(c => ['voice', 'meeting'].includes(c.type)).map(channel => (
                            <button
                                key={channel.id}
                                onClick={() => setIsInMeeting(true)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md mb-0.5 text-sm hover:bg-slate-800 hover:text-slate-100 transition-all text-slate-400 group"
                            >
                                {channel.type === 'meeting' ? (
                                    <Video className="w-4 h-4 text-slate-500 group-hover:text-green-400 shrink-0" />
                                ) : (
                                    <Volume2 className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                                )}
                                <span className="truncate group-hover:text-white">{channel.name}</span>
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                {/* User Control Panel */}
                <div className="h-[52px] bg-slate-950/50 flex items-center px-2 gap-2 border-t border-slate-800">
                    <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity" onClick={onLogout}>
                        <AvatarImage src={MEMBERS[0].avatar} />
                        <AvatarFallback>ME</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <div className="text-xs font-bold text-white truncate">Kim Min-su</div>
                        <div className="text-[10px] text-slate-400 truncate">Online</div>
                    </div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-800">
                            <Mic className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setShowSettings(true)}>
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* ② Main Content (Slack Style) */}
            <main className="flex-1 flex flex-col min-w-0 bg-white relative">
                {/* Main Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Hash className="w-5 h-5 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">{currentChannel.name}</span>
                        <span className="hidden md:inline-block text-sm text-slate-400 truncate border-l ml-2 pl-2">
                            Topic: Q4 Marketing Strategy Discussion
                        </span>
                    </div>
                    
                    {/* Header Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Instant Meeting Button (Zoom Style) */}
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
                            size="sm"
                            onClick={() => setIsInMeeting(true)}
                        >
                            <Video className="w-4 h-4" />
                            <span className="hidden sm:inline">Start Meeting</span>
                        </Button>

                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                        <div className="flex items-center text-slate-400 gap-1">
                             <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-indigo-600">
                                <Phone className="w-4 h-4" />
                             </Button>
                             <Button variant="ghost" size="icon" className="w-8 h-8 hover:text-indigo-600">
                                <Search className="w-4 h-4" />
                             </Button>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 relative overflow-hidden">
                    <TranslationChat />
                </div>
                
                {/* Whiteboard Overlay */}
                {showWhiteboard && (
                    <MiroWhiteboard onClose={() => setShowWhiteboard(false)} />
                )}
            </main>

            {/* ③ Right Panel (Member List) */}
            <aside className="w-60 bg-slate-50 border-l flex flex-col shrink-0 hidden lg:flex">
                <div className="h-14 px-4 flex items-center border-b font-bold text-sm text-slate-500">
                    MEMBERS — {MEMBERS.length}
                </div>
                <ScrollArea className="flex-1 p-3">
                    {/* Role Groups can be implemented here */}
                    {['Owner', 'Admin', 'Member'].map(role => {
                        const roleMembers = MEMBERS.filter(m => m.role === role);
                        if (roleMembers.length === 0) return null;
                        return (
                            <div key={role} className="mb-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">{role}</h4>
                                {roleMembers.map(member => (
                                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors group">
                                        <div className="relative">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={member.avatar} />
                                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-50 ${
                                                member.status === 'online' ? 'bg-green-500' : 
                                                member.status === 'busy' ? 'bg-red-500' : 'bg-slate-400'
                                            }`} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="text-sm font-medium text-slate-700 truncate group-hover:text-slate-900">{member.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{member.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </ScrollArea>
                
                <div className="p-3 border-t bg-slate-100">
                     <Button variant="outline" className="w-full justify-start text-slate-600 border-slate-300 hover:bg-white">
                        <UserPlus className="w-4 h-4 mr-2" /> Invite People
                     </Button>
                </div>
            </aside>
        </div>
    );
}