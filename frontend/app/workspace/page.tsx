"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { usePresence } from "../contexts/presence-context";
import { apiClient, UserSearchResult, Workspace, WorkspaceCategory } from "../lib/api";
import { filterActiveMembers } from "../lib/utils";
import NotificationDropdown from "../components/NotificationDropdown";
import EditProfileModal from "../../components/EditProfileModal";
import GlobalUserProfileMenu from "../../components/GlobalUserProfileMenu";
import StatusIndicator from "../../components/StatusIndicator";
import {
  Plus,
  ArrowRight,
  Search,
  X,
  ArrowLeft,
  Loader2,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

console.log("[WorkspacePage] Module loaded");

// WorkspaceCard Component
function WorkspaceCard({
  workspace,
  categories,
  workspaceCategoryMap,
  draggingWorkspaceId,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  workspace: Workspace;
  categories: WorkspaceCategory[];
  workspaceCategoryMap: Record<number, number[]>;
  draggingWorkspaceId: number | null;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const activeMembers = filterActiveMembers(workspace.members || []);
  const displayMembers = activeMembers.slice(0, 5);
  const wsCategories = workspaceCategoryMap[workspace.id] || [];

  return (
    <div
      className={`relative group ${draggingWorkspaceId === workspace.id ? "opacity-50" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, workspace.id)}
      onDragEnd={onDragEnd}
    >
      <button
        onClick={onClick}
        className="w-full p-5 bg-[#222] hover:bg-[#262626] transition-colors text-left cursor-grab active:cursor-grabbing"
      >
        {/* Category dots */}
        {wsCategories.length > 0 && (
          <div className="flex gap-1 mb-3">
            {wsCategories.slice(0, 3).map(catId => {
              const cat = categories.find(c => c.id === catId);
              return cat ? (
                <span
                  key={catId}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              ) : null;
            })}
          </div>
        )}

        {/* Name */}
        <h3 className="text-base font-medium text-white truncate mb-1">
          {workspace.name}
        </h3>

        {/* Member count */}
        <p className="text-sm text-white/40 mb-4">
          멤버 {activeMembers.length}명
        </p>

        {/* Avatars */}
        <div className="flex items-center -space-x-2">
          {displayMembers.map((member) => (
            <div
              key={member.id}
              className="w-7 h-7 rounded-full bg-white/15 ring-2 ring-[#222] group-hover:ring-[#262626] overflow-hidden transition-colors"
            >
              {member.user?.profile_img ? (
                <img src={member.user.profile_img} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[10px] text-white/50">{member.user?.nickname?.charAt(0)}</span>
                </div>
              )}
            </div>
          ))}
          {activeMembers.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-white/10 ring-2 ring-[#222] group-hover:ring-[#262626] flex items-center justify-center transition-colors">
              <span className="text-[10px] text-white/50">+{activeMembers.length - 5}</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createStep, setCreateStep] = useState<1 | 2>(1);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalWorkspaces, setTotalWorkspaces] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Workspace Search
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const workspaceSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Categories
  const [categories, setCategories] = useState<WorkspaceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [editingCategory, setEditingCategory] = useState<WorkspaceCategory | null>(null);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState<number | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [workspaceCategoryMap, setWorkspaceCategoryMap] = useState<Record<number, number[]>>({});

  // Drag and drop
  const [draggingWorkspaceId, setDraggingWorkspaceId] = useState<number | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | "uncategorized" | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenModal = () => {
    setShowNewWorkspace(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowNewWorkspace(false);
      setIsClosingModal(false);
      setNewWorkspaceName("");
      setCreateStep(1);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedMembers([]);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 600);
  };

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await apiClient.searchUsers(query);
      const filteredUsers = result.users.filter(
        (u) => !selectedMembers.some((m) => m.id === u.id)
      );
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedMembers]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  const handleAddMember = (user: UserSearchResult) => {
    setSelectedMembers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUpdateProfile = async () => {
    await refreshUser();
    setIsEditProfileModalOpen(false);
  };

  const handleRemoveMember = (userId: number) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleNextStep = () => {
    if (newWorkspaceName.trim()) {
      setCreateStep(2);
    }
  };

  const handlePrevStep = () => {
    setCreateStep(1);
    setSearchQuery("");
    setSearchResults([]);
  };

  const fetchWorkspaces = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setIsLoadingWorkspaces(true);
        setWorkspaces([]);
      } else {
        setIsLoadingMore(true);
      }

      const offset = reset ? 0 : workspaces.length;
      const response = await apiClient.getMyWorkspaces({
        limit: ITEMS_PER_PAGE,
        offset,
        search: debouncedSearchQuery || undefined,
        category_id: selectedCategoryId || undefined,
      });

      if (reset) {
        setWorkspaces(response.workspaces);
        // Initialize category map from workspace data
        const newMap: Record<number, number[]> = {};
        response.workspaces.forEach(ws => {
          if (ws.category_ids && ws.category_ids.length > 0) {
            newMap[ws.id] = ws.category_ids;
          }
        });
        setWorkspaceCategoryMap(newMap);
      } else {
        setWorkspaces(prev => [...prev, ...response.workspaces]);
        // Append to category map
        setWorkspaceCategoryMap(prev => {
          const newMap = { ...prev };
          response.workspaces.forEach(ws => {
            if (ws.category_ids && ws.category_ids.length > 0) {
              newMap[ws.id] = ws.category_ids;
            }
          });
          return newMap;
        });
      }

      setTotalWorkspaces(response.total);
      setHasMore(response.has_more ?? (offset + response.workspaces.length < response.total));
    } catch (error) {
      console.error("[WorkspacePage] Failed to fetch workspaces:", error);
    } finally {
      setIsLoadingWorkspaces(false);
      setIsLoadingMore(false);
    }
  }, [debouncedSearchQuery, selectedCategoryId, workspaces.length]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.getMyCategories();
      setCategories(response.categories);
    } catch (error) {
      console.error("[WorkspacePage] Failed to fetch categories:", error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (workspaceSearchTimeoutRef.current) {
      clearTimeout(workspaceSearchTimeoutRef.current);
    }

    workspaceSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(workspaceSearchQuery);
    }, 300);

    return () => {
      if (workspaceSearchTimeoutRef.current) {
        clearTimeout(workspaceSearchTimeoutRef.current);
      }
    };
  }, [workspaceSearchQuery]);

  // Re-fetch when search or category changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces(true);
    }
  }, [debouncedSearchQuery, selectedCategoryId, isAuthenticated]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoadingWorkspaces) {
          fetchWorkspaces(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoadingWorkspaces, fetchWorkspaces]);

  // Category handlers
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || isCreatingCategory) return;

    try {
      setIsCreatingCategory(true);
      await apiClient.createCategory({
        name: newCategoryName,
        color: newCategoryColor,
      });
      await fetchCategories();
      setShowCategoryModal(false);
      setNewCategoryName("");
      setNewCategoryColor("#6366f1");
    } catch (error) {
      console.error("Failed to create category:", error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim() || isCreatingCategory) return;

    try {
      setIsCreatingCategory(true);
      await apiClient.updateCategory(editingCategory.id, {
        name: newCategoryName,
        color: newCategoryColor,
      });
      await fetchCategories();
      setEditingCategory(null);
      setShowCategoryModal(false);
      setNewCategoryName("");
      setNewCategoryColor("#6366f1");
    } catch (error) {
      console.error("Failed to update category:", error);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("이 카테고리를 삭제하시겠습니까?")) return;

    try {
      await apiClient.deleteCategory(categoryId);
      await fetchCategories();
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
      }
      setCategoryMenuOpen(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  };

  const openEditCategory = (category: WorkspaceCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setShowCategoryModal(true);
    setCategoryMenuOpen(null);
  };

  // 워크스페이스가 어떤 카테고리에 속해있는지 확인 (임시로 로컬 상태 사용)
  const isWorkspaceInCategory = (workspaceId: number, categoryId: number) => {
    return workspaceCategoryMap[workspaceId]?.includes(categoryId) || false;
  };

  const toggleWorkspaceCategory = async (workspaceId: number, categoryId: number) => {
    const isIn = isWorkspaceInCategory(workspaceId, categoryId);

    try {
      if (isIn) {
        await apiClient.removeWorkspaceFromCategory(categoryId, workspaceId);
        setWorkspaceCategoryMap(prev => ({
          ...prev,
          [workspaceId]: (prev[workspaceId] || []).filter(id => id !== categoryId)
        }));
      } else {
        await apiClient.addWorkspaceToCategory(categoryId, workspaceId);
        setWorkspaceCategoryMap(prev => ({
          ...prev,
          [workspaceId]: [...(prev[workspaceId] || []), categoryId]
        }));
      }
      await fetchCategories();
    } catch (error) {
      console.error("Failed to toggle workspace category:", error);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, workspaceId: number) => {
    setDraggingWorkspaceId(workspaceId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", workspaceId.toString());
  };

  const handleDragEnd = () => {
    setDraggingWorkspaceId(null);
    setDragOverCategoryId(null);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: number | "uncategorized") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategoryId(categoryId);
  };

  const handleDragLeave = () => {
    setDragOverCategoryId(null);
  };

  // 워크스페이스를 새 카테고리로 이동 (기존 카테고리에서 제거 후 새 카테고리에 추가)
  const moveWorkspaceToCategory = async (workspaceId: number, targetCategoryId: number) => {
    const currentCategories = workspaceCategoryMap[workspaceId] || [];

    try {
      // 기존 카테고리에서 제거
      for (const catId of currentCategories) {
        if (catId !== targetCategoryId) {
          await apiClient.removeWorkspaceFromCategory(catId, workspaceId);
        }
      }

      // 새 카테고리에 추가 (이미 있지 않은 경우)
      if (!currentCategories.includes(targetCategoryId)) {
        await apiClient.addWorkspaceToCategory(targetCategoryId, workspaceId);
      }

      // 상태 업데이트
      setWorkspaceCategoryMap(prev => ({
        ...prev,
        [workspaceId]: [targetCategoryId]
      }));

      await fetchCategories();
    } catch (error) {
      console.error("Failed to move workspace:", error);
    }
  };

  // 워크스페이스의 모든 카테고리 제거
  const removeAllCategories = async (workspaceId: number) => {
    const currentCategories = workspaceCategoryMap[workspaceId] || [];

    try {
      for (const catId of currentCategories) {
        await apiClient.removeWorkspaceFromCategory(catId, workspaceId);
      }

      setWorkspaceCategoryMap(prev => ({
        ...prev,
        [workspaceId]: []
      }));

      await fetchCategories();
    } catch (error) {
      console.error("Failed to remove categories:", error);
    }
  };

  const handleDrop = async (e: React.DragEvent, categoryId: number | "uncategorized") => {
    e.preventDefault();
    setDragOverCategoryId(null);

    if (draggingWorkspaceId) {
      if (categoryId === "uncategorized") {
        // 미분류로 드롭: 모든 카테고리 제거
        await removeAllCategories(draggingWorkspaceId);
      } else {
        // 특정 카테고리로 드롭: 해당 카테고리로 이동
        await moveWorkspaceToCategory(draggingWorkspaceId, categoryId);
      }
    }
    setDraggingWorkspaceId(null);
  };

  const handleCreateWorkspace = async () => {
    if (isCreating) return;

    try {
      setIsCreating(true);
      const newWorkspace = await apiClient.createWorkspace({
        name: newWorkspaceName,
        member_ids: selectedMembers.map((m) => m.id),
      });

      await fetchWorkspaces();
      handleCloseModal();
      router.push(`/workspace/${newWorkspace.id}`);
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("워크스페이스 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated, fetchCategories]);

  const { presenceMap, subscribePresence } = usePresence();

  useEffect(() => {
    if (workspaces.length > 0) {
      const allMemberIds = new Set<number>();
      workspaces.forEach(ws => {
        ws.members?.forEach(m => {
          if (m.user?.id) allMemberIds.add(m.user.id);
        });
      });
      if (allMemberIds.size > 0) {
        subscribePresence(Array.from(allMemberIds));
      }
    }
  }, [workspaces, subscribePresence]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]" style={{ fontFamily: "'Cafe24ProSlim', sans-serif" }}>
        <div className="w-1 h-8 bg-white/40" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-[#1a1a1a] text-white flex"
      style={{ fontFamily: "'Cafe24ProSlim', sans-serif" }}
    >
      {/* Left Panel */}
      <div className="hidden lg:flex w-[420px] min-h-screen flex-col justify-between p-10 border-r border-white/10">
        {/* Top */}
        <div>
          <img src="/eum_white.png" alt="EUM" className="h-5" />
        </div>

        {/* Center - Typography */}
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-white/50 text-sm tracking-wide">Welcome back</p>
            <h1 className="text-[48px] font-bold leading-[1.1] tracking-tight text-white">
              {user.nickname}
            </h1>
          </div>

          <div className="w-16 h-[2px] bg-white/30" />

          <div className="space-y-2">
            <p className="text-white/60 text-base">
              {workspaces.length > 0
                ? `${workspaces.length}개의 워크스페이스`
                : "워크스페이스 없음"}
            </p>
          </div>
        </div>

        {/* Bottom - Create Button */}
        <button
          onClick={handleOpenModal}
          className="group flex items-center justify-between py-5 border-t border-white/10 hover:border-white/20 transition-colors"
        >
          <span className="text-base text-white/70 group-hover:text-white transition-colors">
            새 워크스페이스 만들기
          </span>
          <ArrowRight size={18} className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 lg:px-10 h-16 border-b border-white/10">
          <img src="/eum_white.png" alt="EUM" className="h-4 lg:hidden" />

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <NotificationDropdown onInvitationAccepted={() => fetchWorkspaces()} />

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="relative">
                  {user.profileImg ? (
                    <img
                      src={user.profileImg}
                      alt={user.nickname}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <StatusIndicator
                    status={presenceMap[user.id]?.status || user.default_status || "online"}
                    size="sm"
                    className="absolute -bottom-0.5 -right-0.5 ring-2 ring-[#1a1a1a]"
                  />
                </div>
                <span className="hidden sm:block text-sm text-white/80">{user.nickname}</span>
              </button>

              {showProfileMenu && (
                <GlobalUserProfileMenu
                  onClose={() => setShowProfileMenu(false)}
                  onEditProfile={() => {
                    setShowProfileMenu(false);
                    setIsEditProfileModalOpen(true);
                  }}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </div>
        </header>

        {isEditProfileModalOpen && user && (
          <EditProfileModal
            user={user}
            onClose={() => setIsEditProfileModalOpen(false)}
            onUpdate={handleUpdateProfile}
          />
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 lg:px-10 py-10">
            {/* Mobile Header */}
            <div className="lg:hidden mb-10">
              <p className="text-white/50 text-xs tracking-wide uppercase mb-2">Welcome back</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">{user.nickname}</h1>
            </div>

            {/* Search & Filter Bar */}
            <div className="mb-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={workspaceSearchQuery}
                  onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                  placeholder="워크스페이스 검색..."
                  className="w-full bg-[#222] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20 transition-all"
                />
                {workspaceSearchQuery && (
                  <button
                    onClick={() => setWorkspaceSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {/* All */}
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  onDragOver={(e) => handleDragOver(e, "uncategorized")}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "uncategorized")}
                  className={`flex-shrink-0 px-4 py-2 text-sm transition-all ${
                    dragOverCategoryId === "uncategorized"
                      ? "bg-white/20 ring-2 ring-white/50 scale-105"
                      : selectedCategoryId === null
                      ? "bg-white text-[#1a1a1a] font-medium"
                      : "bg-[#222] text-white/60 hover:text-white"
                  }`}
                >
                  전체
                </button>

                {/* Category Buttons */}
                {categories.map((category) => (
                  <div key={category.id} className="relative flex-shrink-0">
                    <button
                      onClick={() => setSelectedCategoryId(category.id)}
                      onDragOver={(e) => handleDragOver(e, category.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, category.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                        dragOverCategoryId === category.id
                          ? "bg-white/20 ring-2 ring-white/50 scale-105"
                          : selectedCategoryId === category.id
                          ? "bg-white text-[#1a1a1a] font-medium"
                          : "bg-[#222] text-white/60 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                      {category.workspace_count !== undefined && (
                        <span className={selectedCategoryId === category.id ? "text-[#1a1a1a]/60" : "text-white/30"}>
                          {category.workspace_count}
                        </span>
                      )}
                    </button>

                    {/* Category Menu Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCategoryMenuOpen(categoryMenuOpen === category.id ? null : category.id);
                      }}
                      className={`absolute -right-1 -top-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 ${
                        categoryMenuOpen === category.id ? "opacity-100" : ""
                      } bg-[#333] text-white/60 hover:text-white transition-all`}
                    >
                      <MoreHorizontal size={10} />
                    </button>

                    {/* Category Menu Dropdown */}
                    {categoryMenuOpen === category.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setCategoryMenuOpen(null)}
                        />
                        <div className="absolute top-full left-0 mt-2 w-32 bg-[#252525] border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl">
                          <button
                            onClick={() => openEditCategory(category)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5 transition-colors"
                          >
                            <Pencil size={12} />
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={12} />
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Add Category Button */}
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryColor("#6366f1");
                    setShowCategoryModal(true);
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm text-white/40 hover:text-white/70 bg-[#222] hover:bg-[#262626] transition-colors"
                >
                  <FolderPlus size={14} />
                  <span>카테고리</span>
                </button>
              </div>
            </div>

            {/* Section Title */}
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-sm text-white/50 uppercase tracking-[0.15em]">
                Workspaces {totalWorkspaces > 0 && `(${totalWorkspaces})`}
              </h2>
              <button
                onClick={handleOpenModal}
                className="lg:hidden text-sm text-white/60 hover:text-white transition-colors"
              >
                + 새로 만들기
              </button>
            </div>

            {/* Loading */}
            {isLoadingWorkspaces && (
              <div className="py-20 flex justify-center">
                <div className="w-1 h-8 bg-white/40 animate-pulse" />
              </div>
            )}

            {/* Empty State */}
            {!isLoadingWorkspaces && workspaces.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-white/40 text-lg mb-6">
                  {debouncedSearchQuery
                    ? "검색 결과가 없습니다"
                    : selectedCategoryId
                    ? "이 카테고리에 워크스페이스가 없습니다"
                    : "아직 워크스페이스가 없습니다"}
                </p>
                {!debouncedSearchQuery && !selectedCategoryId && (
                  <button
                    onClick={handleOpenModal}
                    className="inline-flex items-center gap-2 text-base text-white/80 hover:text-white border-b-2 border-white/30 hover:border-white pb-1 transition-all"
                  >
                    <span>첫 번째 워크스페이스 만들기</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Workspace List */}
            {!isLoadingWorkspaces && workspaces.length > 0 && (
              <div className="space-y-6">
                {selectedCategoryId === null ? (
                  // 전체 보기: 카테고리별 그룹화
                  <>
                    {categories.map((category) => {
                      const categoryWorkspaces = workspaces.filter(ws =>
                        workspaceCategoryMap[ws.id]?.includes(category.id)
                      );
                      const isDragOver = dragOverCategoryId === category.id;
                      const showSection = categoryWorkspaces.length > 0 || isDragOver;

                      if (!showSection) return null;

                      return (
                        <div
                          key={category.id}
                          onDragOver={(e) => handleDragOver(e, category.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, category.id)}
                          className={`p-3 -m-3 transition-colors ${isDragOver ? "bg-white/5" : ""}`}
                        >
                          {/* Category Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <h3 className="text-sm font-medium text-white/70">
                              {category.name}
                            </h3>
                            <span className="text-sm text-white/30">
                              ({categoryWorkspaces.length})
                            </span>
                          </div>
                          {/* Category Workspaces */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryWorkspaces.map((workspace) => (
                              <WorkspaceCard
                                key={workspace.id}
                                workspace={workspace}
                                categories={categories}
                                workspaceCategoryMap={workspaceCategoryMap}
                                draggingWorkspaceId={draggingWorkspaceId}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onClick={() => router.push(`/workspace/${workspace.id}`)}
                              />
                            ))}
                            {/* Skeleton placeholder */}
                            {isDragOver && (
                              <div className="p-5 bg-white/10 border-2 border-dashed border-white/20 animate-pulse">
                                <div className="h-2 w-8 bg-white/20 mb-3" />
                                <div className="h-4 w-24 bg-white/20 mb-1" />
                                <div className="h-3 w-16 bg-white/10 mb-4" />
                                <div className="flex -space-x-2">
                                  <div className="w-7 h-7 rounded-full bg-white/10" />
                                  <div className="w-7 h-7 rounded-full bg-white/10" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 카테고리 없는 워크스페이스 (미분류) */}
                    {(() => {
                      const uncategorizedWorkspaces = workspaces.filter(ws =>
                        !workspaceCategoryMap[ws.id] || workspaceCategoryMap[ws.id].length === 0
                      );
                      const isDragOver = dragOverCategoryId === "uncategorized";
                      const showSection = uncategorizedWorkspaces.length > 0 || (draggingWorkspaceId && categories.length > 0);

                      if (!showSection) return null;

                      return (
                        <div
                          onDragOver={(e) => handleDragOver(e, "uncategorized")}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, "uncategorized")}
                          className={`p-3 -m-3 transition-colors ${isDragOver ? "bg-white/5" : ""}`}
                        >
                          {categories.length > 0 && (
                            <div className={`border-t mb-4 ${isDragOver ? "border-white/30" : "border-white/10"}`} />
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {uncategorizedWorkspaces.map((workspace) => (
                              <WorkspaceCard
                                key={workspace.id}
                                workspace={workspace}
                                categories={categories}
                                workspaceCategoryMap={workspaceCategoryMap}
                                draggingWorkspaceId={draggingWorkspaceId}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onClick={() => router.push(`/workspace/${workspace.id}`)}
                              />
                            ))}
                            {/* Skeleton placeholder */}
                            {isDragOver && (
                              <div className="p-5 bg-white/10 border-2 border-dashed border-white/20 animate-pulse">
                                <div className="h-4 w-24 bg-white/20 mb-1" />
                                <div className="h-3 w-16 bg-white/10 mb-4" />
                                <div className="flex -space-x-2">
                                  <div className="w-7 h-7 rounded-full bg-white/10" />
                                  <div className="w-7 h-7 rounded-full bg-white/10" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  // 특정 카테고리 선택: 그리드
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workspaces.map((workspace) => (
                      <WorkspaceCard
                        key={workspace.id}
                        workspace={workspace}
                        categories={categories}
                        workspaceCategoryMap={workspaceCategoryMap}
                        draggingWorkspaceId={draggingWorkspaceId}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/workspace/${workspace.id}`)}
                      />
                    ))}
                  </div>
                )}

                {/* Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="py-4">
                  {isLoadingMore && (
                    <div className="flex justify-center">
                      <Loader2 size={20} className="animate-spin text-white/40" />
                    </div>
                  )}
                  {!hasMore && workspaces.length > 0 && (
                    <p className="text-center text-sm text-white/30">
                      모든 워크스페이스를 불러왔습니다
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      <div
        className={`fixed inset-0 z-[100] flex transition-all duration-500 ${
          showNewWorkspace
            ? isClosingModal
              ? 'opacity-0'
              : 'opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ fontFamily: "'Cafe24ProSlim', sans-serif" }}
      >
        {/* Left - Video */}
        <div className="hidden lg:block w-[55%] h-full relative overflow-hidden bg-[#1a1a1a]">
          <video
            ref={videoRef}
            src="/new-workspace-page-background-video.mov"
            className="w-full h-full object-cover opacity-60"
            muted
            loop
            playsInline
            preload="auto"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#1a1a1a]" />

          <button
            onClick={handleCloseModal}
            className="absolute top-8 left-8 text-white/60 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Right - Form */}
        <div className="w-full lg:w-[45%] h-full bg-[#1a1a1a] flex flex-col justify-center px-10 lg:px-16">
          <button
            onClick={handleCloseModal}
            className="lg:hidden absolute top-8 right-8 text-white/60 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          <div className="max-w-sm">
            {/* Progress */}
            <div className="flex gap-3 mb-12">
              <div className={`h-[3px] w-10 rounded-full ${createStep >= 1 ? 'bg-white' : 'bg-white/20'}`} />
              <div className={`h-[3px] w-10 rounded-full ${createStep >= 2 ? 'bg-white' : 'bg-white/20'}`} />
            </div>

            {createStep === 1 && (
              <div className="space-y-12">
                <div className="space-y-3">
                  <p className="text-sm text-white/50 uppercase tracking-[0.15em]">Step 01</p>
                  <h2 className="text-3xl font-bold text-white">워크스페이스 이름</h2>
                </div>

                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="이름 입력"
                  className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 py-4 text-xl text-white placeholder:text-white/30 outline-none transition-colors"
                  autoFocus
                />

                <button
                  onClick={handleNextStep}
                  disabled={!newWorkspaceName.trim()}
                  className={`flex items-center gap-3 text-base transition-all ${
                    newWorkspaceName.trim()
                      ? 'text-white hover:gap-4'
                      : 'text-white/30 cursor-not-allowed'
                  }`}
                >
                  <span>다음</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-10">
                <div className="space-y-3">
                  <p className="text-sm text-white/50 uppercase tracking-[0.15em]">Step 02</p>
                  <h2 className="text-3xl font-bold text-white">멤버 초대</h2>
                  <p className="text-base text-white/50">선택사항</p>
                </div>

                {/* Selected */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 bg-white/10 rounded-full py-1.5 pl-1.5 pr-3"
                      >
                        {member.profile_img ? (
                          <img src={member.profile_img} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-[10px] text-white/70">{member.nickname.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-sm text-white/80">{member.nickname}</span>
                        <button onClick={() => handleRemoveMember(member.id)} className="ml-1">
                          <X size={12} className="text-white/40 hover:text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이름 또는 이메일 검색"
                    className="w-full bg-transparent border-b-2 border-white/20 focus:border-white/60 py-4 pl-7 text-base text-white placeholder:text-white/30 outline-none transition-colors"
                  />
                  {isSearching && (
                    <Loader2 size={14} className="absolute right-0 top-1/2 -translate-y-1/2 animate-spin text-white/50" />
                  )}

                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#252525] border border-white/10 rounded-xl overflow-hidden">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleAddMember(result)}
                          className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                        >
                          {result.profile_img ? (
                            <img src={result.profile_img} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                              <span className="text-sm text-white/70">{result.nickname.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <p className="text-base text-white">{result.nickname}</p>
                            <p className="text-sm text-white/50">{result.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={handlePrevStep}
                    className="flex items-center gap-2 text-base text-white/50 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={18} />
                    <span>이전</span>
                  </button>

                  <button
                    onClick={handleCreateWorkspace}
                    disabled={isCreating}
                    className="flex items-center gap-3 text-base text-white hover:gap-4 transition-all disabled:text-white/40"
                  >
                    <span>{isCreating ? '생성 중...' : '완료'}</span>
                    {isCreating ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCategoryModal(false);
              setEditingCategory(null);
              setNewCategoryName("");
              setNewCategoryColor("#6366f1");
            }}
          />

          <div className="bg-[#222] w-full max-w-xs relative z-10">
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="카테고리 이름"
                className="w-full bg-transparent border-b border-white/20 focus:border-white/50 py-2 text-white placeholder:text-white/30 outline-none transition-colors"
                autoFocus
              />

              <div className="flex gap-1.5">
                {["#737373", "#a3a3a3", "#6366f1", "#22c55e", "#ef4444", "#f97316"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-6 h-6 ${newCategoryColor === color ? "ring-1 ring-white" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex border-t border-white/10">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setNewCategoryName("");
                  setNewCategoryColor("#6366f1");
                }}
                className="flex-1 py-3 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                disabled={!newCategoryName.trim() || isCreatingCategory}
                className="flex-1 py-3 text-sm text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isCreatingCategory ? "..." : (editingCategory ? "수정" : "생성")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
