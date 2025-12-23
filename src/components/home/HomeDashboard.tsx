import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
    Dialog, DialogContent, DialogDescription, DialogFooter, 
    DialogHeader, DialogTitle, DialogTrigger 
} from '../ui/dialog';
import { 
    Video, Users, Calendar, Plus, LogOut, 
    Settings, MoreHorizontal, ArrowRight, Command 
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types ---
export interface Workspace {
    id: string;
    name: string;
    type: 'Team' | 'Personal' | 'Class' | 'Project';
    members: number;
    lastActive: string;
}

interface HomeDashboardProps {
    onLogout: () => void;
    onEnterWorkspace: (workspace: Workspace) => void;
}

// --- Component ---
export function HomeDashboard({ onLogout, onEnterWorkspace }: HomeDashboardProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([
        { id: 'ws-1', name: 'Global Marketing Team', type: 'Team', members: 12, lastActive: '2 mins ago' },
        { id: 'ws-2', name: 'My Personal Lab', type: 'Personal', members: 1, lastActive: 'Yesterday' },
    ]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newWsName, setNewWsName] = useState('');
    const [inviteEmails, setInviteEmails] = useState('');

    const handleCreate = () => {
        if (!newWsName.trim()) return;
        const newWs: Workspace = {
            id: `ws-${Date.now()}`,
            name: newWsName,
            type: 'Team',
            members: inviteEmails.split(',').filter(e => e.trim()).length + 1, // Me + Invites
            lastActive: 'Just now'
        };
        setWorkspaces([...workspaces, newWs]);
        setNewWsName('');
        setInviteEmails('');
        setIsCreateOpen(false);
        // UX Rule: Auto-enter upon creation
        onEnterWorkspace(newWs);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            
            {/* ① Header (Always Fixed) */}
            <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        Z
                    </div>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">ZoomCord</span>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-slate-500">
                        <Settings className="w-5 h-5" />
                    </Button>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-bold text-slate-900">Kim Min-su</div>
                            <div className="text-xs text-slate-500">Free Plan</div>
                        </div>
                        <Avatar className="h-9 w-9 border cursor-pointer hover:ring-2 ring-indigo-100 transition-all" onClick={onLogout}>
                            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Minsu" />
                            <AvatarFallback>KM</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10 flex flex-col gap-10">
                
                {/* ④ Quick Actions (Zoom Style) */}
                <section>
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Command className="w-5 h-5 text-indigo-500" /> Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickActionCard 
                            icon={<Video className="w-8 h-8 text-white" />} 
                            label="New Meeting" 
                            subLabel="Start an instant meeting"
                            color="bg-orange-500 hover:bg-orange-600"
                        />
                        <QuickActionCard 
                            icon={<Plus className="w-8 h-8 text-white" />} 
                            label="Join Meeting" 
                            subLabel="Join via ID or link"
                            color="bg-indigo-500 hover:bg-indigo-600"
                        />
                        <QuickActionCard 
                            icon={<Calendar className="w-8 h-8 text-white" />} 
                            label="Schedule" 
                            subLabel="Plan upcoming meetings"
                            color="bg-indigo-500 hover:bg-indigo-600"
                        />
                         <QuickActionCard 
                            icon={<Users className="w-8 h-8 text-white" />} 
                            label="Share Screen" 
                            subLabel="Share without joining"
                            color="bg-indigo-500 hover:bg-indigo-600"
                        />
                    </div>
                </section>

                {/* ② Workspace Section (Central) */}
                <section className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Your Workspaces</h2>
                        <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Create Workspace
                        </Button>
                    </div>

                    {/* ③ Empty State Handling */}
                    {workspaces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">아직 워크스페이스가 없습니다</h3>
                            <p className="text-slate-500 mb-6 text-sm">팀을 만들고 협업을 시작해보세요.</p>
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsCreateOpen(true)}>
                                <Plus className="w-5 h-5 mr-2" /> 워크스페이스 생성
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {workspaces.map((ws) => (
                                <Card 
                                    key={ws.id} 
                                    className="group cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all duration-200 relative overflow-hidden"
                                    onClick={() => onEnterWorkspace(ws)}
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {ws.name.charAt(0).toUpperCase()}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <CardTitle className="mt-3 text-lg">{ws.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <div className="flex items-center text-sm text-slate-500 gap-4">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> {ws.members} members
                                            </span>
                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                                                {ws.type}
                                            </span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-3 border-t bg-slate-50/50 flex justify-between items-center text-xs text-slate-400 group-hover:bg-indigo-50/30 transition-colors">
                                        <span>Active {ws.lastActive}</span>
                                        <span className="text-indigo-600 font-bold opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                            Enter <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </CardFooter>
                                </Card>
                            ))}

                            {/* 'Create New' Card at the end of the list */}
                            <button 
                                onClick={() => setIsCreateOpen(true)}
                                className="flex flex-col items-center justify-center h-full min-h-[180px] border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 shadow-sm mb-3 transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-slate-600 group-hover:text-indigo-700">Create Workspace</span>
                            </button>
                        </div>
                    )}
                </section>
            </main>

            {/* Create Workspace Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>워크스페이스 생성</DialogTitle>
                        <DialogDescription>
                            팀이 함께 일할 새로운 공간을 만듭니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-slate-700 font-semibold">워크스페이스 이름 <span className="text-red-500">*</span></Label>
                            <Input 
                                id="name" 
                                placeholder="예: Design Team, Study Group" 
                                value={newWsName}
                                onChange={(e) => setNewWsName(e.target.value)}
                                className="h-11"
                                autoFocus
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label className="text-slate-700 font-semibold">워크스페이스 타입</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Team', 'Study', 'Community'].map((type) => (
                                    <label key={type} className="cursor-pointer relative">
                                        <input type="radio" name="ws-type" className="peer sr-only" defaultChecked={type === 'Team'} />
                                        <div className="text-center py-3 text-sm border-2 rounded-xl hover:bg-slate-50 peer-checked:border-indigo-600 peer-checked:text-indigo-600 peer-checked:bg-indigo-50 transition-all font-medium text-slate-500">
                                            {type}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="invite" className="text-slate-700 font-semibold">멤버 초대 (선택)</Label>
                            <Input 
                                id="invite" 
                                placeholder="이메일 입력 (쉼표로 구분)" 
                                value={inviteEmails}
                                onChange={(e) => setInviteEmails(e.target.value)}
                                className="h-11"
                            />
                            <p className="text-xs text-slate-400">나중에 링크로 초대할 수도 있습니다.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
                        <Button type="submit" onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700">생성하기</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Helper Component for Quick Actions
function QuickActionCard({ icon, label, subLabel, color }: any) {
    return (
        <button className={`flex flex-col items-start justify-between p-5 rounded-2xl ${color} text-white shadow-lg shadow-indigo-200/50 transition-transform hover:-translate-y-1 h-32 w-full text-left`}>
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                {icon}
            </div>
            <div>
                <div className="font-bold text-lg leading-none mb-1">{label}</div>
                <div className="text-xs opacity-80 font-medium">{subLabel}</div>
            </div>
        </button>
    );
}