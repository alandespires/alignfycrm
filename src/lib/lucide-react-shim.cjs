/**
 * lucide-react → Material Symbols Rounded (filled, bold) shim.
 * Aliased in vite.config.ts. Renders <span className="material-symbols-rounded">name</span>
 * preserving lucide-react's prop surface (className, size, strokeWidth, style, ...).
 */
const React = require("react");

// Maps PascalCase lucide names → Material Symbols Rounded ligatures.
const MAP = {
  LayoutDashboard: "dashboard", LayoutGrid: "grid_view", LayoutList: "view_list",
  Users: "group", User: "person", UserCircle: "account_circle", UserCircle2: "account_circle",
  UserPlus: "person_add", UserCheck: "how_to_reg", UserX: "person_off",
  Kanban: "view_kanban", Building: "business", Building2: "apartment",
  ListChecks: "checklist", List: "list", ListTodo: "checklist_rtl",
  Zap: "bolt", Sparkles: "auto_awesome", Sparkle: "auto_awesome",
  BarChart: "bar_chart", BarChart2: "bar_chart", BarChart3: "bar_chart_4_bars", BarChart4: "bar_chart_4_bars",
  PieChart: "pie_chart", LineChart: "show_chart", AreaChart: "area_chart",
  TrendingUp: "trending_up", TrendingDown: "trending_down", Activity: "monitoring",
  Settings: "settings", Settings2: "settings", Cog: "settings", SlidersHorizontal: "tune", Sliders: "tune",
  Search: "search", SearchX: "search_off",
  Plus: "add", PlusCircle: "add_circle", Minus: "remove", MinusCircle: "do_not_disturb_on",
  LogOut: "logout", LogIn: "login",
  Loader: "progress_activity", Loader2: "progress_activity", LoaderCircle: "progress_activity", RefreshCw: "refresh", RefreshCcw: "refresh", RotateCw: "refresh", RotateCcw: "refresh",
  Sun: "light_mode", Moon: "dark_mode", SunMoon: "routine",
  Shield: "shield", ShieldCheck: "verified_user", ShieldAlert: "gpp_maybe", ShieldOff: "gpp_bad",
  Wallet: "wallet", CreditCard: "credit_card", DollarSign: "attach_money", Receipt: "receipt_long", Banknote: "payments",
  Stethoscope: "stethoscope", Pill: "medication", HeartPulse: "monitor_heart",
  Target: "target", Crosshair: "crisis_alert", Flag: "flag",
  FileText: "description", File: "draft", FilePlus: "note_add", Files: "folder_copy", FileCheck: "task", FileSpreadsheet: "table_chart", FileImage: "image", FileDown: "download", FileUp: "upload",
  History: "history", Clock: "schedule", Clock3: "schedule", Clock4: "schedule", Timer: "timer", Hourglass: "hourglass",
  Megaphone: "campaign", Bell: "notifications", BellOff: "notifications_off", BellRing: "notifications_active",
  Mail: "mail", MailOpen: "drafts", MailPlus: "outgoing_mail", Inbox: "inbox", Send: "send",
  Globe: "public", Globe2: "public", LifeBuoy: "support", HelpCircle: "help", Info: "info", AlertCircle: "error", AlertTriangle: "warning", AlertOctagon: "report",
  BookOpen: "menu_book", Book: "book", BookMarked: "bookmark", Bookmark: "bookmark",
  MessageCircle: "chat_bubble", MessageSquare: "chat", MessagesSquare: "forum", Mic: "mic", MicOff: "mic_off",
  Phone: "call", PhoneCall: "call", PhoneIncoming: "call_received", PhoneOutgoing: "call_made", PhoneOff: "call_end",
  ChevronDown: "expand_more", ChevronUp: "expand_less", ChevronLeft: "chevron_left", ChevronRight: "chevron_right",
  ChevronsLeft: "keyboard_double_arrow_left", ChevronsRight: "keyboard_double_arrow_right", ChevronsUp: "keyboard_double_arrow_up", ChevronsDown: "keyboard_double_arrow_down",
  ArrowLeft: "arrow_back", ArrowRight: "arrow_forward", ArrowUp: "arrow_upward", ArrowDown: "arrow_downward",
  ArrowUpRight: "north_east", ArrowUpLeft: "north_west", ArrowDownRight: "south_east", ArrowDownLeft: "south_west",
  MoveRight: "east", MoveLeft: "west", MoveUp: "north", MoveDown: "south",
  PanelLeftClose: "left_panel_close", PanelLeftOpen: "left_panel_open", PanelRightClose: "right_panel_close", PanelRightOpen: "right_panel_open",
  Home: "home", ShoppingBag: "shopping_bag", ShoppingCart: "shopping_cart", Store: "storefront",
  HeartHandshake: "handshake", Handshake: "handshake", Heart: "favorite", HeartOff: "heart_broken",
  BrainCircuit: "psychology", Brain: "neurology", Bot: "smart_toy", Cpu: "memory",
  Briefcase: "work", GraduationCap: "school", ClipboardList: "assignment", ClipboardCheck: "assignment_turned_in", Clipboard: "content_paste",
  CalendarCheck: "event_available", Calendar: "calendar_today", CalendarDays: "calendar_month", CalendarPlus: "event", CalendarX: "event_busy",
  IdCard: "badge", Menu: "menu", MoreHorizontal: "more_horiz", MoreVertical: "more_vert", X: "close", XCircle: "cancel",
  Check: "check", CheckCircle: "check_circle", CheckCircle2: "check_circle", CheckSquare: "check_box",
  Square: "check_box_outline_blank", Circle: "radio_button_unchecked", Dot: "fiber_manual_record",
  Eye: "visibility", EyeOff: "visibility_off",
  Edit: "edit", Edit2: "edit", Edit3: "edit_note", Pencil: "edit", PencilLine: "edit_note", PenLine: "edit_note",
  Trash: "delete", Trash2: "delete",
  Copy: "content_copy", Clipboard2: "content_paste", Scissors: "content_cut",
  Download: "download", Upload: "upload", DownloadCloud: "cloud_download", UploadCloud: "cloud_upload",
  Filter: "filter_list", FilterX: "filter_alt_off", SortAsc: "sort", SortDesc: "sort",
  Star: "star", StarOff: "star_outline", Sparkle2: "auto_awesome",
  Tag: "sell", Tags: "sell", Hash: "tag",
  Image: "image", ImagePlus: "add_photo_alternate", Camera: "photo_camera", Video: "videocam", Film: "movie",
  Folder: "folder", FolderOpen: "folder_open", FolderPlus: "create_new_folder",
  Link: "link", Link2: "link", Unlink: "link_off", ExternalLink: "open_in_new",
  Lock: "lock", Unlock: "lock_open", Key: "key",
  Save: "save", Paperclip: "attach_file",
  Wand: "auto_fix_high", Wand2: "auto_fix_high", Wrench: "build", Hammer: "build", Tool: "build",
  Radio: "radio_button_checked", Wifi: "wifi", WifiOff: "wifi_off", Signal: "signal_cellular_alt", Antenna: "cell_tower",
  Eye2: "visibility", ThumbsUp: "thumb_up", ThumbsDown: "thumb_down",
  MapPin: "place", Map: "map", Navigation: "navigation", Compass: "explore",
  Play: "play_arrow", Pause: "pause", StopCircle: "stop_circle", SkipForward: "skip_next", SkipBack: "skip_previous",
  Volume: "volume_up", Volume1: "volume_down", Volume2: "volume_up", VolumeX: "volume_off",
  Lightbulb: "lightbulb", Flame: "local_fire_department", Leaf: "eco", Cloud: "cloud", CloudOff: "cloud_off",
  Database: "database", Server: "dns", HardDrive: "hard_drive", Layers: "layers",
  Package: "inventory_2", Box: "inventory_2", Boxes: "inventory",
  Bug: "bug_report", Code: "code", Code2: "code", Terminal: "terminal", Braces: "data_object", Brackets: "data_array",
  Smartphone: "smartphone", Tablet: "tablet", Monitor: "desktop_windows", Laptop: "laptop",
  Printer: "print", Headphones: "headphones", Speaker: "speaker",
  Award: "workspace_premium", Trophy: "emoji_events", Crown: "workspace_premium", Gem: "diamond",
  Rocket: "rocket_launch", Plane: "flight", Car: "directions_car", Truck: "local_shipping", Bike: "directions_bike",
  Coffee: "local_cafe", Pizza: "local_pizza", Gift: "redeem", PartyPopper: "celebration",
  Quote: "format_quote", Bold: "format_bold", Italic: "format_italic", Underline: "format_underlined",
  AlignLeft: "format_align_left", AlignCenter: "format_align_center", AlignRight: "format_align_right", AlignJustify: "format_align_justify",
  Power: "power_settings_new", PowerOff: "power_off",
  EyeIcon: "visibility",
};

// Convert PascalCase → snake_case as last-resort fallback (most won't match a real symbol; default to "circle").
function fallback(name) {
  const snake = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
  return snake || "circle";
}

const TW_H = { "2": 8, "2.5": 10, "3": 12, "3.5": 14, "4": 16, "5": 20, "6": 24, "7": 28, "8": 32, "9": 36, "10": 40, "11": 44, "12": 48, "14": 56, "16": 64 };
function pxFromClass(cls) {
  if (!cls || typeof cls !== "string") return null;
  const m = /(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/.exec(cls);
  if (!m) return null;
  return TW_H[m[1]] != null ? TW_H[m[1]] : parseFloat(m[1]) * 4;
}

const cache = new Map();
function makeIcon(name) {
  if (cache.has(name)) return cache.get(name);
  const ligature = MAP[name] || fallback(name);
  const Comp = React.forwardRef(function Icon(props, ref) {
    const { className = "", size, strokeWidth, color, style, ...rest } = props || {};
    const px = (typeof size === "number" ? size : null) ?? pxFromClass(className) ?? 16;
    const merged = {
      lineHeight: 1,
      fontSize: px + "px",
      width: px + "px",
      height: px + "px",
      color: color || undefined,
      ...style,
    };
    return React.createElement(
      "span",
      {
        ...rest,
        ref,
        "aria-hidden": props["aria-label"] ? undefined : true,
        className: ("material-symbols-rounded ks-mi " + className).trim(),
        style: merged,
      },
      ligature
    );
  });
  Comp.displayName = name;
  cache.set(name, Comp);
  return Comp;
}

const handler = {
  get(_t, prop) {
    if (prop === "__esModule") return true;
    if (prop === "default") return module.exports;
    if (typeof prop === "symbol") return undefined;
    return makeIcon(String(prop));
  },
};

module.exports = new Proxy({}, handler);
module.exports.default = module.exports;
