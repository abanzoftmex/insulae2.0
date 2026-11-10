"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Search,
  LayoutGrid,
  List,
  ArrowDown,
  ArrowUp,
  MapPin,
  Clock,
  Plus,
  FileText,
  MoreVertical,
  Eye,
  Edit2,
  Play,
  Mail,
  MessageCircle,
  Loader2,
  X,
  CalendarDays,
  RotateCcw
} from "lucide-react";
import { Announcement } from "@/modules/announcement/domain/announcement.types";
import { PageBackBadge } from "@/components/ui/page-back-badge";
import { AnnouncementCard } from "./announcement-card";
import {
  sendAnnouncementInvitationAction,
  getAnnouncementWhatsAppTextAction
} from "../[id]/asamblea/actions";
import { isAsamblea, getMeetingNoun } from "@/app/(admin)/gobernanza/convocatorias/_lib/governance-terms";

const WHATSAPP_HELP_NUMBER = "5212212721794";

interface UserDirectoryItem {
  id: string;
  name: string;
}

interface AnnouncementsWorkbenchProps {
  initialAnnouncements: Announcement[];
  canManage: boolean;
  canEdit?: boolean;
  userDirectory: UserDirectoryItem[];
  types?: { id: string; name: string }[];
  subtypes?: { id: string; name: string; typeId: string }[];
  isResidentView?: boolean;
}

type SortField = "Fecha" | "Asunto" | "Estatus" | "Tipo";
type ViewMode = "LISTA" | "TARJETAS";

function formatInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    if (parts[0].length <= 2) return parts[0].toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AnnouncementsWorkbench({
  initialAnnouncements,
  canManage,
  canEdit = true,
  userDirectory,
  types = [],
  subtypes = [],
  isResidentView = false
}: AnnouncementsWorkbenchProps) {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [selectedTypeTab, setSelectedTypeTab] = useState("Todas");
  const [sortBy, setSortBy] = useState<SortField>("Fecha");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("LISTA");

  // Dropdown & Action States
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    openUpwards: boolean;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSendingEmailId, setIsSendingEmailId] = useState<string | null>(null);
  const [isSendingWAId, setIsSendingWAId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!openDropdownId) return;
    const closeMenu = () => {
      setOpenDropdownId(null);
      setDropdownCoords(null);
    };
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openDropdownId]);

  const handleToggleDropdown = (
    e: React.MouseEvent<HTMLButtonElement>,
    announcementId: string
  ) => {
    e.stopPropagation();
    if (openDropdownId === announcementId) {
      setOpenDropdownId(null);
      setDropdownCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 220;
      const openUpwards = spaceBelow < menuHeight;
      const left = Math.max(12, Math.min(window.innerWidth - 220, rect.right - 208));

      setDropdownCoords({
        top: openUpwards ? rect.top - 6 : rect.bottom + 6,
        left,
        openUpwards
      });
      setOpenDropdownId(announcementId);
    }
  };

  const activeDropdownAnnouncement = useMemo(() => {
    if (!openDropdownId) return null;
    return initialAnnouncements.find((a) => a.id === openDropdownId) || null;
  }, [openDropdownId, initialAnnouncements]);

  // WhatsApp Dialog States
  const [waRecipients, setWaRecipients] = useState<
    { name: string; position: string; phone: string }[] | null
  >(null);
  const [waText, setWaText] = useState<string>("");

  // Map users for fast lookups
  const userMap = useMemo(() => {
    return new Map(userDirectory.map((u) => [u.id, u.name]));
  }, [userDirectory]);

  // Extract all distinct statuses
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    initialAnnouncements.forEach((a) => {
      if (a.status?.name) set.add(a.status.name);
    });
    return Array.from(set);
  }, [initialAnnouncements]);

  // Meeting type tabs definition (matching Image 2)
  const tabs = useMemo(() => {
    const list = [
      {
        id: "Todas",
        label: "Todas",
        matcher: () => true
      },
      {
        id: "Asambleas",
        label: "Asambleas",
        matcher: (a: Announcement) =>
          /asamblea/i.test(a.type?.name || "") ||
          /asamblea/i.test(a.subtype?.name || "")
      },
      {
        id: "Reuniones de consejo",
        label: "Reuniones de consejo",
        matcher: (a: Announcement) =>
          /consejo/i.test(a.type?.name || "") ||
          /consejo/i.test(a.subtype?.name || "")
      },
      {
        id: "Sesiones de comisiones",
        label: "Sesiones de comisiones",
        matcher: (a: Announcement) =>
          /comisi/i.test(a.type?.name || "") ||
          /comisi/i.test(a.subtype?.name || "")
      },
      {
        id: "Reuniones de trabajo",
        label: "Reuniones de trabajo",
        matcher: (a: Announcement) =>
          /trabajo/i.test(a.type?.name || "") ||
          /trabajo/i.test(a.subtype?.name || "")
      }
    ];

    // Check if there are other types/subtypes in announcements not covered
    const extraLabels = new Set<string>();
    initialAnnouncements.forEach((a) => {
      const typeName = a.type?.name || "";
      const subtypeName = a.subtype?.name || "";
      const covered = list.slice(1).some((t) => t.matcher(a));
      if (!covered) {
        if (subtypeName) extraLabels.add(subtypeName);
        else if (typeName) extraLabels.add(typeName);
      }
    });

    extraLabels.forEach((label) => {
      list.push({
        id: label,
        label,
        matcher: (a: Announcement) =>
          a.subtype?.name === label || a.type?.name === label
      });
    });

    return list.map((tab) => {
      const count =
        tab.id === "Todas"
          ? initialAnnouncements.length
          : initialAnnouncements.filter(tab.matcher).length;
      return {
        ...tab,
        count
      };
    });
  }, [initialAnnouncements]);

  // Filter & Sort Logic
  const filteredAnnouncements = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const currentTab = tabs.find((t) => t.id === selectedTypeTab);

    return initialAnnouncements
      .filter((a) => {
        // Tab filter
        if (currentTab && currentTab.id !== "Todas") {
          if (!currentTab.matcher(a)) return false;
        }

        // Status filter
        if (selectedStatus !== "Todos") {
          if (a.status?.name !== selectedStatus) return false;
        }

        // Search term
        if (q) {
          const matchName = a.name.toLowerCase().includes(q);
          const matchType = (a.type?.name || "").toLowerCase().includes(q);
          const matchSubtype = (a.subtype?.name || "").toLowerCase().includes(q);
          const matchLocation = (a.dates || []).some((d) =>
            (d.location || "").toLowerCase().includes(q)
          );
          const matchCallType = (a.dates || []).some((d) =>
            (d.callType || "").toLowerCase().includes(q)
          );
          const matchTopics = (a.topics || []).some(
            (t) =>
              (t.title || "").toLowerCase().includes(q) ||
              (t.description || "").toLowerCase().includes(q)
          );
          const matchPresenter = (a.topics || []).some((t) => {
            if (!t.presenterId) return false;
            const pName = userMap.get(t.presenterId) || "";
            return pName.toLowerCase().includes(q);
          });

          if (
            !matchName &&
            !matchType &&
            !matchSubtype &&
            !matchLocation &&
            !matchCallType &&
            !matchTopics &&
            !matchPresenter
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === "Fecha") {
          const dateA = a.dates[0]?.date ? new Date(a.dates[0].date).getTime() : 0;
          const dateB = b.dates[0]?.date ? new Date(b.dates[0].date).getTime() : 0;
          comp = dateA - dateB;
        } else if (sortBy === "Asunto") {
          comp = a.name.localeCompare(b.name);
        } else if (sortBy === "Estatus") {
          comp = (a.status?.name || "").localeCompare(b.status?.name || "");
        } else if (sortBy === "Tipo") {
          const typeA = a.subtype?.name || a.type?.name || "";
          const typeB = b.subtype?.name || b.type?.name || "";
          comp = typeA.localeCompare(typeB);
        }

        return sortDirection === "asc" ? comp : -comp;
      });
  }, [
    initialAnnouncements,
    searchTerm,
    selectedStatus,
    selectedTypeTab,
    sortBy,
    sortDirection,
    tabs,
    userMap
  ]);

  // Helper to extract responsibles for an announcement
  const getResponsibles = (announcement: Announcement) => {
    const list: { name: string; initials: string }[] = [];
    const seen = new Set<string>();

    (announcement.topics || []).forEach((t) => {
      if (t.presenterId) {
        const name = userMap.get(t.presenterId) || t.presenterId;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ name, initials: formatInitials(name) });
        }
      }
    });

    if (list.length === 0) {
      if (announcement.conveningPersonId) {
        const name =
          userMap.get(announcement.conveningPersonId) ||
          announcement.conveningPersonId;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ name, initials: formatInitials(name) });
        }
      }
      if (announcement.moderatorPersonId) {
        const name =
          userMap.get(announcement.moderatorPersonId) ||
          announcement.moderatorPersonId;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ name, initials: formatInitials(name) });
        }
      }
    }

    if (list.length === 0 && announcement.conveningPosition) {
      const pos = announcement.conveningPosition.trim();
      if (pos) {
        list.push({ name: pos, initials: formatInitials(pos) });
      }
    }

    return list;
  };

  // Actions
  const handleSendByEmail = (announcementId: string) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas enviar esta convocatoria por correo electrónico a todos los participantes e invitados?"
      )
    ) {
      return;
    }
    setIsSendingEmailId(announcementId);
    startTransition(async () => {
      const res = await sendAnnouncementInvitationAction(announcementId);
      setIsSendingEmailId(null);
      setOpenDropdownId(null);
      if (res.success) {
        alert(
          res.message ||
            `Convocatoria enviada con éxito.\nTotal enviados: ${res.sentCount}\nFallidos: ${res.failedCount}`
        );
      } else {
        alert(`Error al enviar correos: ${res.error || res.message}`);
      }
    });
  };

  const handleSendByWhatsApp = (announcementId: string) => {
    setIsSendingWAId(announcementId);
    startTransition(async () => {
      const res = await getAnnouncementWhatsAppTextAction(announcementId);
      setIsSendingWAId(null);
      setOpenDropdownId(null);
      if (res.success && res.text) {
        setWaText(res.text);
        if (res.recipients && res.recipients.length > 0) {
          setWaRecipients(res.recipients);
        } else {
          const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
            res.text
          )}`;
          window.open(url, "_blank");
        }
      } else {
        alert(`Error al preparar mensaje de WhatsApp: ${res.error}`);
      }
    });
  };

  // Status Badge Helper
  const renderStatusBadge = (statusName: string) => {
    const upper = statusName.toUpperCase();
    if (upper === "PENDIENTE") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-sm bg-[#fcf8f0] border border-[#d0b685]/70 text-[#947133] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-xs">
          Pendiente
        </span>
      );
    }
    if (upper === "TERMINADA") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-sm bg-[#f1f5f9] border border-[#cbd5e1] text-[#64748b] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-xs">
          Terminada
        </span>
      );
    }
    if (upper === "EN PROCESO" || upper === "INICIADA") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-sm bg-[#e8f1f5] border border-[#304854]/40 text-[#304854] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-xs">
          {statusName}
        </span>
      );
    }
    if (upper === "CANCELADA") {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-sm bg-[#fee2e2] border border-[#fca5a5] text-[#991b1b] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-xs">
          Cancelada
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-sm bg-white border border-[#cbd5e1] text-[#475569] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shadow-xs">
        {statusName}
      </span>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative">
      {/* ============================================================== */}
      {/* 1. HEADER SECTION (Matches Image 2)                             */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div className="flex items-start gap-3">
          <PageBackBadge className="mt-1 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-extrabold text-[#304854] tracking-tight uppercase leading-none">
                Convocatorias
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#f7f3ec] border border-[#d0b685]/50 text-[#304854]">
                Gobernanza
              </span>
            </div>
            <p className="text-[#64748b] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
              Asambleas, reuniones de consejo, sesiones de comisiones y reuniones de trabajo
            </p>
          </div>
        </div>

        {canManage && (
          <Link
            href="/gobernanza/convocatorias/nuevo"
            className="inline-flex items-center gap-2 h-9 px-5 rounded-full bg-[#304854] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-[#253943] transition-all shadow-sm active:scale-95 self-start md:self-auto shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nueva convocatoria
          </Link>
        )}
      </div>

      {/* Decorative Gold & Slate Line (Matches Image 2) */}
      <div className="relative mb-5 h-[2px] w-full bg-[#304854]/25">
        <div className="absolute left-0 top-0 h-[3px] w-28 bg-[#d0b685] rounded-full" />
      </div>

      {/* ============================================================== */}
      {/* 2. FILTER & TOOLBAR SECTION (Two Rows, Matches Image 2)         */}
      {/* ============================================================== */}
      <div className="space-y-3.5 bg-transparent">
        {/* Row 1: Search, Estatus, Ordenar por, Direction, View toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-3.5 h-3.5 text-[#64748b] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar convocatoria o lugar..."
                className="h-9 w-60 sm:w-64 md:w-72 rounded-full border border-[#cbd5e1] bg-white pl-9 pr-8 text-xs text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#304854] focus:ring-1 focus:ring-[#304854] outline-none shadow-xs transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 text-[#94a3b8] hover:text-[#0f172a]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Estatus Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                Estatus
              </span>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9 rounded-full border border-[#cbd5e1] bg-white pl-3.5 pr-8 text-xs font-semibold text-[#0f172a] focus:border-[#304854] outline-none cursor-pointer shadow-xs appearance-none"
                >
                  <option value="Todos">Todos</option>
                  {availableStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">
                  ⌵
                </span>
              </div>
            </div>

            {/* Ordenar por Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">
                Ordenar por
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="h-9 rounded-full border border-[#cbd5e1] bg-white pl-3.5 pr-8 text-xs font-semibold text-[#0f172a] focus:border-[#304854] outline-none cursor-pointer shadow-xs appearance-none"
                >
                  <option value="Fecha">Fecha</option>
                  <option value="Asunto">Asunto</option>
                  <option value="Estatus">Estatus</option>
                  <option value="Tipo">Tipo</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">
                  ⌵
                </span>
              </div>

              {/* Sort Order Button */}
              <button
                type="button"
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                title={
                  sortDirection === "asc" ? "Orden ascendente" : "Orden descendente"
                }
                className="w-8 h-8 rounded-lg bg-[#304854] text-white flex items-center justify-center hover:bg-[#253943] transition-colors shadow-xs active:scale-95"
              >
                {sortDirection === "asc" ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* View Mode Toggle: TARJETAS / LISTA */}
          <div className="inline-flex items-center gap-1 bg-[#f1f5f9] p-1 rounded-xl border border-[#e2e8f0] self-start lg:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("TARJETAS")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "TARJETAS"
                  ? "bg-[#304854] text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#304854] bg-transparent"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Tarjetas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LISTA")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "LISTA"
                  ? "bg-[#304854] text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#304854] bg-transparent"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>
        </div>

        {/* Row 2: Tipo de Reunión Tabs & Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b] mr-1">
              Tipo de reunión
            </span>
            {tabs.map((tab) => {
              const isActive = selectedTypeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTypeTab(tab.id)}
                  className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#304854] text-white shadow-xs"
                      : "bg-white border border-[#cbd5e1] text-[#475569] hover:bg-[#faf8f5]"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id !== "Todas" && tab.count > 0 && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[#f4efe6] text-[#8c734b] border border-[#d0b685]/40"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Convocatorias Count */}
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748b] shrink-0">
            {filteredAnnouncements.length}{" "}
            {filteredAnnouncements.length === 1 ? "Convocatoria" : "Convocatorias"}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. LIST VIEW (TABLE) OR CARDS VIEW                             */}
      {/* ============================================================== */}
      {filteredAnnouncements.length > 0 ? (
        viewMode === "LISTA" ? (
          <div className="overflow-hidden rounded-2xl border border-[#cbd5e1]/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                {/* Table Header: Solid Navy #304854, White text */}
                <thead className="bg-[#304854] text-white">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Fecha {sortBy === "Fecha" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Asunto
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Tipo de reunión
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Convocatoria
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Lugar
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Hora
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Estatus
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Temas propuestos
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap">
                      Responsable
                    </th>
                    <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-white whitespace-nowrap text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredAnnouncements.map((announcement) => {
                    const primaryDate = announcement.dates?.[0];
                    const responsibles = getResponsibles(announcement);
                    const isDropdownOpen = openDropdownId === announcement.id;
                    const typeLabel =
                      announcement.subtype?.name || announcement.type?.name || "Reunión";

                    return (
                      <tr
                        key={announcement.id}
                        className="hover:bg-[#fbfaf8] transition-colors"
                      >
                        {/* 1. Fecha */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          {primaryDate?.date ? (
                            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[#304854] text-white shadow-xs">
                              <span className="text-[9px] font-bold uppercase tracking-wider opacity-85 leading-none">
                                {format(new Date(primaryDate.date), "MMM", {
                                  locale: es
                                })}
                              </span>
                              <span className="text-base font-extrabold leading-tight">
                                {format(new Date(primaryDate.date), "dd")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#94a3b8] font-bold">—</span>
                          )}
                        </td>

                        {/* 2. Asunto */}
                        <td className="px-4 py-3.5 align-middle max-w-[220px]">
                          <Link
                            href={`/gobernanza/convocatorias/${announcement.id}`}
                            className="text-sm font-bold text-[#0f172a] hover:text-[#304854] hover:underline leading-snug line-clamp-2 block"
                            title={announcement.name}
                          >
                            {announcement.name}
                          </Link>
                        </td>

                        {/* 3. Tipo de Reunión */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#edf6f1] border border-[#c5e6d4] text-[#1b5e3f] shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                            {typeLabel}
                          </span>
                        </td>

                        {/* 4. Convocatoria */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="space-y-0.5">
                            <p className="text-xs font-extrabold text-[#0f172a] uppercase tracking-tight">
                              {primaryDate?.callType || "1RA CONVOCATORIA"}
                            </p>
                            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wide">
                              {announcement.topics.length}{" "}
                              {announcement.topics.length === 1 ? "TEMA" : "TEMAS"}
                            </p>
                          </div>
                        </td>

                        {/* 5. Lugar */}
                        <td className="px-4 py-3.5 align-middle max-w-[140px]">
                          {primaryDate?.location ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#475569]">
                              <MapPin className="w-3.5 h-3.5 text-[#d0b685] shrink-0" />
                              <span className="truncate" title={primaryDate.location}>
                                {primaryDate.location}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#94a3b8]">—</span>
                          )}
                        </td>

                        {/* 6. Hora */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          {primaryDate?.time ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#475569]">
                              <Clock className="w-3.5 h-3.5 text-[#94a3b8] shrink-0" />
                              <span>{primaryDate.time}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#94a3b8]">—</span>
                          )}
                        </td>

                        {/* 7. Estatus */}
                        <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                          {renderStatusBadge(announcement.status?.name || "Pendiente")}
                        </td>

                        {/* 8. Temas Propuestos */}
                        <td className="px-4 py-3.5 align-middle max-w-[320px]">
                          {announcement.topics.length > 0 ? (
                            announcement.topics.some((t) => t.title?.trim()) ? (
                              <div className="space-y-1.5 py-0.5">
                                {announcement.topics.map((t, idx) => {
                                  const topicTitle = t.title?.trim();
                                  return (
                                    <div
                                      key={t.id || idx}
                                      className="flex items-start gap-2"
                                    >
                                      <span className="w-4 h-4 rounded-full bg-[#f6efe4] border border-[#d0b685] text-[#826639] text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <span className="text-xs text-[#334155] font-normal leading-snug line-clamp-2">
                                        {topicTitle || "Sin detalle capturado"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs italic text-[#94a3b8]">
                                {announcement.topics.length}{" "}
                                {announcement.topics.length === 1 ? "tema" : "temas"} · sin
                                detalle capturado
                              </span>
                            )
                          ) : (
                            <span className="text-xs italic text-[#94a3b8]">
                              Sin temas registrados
                            </span>
                          )}
                        </td>

                        {/* 9. Responsable */}
                        <td className="px-4 py-3.5 align-middle max-w-[160px]">
                          {responsibles.length > 0 ? (
                            <div className="space-y-1 py-0.5">
                              {responsibles.map((r, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-[#304854] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                    {r.initials}
                                  </div>
                                  <span className="text-xs font-medium text-[#334155] truncate">
                                    {r.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">—</span>
                          )}
                        </td>

                        {/* 10. Acciones */}
                        <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 relative">
                            {announcement.pdfUrl && (
                              <a
                                href={announcement.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#304854] hover:text-white hover:border-[#304854] flex items-center justify-center transition-colors shadow-xs"
                                title="Ver PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </a>
                            )}

                            {/* 3 dots action menu button */}
                            <button
                              type="button"
                              onClick={(e) =>
                                handleToggleDropdown(e, announcement.id)
                              }
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shadow-xs cursor-pointer ${
                                isDropdownOpen
                                  ? "bg-[#304854] text-white border-[#304854]"
                                  : "border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#304854] hover:text-white hover:border-[#304854]"
                              }`}
                              title="Opciones"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                canManage={canManage}
                canEdit={canEdit}
              />
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#cbd5e1]/80 shadow-xs space-y-4">
          <div className="w-14 h-14 bg-[#f8fafc] rounded-2xl flex items-center justify-center text-[#304854] border border-[#e2e8f0]">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div className="text-center max-w-sm px-4">
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-[#0f172a]">
              No se encontraron convocatorias
            </h3>
            <p className="text-[#64748b] text-[11px] mt-1 font-medium">
              {searchTerm || selectedStatus !== "Todos" || selectedTypeTab !== "Todas"
                ? "No existen registros que coincidan con los filtros aplicados."
                : "Aún no se han registrado convocatorias en este condominio."}
            </p>
          </div>
          {(searchTerm ||
            selectedStatus !== "Todos" ||
            selectedTypeTab !== "Todas") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedStatus("Todos");
                setSelectedTypeTab("Todas");
              }}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-[#f1f5f9] border border-[#cbd5e1] text-[11px] font-bold uppercase tracking-wider text-[#304854] hover:bg-[#e2e8f0] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer filtros
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. FLOATING WHATSAPP BUTTON (Matches Image 2)                   */}
      {/* ============================================================== */}
      <a
        href={`https://api.whatsapp.com/send?phone=${WHATSAPP_HELP_NUMBER}&text=${encodeURIComponent(
          "Hola, necesito ayuda con el módulo de convocatorias de Val'Quirico."
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba56] text-white text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
        title="Contactar soporte por WhatsApp"
      >
        <MessageCircle className="w-4 h-4 fill-current" />
        <span>¿Necesitas ayuda?</span>
      </a>

      {/* ============================================================== */}
      {/* 5. WHATSAPP RECIPIENTS MODAL                                    */}
      {/* ============================================================== */}
      {waRecipients && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWaRecipients(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#304854]">
                  Enviar Invitación por WhatsApp
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase">
                  Selecciona a quién deseas enviar el mensaje
                </p>
              </div>
              <button
                onClick={() => setWaRecipients(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {waRecipients.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {rec.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 truncate">
                      {rec.position}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {rec.phone}
                    </p>
                  </div>
                  <a
                    href={`https://api.whatsapp.com/send?phone=${rec.phone}&text=${encodeURIComponent(
                      waText
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setWaRecipients(null)}
                    className="h-8 px-3 rounded-full bg-[#25D366] hover:bg-[#20ba56] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Enviar
                  </a>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  waText
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWaRecipients(null)}
                className="w-full h-9 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                Abrir selector de contactos
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. FLOATING ACTION MENU (Mounted to body to avoid overflow clip) */}
      {/* ============================================================== */}
      {mounted &&
        openDropdownId &&
        dropdownCoords &&
        activeDropdownAnnouncement &&
        createPortal(
          <>
            {/* Transparent click-away backdrop with high z-index */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => {
                setOpenDropdownId(null);
                setDropdownCoords(null);
              }}
            />

            {/* Floating Dropdown Menu */}
            <div
              style={{
                position: "fixed",
                top: dropdownCoords.openUpwards ? "auto" : `${dropdownCoords.top}px`,
                bottom: dropdownCoords.openUpwards
                  ? `${window.innerHeight - dropdownCoords.top}px`
                  : "auto",
                left: `${dropdownCoords.left}px`,
              }}
              className="w-52 rounded-xl border border-[#cbd5e1] bg-white p-1.5 shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-100"
            >
              <Link
                href={`/gobernanza/convocatorias/${activeDropdownAnnouncement.id}`}
                onClick={() => {
                  setOpenDropdownId(null);
                  setDropdownCoords(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[#1e293b] hover:bg-[#faf8f5] hover:text-[#304854] transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-[#64748b]" />
                Ver detalles
              </Link>

              {canManage && (
                <>
                  {canEdit && (
                    <Link
                      href={`/gobernanza/convocatorias/${activeDropdownAnnouncement.id}/editar`}
                      onClick={() => {
                        setOpenDropdownId(null);
                        setDropdownCoords(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[#1e293b] hover:bg-[#faf8f5] hover:text-[#304854] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#64748b]" />
                      Editar convocatoria
                    </Link>
                  )}

                  <Link
                    href={`/gobernanza/convocatorias/${activeDropdownAnnouncement.id}/asamblea`}
                    onClick={() => {
                      setOpenDropdownId(null);
                      setDropdownCoords(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[#1e293b] hover:bg-[#faf8f5] hover:text-[#304854] transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-[#304854]" />
                    {(() => {
                      const isAsam = isAsamblea(activeDropdownAnnouncement);
                      const noun = getMeetingNoun(isAsam, { capitalized: false });
                      const isLive =
                        activeDropdownAnnouncement.status?.name === "En Proceso" ||
                        activeDropdownAnnouncement.status?.name === "Iniciada";
                      return isLive ? `Toma de ${noun}` : `Iniciar ${noun}`;
                    })()}
                  </Link>

                  <button
                    type="button"
                    disabled={isSendingEmailId === activeDropdownAnnouncement.id}
                    onClick={() => {
                      const annId = activeDropdownAnnouncement.id;
                      setOpenDropdownId(null);
                      setDropdownCoords(null);
                      handleSendByEmail(annId);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[#1e293b] hover:bg-[#faf8f5] hover:text-[#304854] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingEmailId === activeDropdownAnnouncement.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#304854]" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-[#64748b]" />
                    )}
                    {isSendingEmailId === activeDropdownAnnouncement.id
                      ? "Enviando..."
                      : "Enviar por correo"}
                  </button>

                  <button
                    type="button"
                    disabled={isSendingWAId === activeDropdownAnnouncement.id}
                    onClick={() => {
                      const annId = activeDropdownAnnouncement.id;
                      setOpenDropdownId(null);
                      setDropdownCoords(null);
                      handleSendByWhatsApp(annId);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[#1e293b] hover:bg-[#faf8f5] hover:text-[#304854] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingWAId === activeDropdownAnnouncement.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#25D366]" />
                    ) : (
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    )}
                    {isSendingWAId === activeDropdownAnnouncement.id
                      ? "Preparando..."
                      : "Enviar por WhatsApp"}
                  </button>
                </>
              )}

              {(activeDropdownAnnouncement.status?.name === "En Proceso" ||
                activeDropdownAnnouncement.status?.name === "Iniciada") &&
                activeDropdownAnnouncement.dates[0] && (
                  <Link
                    href={`/gobernanza/convocatorias/${activeDropdownAnnouncement.id}/asamblea/${activeDropdownAnnouncement.dates[0].id}/participar`}
                    onClick={() => {
                      setOpenDropdownId(null);
                      setDropdownCoords(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-[#304854] hover:bg-[#304854]/10 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-[#304854] fill-[#304854]" />
                    Participar
                  </Link>
                )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

